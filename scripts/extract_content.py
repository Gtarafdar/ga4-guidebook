#!/usr/bin/env python3
"""Extract topics, screenshots, diagrams, cheatsheet, videos from ga4-study-simulator.html."""
from __future__ import annotations

import base64
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "ga4-study-simulator.html"
OUT_TOPICS = ROOT / "data" / "topics.json"
OUT_META = ROOT / "data" / "meta.json"
SHOT_DIR = ROOT / "assets" / "screenshots"
DIAG_DIR = ROOT / "assets" / "diagrams"


def extract_bracket_block(src: str, start_marker: str) -> str:
    i = src.find(start_marker)
    if i < 0:
        raise ValueError(f"marker not found: {start_marker}")
    bracket = src.find("[", i)
    depth = 0
    for j in range(bracket, len(src)):
        if src[j] == "[":
            depth += 1
        elif src[j] == "]":
            depth -= 1
            if depth == 0:
                return src[bracket : j + 1]
    raise ValueError("unclosed [")


def extract_brace_object(src: str, start_marker: str) -> str:
    i = src.find(start_marker)
    if i < 0:
        raise ValueError(f"marker not found: {start_marker}")
    brace = src.find("{", i)
    depth = 0
    in_str = False
    quote = ""
    esc = False
    for j in range(brace, len(src)):
        c = src[j]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == quote:
                in_str = False
            continue
        if c in "\"'`":
            in_str = True
            quote = c
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return src[brace : j + 1]
    raise ValueError("unclosed {")


def split_top_level_objects(array_src: str) -> list[str]:
    """Split `[ {..}, {..} ]` into object strings."""
    inner = array_src.strip()
    if inner.startswith("["):
        inner = inner[1:]
    if inner.endswith("]"):
        inner = inner[:-1]
    objs = []
    depth = 0
    start = None
    in_str = False
    quote = ""
    esc = False
    for j, c in enumerate(inner):
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == quote:
                in_str = False
            continue
        if c in "\"'`":
            in_str = True
            quote = c
            continue
        if c == "{":
            if depth == 0:
                start = j
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0 and start is not None:
                objs.append(inner[start : j + 1])
                start = None
    return objs


def parse_string_field(obj: str, name: str) -> str | None:
    m = re.search(rf'{name}:\s*"((?:[^"\\]|\\.)*)"', obj)
    if not m:
        return None
    return bytes(m.group(1), "utf-8").decode("unicode_escape")


def parse_string_array(obj: str, name: str) -> list[str]:
    m = re.search(rf"{name}:\s*\[([\s\S]*?)\]\s*,", obj)
    if not m:
        # try end of object
        m = re.search(rf"{name}:\s*\[([\s\S]*?)\]\s*\}}", obj)
    if not m:
        return []
    body = m.group(1)
    return [bytes(s, "utf-8").decode("unicode_escape") for s in re.findall(r'"((?:[^"\\]|\\.)*)"', body)]


def parse_faq(obj: str) -> list[dict]:
    m = re.search(r"faq:\s*\[([\s\S]*?)\]\s*,\s*\n\s*resources:", obj)
    if not m:
        m = re.search(r"faq:\s*\[([\s\S]*?)\]\s*,\s*\n\s*questions:", obj)
    if not m:
        return []
    items = []
    for qm, am in re.findall(
        r'\{q:\s*"((?:[^"\\]|\\.)*)"\s*,\s*a:\s*"((?:[^"\\]|\\.)*)"\}', m.group(1)
    ):
        items.append(
            {
                "q": bytes(qm, "utf-8").decode("unicode_escape"),
                "a": bytes(am, "utf-8").decode("unicode_escape"),
            }
        )
    return items


def parse_resources(obj: str) -> list[dict]:
    m = re.search(r"resources:\s*\[([\s\S]*?)\]\s*,\s*\n\s*questions:", obj)
    if not m:
        return []
    items = []
    for t, u in re.findall(
        r'\{t:\s*"((?:[^"\\]|\\.)*)"\s*,\s*u:\s*"((?:[^"\\]|\\.)*)"\}', m.group(1)
    ):
        items.append(
            {
                "t": bytes(t, "utf-8").decode("unicode_escape"),
                "u": bytes(u, "utf-8").decode("unicode_escape"),
            }
        )
    return items


def parse_questions(obj: str) -> list[dict]:
    m = re.search(r"questions:\s*\[([\s\S]*)", obj)
    if not m:
        return []
    body = m.group(1)
    # trim trailing ]}
    questions = []
    for match in re.finditer(
        r'\{q:\s*"((?:[^"\\]|\\.)*)"\s*,\s*o:\[([\s\S]*?)\]\s*,\s*c:(\d+)\s*,\s*e:\s*"((?:[^"\\]|\\.)*)"\}',
        body,
    ):
        opts = [bytes(o, "utf-8").decode("unicode_escape") for o in re.findall(r'"((?:[^"\\]|\\.)*)"', match.group(2))]
        questions.append(
            {
                "q": bytes(match.group(1), "utf-8").decode("unicode_escape"),
                "o": opts,
                "c": int(match.group(3)),
                "e": bytes(match.group(4), "utf-8").decode("unicode_escape"),
            }
        )
    return questions


def extract_screenshots(obj: str, topic_id: str) -> list[dict]:
    shots = []
    for i, m in enumerate(
        re.finditer(
            r'\{\s*src:\s*"(data:image/(jpeg|png|webp|gif);base64,([A-Za-z0-9+/=]+))"\s*,\s*caption:\s*"((?:[^"\\]|\\.)*)"\s*,\s*alt:\s*"((?:[^"\\]|\\.)*)"\s*\}',
            obj,
        )
    ):
        ext = "jpg" if m.group(2) == "jpeg" else m.group(2)
        fname = f"{topic_id}-{i+1}.{ext}"
        path = SHOT_DIR / fname
        raw = base64.b64decode(m.group(3))
        path.write_bytes(raw)
        shots.append(
            {
                "src": f"assets/screenshots/{fname}",
                "caption": bytes(m.group(4), "utf-8").decode("unicode_escape"),
                "alt": bytes(m.group(5), "utf-8").decode("unicode_escape"),
            }
        )
    return shots


def extract_diagram_ref(obj: str) -> str | None:
    m = re.search(r"diagram:\s*DIAGRAMS\.([a-zA-Z0-9_]+)", obj)
    return m.group(1) if m else None


def extract_diagrams(html: str) -> dict[str, str]:
    """Extract DIAGRAMS key -> svg html string (best effort)."""
    m = re.search(r"const DIAGRAMS\s*=\s*\{", html)
    if not m:
        return {}
    # Find matching close — hard with nested braces in templates; use key pattern
    start = m.end()
    # Grab until `\n};\n\n// Confirmed` or similar
    end_m = re.search(r"\n\};\n\n// Confirmed", html[start:])
    if not end_m:
        end_m = re.search(r"\n\};\nconst PLAYLIST", html[start:])
    if not end_m:
        return {}
    body = html[start : start + end_m.start()]
    diagrams = {}
    # keys like structure: svgWrap(`...`),
    for km in re.finditer(r"(\w+):\s*svgWrap\(`", body):
        key = km.group(1)
        i = km.end()
        # find closing `),  or `)\n
        # template may contain ${...}
        j = i
        while j < len(body):
            if body[j] == "`" and (j + 1 >= len(body) or body[j + 1] in "),"):
                # check it's end of svgWrap
                rest = body[j : j + 20]
                if rest.startswith("`)"):
                    diagrams[key] = body[i:j]
                    break
            j += 1
    return diagrams


def extract_cheatsheet(html: str) -> list[str]:
    m = re.search(r"const CHEATSHEET\s*=\s*\[([\s\S]*?)\];", html)
    if not m:
        return []
    return [bytes(s, "utf-8").decode("unicode_escape") for s in re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(1))]


def extract_videos(html: str) -> dict:
    m = re.search(r"const CONFIRMED_VIDEOS\s*=\s*\{([\s\S]*?)\};", html)
    if not m:
        return {}
    videos = {}
    for tid, vid, title in re.findall(
        r'"([^"]+)":\s*\{\s*id:\s*"([^"]+)"\s*,\s*title:\s*"((?:[^"\\]|\\.)*)"\s*\}',
        m.group(1),
    ):
        videos[tid] = {
            "id": vid,
            "title": bytes(title, "utf-8").decode("unicode_escape"),
        }
    return videos


def main() -> int:
    SHOT_DIR.mkdir(parents=True, exist_ok=True)
    DIAG_DIR.mkdir(parents=True, exist_ok=True)
    html = HTML.read_text(encoding="utf-8", errors="replace")

    topics_src = extract_bracket_block(html, "const topics = [")
    objects = split_top_level_objects(topics_src)
    print(f"Found {len(objects)} topic objects")

    topics = []
    for obj in objects:
        tid = parse_string_field(obj, "id")
        title = parse_string_field(obj, "title")
        if not tid or not title:
            print("skip object missing id/title", file=sys.stderr)
            continue
        shots = extract_screenshots(obj, tid)
        # strip base64 from learn parsing by removing screenshot blocks first
        obj_clean = re.sub(
            r'screenshots:\s*\[[\s\S]*?\],\s*\n\s*learn:',
            "screenshots: [],\n    learn:",
            obj,
            count=1,
        )
        topic = {
            "id": tid,
            "title": title,
            "tldr": parse_string_field(obj_clean, "tldr") or "",
            "plain": parse_string_field(obj_clean, "plain") or "",
            "diagram": extract_diagram_ref(obj),
            "screenshots": shots,
            "learn": parse_string_array(obj_clean, "learn"),
            "example": parse_string_field(obj_clean, "example") or "",
            "quickWins": parse_string_array(obj_clean, "quickWins"),
            "faq": parse_faq(obj_clean),
            "resources": parse_resources(obj_clean),
            "questions": parse_questions(obj_clean),
            "illustrations": [],
            "simulation": [],
            "enriched": False,
        }
        topics.append(topic)
        print(f"  {tid}: {len(topic['learn'])} paras, {len(topic['questions'])} Qs, {len(shots)} shots")

    # Diagrams — save raw template content as notes; site will rebuild simple SVG from topic data
    diagrams = extract_diagrams(html)
    print(f"Diagrams extracted: {len(diagrams)}")
    for k, v in diagrams.items():
        (DIAG_DIR / f"{k}.svg.txt").write_text(v, encoding="utf-8")

    OUT_TOPICS.parent.mkdir(parents=True, exist_ok=True)
    OUT_TOPICS.write_text(json.dumps(topics, ensure_ascii=False, indent=2), encoding="utf-8")

    meta = {
        "cheatsheet": extract_cheatsheet(html),
        "videos": extract_videos(html),
        "playlistUrl": "https://www.youtube.com/playlist?list=PLI5YfMzCfRtZNBRmhTEJkcHYvN_x_wpxM",
        "videoHubUrl": "https://support.google.com/analytics/answer/13284728",
        "demoJoinUrl": "https://support.google.com/analytics/answer/6367342",
        "exam": {"numQuestions": 40, "timeLimitMin": 40, "passPercent": 80},
        "topicCount": len(topics),
        "questionCount": sum(len(t["questions"]) for t in topics),
    }
    OUT_META.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_TOPICS} ({OUT_TOPICS.stat().st_size // 1024} KB)")
    print(f"Wrote {OUT_META}")
    print(f"Screenshots in {SHOT_DIR}: {len(list(SHOT_DIR.glob('*')))} files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
