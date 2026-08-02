# Campaign Tracking & UTMs

How GA4 knows where a session came from, and how to make sure it knows correctly.

## UTM parameters
Five standard URL parameters carry campaign context into GA4:

| Parameter | Populates | Required? |
|---|---|---|
| `utm_source` | Source | Yes |
| `utm_medium` | Medium | Yes |
| `utm_campaign` | Campaign name | Recommended |
| `utm_term` | Term (paid search keyword) | Optional |
| `utm_content` | Content (A/B creative variant) | Optional |

*Business use:* source/medium is what drives channel grouping (see below), so getting these two right on every outbound link — newsletter, social bio link, partner site, paid ad — matters more than the optional two.

## Auto-tagging vs. manual tagging
Google Ads uses **auto-tagging** (a `gclid` parameter appended automatically) rather than UTMs, and GA4 reads that to populate source/medium as `google / cpc` with richer detail (campaign, ad group, keyword) than manual UTMs alone provide. Don't manually UTM-tag Google Ads links — it can conflict with or override the richer auto-tagged data. Everything else (email, social, partner links, other ad platforms) needs manual UTM tagging via a URL builder.

*Business use:* if Google Ads traffic looks oddly attributed, check whether someone manually added UTMs on top of auto-tagging — that's the most common cause.

## Channel grouping
GA4 buckets every session into a **Default channel group** (Organic Search, Paid Search, Organic Social, Paid Social, Email, Referral, Direct, etc.) based on source/medium/campaign values using Google's built-in rules. You can also define **custom channel groups** with your own rules layered on top for org-specific categories.

*Business use:* "Direct" traffic is often a symptom of missing or malformed UTMs (some referrer/campaign info got lost or wasn't attached), not literally someone typing the URL — worth investigating before assuming it's un-trackable brand traffic.

## Common tagging pitfalls
- **Self-referral**: your own domain showing up as a referral source, usually from an unconfigured cross-domain setup or a third-party checkout/payment redirect not added to the referral exclusion list.
- **Inconsistent casing/values**: `utm_source=Newsletter` and `utm_source=newsletter` are treated as different sources — agree on a lowercase naming convention across the team before launching a campaign.
- **Broken links after redirects**: some link shorteners or redirect chains strip UTM parameters — always test the final landing URL, not just the shortened one.

*Business use:* a tagging-convention doc (allowed source/medium/campaign values) prevents most of the above and pays for itself the first time someone runs a multi-channel launch.