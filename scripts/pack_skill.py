#!/usr/bin/env python3
"""Rebuild downloads/ga4-business-toolkit.zip (+ .skill) from data/skill/."""
from __future__ import annotations

import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "skill"
OUT_DIR = ROOT / "downloads"
ZIP_PATH = OUT_DIR / "ga4-business-toolkit.zip"
SKILL_ALIAS = ROOT / "ga4-business-toolkit.skill"
INNER = "ga4-business-toolkit"


def main() -> int:
    if not (SRC / "SKILL.md").exists():
        raise SystemExit("missing data/skill/SKILL.md")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if ZIP_PATH.exists():
        ZIP_PATH.unlink()
    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in SRC.rglob("*"):
            if path.is_file():
                arc = f"{INNER}/{path.relative_to(SRC).as_posix()}"
                zf.write(path, arc)
    shutil.copyfile(ZIP_PATH, SKILL_ALIAS)
    print(f"Wrote {ZIP_PATH.relative_to(ROOT)} and {SKILL_ALIAS.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
