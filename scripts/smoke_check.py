#!/usr/bin/env python3
"""Regression smoke check for GA4 Desk — run after every upgrade phase."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ERRORS: list[str] = []


def ok(msg: str) -> None:
    print("OK ", msg)


def fail(msg: str) -> None:
    ERRORS.append(msg)
    print("FAIL", msg)


def load(rel: str):
    p = ROOT / rel
    if not p.exists():
        fail(f"missing file {rel}")
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        fail(f"invalid JSON {rel}: {e}")
        return None


def main() -> int:
    topics = load("data/topics.json")
    meta = load("data/meta.json")
    diagrams = load("data/diagrams.json")
    refs = load("data/references.json")

    if topics is None or meta is None or diagrams is None:
        return 1

    if len(topics) != 23:
        fail(f"expected 23 topics, got {len(topics)}")
    else:
        ok("23 topics")

    qn = sum(len(t.get("questions") or []) for t in topics)
    if qn != 494:
        fail(f"expected 494 practice questions, got {qn}")
    else:
        ok("494 practice questions")

    if len(diagrams) < 23:
        fail(f"expected >=23 diagrams, got {len(diagrams)}")
    else:
        ok(f"{len(diagrams)} diagrams")

    unstepped = [k for k, svg in diagrams.items() if "data-diag-step=" not in (svg or "")]
    if unstepped:
        fail(f"diagrams missing animation steps: {unstepped[:5]}")
    else:
        ok("diagram step choreography present")

    shot_dir = ROOT / "assets" / "screenshots"
    shots = list(shot_dir.glob("*.jpg")) + list(shot_dir.glob("*.png"))
    if len(shots) < 30:
        fail(f"expected >=30 screenshots, got {len(shots)}")
    else:
        ok(f"{len(shots)} screenshots")

    # asset paths referenced by topics
    missing_assets = 0
    for t in topics:
        for s in t.get("screenshots") or []:
            src = s.get("src") or ""
            if src and not (ROOT / src).exists():
                missing_assets += 1
                if missing_assets <= 5:
                    fail(f"missing screenshot {src}")
        for s in t.get("illustrations") or []:
            src = s.get("src") or ""
            if src and not (ROOT / src).exists():
                missing_assets += 1
                if missing_assets <= 8:
                    fail(f"missing illustration {src}")
    if missing_assets == 0:
        ok("topic media paths exist")

    for rel in [
        "index.html",
        "course/index.html",
        "resources/index.html",
        "coach/index.html",
        "settings/index.html",
        "skill/index.html",
        "downloads/ga4-business-toolkit.zip",
        "assets/brand/og-image.png",
        "assets/brand/favicon.ico",
        "robots.txt",
        "sitemap.xml",
        "js/app.js",
        "js/render.js",
        "js/tts.js",
        "js/diagrams-animate.js",
        "js/coach.js",
        "css/site.css",
        "data/skill/SKILL.md",
        ".nojekyll",
    ]:
        if (ROOT / rel).exists():
            ok(rel)
        else:
            fail(f"missing {rel}")

    # brand + skill packaging
    if (ROOT / "scripts" / "pack_skill.py").exists():
        ok("scripts/pack_skill.py")
    else:
        fail("missing scripts/pack_skill.py")

    # optional upgrade artifacts (warn via fail only if gates present but invalid)
    gates_path = ROOT / "data" / "gates.json"
    if gates_path.exists():
        gates = load("data/gates.json")
        if gates:
            ids = {t["id"] for t in topics}
            for tid, bank in gates.items():
                if tid not in ids:
                    fail(f"gates.json unknown topic {tid}")
                qs = bank.get("questions") if isinstance(bank, dict) else bank
                if not qs or len(qs) < 8:
                    fail(f"gate bank {tid} needs >=8 questions")
            ok(f"gates.json covers {len(gates)} topics")

    stories_path = ROOT / "data" / "stories.json"
    if stories_path.exists():
        stories = load("data/stories.json")
        if stories and len(stories) < 23:
            fail(f"stories.json expected 23, got {len(stories)}")
        elif stories:
            ok(f"stories.json {len(stories)}")

    if (ROOT / "academy" / "index.html").exists():
        ok("academy/index.html")

    # illustrations from meta
    if meta.get("illustrations"):
        ill_miss = 0
        for tid, items in meta["illustrations"].items():
            for item in items:
                src = item.get("src") if isinstance(item, dict) else item
                if src and not (ROOT / src).exists():
                    ill_miss += 1
                    fail(f"missing illustration {src}")
        if ill_miss == 0:
            ok(f"meta illustrations {len(meta['illustrations'])} topics")

    course_js = ROOT / "js" / "course.js"
    if course_js.exists():
        ok("js/course.js")
    else:
        fail("missing js/course.js")

    if refs is not None:
        ok(f"references {len(refs)}")

    print("---")
    if ERRORS:
        print(f"{len(ERRORS)} failure(s)")
        return 1
    print("ALL CHECKS PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
