"""Monitor selected public sources for the next intake. Python standard library only.

This produces review signals, never verified opportunities or eligibility decisions.
Personal browser progress is not read or transmitted.
"""
from __future__ import annotations
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from hashlib import sha256
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import urljoin, urlparse, urlunparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
TOPIC = re.compile(r"scholarship|sanctuary|humanitarian|palestin|bseisu|displaced|refugee|asylum|software|computing|computer science|master|postgraduate", re.I)
FUNDING_FOCUS = re.compile(r"sanctuary|humanitarian|palestin|bseisu|displaced|refugee|asylum", re.I)
OPENING = re.compile(r"(?:applications?|registration)\s+(?:(?:are|is)\s+)?(?:now\s+)?open\b|accepting\s+applications|apply\s+now", re.I)
CLOSED = re.compile(r"applications?\s+(?:(?:are|is)\s+)?(?:now\s+)?closed|no longer accept|deadline has passed|not (?:yet )?open|applications?\s+will\s+open", re.I)


def stamp():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def has_target_year(value, target_year):
    # 2026/2027 is a previous intake, even though its second year contains 2027.
    old_cycle = re.compile(rf"\b{target_year - 1}\s*[/–-]\s*(?:{target_year}|{target_year % 100:02d})\b")
    new_cycle = re.compile(rf"\b{target_year}\s*[/–-]\s*(?:{target_year + 1}|{(target_year + 1) % 100:02d})\b")
    if old_cycle.search(value) and not new_cycle.search(value):
        return False
    return bool(re.search(rf"\b{target_year}\b", old_cycle.sub("OLD_INTAKE", value)))


def clean_url(value):
    p = urlparse(value)
    if p.scheme != "https" or not p.netloc or p.username or p.password:
        return None
    # Keep query parameters: some universities identify awards with ?id=...
    return urlunparse(p._replace(fragment=""))


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ignored = 0
        self.ignore_tags = {"script", "style", "nav", "header", "footer", "noscript", "svg"}
        self.text = []
        self.links = []
        self.href = None
        self.anchor = []

    def handle_starttag(self, tag, attrs):
        if tag in self.ignore_tags:
            self.ignored += 1
        if self.ignored:
            return
        if tag == "a":
            self.href = dict(attrs).get("href")
            self.anchor = []
        if tag in {"p", "div", "li", "h1", "h2", "h3", "h4", "tr", "section", "br"}:
            self.text.append("\n")

    def handle_endtag(self, tag):
        if tag in self.ignore_tags:
            self.ignored = max(0, self.ignored - 1)
            return
        if self.ignored:
            return
        if tag == "a" and self.href:
            self.links.append((self.href, " ".join(self.anchor).strip()))
            self.href = None
        if tag in {"p", "div", "li", "h1", "h2", "h3", "h4", "tr", "section"}:
            self.text.append("\n")

    def handle_data(self, data):
        if not self.ignored:
            self.text.append(data + " ")
            if self.href:
                self.anchor.append(data)


def yearly_windows(text, target_year):
    """Require a year marker close to useful content, rather than a footer year."""
    parts = [re.sub(r"\s+", " ", p).strip() for p in text.split("\n") if p.strip()]
    windows = []
    for i, part in enumerate(parts):
        if has_target_year(part, target_year):
            nearby = " ".join(parts[max(0, i - 2):i + 3])
            if TOPIC.search(nearby) and has_target_year(nearby, target_year):
                windows.append(nearby[:1400])
    return sorted(set(windows))


def parse_snapshot(html, url, target_year):
    parser = Page()
    parser.feed(html)
    raw = "".join(parser.text)
    lines = [re.sub(r"\s+", " ", p).strip() for p in raw.split("\n") if p.strip()]
    relevant = [p for p in lines if TOPIC.search(p) or re.search(r"deadline|eligib|applications|\b2027\b|\b2028\b", p, re.I)]
    windows = yearly_windows(raw, target_year)
    signals = [p for p in windows if OPENING.search(p) and not CLOSED.search(p)]
    links = {}
    for href, label in parser.links:
        absolute = clean_url(urljoin(url, href))
        if absolute and TOPIC.search(label + " " + absolute):
            links[absolute] = re.sub(r"\s+", " ", label)[:200] or absolute
    return {
        "fingerprint": sha256("\n".join(relevant).encode()).hexdigest(),
        "signals": signals,
        "links": links,
        "yearContent": windows,
    }


def fetch_page(url):
    if not clean_url(url):
        raise ValueError("Only public HTTPS source links are supported")
    req = Request(url, headers={"User-Agent": "MastersOS/1.0 (personal postgraduate opportunity monitor)", "Accept": "text/html"})
    with urlopen(req, timeout=20) as response:
        content_type = response.headers.get("Content-Type", "")
        if "html" not in content_type.lower():
            raise ValueError("Source is not an HTML page; check it manually")
        data = response.read(2_000_001)
        if len(data) > 2_000_000:
            raise ValueError("Page exceeded the 2 MB monitoring limit")
        html = data.decode(response.headers.get_content_charset() or "utf-8", errors="replace")
        text = re.sub(r"<[^>]+>", " ", html)
        if re.search(r"verify you are human|just a moment|access denied|enable javascript and cookies|checking your browser", text, re.I) and len(text.strip()) < 15000:
            raise ValueError("Source blocked automated access; check it manually")
        return html


def make_event(source, kind, url, evidence, at):
    key = source["id"] + kind + url + evidence
    return {
        "id": sha256(key.encode()).hexdigest()[:24],
        "sourceId": source["id"], "title": source["title"], "kind": kind,
        "url": url, "detectedAt": at,
        "summary": evidence[:550] + " Verify the new-year dates, master's coverage and eligibility on the official page before applying.",
    }


def collect_events(source, previous, snapshot, target_year, at):
    events = []
    old_signals = previous.get("signals", []) if previous else []
    # On a first run, course openings already present in the catalogue are a baseline.
    # A scholarship with a new-year opening signal is still useful on the first run.
    for signal in snapshot["signals"]:
        if source['kind'] == 'scholarship' and source['type'] == 'directory' and not FUNDING_FOCUS.search(signal):
            continue
        if signal not in old_signals and (previous or source["kind"] == "scholarship"):
            events.append(make_event(source, "possible_opening", source["url"], signal, at))
    if previous and snapshot['yearContent'] != previous.get('yearContent', []) and snapshot['yearContent'] and not events and (source['kind'] == 'course' or source['type'] == 'detail' or any(FUNDING_FOCUS.search(p) for p in snapshot['yearContent'])):
        events.append(make_event(source, "page_changed", source["url"], "A page containing the target intake was updated. This may be a date or eligibility change, not an opening.", at))
        events[-1]["id"] = sha256((source["id"] + snapshot["fingerprint"]).encode()).hexdigest()[:24]
    if source["type"] == "directory":
        old_links = previous.get("links", {}) if previous else {}
        for url, label in snapshot["links"].items():
            # Never turn a generic new scholarship link into an opportunity automatically.
            # Require an explicit next-year marker in the label or URL for discovery alerts.
            if url not in old_links and has_target_year(label + ' ' + url, target_year) and (source['kind'] == 'course' or FUNDING_FOCUS.search(label + ' ' + url)):
                events.append(make_event(source, "new_link", url, f"New-year link discovered: {label}", at))
    return events


def run(config, report, fetcher=fetch_page):
    at = stamp()
    sources = dict(report.get("sources", {}))
    events = list(report.get("events", []))
    errors = []
    new_events = []
    target = int(config["targetYear"])

    def check(source):
        try:
            return source, parse_snapshot(fetcher(source["url"]), source["url"], target), None
        except Exception as exc:
            # Keep a human-readable error, without full headers, environment or credentials.
            return source, None, f"{type(exc).__name__}: {str(exc)[:180]}"

    with ThreadPoolExecutor(max_workers=4) as pool:
        for source, snapshot, error in pool.map(check, config["sources"]):
            if error:
                errors.append({"sourceId": source["id"], "title": source["title"], "message": error})
                continue
            previous = sources.get(source["id"])
            candidates = collect_events(source, previous, snapshot, target, at)
            existing = {e["id"] for e in events}
            for event in candidates:
                if event["id"] not in existing:
                    new_events.append(event)
                    events.append(event)
                    existing.add(event["id"])
            sources[source["id"]] = {"title": source["title"], "url": source["url"], "checkedAt": at, **snapshot}
    # Never convert errors into an "all clear" result or overwrite successful baselines.
    successful = len(config["sources"]) - len(errors)
    output = {"configured": True, "lastRun": at, "lastSuccessfulRun": at if successful else report.get("lastSuccessfulRun"), "sources": sources, "events": sorted(events, key=lambda e: e["detectedAt"], reverse=True)[:200], "errors": errors}
    return output, new_events


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=ROOT / "monitor-sources.json")
    parser.add_argument("--report", type=Path, default=ROOT / "public/data/monitor.json")
    parser.add_argument("--notifications", type=Path, default=ROOT / ".monitor-notifications.json")
    args = parser.parse_args()
    config = json.loads(args.config.read_text())
    old = json.loads(args.report.read_text()) if args.report.exists() else {}
    report, fresh = run(config, old)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    args.notifications.write_text(json.dumps(fresh, indent=2, ensure_ascii=False) + "\n")
    print(f"Checked {len(config['sources'])} sources: {len(fresh)} new review signals, {len(report['errors'])} fetch issues.")
    for error in report["errors"]:
        print(f"Manual check needed: {error['title']} — {error['message']}")
    if len(report["errors"]) == len(config["sources"]):
        raise SystemExit("All sources failed. Previous baselines were retained; no successful check is claimed.")


if __name__ == "__main__":
    main()
