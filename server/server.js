/*
 * Backend CRM – integracja z Facebook Lead Ads.
 *
 * Funkcje:
 *  - Serwuje statyczny front-end z katalogu ../crm
 *  - GET  /webhook        – weryfikacja webhooka Meta (hub.challenge)
 *  - POST /webhook        – odbiór powiadomień "leadgen", pobranie leada z Graph API
 *  - GET  /api/leads      – lista zebranych leadów (w formacie kontaktu CRM)
 *  - POST /api/sync       – ręczne pobranie ostatnich leadów z formularzy (META_FORM_IDS)
 *  - GET  /api/health     – status i konfiguracja (bez sekretów)
 *
 * Brak zależności zewnętrznych – wyłącznie wbudowane moduły Node.
 */
"use strict";

const http = require("http");
const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

// --- Konfiguracja (zmienne środowiskowe) --------------------------------
const PORT = process.env.PORT || 3000;
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v21.0";
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || "";
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "crm-verify-token";
const APP_SECRET = process.env.META_APP_SECRET || "";
const FORM_IDS = (process.env.META_FORM_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Opcjonalne mapowanie pól niestandardowych formularza na pola kontaktu CRM.
// Format JSON, np.: {"budzet":"value","miasto":"company","nazwa_firmy":"company"}
// Dozwolone cele: name, company, email, phone, value, notes.
let FIELD_MAP = {};
try {
  FIELD_MAP = JSON.parse(process.env.META_FIELD_MAP || "{}");
} catch (e) {
  console.warn("META_FIELD_MAP nie jest poprawnym JSON – pomijam:", e.message);
}

const CRM_DIR = path.join(__dirname, "..", "crm");
const DATA_FILE = path.join(__dirname, "data", "leads.json");

// --- Trwałość (plik JSON) -----------------------------------------------
function loadLeads() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveLeads(leads) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2));
}

/** Zapisuje leada, jeśli jego leadId jeszcze nie istnieje. Zwraca true gdy dodano. */
function upsertLead(lead) {
  const leads = loadLeads();
  if (leads.some((l) => l.leadId === lead.leadId)) return false;
  leads.push(lead);
  saveLeads(leads);
  return true;
}

// --- Graph API ----------------------------------------------------------
function graphGet(pathAndQuery) {
  return new Promise((resolve, reject) => {
    if (!ACCESS_TOKEN) return reject(new Error("Brak META_ACCESS_TOKEN"));
    const sep = pathAndQuery.includes("?") ? "&" : "?";
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pathAndQuery}${sep}access_token=${encodeURIComponent(ACCESS_TOKEN)}`;
    https
      .get(url, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            const json = JSON.parse(body);
            if (json.error) return reject(new Error(json.error.message));
            resolve(json);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

// Standardowe nazwy pól Meta -> pola kontaktu CRM.
const STANDARD_FIELDS = {
  full_name: "name",
  email: "email",
  phone_number: "phone",
  company_name: "company",
};

/**
 * Zamienia surowego leada z Graph API na kontakt CRM.
 * - mapuje pola standardowe oraz zdefiniowane w META_FIELD_MAP,
 * - wszystkie pozostałe (niezmapowane) pola zachowuje w notatkach,
 *   dzięki czemu żadne dane z formularza nie przepadają.
 */
function leadToContact(raw) {
  const contact = {
    leadId: raw.id,
    name: "",
    company: "",
    email: "",
    phone: "",
    stage: "lead",
    value: 0,
    notes: "",
    createdAt: raw.created_time ? new Date(raw.created_time).getTime() : Date.now(),
    source: "facebook_lead_ads",
  };

  const extraLines = [];
  for (const f of raw.field_data || []) {
    const value = (f.values && f.values[0]) || "";
    if (!value) continue;
    // first_name/last_name są łączone w pole "name" poniżej – nie powielaj ich w notatkach
    if (f.name === "first_name" || f.name === "last_name") continue;
    const target = FIELD_MAP[f.name] || STANDARD_FIELDS[f.name];
    if (target === "value") {
      contact.value = parseFloat(String(value).replace(/[^\d.,-]/g, "").replace(",", ".")) || 0;
    } else if (target && target in contact && target !== "leadId") {
      contact[target] = contact[target] ? `${contact[target]} ${value}` : value;
    } else {
      extraLines.push(`${f.name}: ${value}`); // pole niezmapowane -> do notatek
    }
  }

  // Obsługa formularzy rozbijających imię na first_name / last_name
  if (!contact.name) {
    const fd = Object.fromEntries((raw.field_data || []).map((f) => [f.name, (f.values || [])[0] || ""]));
    contact.name = [fd.first_name, fd.last_name].filter(Boolean).join(" ").trim();
  }
  if (!contact.name) contact.name = "(bez nazwy)";

  const header = `Z Facebook Lead Ads (formularz ${raw.form_id || "?"}).`;
  contact.notes = [header, ...extraLines].join("\n");
  return contact;
}

/** Pobiera szczegóły pojedynczego leada po jego ID. */
async function fetchLead(leadgenId, formId) {
  const data = await graphGet(`${leadgenId}?fields=id,created_time,field_data,form_id`);
  data.form_id = data.form_id || formId;
  return leadToContact(data);
}

/** Pobiera ostatnie leady ze wszystkich skonfigurowanych formularzy. */
async function syncForms() {
  let added = 0;
  for (const formId of FORM_IDS) {
    const res = await graphGet(`${formId}/leads?fields=id,created_time,field_data,form_id&limit=50`);
    for (const raw of res.data || []) {
      raw.form_id = raw.form_id || formId;
      if (upsertLead(leadToContact(raw))) added++;
    }
  }
  return added;
}

// --- Weryfikacja podpisu webhooka ---------------------------------------
function verifySignature(rawBody, signatureHeader) {
  if (!APP_SECRET) return true; // brak sekretu = weryfikacja wyłączona (dev)
  if (!signatureHeader) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

// --- Pomocnicze HTTP -----------------------------------------------------
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function serveStatic(req, res, pathname) {
  let rel = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(CRM_DIR, path.normalize(rel));
  if (!filePath.startsWith(CRM_DIR)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404).end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(content);
  });
}

// --- Router --------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  // CORS – pozwala otworzyć front-end z innego origin (np. file:// przez localhost)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.writeHead(204).end();

  try {
    // Weryfikacja webhooka (Meta wywołuje GET przy konfiguracji)
    if (pathname === "/webhook" && req.method === "GET") {
      if (
        url.searchParams.get("hub.mode") === "subscribe" &&
        url.searchParams.get("hub.verify_token") === VERIFY_TOKEN
      ) {
        res.writeHead(200, { "Content-Type": "text/plain" });
        return res.end(url.searchParams.get("hub.challenge") || "");
      }
      return res.writeHead(403).end("Forbidden");
    }

    // Odbiór powiadomień o nowych leadach
    if (pathname === "/webhook" && req.method === "POST") {
      const rawBody = await readBody(req);
      if (!verifySignature(rawBody, req.headers["x-hub-signature-256"])) {
        return res.writeHead(401).end("Invalid signature");
      }
      res.writeHead(200).end("EVENT_RECEIVED"); // potwierdź szybko, przetwarzaj asynchronicznie
      try {
        const payload = JSON.parse(rawBody);
        for (const entry of payload.entry || []) {
          for (const change of entry.changes || []) {
            if (change.field !== "leadgen") continue;
            const v = change.value || {};
            const contact = await fetchLead(v.leadgen_id, v.form_id);
            if (upsertLead(contact)) console.log("Nowy lead:", contact.name, contact.email);
          }
        }
      } catch (e) {
        console.error("Błąd przetwarzania webhooka:", e.message);
      }
      return;
    }

    // API dla front-endu
    if (pathname === "/api/leads" && req.method === "GET") {
      return sendJson(res, 200, loadLeads());
    }

    if (pathname === "/api/sync" && req.method === "POST") {
      if (FORM_IDS.length === 0) {
        return sendJson(res, 400, { error: "Brak META_FORM_IDS w konfiguracji" });
      }
      const added = await syncForms();
      return sendJson(res, 200, { added, total: loadLeads().length });
    }

    if (pathname === "/api/health" && req.method === "GET") {
      return sendJson(res, 200, {
        ok: true,
        graphVersion: GRAPH_VERSION,
        hasAccessToken: Boolean(ACCESS_TOKEN),
        signatureCheck: Boolean(APP_SECRET),
        formIds: FORM_IDS.length,
        leads: loadLeads().length,
      });
    }

    // Front-end statyczny
    if (req.method === "GET") return serveStatic(req, res, pathname);

    res.writeHead(404).end("Not found");
  } catch (e) {
    console.error(e);
    sendJson(res, 500, { error: e.message });
  }
});

// Uruchom serwer tylko przy bezpośrednim starcie (pozwala importować funkcje w testach).
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`CRM + Lead Ads działa na http://localhost:${PORT}`);
    console.log(`  Webhook:        http://localhost:${PORT}/webhook`);
    console.log(`  Access token:   ${ACCESS_TOKEN ? "ustawiony" : "BRAK (ustaw META_ACCESS_TOKEN)"}`);
    console.log(`  Weryfikacja podpisu: ${APP_SECRET ? "włączona" : "wyłączona (ustaw META_APP_SECRET)"}`);
    console.log(`  Formularze (sync): ${FORM_IDS.length || "brak (ustaw META_FORM_IDS)"}`);
  });
}

module.exports = { leadToContact };
