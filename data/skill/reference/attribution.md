# Attribution

Attribution decides which touchpoint(s) get credit when a conversion happens. This is a modeling choice, not a fact — different models will show different "top channels" from the exact same underlying data.

## The default model
GA4's default reporting attribution model is **data-driven attribution (DDA)**, which distributes credit across touchpoints in a conversion path based on modeled contribution, rather than crediting one single touchpoint. It only applies to paid and organic channels together (cross-channel).

*Business use:* if someone asks "why does GA4 show a different top channel than our old last-click spreadsheet," the answer is very often just "different attribution model, same data."

## Other models available
Rule-based alternatives (last click, first click, linear, time decay, position-based) are still selectable for comparison, mainly through the Advertising > Attribution > Model comparison tool, even though DDA is the default for standard reports.

*Business use:* use model comparison when a stakeholder is anchored on last-click reporting from a legacy tool — show them the same conversions under a couple of models side by side rather than arguing abstractly about which model is "right." There usually isn't a single right answer; the point is to pick a consistent model and understand its bias.

## Lookback windows
Attribution only looks back a limited number of days from the conversion to find eligible touchpoints — commonly a 30-day window for acquisition events and a longer window (up to 90 days) for other conversion events, configurable in Admin > Attribution settings.

*Business use:* a long sales cycle (B2B, big-ticket purchases) can outlast the default lookback window entirely, meaning real influencing touchpoints get silently excluded from credit. Worth checking this setting before trusting attribution numbers for a long-consideration product.

## Reading channel-level attribution responsibly
Attribution answers "which channels contributed" — it doesn't answer "which channel should get more budget" on its own. Budget decisions also need incrementality thinking (would this conversion have happened anyway without this touchpoint), which attribution models don't measure.

*Business use:* treat attribution output as one input to a budget conversation, not the full answer — pair it with holdout tests or incrementality studies for high-stakes reallocation decisions.