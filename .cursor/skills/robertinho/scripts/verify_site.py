#!/usr/bin/env python3
"""Verify a built site: screenshots plus automatic quality checks.

Runs against a server that is already up (use webapp-testing's with_server.py
to start it). For each path and viewport width it saves a full-page screenshot
and checks console errors, horizontal overflow, images without alt, links and
buttons without an accessible name, WCAG AA text contrast, visible keyboard
focus, and forbidden terms (brand names or fonts from the references).

Writes report.json to --out, prints a summary, and exits 1 if any check fails.

Usage:
  verify_site.py --url http://localhost:5173 --path / --path /sobre \
    --out docs/sites/meu-site/verificacao/rodada-1 \
    --forbid "Cine Tutu" --forbid Tenez
"""

import argparse
import json
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

MAX_TABS = 20
MAX_ITEMS = 15

CHECKS_JS = r"""
() => {
  const visible = (el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && r.height > 0;
  };
  const describe = (el) => {
    const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('src') || '').trim().slice(0, 40);
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (text ? ` "${text}"` : '');
  };
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return {r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1};
  };
  const lum = ({r, g, b}) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const blend = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1,
  });
  const background = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== 'none') return null;
      const c = parse(s.backgroundColor);
      if (c && c.a > 0) return c.a < 1 ? blend(c, {r: 255, g: 255, b: 255, a: 1}) : c;
    }
    return {r: 255, g: 255, b: 255, a: 1};
  };

  const contrast = [];
  const seen = new Set();
  for (const el of document.body.querySelectorAll('*')) {
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!hasText || !visible(el)) continue;
    const s = getComputedStyle(el);
    const bg = background(el);
    const fg = parse(s.color);
    if (!bg || !fg) continue;
    const c = blend(fg, bg);
    const [l1, l2] = [lum(c), lum(bg)].sort((a, b) => b - a);
    const ratio = (l1 + 0.05) / (l2 + 0.05);
    const size = parseFloat(s.fontSize);
    const large = size >= 24 || (size >= 18.66 && parseInt(s.fontWeight) >= 700);
    const min = large ? 3 : 4.5;
    const key = describe(el);
    if (ratio < min && !seen.has(key)) {
      seen.add(key);
      contrast.push(`${key}: ${ratio.toFixed(2)}:1 (mínimo ${min}:1)`);
    }
  }

  const fonts = new Set();
  for (const el of document.body.querySelectorAll('*')) {
    if (visible(el)) fonts.add(getComputedStyle(el).fontFamily);
  }

  return {
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1
      ? `${document.documentElement.scrollWidth}px de conteúdo em ${window.innerWidth}px de viewport` : null,
    imagesWithoutAlt: [...document.querySelectorAll('img:not([alt])')].map(describe),
    unnamedControls: [...document.querySelectorAll('a[href], button, [role=button]')]
      .filter((el) => visible(el) && !(el.innerText || '').trim() && !el.getAttribute('aria-label')
        && !el.getAttribute('aria-labelledby') && !el.getAttribute('title')
        && !el.querySelector('img[alt]:not([alt=""]), svg title'))
      .map(describe),
    contrast,
    fonts: [...fonts],
    text: document.body.innerText,
  };
}
"""

FOCUS_JS = r"""
() => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const s = getComputedStyle(el);
  const outline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
  const shadow = s.boxShadow && s.boxShadow !== 'none';
  const text = (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 40);
  return {id: el.tagName.toLowerCase() + (text ? ` "${text}"` : ''), visible: outline || shadow};
}
"""


def slugify(path):
    return re.sub(r"[^a-z0-9]+", "-", path.lower()).strip("-") or "home"


def check_focus(page):
    missing, seen = [], set()
    for _ in range(MAX_TABS):
        page.keyboard.press("Tab")
        info = page.evaluate(FOCUS_JS)
        if not info or info["id"] in seen:
            if info:
                break
            continue
        seen.add(info["id"])
        if not info["visible"]:
            missing.append(info["id"])
    return missing


def run_case(browser, url, path, width, out, forbid):
    page = browser.new_page(viewport={"width": width, "height": 900})
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(url.rstrip("/") + path)
    page.wait_for_load_state("networkidle")

    shot = out / f"{slugify(path)}-{width}.png"
    page.screenshot(path=str(shot), full_page=True)
    data = page.evaluate(CHECKS_JS)
    focus = check_focus(page)
    page.close()

    haystack = data["text"].lower() + "\n" + "\n".join(data["fonts"]).lower()
    found = [t for t in forbid if t.lower() in haystack]

    checks = {
        "console_errors": errors[:MAX_ITEMS],
        "horizontal_overflow": [data["overflow"]] if data["overflow"] else [],
        "images_without_alt": data["imagesWithoutAlt"][:MAX_ITEMS],
        "unnamed_controls": data["unnamedControls"][:MAX_ITEMS],
        "low_contrast": data["contrast"][:MAX_ITEMS],
        "focus_not_visible": focus[:MAX_ITEMS],
        "forbidden_terms": found,
    }
    return {
        "path": path,
        "width": width,
        "screenshot": str(shot),
        "fonts": data["fonts"],
        "checks": checks,
        "passed": not any(checks.values()),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default="http://localhost:5173")
    parser.add_argument("--path", action="append", default=[], help="page path, repeatable (default /)")
    parser.add_argument("--width", action="append", type=int, default=[], help="viewport width, repeatable (default 1440 and 390)")
    parser.add_argument("--forbid", action="append", default=[], help="term that must not appear in text or fonts, repeatable")
    parser.add_argument("--out", required=True, help="output folder for screenshots and report.json")
    args = parser.parse_args()

    paths = args.path or ["/"]
    widths = args.width or [1440, 390]
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        results = [run_case(browser, args.url, path, w, out, args.forbid) for path in paths for w in widths]
        browser.close()

    report = {"url": args.url, "passed": all(r["passed"] for r in results), "results": results}
    (out / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))

    for r in results:
        status = "OK" if r["passed"] else "FALHOU"
        print(f"[{status}] {r['path']} @ {r['width']}px -> {r['screenshot']}")
        for name, items in r["checks"].items():
            for item in items:
                print(f"    {name}: {item}")
    print(f"\nRelatório: {out / 'report.json'}")
    sys.exit(0 if report["passed"] else 1)


if __name__ == "__main__":
    main()
