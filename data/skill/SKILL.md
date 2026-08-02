---
name: ga4-business-toolkit
description: >
  Practical Google Analytics 4 (GA4) coach and quick-reference for learners and working analysts.
  Covers account/property/stream structure, dimensions vs metrics, key events, reports & Explore,
  scopes, attribution, UTMs/campaign tracking, advertising budgeting, cardinality/governance,
  BigQuery export & APIs, GA4 360, Consent Mode, Google Signals & Ads linking, Setup Assistant,
  recommended vs custom events, Enhanced Measurement, DebugView, User-ID, cross-domain measurement,
  predictive metrics, custom channel groups, and gtag.js vs GTM. Use whenever the user asks a GA4
  or Google Analytics question, wants help reading a GA4 screenshot, setting up tracking, explaining
  a concept to a colleague, or applying analytics to a marketing/business decision (attribution,
  budget, funnel drop-off, campaign tagging). Trigger even without the word "GA4" if they describe
  event tracking, conversions, UTMs, website analytics, or channel performance.
---

# GA4 Business Toolkit

This skill grounds answers for **GA4 Desk** (course + resource library + coach). Prefer these notes and the linked `reference/` files over generic model memory. Be concrete. Do not invent metrics, testimonials, or product claims. Treat numeric limits as last-known and offer to verify on support.google.com/analytics when stakes are high.

## How to answer

1. Answer directly — working answer first, lecture only if asked.
2. Frame with *how you’d use this at work*.
3. If a screenshot is provided: describe visible UI, map to concepts, give next click-path; do not invent labels that aren’t visible.
4. If the question needs depth beyond this file, read the matching `reference/*.md` file.
5. If material doesn’t cover the question, say so, then answer from general GA4 knowledge labeled clearly.

## Quick concept map

| Topic | File |
|---|---|
| Account → Property → Data stream | this file |
| Dimensions vs metrics | this file |
| Key events | this file |
| Scopes | this file |
| Reports & Explore / segments vs audiences | `reference/reports-and-exploration.md` |
| Attribution | `reference/attribution.md` |
| Campaign tracking & UTMs | `reference/campaign-tracking.md` |
| Data governance & cardinality | `reference/data-governance.md` |
| BigQuery export & APIs | `reference/bigquery-and-apis.md` |
| GA4 360 | `reference/ga360.md` |

## Core concepts

**Account → Property → Data stream**  
Account = company umbrella. Property = what you measure day-to-day. Data stream = web / iOS / Android feed into a property. One property can unify multiple streams.

*Business use:* separate brands/KPIs → separate properties; same users across web+app → multiple streams in one property.

**Dimensions vs metrics**  
Dimension = label (Country, Device). Metric = number (Sessions, Revenue). Every report pairs them.

*Business use:* “revenue by campaign” = metric Revenue × dimension Campaign.

**Key events**  
Flagging an event as a key event marks it as a business outcome (conversion). It doesn’t add tracking by itself.

*Business use:* align stakeholders on what “success” means before starring everything.

**Scopes**  
Custom dimensions/metrics attach at user, session, event, or item scope. Mismatched scope is a common cause of “weird numbers.”

*Business use:* “membership tier at purchase time” is often event-scoped; “current tier” may be user-scoped — different questions.

**Confirm tracking**  
Use **Realtime** (last ~30 minutes) right after tagging changes. Standard reports can lag 24–48 hours.

**Consent Mode**  
Denied consent doesn’t always mean zero collection — GA4 can switch to cookieless pings and modeled conversions. Configure with a CMP; don’t treat denied as “GA is off.”

**DebugView**  
Only shows devices explicitly in debug mode — empty DebugView usually means debug isn’t enabled, not that production tracking is dead.

**User-ID vs Google Signals**  
User-ID = your logged-in ID, deliberate implementation, strong cross-device stitching. Signals = Google-signed-in users with ads personalization; off by default; weaker/less controllable.

**Cross-domain**  
Without both domains listed in tag settings, a checkout hop starts a new session.

**gtag.js vs GTM**  
Both fire the Google tag. gtag.js = direct snippet. GTM = container for many tags/triggers without redeploying site code for every change.

**Enhanced measurement**  
Per web stream toggles for scroll, outbound click, site search, form interaction, video engagement, file download — no custom code for those basics.

**Predictive metrics**  
Purchase probability, churn probability, predicted revenue — require enough qualifying examples in ~28 days.

## Day-to-day patterns

- “Why did conversions drop?” → Acquisition + Explore funnel/path; check broad vs one-channel; verify tagging.
- “Which channel gets budget?” → Attribution model choice first (`reference/attribution.md`); attribution ≠ incrementality.
- “Combine three regional sites?” → Roll-up property (360) — `reference/ga360.md`.
- “Finance should only see a slice?” → Subproperty (360).
- “Warehouse dashboards?” → BigQuery export — `reference/bigquery-and-apis.md`.

## Honesty rules for the coach

- No invented case studies or fake screenshots.
- Demo account screenshots are from Google’s public Merchandise Store property.
- Practice exam ≠ official certification.
- When unsure about a current UI label or quota, say so.
