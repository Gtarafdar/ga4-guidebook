# BigQuery Export & APIs

How to get GA4 data out of the UI and into a warehouse, dashboard tool, or custom pipeline.

## BigQuery export
Free on standard GA4 properties (not just GA4 360) — a meaningful difference from Universal Analytics, where warehouse export was a paid-only feature. Two export modes:

| Mode | Behavior |
|---|---|
| Daily (batch) | One full table per day (`events_YYYYMMDD`), typically available within a day; free tier caps around 1M events/day, and a property that consistently exceeds the cap gets its daily export paused |
| Streaming | Near-real-time rows land within minutes via an intraday table (`events_intraday_YYYYMMDD`); no event-count cap, but data can have gaps and incomplete attribution since it hasn't been fully processed yet |

GA4 360 adds a third mode, **fresh daily**, that delivers a more complete daily table earlier (commonly by early morning) with intra-day batched updates — useful for teams that want daily-table completeness without waiting the full day.

*Business use:* if a data team wants same-day dashboards, they're choosing between "get it fast but slightly rough" (streaming) and "get it complete but delayed" (daily) — that's a real tradeoff to make explicit with them up front, not an oversight to fix.

## BigQuery cost model
Google Cloud (not GA4) bills for BigQuery usage past its own free tier — commonly around 10 GB of active storage and 1 TB of query processing per month per billing account. GA4 export itself has no separate licensing fee on standard properties; the cost exposure is standard GCP storage/compute.

*Business use:* if someone's worried BigQuery export is expensive, clarify that GA4's export is free — the cost, if any, is normal cloud storage/query spend on GCP, which is worth estimating with a data engineer before committing to heavy exploration in BigQuery.

## Data API vs. Admin API
The **Data API** retrieves report-style data (dimensions/metrics, similar to what you'd pull from the UI) programmatically — for custom dashboards, scheduled exports, or feeding data into another tool that doesn't natively integrate with GA4. The **Admin API** manages property configuration itself (custom dimensions, data streams, conversion events, access bindings) — for automating setup/governance rather than pulling report data.

*Business use:* "build me a live dashboard of GA4 metrics in [tool]" is a Data API integration; "programmatically roll out the same custom dimension across 40 properties" is an Admin API task. Naming which one you need early saves a wrong-tool detour.