## Google Tag Manager / gtag.js

**What it is**

- Google Tag Manager (GTM) and the Google tag (`gtag.js`) are Google’s tag orchestration and measurement framework.[^4][^2][^1]
- The goal is to have a **single tagging layer** that can load and configure multiple Google products (Analytics, Ads, Floodlight, etc.) and third‑party tags without changing site code every time.[^5][^3][^1]

**Role in tracking**

- GTM/gtag.js itself is mostly a **loader and router**: it manages which tags fire when and passes data into them (pageviews, events, IDs).[^2][^6][^1]
- Fingerprinting or more invasive tracking usually comes from scripts *loaded via* GTM (e.g. Fingerprint.js, custom measurement scripts), rather than GTM/gtag.js being the fingerprinting library by itself.[^7][^5]


[^1]: https://developers.google.com/tag-platform/gtagjs

[^2]: https://support.google.com/tagmanager/answer/7582054?hl=en

[^3]: https://www.reddit.com/r/GoogleTagManager/comments/1i51zcb/anyone_explain_google_tag_manager_to_me_please_in/

[^4]: https://optimizesmart.com/blog/gtag-js-google-tag-in-google-analytics-4-and-beyond/

[^5]: https://www.bounteous.com/insights/2017/12/12/what-gtagjs-google-analytics-and-do-i-need-it/

[^6]: https://www.analyticsmania.com/post/gtag-vs-google-tag-manager/

[^7]: https://joshwayman.com/how-to-implement-fingerprint-js-with-gtm/

[^8]: https://ceaksan.com/en/global-site-tag-gtag-js-event-tracking

[^9]: https://www.opel.ie/content/dam/opel/ireland/tools/pdf/cookies/GDPR_ScorecardResearch.pdf

[^10]: https://www.scorecardresearch.com

[^11]: https://lokker.com/topics/comscore
