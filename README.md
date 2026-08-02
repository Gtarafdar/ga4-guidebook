# GA4 Desk

Free **Google Analytics 4 guidebook** for [GitHub Pages](https://gtarafdar.github.io/ga4-guidebook/):

- **Course** — Learn → Gate (70%) → Unlock → Exam (80%); practice bank optional; local progress; read-aloud  
- **Video Academy** — Official Skillshop + Expert creators, always tagged  
- **Resources** — same material as a searchable library (no gating)  
- **Coach** — free local search + optional OpenRouter BYOK (skill-grounded)  
- **AI Skill** — downloadable `ga4-business-toolkit` for Claude, Cursor, and other IDEs  

Live site: **https://gtarafdar.github.io/ga4-guidebook/**  
Repo: **https://github.com/Gtarafdar/ga4-guidebook** — please ★ star if it helps  

Not affiliated with Google. Practice questions are original. Screenshots are from Google’s public [GA4 demo account](https://support.google.com/analytics/answer/6367342) (Merchandise Store). **Not Skillshop certification.**

## Quick start (local)

```bash
cd "Ga4 LMS"
python3 -m http.server 8000
```

Open http://localhost:8000

## Download the skill

- Zip: [`downloads/ga4-business-toolkit.zip`](downloads/ga4-business-toolkit.zip)  
- Alias: [`ga4-business-toolkit.skill`](ga4-business-toolkit.skill)  
- Details: [`skill/index.html`](skill/index.html)  

Rebuild after editing notes:

```bash
python3 scripts/pack_skill.py
```

## Course rules

1. Chapters unlock in order after you **pass that chapter’s Gate Quiz at 70%**.  
2. Gate questions are a **separate bank** (`data/gates.json`) — not the 494 practice questions.  
3. Practice tab stays available for drills anytime a chapter is unlocked.  
4. Timed exam (**40Q / 40min / 80%**) opens only after **all chapters are passed**.  
5. Progress is stored in `localStorage` as `ga4lms_progress_v2` (migrates soft visits from `v1`).

## GitHub Pages

1. Push to `Gtarafdar/ga4-guidebook`.  
2. Settings → Pages → Deploy from branch → `/` (root).  
3. Site URL: `https://gtarafdar.github.io/ga4-guidebook/`

Keep `index.html` at the repo root. Keep `.nojekyll`.

## Optional API keys (BYOK)

Stored only in the visitor’s browser `localStorage`:

| Feature | Provider | Notes |
|---|---|---|
| AI coach / screenshot help | [OpenRouter](https://openrouter.ai) | Enable in Coach settings. Prefer free models. |
| Nicer read-aloud | [ElevenLabs](https://elevenlabs.io) | Optional. Browser `speechSynthesis` is the free default. |

No shared paid keys are committed to this repo.

## Content pipeline

```bash
python3 scripts/extract_content.py   # rebuild data/topics.json + assets/screenshots from ga4-study-simulator.html
python3 scripts/enrich_topics.py     # re-apply Phase-1 enrichments on thin chapters
python3 scripts/annotate_diagram_steps.py
python3 scripts/pack_skill.py
python3 scripts/smoke_check.py
```

## Structure

```
index.html
skill/index.html
course/  academy/  resources/  coach/  settings/
downloads/ga4-business-toolkit.zip
assets/brand/  assets/illustrations/  assets/screenshots/
css/site.css
js/app.js  js/course.js  js/render.js  js/tts.js  js/coach.js …
data/…  data/skill/…
```

## Maker

[Gobinda Tarafdar](https://github.com/Gtarafdar) — [X](https://x.com/Gtarafdarr) · [LinkedIn](https://www.linkedin.com/in/gobinda-tarafdar/) · [Donate](https://gtarafdar.com/donate)

## License

Educational materials in this repo are free to use and share. Not affiliated with Google.
