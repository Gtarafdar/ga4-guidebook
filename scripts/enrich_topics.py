#!/usr/bin/env python3
"""Enrich the five thinnest chapters with examples, simulations, and illustration refs."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOPICS = ROOT / "data" / "topics.json"

ENRICH = {
  "advertising": {
    "learn_extra": [
      "Advertising in GA4 is where acquisition credit meets budget conversations. The Advertising section and attribution reports redistribute the <strong>same</strong> conversions under different models — so two slides can disagree without either being 'broken tracking.'",
      "When a stakeholder asks which channel should get more spend, separate three ideas: (1) what GA4 attributed under the active model, (2) what last-click would have said, and (3) whether the conversion would have happened anyway (incrementality). GA4 helps with (1) and (2); it does not measure (3) by itself.",
      "Cross-channel reports only make sense if campaign tagging is consistent and Google Ads linking (when relevant) is healthy. Garbage UTMs in → misleading budget debates out."
    ],
    "example": "A retailer sees Paid Search 'winning' on last-click but Data-Driven Attribution giving more credit to Paid Social and Email early in the path. Neither report is lying — last-click overcredits the closer; DDA spreads credit. The useful move is a model comparison for the same date range before reallocating budget.",
    "simulation": [
      "Join the Google Merchandise Store demo property from Google’s help article.",
      "Open Advertising in the left navigation (snapshot / hub).",
      "Open an attribution or model comparison view if available in Explore or Advertising.",
      "Note how changing the model shifts channel rows without changing total conversions.",
      "Return here and answer the Advertising practice questions while the idea is fresh."
    ],
    "illustrations": [
      {"src": "assets/illustrations/advertising-attribution.png", "caption": "Same conversions, different credit by attribution model — educational illustration, not a GA4 screenshot.", "alt": "Diagram of last click vs first click vs data-driven credit"}
    ]
  },
  "scopes": {
    "learn_extra": [
      "Scope answers: <em>what is this value attached to?</em> An event-scoped dimension is true for that hit. A user-scoped dimension describes the person until it updates. Session scope sits in between. Item scope is for product line items in ecommerce hits.",
      "The classic failure mode: registering a value with the wrong scope, then joining it in a report and wondering why totals look inflated or blank. Scope mismatches are more often logic bugs than 'GA4 bugs.'"
    ],
    "example": "You want 'membership tier at the moment of purchase' and also 'current membership tier for the user.' Those are different analytical questions — many teams register both an event-scoped and a user-scoped dimension for related concepts rather than forcing one scope to do both jobs.",
    "simulation": [
      "In the demo property: Admin → Custom definitions.",
      "Find the Scope column on existing custom dimensions.",
      "Pick one dimension and ask: is this describing a hit, a visit, a person, or a product line?",
      "Avoid editing live demo definitions others share — observe only unless you’re experimenting carefully."
    ],
    "illustrations": [
      {"src": "assets/illustrations/scopes-nesting.png", "caption": "User ⊃ session ⊃ event nesting — educational illustration.", "alt": "Nested boxes showing user session event scopes"}
    ]
  },
  "key-events": {
    "learn_extra": [
      "A key event is a regular event with a star — GA4 then treats it as a conversion outcome in conversion-focused reports and for Ads optimization targets.",
      "You can mark multiple funnel stages (for example view_item, add_to_cart, purchase) as key events up to the property’s limit. That does not create new tracking; it only flags importance.",
      "If purchase isn’t firing, starring it won’t help — fix collection first (Realtime / DebugView), then mark it as key."
    ],
    "example": "Acme Retail marks purchase and generate_lead as key events. Marketing optimizes Ads toward purchase; the content team watches generate_lead as a mid-funnel outcome. Both appear as key events without renaming either into the other.",
    "simulation": [
      "Admin → Data streams → open the web stream.",
      "Open Events (or Key events, depending on UI wording in the demo).",
      "Find how events are listed and where a key/conversion mark would appear.",
      "Do not toggle production-critical settings on a shared demo — observe the control locations."
    ],
    "illustrations": [
      {"src": "assets/illustrations/key-events-flag.png", "caption": "Flagging an event as a key event marks outcomes — illustration.", "alt": "Event box becoming a key event"}
    ]
  },
  "explore": {
    "learn_extra": [
      "Standard reports answer recurring pulse questions. Explore answers one-off shapes: funnels, paths, cohort retention, segment overlap, free-form crosstabs.",
      "A <strong>segment</strong> lives inside an exploration. An <strong>audience</strong> is saved, reusable, and can sync to Google Ads. If you only need a temporary slice, don’t build an audience."
    ],
    "example": "Question: 'Where do users drop between add_to_cart and purchase?' That’s a Funnel exploration. Question: 'What did people do after viewing the shipping policy?' That’s Path exploration — not the same tool.",
    "simulation": [
      "Left nav → Explore.",
      "Open Template gallery and note Funnel, Path, Free form, Cohort, Segment overlap.",
      "Open any existing shared exploration (demo accounts often have leftovers from other learners).",
      "Create a free-form exploration only if you’re comfortable experimenting in a shared space."
    ],
    "illustrations": [
      {"src": "assets/illustrations/explore-segment-audience.png", "caption": "Segment (temporary) vs audience (saved) — illustration.", "alt": "Segment versus audience comparison"}
    ]
  },
  "dimensions-metrics": {
    "learn_extra": [
      "If you can group or filter by it, it’s usually a dimension. If you can sum or average it, it’s a metric. 'Average engagement time' sounds like a label but it’s a metric.",
      "Custom dimensions and metrics only apply from the moment they’re registered forward — no historical backfill."
    ],
    "example": "Stakeholder: 'Sessions from Instagram last month.' Metric = sessions (or users). Dimension/filter = session source/medium or campaign that identifies Instagram. Translate the ask before opening Explore.",
    "simulation": [
      "Reports → open any table report (for example Events or Traffic acquisition).",
      "Point to a row label — that’s a dimension value.",
      "Point to a numeric column — that’s a metric.",
      "Say out loud one stakeholder question as 'dimension X, metric Y.'"
    ],
    "illustrations": [
      {"src": "assets/illustrations/dimensions-metrics.png", "caption": "Dimensions are words; metrics are numbers — illustration.", "alt": "Dimensions versus metrics cards"}
    ]
  }
}


def main():
    topics = json.loads(TOPICS.read_text(encoding="utf-8"))
    for t in topics:
        extra = ENRICH.get(t["id"])
        if not extra:
            continue
        # append learn paragraphs not already present
        for p in extra.get("learn_extra", []):
            if p not in t["learn"]:
                t["learn"].append(p)
        if extra.get("example"):
            t["example"] = extra["example"]
        t["simulation"] = extra.get("simulation", [])
        t["illustrations"] = extra.get("illustrations", [])
        t["enriched"] = True
        print("enriched", t["id"], "learn=", len(t["learn"]), "sim=", len(t["simulation"]))
    TOPICS.write_text(json.dumps(topics, ensure_ascii=False, indent=2), encoding="utf-8")
    print("done")


if __name__ == "__main__":
    main()
