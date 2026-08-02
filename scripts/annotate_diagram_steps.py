#!/usr/bin/env python3
"""Annotate each concept diagram with explicit data-diag-step groups.

One choreography per diagram — no shared heuristic. Run:
  python3 scripts/annotate_diagram_steps.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DIAG_PATH = ROOT / "data" / "diagrams.json"

# Child indices after parsing (defs=0). Background full-bleed rects stay outside steps.
# Each step: (label, [child_index, ...])
FLOWS: dict[str, list[tuple[str, list[int]]]] = {
    "structure": [
        ("Title", [2, 3]),
        ("Account", [4, 5, 6, 7]),
        ("Branch to properties", [8, 9, 10, 11]),
        ("Properties", [12, 13, 14, 15, 16, 17, 18]),
        ("Branch to streams", [19, 20, 21, 22, 23]),
        ("Data streams", [24, 25, 26, 27, 28, 29, 30, 31, 32, 33]),
        ("Remember", [34, 35, 36, 37, 38, 39, 40, 41, 42]),
    ],
    "dimmetric": [
        ("What a report is", [1]),
        ("Header row", [2, 3, 4]),
        ("Row: /homepage", [5, 6, 7]),
        ("Row: /pricing", [8, 9, 10]),
        ("Row: /blog", [11, 12, 13]),
    ],
    "keyevents": [
        ("Event fires", [1, 2, 3]),
        ("Becomes a key event", [4, 5, 6, 7]),
        ("Counted as conversion", [8, 9, 10, 11]),
    ],
    "realtime": [
        ("Question", [1]),
        ("Realtime report", [2, 3, 4]),
        ("Standard reports", [5, 6, 7]),
    ],
    "explore": [
        ("Segment (Explore)", [1, 2, 3, 4, 5]),
        ("Audience (reusable)", [6, 7, 8, 9, 10]),
    ],
    "scopes": [
        ("User scope", [1, 2]),
        ("Session scope", [3, 4]),
        ("Event scope", [5, 6]),
    ],
    "attribution": [
        ("Same journey", [1]),
        ("Last click", [2, 3, 4, 5, 6]),
        ("First click", [7, 8, 9, 10, 11]),
        ("Linear", [12, 13, 14, 15, 16, 17, 18]),
        ("Data-driven", [19, 20, 21, 22, 23, 24, 25]),
        ("Takeaway", [26]),
    ],
    "utm": [
        ("Tagged link", [1, 2, 3]),
        ("utm_source", [4, 7]),
        ("utm_medium", [5, 8]),
        ("utm_campaign", [6, 9]),
    ],
    "advertising": [
        ("Title", [1]),
        ("Paid Search", [2, 3]),
        ("Paid Social", [4, 5]),
        ("Email", [6, 7]),
        ("Note", [8]),
    ],
    "cardinality": [
        ("Title", [1]),
        ("Many unique values", list(range(2, 17))),
        ("Collapsed into (other)", [17, 18, 19, 20]),
    ],
    "bigquery": [
        ("GA4 Property", [1, 2]),
        ("Export to BigQuery", [3, 4, 5, 6]),
        ("SQL & BI tools", [7, 8, 9, 10]),
    ],
    "ga360": [
        ("Subproperty path", [1, 2, 3]),
        ("Filtered subproperty", [4, 5, 6, 7, 8]),
        ("Roll-up sources", [9, 10, 11, 12, 13]),
        ("Combined roll-up", [14, 15, 16, 17, 18, 19]),
    ],
    "consent": [
        ("Title", [1]),
        ("Storage granted", [2, 3, 4]),
        ("Storage denied", [5, 6, 7]),
        ("Note", [8]),
    ],
    "signalsads": [
        ("Title", [1]),
        ("Devices", [2, 3, 4, 5, 6, 7]),
        ("Signals stitch", [8, 9, 10]),
        ("One user", [11, 12]),
        ("Requirements", [13]),
    ],
    "setupassist": [
        ("Checklist title", [1]),
        ("Streams & Signals", [2, 3, 4, 5]),
        ("Ads & Key events", [6, 7, 8, 9]),
        ("Import & BigQuery", [10, 11, 12, 13]),
    ],
    "eventparams": [
        ("Title", [1]),
        ("Event: purchase", [2, 3]),
        ("Parameters fan out", [4, 5, 6]),
        ("Parameter values", [7, 8, 9, 10, 11, 12]),
        ("Takeaway", [13]),
    ],
    "enhmeasure": [
        ("Enhanced measurement ON", [1, 2]),
        ("Auto events fan out", [3, 4, 5, 6, 7]),
        ("Event types", list(range(8, 18))),
        ("Takeaway", [18]),
    ],
    "debugview": [
        ("Device in debug mode", [1, 2, 3]),
        ("Events stream in", [4, 5, 6, 7]),
        ("DebugView timeline", [8, 9, 10, 11]),
        ("Note", [12]),
    ],
    "userid": [
        ("Phone session", [1, 2, 3]),
        ("Laptop session", [4, 5, 6]),
        ("Stitch by user_id", [7, 8, 9, 10, 11]),
        ("One user", [12, 13, 14]),
    ],
    "crossdomain": [
        ("siteA.com", [1, 2, 3]),
        ("Linker (?_gl=)", [4, 5]),
        ("siteB.com", [6, 7, 8]),
        ("Still one session", [9, 10, 11, 12]),
        ("Note", [13]),
    ],
    "predictive": [
        ("Predictive metrics", [1, 2, 3, 4, 5, 6]),
        ("Build audience", [7, 8, 9, 10, 11, 12]),
        ("Activate in Ads/Email", [13, 14, 15, 16]),
        ("Qualification note", [17]),
    ],
    "channelgroups": [
        ("Note", [13]),
        ("Default group", [1, 2, 3]),
        ("Custom group", [4, 5, 6]),
        ("Example channels", [7, 8, 9, 10, 11, 12]),
    ],
    "gtagvsgtm": [
        ("gtag.js", [1, 2, 3]),
        ("Google Tag Manager", [4, 5, 6]),
        ("Takeaway", [7]),
    ],
}


def fix_svg_text(svg: str) -> str:
    # Invalid raw <head> inside text content breaks XML
    return svg.replace("pasted in <head>", "pasted in &lt;head&gt;")


def local(tag: str) -> str:
    return tag.split("}")[-1] if "}" in tag else tag


def annotate(svg: str, steps: list[tuple[str, list[int]]]) -> str:
    svg = fix_svg_text(svg)
    # Drop xmlns so ElementTree doesn't prefix every tag
    had_ns = 'xmlns="http://www.w3.org/2000/svg"' in svg
    bare = svg.replace('xmlns="http://www.w3.org/2000/svg"', "", 1)
    root = ET.fromstring(bare)
    kids = list(root)
    for c in kids:
        root.remove(c)

    claimed: set[int] = set()
    for _, idxs in steps:
        for i in idxs:
            claimed.add(i)

    always_idxs: set[int] = set()
    always: list[ET.Element] = []
    for i, el in enumerate(kids):
        tag = local(el.tag)
        if tag == "defs":
            always_idxs.add(i)
            always.append(el)
            continue
        if tag == "rect" and i not in claimed:
            w = float(el.get("width") or 0)
            h = float(el.get("height") or 0)
            vb = (root.get("viewBox") or "0 0 720 400").split()
            vw, vh = float(vb[2]), float(vb[3])
            if w >= vw * 0.85 and h >= vh * 0.75:
                always_idxs.add(i)
                always.append(el)
                continue

    for el in always:
        root.append(el)

    for step_i, (label, idxs) in enumerate(steps, start=1):
        g = ET.Element("g")
        g.set("data-diag-step", str(step_i))
        g.set("data-diag-label", label)
        for i in idxs:
            if i < 0 or i >= len(kids):
                raise IndexError(f"step '{label}' bad index {i} (len={len(kids)})")
            g.append(kids[i])
        root.append(g)

    leftovers = ET.Element("g")
    leftovers.set("data-diag-step", str(len(steps) + 1))
    leftovers.set("data-diag-label", "More")
    for i, el in enumerate(kids):
        if i in claimed or i in always_idxs:
            continue
        leftovers.append(el)
    if len(leftovers):
        print(f"  WARN leftovers: {len(leftovers)} nodes")
        root.append(leftovers)

    out = ET.tostring(root, encoding="unicode")
    if had_ns:
        out = out.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ', 1)
    # Self-close empty fix not needed; keep pretty-ish newlines out
    return out


def main() -> int:
    data = json.loads(DIAG_PATH.read_text(encoding="utf-8"))
    missing = [k for k in data if k not in FLOWS]
    extra = [k for k in FLOWS if k not in data]
    if missing:
        raise SystemExit(f"Missing flows for: {missing}")
    if extra:
        raise SystemExit(f"Unknown flow keys: {extra}")

    out = {}
    for key, svg in data.items():
        # If already annotated, strip previous step groups back to flat children first
        if 'data-diag-step="' in svg:
            svg = flatten_steps(svg)
        out[key] = annotate(svg, FLOWS[key])
        n = out[key].count("data-diag-step=")
        print(f"OK  {key:16} {n} steps")

    DIAG_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {DIAG_PATH}")
    return 0


def flatten_steps(svg: str) -> str:
    """Unwrap prior data-diag-step groups so we can re-annotate cleanly."""
    svg = fix_svg_text(svg)
    had_ns = 'xmlns="http://www.w3.org/2000/svg"' in svg
    bare = svg.replace('xmlns="http://www.w3.org/2000/svg"', "", 1)
    root = ET.fromstring(bare)
    kids = list(root)
    for c in kids:
        root.remove(c)
    for el in kids:
        if local(el.tag) == "g" and el.get("data-diag-step"):
            for child in list(el):
                root.append(child)
        else:
            root.append(el)
    out = ET.tostring(root, encoding="unicode")
    if had_ns:
        out = out.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ', 1)
    return out


if __name__ == "__main__":
    raise SystemExit(main())
