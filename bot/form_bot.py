"""Bot, ktory o wyznaczonej godzinie otwiera strone, wypelnia formularz i wysyla zgloszenie.

Uzycie:
    python -m bot.form_bot bot/config.yaml --dry-run
    python -m bot.form_bot bot/config.yaml

Konfiguracja jest deklaratywna (YAML) - patrz bot/config.example.yaml.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path

import yaml
from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import TimeoutError as PlaywrightTimeout
from playwright.sync_api import sync_playwright

ENV_PATTERN = re.compile(r"\$\{([A-Za-z_][A-Za-z0-9_]*)\}")


def log(message: str) -> None:
    stamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"[{stamp}] {message}", flush=True)


def load_dotenv(path: Path) -> None:
    """Minimalny parser .env - bez dodatkowej zaleznosci."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("'\""))


def expand(value):
    """Podstawia ${ZMIENNA} wartosciami ze srodowiska - dane wrazliwe nie trafiaja do configu."""
    if isinstance(value, str):
        def repl(match: re.Match) -> str:
            name = match.group(1)
            if name not in os.environ:
                raise KeyError(f"Brak zmiennej srodowiskowej {name} uzytej w konfiguracji")
            return os.environ[name]
        return ENV_PATTERN.sub(repl, value)
    if isinstance(value, dict):
        return {k: expand(v) for k, v in value.items()}
    if isinstance(value, list):
        return [expand(v) for v in value]
    return value


def parse_target(timing: dict) -> float | None:
    """Zwraca uniksowy timestamp momentu wyslania zgloszenia (albo None = natychmiast)."""
    if not timing:
        return None
    now = datetime.now()
    if timing.get("at"):
        target = datetime.fromisoformat(str(timing["at"]))
        if target <= now:
            raise ValueError(f"Termin {target} juz minal - popraw timing.at")
        return target.timestamp()
    if timing.get("daily"):
        hh, mm, ss = (list(map(int, str(timing["daily"]).split(":"))) + [0, 0])[:3]
        target = now.replace(hour=hh, minute=mm, second=ss, microsecond=0)
        if target <= now:
            target += timedelta(days=1)
        return target.timestamp()
    return None


def wait_until(target_ts: float) -> None:
    """Czeka do zadanego momentu; ostatnia sekunda odliczana precyzyjnie."""
    remaining = target_ts - time.time()
    if remaining <= 0:
        return
    log(f"Czekam {remaining:.1f}s do {datetime.fromtimestamp(target_ts):%Y-%m-%d %H:%M:%S}")
    while True:
        remaining = target_ts - time.time()
        if remaining <= 0:
            return
        if remaining > 5:
            time.sleep(min(remaining - 5, 30))
        elif remaining > 0.2:
            time.sleep(0.05)
        else:
            time.sleep(0.002)


@dataclass
class RunReport:
    name: str
    started_at: str
    steps: list = field(default_factory=list)
    status: str = "running"
    error: str | None = None
    screenshots: list = field(default_factory=list)
    submitted: bool = False

    def to_json(self) -> str:
        return json.dumps(self.__dict__, ensure_ascii=False, indent=2)


class FormBot:
    def __init__(self, config: dict, dry_run: bool = False, run_dir: Path | None = None):
        self.config = config
        self.dry_run = dry_run or bool(config.get("dry_run"))
        self.timeout = int(config.get("timeout_ms", 20000))
        self.run_dir = run_dir or Path(config.get("runs_dir", "runs")) / datetime.now().strftime("%Y%m%d-%H%M%S")
        self.run_dir.mkdir(parents=True, exist_ok=True)
        self.report = RunReport(name=config.get("name", "run"), started_at=datetime.now().isoformat())
        self.target_ts = parse_target(config.get("timing") or {})
        self.skipped_submit = False

    # --- pojedyncze akcje -------------------------------------------------
    def _shot(self, page, label: str) -> None:
        path = self.run_dir / f"{len(self.report.screenshots):02d}-{label}.png"
        try:
            page.screenshot(path=str(path), full_page=True)
            self.report.screenshots.append(str(path))
            log(f"zrzut ekranu -> {path}")
        except PlaywrightError as exc:
            log(f"nie udalo sie zrobic zrzutu ({exc})")

    def _execute(self, page, step: dict) -> None:
        action, params = next(iter(step.items()))
        if isinstance(params, str):
            params = {"selector": params} if action not in {"goto", "expect_text", "screenshot", "press"} else {"value": params}
        params = expand(params or {})
        selector = params.get("selector")

        if action == "goto":
            page.goto(params.get("value") or params["url"], wait_until=params.get("wait_until", "domcontentloaded"), timeout=self.timeout)
        elif action == "wait_for":
            page.wait_for_selector(selector, timeout=int(params.get("timeout_ms", self.timeout)))
        elif action == "wait_ms":
            time.sleep(int(params.get("value", 1000)) / 1000)
        elif action == "fill":
            page.fill(selector, str(params["value"]), timeout=self.timeout)
        elif action == "type":
            page.type(selector, str(params["value"]), delay=int(params.get("delay_ms", 40)), timeout=self.timeout)
        elif action == "select":
            page.select_option(selector, str(params["value"]), timeout=self.timeout)
        elif action == "check":
            page.check(selector, timeout=self.timeout)
        elif action == "uncheck":
            page.uncheck(selector, timeout=self.timeout)
        elif action == "upload":
            page.set_input_files(selector, str(params["path"]), timeout=self.timeout)
        elif action == "press":
            page.press(selector or "body", str(params.get("value", "Enter")), timeout=self.timeout)
        elif action == "screenshot":
            self._shot(page, str(params.get("value", "step")))
        elif action == "expect_text":
            if self.skipped_submit:
                log("DRY-RUN: pomijam weryfikacje potwierdzenia (nic nie wyslano)")
                return
            text = str(params.get("value") or params.get("text"))
            page.wait_for_selector(f"text={text}", timeout=int(params.get("timeout_ms", self.timeout)))
        elif action == "click":
            self._click(page, selector, params)
        else:
            raise ValueError(f"Nieznana akcja: {action}")

    def _click(self, page, selector: str, params: dict) -> None:
        is_submit = bool(params.get("submit"))
        if is_submit:
            self._shot(page, "before-submit")
            if self.target_ts:
                wait_until(self.target_ts)
            if self.dry_run:
                log(f"DRY-RUN: pomijam klikniecie {selector} (zgloszenie NIE zostalo wyslane)")
                self.skipped_submit = True
                return
        page.click(selector, timeout=self.timeout)
        if is_submit:
            self.report.submitted = True
            page.wait_for_load_state("networkidle", timeout=self.timeout)
            self._shot(page, "after-submit")

    # --- przebieg ---------------------------------------------------------
    def run(self) -> RunReport:
        browser_cfg = self.config.get("browser") or {}
        attempts = int((self.config.get("retries") or {}).get("attempts", 1))
        backoff = float((self.config.get("retries") or {}).get("backoff_seconds", 2))

        for attempt in range(1, attempts + 1):
            try:
                self._run_once(browser_cfg)
                self.report.status = "ok"
                break
            except Exception as exc:  # noqa: BLE001 - raport ma przetrwac kazdy blad
                self.report.error = f"{type(exc).__name__}: {exc}"
                log(f"proba {attempt}/{attempts} nieudana: {self.report.error}")
                if self.report.submitted:
                    log("zgloszenie zostalo juz wyslane - nie ponawiam")
                    self.report.status = "submitted_with_errors"
                    break
                if attempt == attempts:
                    self.report.status = "failed"
                else:
                    time.sleep(backoff * attempt)

        report_path = self.run_dir / "report.json"
        report_path.write_text(self.report.to_json(), encoding="utf-8")
        log(f"status: {self.report.status}; raport -> {report_path}")
        return self.report

    def _run_once(self, browser_cfg: dict) -> None:
        self.report.steps = []
        self.skipped_submit = False
        with sync_playwright() as pw:
            launch_kwargs = {
                "headless": browser_cfg.get("headless", True),
                "slow_mo": int(browser_cfg.get("slow_mo_ms", 0)),
            }
            # Przydatne, gdy Chromium jest juz w systemie i nie chcemy `playwright install`.
            executable = browser_cfg.get("executable_path") or os.environ.get("CHROMIUM_EXECUTABLE")
            if executable:
                launch_kwargs["executable_path"] = executable
            context_kwargs = {
                "locale": browser_cfg.get("locale", "pl-PL"),
                "timezone_id": browser_cfg.get("timezone", "Europe/Warsaw"),
                "viewport": {"width": 1440, "height": 900},
            }
            if browser_cfg.get("user_agent"):
                context_kwargs["user_agent"] = browser_cfg["user_agent"]

            profile = browser_cfg.get("user_data_dir")
            if profile:
                # trwaly profil = zachowane ciasteczka/sesja logowania miedzy uruchomieniami
                context = pw.chromium.launch_persistent_context(profile, **launch_kwargs, **context_kwargs)
                browser = None
            else:
                browser = pw.chromium.launch(**launch_kwargs)
                context = browser.new_context(**context_kwargs)

            context.set_default_timeout(self.timeout)
            page = context.new_page()
            try:
                if self.config.get("url"):
                    page.goto(self.config["url"], wait_until="domcontentloaded", timeout=self.timeout)
                for step in self.config.get("steps", []):
                    name = next(iter(step))
                    log(f"krok: {name} {json.dumps(step[name], ensure_ascii=False, default=str) if not isinstance(step[name], str) else step[name]}")
                    self._execute(page, step)
                    self.report.steps.append(name)
            except Exception:
                self._shot(page, "error")
                raise
            finally:
                context.close()
                if browser:
                    browser.close()


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Bot wypelniajacy i wysylajacy formularz o zadanej godzinie")
    parser.add_argument("config", help="sciezka do pliku YAML z konfiguracja")
    parser.add_argument("--dry-run", action="store_true", help="wypelnij formularz, ale NIE wysylaj")
    parser.add_argument("--now", action="store_true", help="zignoruj harmonogram i uruchom natychmiast")
    parser.add_argument("--headful", action="store_true", help="pokaz okno przegladarki")
    args = parser.parse_args(argv)

    config_path = Path(args.config)
    load_dotenv(config_path.parent / ".env")
    config = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}

    if args.headful:
        config.setdefault("browser", {})["headless"] = False
    if args.now:
        config["timing"] = {}

    bot = FormBot(config, dry_run=args.dry_run)
    if bot.target_ts:
        lead = float((config.get("timing") or {}).get("open_page_seconds_before", 60))
        wait_until(bot.target_ts - lead)
        log(f"otwieram strone {lead:.0f}s przed terminem")
    report = bot.run()
    return 0 if report.status == "ok" else 1


if __name__ == "__main__":
    sys.exit(main())
