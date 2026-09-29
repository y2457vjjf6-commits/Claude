"""Bada formularz i wypisuje gotowe kroki do konfiguracji bota.

    python -m bot.inspect_form "https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=..."

Skrypt NICZEGO nie wysyla. Otwiera strone, czeka az sie zaladuje, wypisuje
wykryte pytania, sprawdza obecnosc CAPTCHA i zapisuje zrzut ekranu.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from playwright.sync_api import sync_playwright

PROBE = """() => {
  const txt = (el) => (el ? (el.innerText || '').replace(/\\s+/g, ' ').trim() : '');
  const containers = Array.from(document.querySelectorAll(
    "div[data-automation-id='questionItem'], [role='listitem']"
  ));
  const questions = containers.map((c) => {
    const field = c.querySelector('input, textarea, select');
    return {
      label: txt(c).slice(0, 120),
      fieldType: field ? (field.tagName.toLowerCase() + ':' + (field.type || '')) : 'brak pola (opis/wybor)',
      automationId: field ? field.getAttribute('data-automation-id') : null,
      required: /\\*/.test(txt(c)) || (field && field.getAttribute('aria-required') === 'true'),
    };
  });
  const buttons = Array.from(document.querySelectorAll('button')).map((b) => ({
    text: txt(b).slice(0, 60),
    automationId: b.getAttribute('data-automation-id'),
  })).filter((b) => b.text || b.automationId);
  return {
    title: document.title,
    heading: txt(document.querySelector('h1, [role="heading"]')).slice(0, 200),
    questions,
    buttons,
    captcha: {
      recaptcha: !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"]'),
      hcaptcha: !!document.querySelector('iframe[src*="hcaptcha"]'),
      other: !!document.querySelector('[class*="captcha" i], [id*="captcha" i]'),
    },
    signInWall: /zaloguj|sign in|logowanie/i.test(document.body.innerText.slice(0, 1500)),
    bodyPreview: (document.body.innerText || '').replace(/\\n{2,}/g, '\\n').slice(0, 1200),
  };
}"""


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Zbadaj formularz i zaproponuj konfiguracje bota")
    parser.add_argument("url")
    parser.add_argument("--headful", action="store_true", help="pokaz okno przegladarki")
    parser.add_argument("--wait", type=int, default=8, help="ile sekund czekac na doladowanie SPA")
    parser.add_argument("--out", default="runs/inspect", help="katalog na zrzut ekranu i JSON")
    args = parser.parse_args(argv)

    out = Path(args.out) / datetime.now().strftime("%Y%m%d-%H%M%S")
    out.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as pw:
        launch = {"headless": not args.headful}
        if os.environ.get("CHROMIUM_EXECUTABLE"):
            launch["executable_path"] = os.environ["CHROMIUM_EXECUTABLE"]
        browser = pw.chromium.launch(**launch)
        context = browser.new_context(locale="pl-PL", timezone_id="Europe/Warsaw",
                                      viewport={"width": 1400, "height": 1200})
        page = context.new_page()
        page.goto(args.url, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(args.wait * 1000)
        info = page.evaluate(PROBE)
        page.screenshot(path=str(out / "formularz.png"), full_page=True)
        (out / "inspect.json").write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")
        context.close()
        browser.close()

    print(f"\nTytul:  {info['title']}")
    print(f"Naglowek: {info['heading']}")
    if info["signInWall"]:
        print("UWAGA: strona wyglada na ekran logowania - bot bedzie potrzebowal browser.user_data_dir")
    cap = info["captcha"]
    if any(cap.values()):
        print(f"UWAGA: wykryto CAPTCHA {cap} - automatyczna wysylka nie zadziala bez Twojego kliknięcia")
    else:
        print("CAPTCHA: nie wykryto")

    print("\nWykryte pytania:")
    fillable = []
    for i, q in enumerate(info["questions"], 1):
        mark = "*" if q["required"] else " "
        print(f" {i:2d}.{mark} [{q['fieldType']}] {q['label']}")
        if not q["fieldType"].startswith("brak"):
            fillable.append(q["label"])

    print("\nPrzyciski:")
    for b in info["buttons"]:
        print(f"  - {b['text']!r} (data-automation-id={b['automationId']})")

    print("\n--- Propozycja sekcji `steps:` do config.yaml ---")
    for label in fillable:
        short = label.split("*")[0].strip()[:60]
        print(f'  - answer: {{ label: "{short}", value: "UZUPELNIJ" }}')
    print('  - click: { selector: "button[data-automation-id=\'submitButton\']", submit: true }')
    print(f"\nZrzut ekranu i JSON: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
