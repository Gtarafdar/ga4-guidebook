# Reports & Exploration

Where to actually look depends on the question. This file maps question → tool.

## Realtime
Activity from roughly the last 30 minutes. Use it to confirm tracking just went live, or to watch a launch/campaign land — not for trend analysis, since the window is too short to be representative.

*Business use:* the first thing to check after any tagging change, before waiting a day for standard reports to populate.

## Standard reports (left-nav: Reports)
Pre-built, opinionated views (Acquisition, Engagement, Monetization, Retention) meant for a quick pulse-check, not deep investigation. They're fast to read but can't be freely reshaped — you're working within Google's chosen dimensions/metrics per report.

*Business use:* good for a recurring "how are we doing" glance or a screenshot for a status update. Not the tool for "why did this happen."

## Explore (left-nav: Explore)
The flexible, build-your-own-report workspace. Each exploration technique answers a different shape of question:

| Technique | Answers |
|---|---|
| Free form | Any custom dimension × metric table/chart — the general-purpose option |
| Funnel exploration | Where users drop off across an ordered sequence of steps |
| Path exploration | What users actually did next (or before) a given event, unordered |
| Segment overlap | How much two or three user segments overlap |
| Cohort exploration | How a group defined by a shared start date behaves over time (retention curves) |
| User lifetime | Value and behavior of users across their entire relationship with the property, not just one session |
| User explorer | Individual user-level activity timelines (careful with PII policy here) |

*Business use:* "why did conversions drop" is a funnel or path question. "Do our email subscribers behave differently than our ad-driven users" is a segment overlap question. "Are new users sticking around" is a cohort question. Naming the shape of the question tells you which exploration technique to reach for.

## Segments vs. audiences
A **segment** is a temporary filter applied inside one Exploration — it doesn't persist or sync anywhere else. An **audience** is a saved, reusable definition of a group of users that can also be exported to Google Ads for targeting/exclusion and used for remarketing.

*Business use:* if you're just slicing data for one analysis, use a segment. If you want to reuse the same group definition across reports or actually target/exclude them in ads, build an audience instead.

## Comparisons
A lighter-weight alternative to segments for standard reports — apply up to a handful of comparisons (e.g. two date ranges, two channels) directly on top of a standard report without leaving it or building an exploration.

*Business use:* "how does this month compare to last month" or "paid vs. organic side by side" without spinning up a full Exploration.