# Video mapping audit

Rule: map only when the video title clearly matches the topic (or is an explicitly labeled Expert supplement). Every ID below was checked with YouTube oEmbed before commit.

Source Skillshop playlist: https://www.youtube.com/playlist?list=PLI5YfMzCfRtZNBRmhTEJkcHYvN_x_wpxM

## Official (Skillshop / Google Analytics)

| Topic | Primary ID | Why |
|---|---|---|
| structure | pNfD4jDF8TE | 1.3 account / property / streams |
| dimensions-metrics | BlKDZgH8Qqw | 1.8 dimensions and metrics |
| key-events | Ror4ubtzMq0 | 2.4 key events |
| reports | KiYVhk1w36E | 2.6 pre-defined reports |
| explore | MwlRg4B7X0c | 2.8 Explore |
| governance | 9Uokq4bhHjE | 2.3 filters / unwanted referrals |
| bigquery-api | TAdi6j-c7WM | 4.5 Analytics APIs (+ Measurelab BQ export related) |
| setupassist | THb5SassY1k | 1.4 website data collection |
| eventparams | R_jW24nAjX4 | 2.2 create and manage events |
| debugview | BkvRu5-Cuz4 | 1.6 confirm data collection (+ Expert DebugView related) |
| gtag-gtm | THb5SassY1k | 1.4 install path (+ Expert gtag vs GTM related) |

## Expert primary (no clear Skillshop title for the concept)

| Topic | Primary ID | Creator | Why |
|---|---|---|---|
| scopes | VQlcZYlJItM | Analytics Mania | User-scoped custom dimensions |
| attribution | 6fR-qVvmNSo | Loves Data | Attribution model changes in GA4 |
| campaign-tracking | Fl5OcKM22Ro | Analytics Mania | UTM parameters / campaign tracking |
| advertising | SnnXNUdy0T4 | Loves Data | Link Google Ads to GA4 |
| ga360 | olZASVlX3Z0 | Measurelab | What is GA 360 |
| consent | sOv6MS67P88 | Loves Data | Cookie banner & Consent Mode |
| signalsads | VnoGWByeODc | Loves Data | Activating Google Signals |
| enhanced-measurement | jRGhWRwlYzk | Analytics Mania | Enhanced Measurement in GA4 |
| user-id | 2amBrQYFUCE | Analytics Mania | User ID tracking in GA4 |
| cross-domain | u4kBqTijBVo | Analytics Mania | Cross-domain tracking in GA4 |
| predictive | wld2YUILbeE | Measurelab | Predictive metrics in GA4 |
| channel-groups | 9tb4TGDlu4c | Analytics Mania | Custom channel groups in GA4 |

Related videos (Official + Expert) live in `data/meta.json` under each topic’s `related` array.
