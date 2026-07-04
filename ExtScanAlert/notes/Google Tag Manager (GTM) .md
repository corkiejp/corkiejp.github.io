## Google Tag Manager / gtag.js

**What it is**

- Google Tag Manager (GTM) and the Google tag (`gtag.js`) are Google’s tag orchestration and measurement framework.[^4][^2][^1]
- The goal is to have a **single tagging layer** that can load and configure multiple Google products (Analytics, Ads, Floodlight, etc.) and third‑party tags without changing site code every time.[^5][^3][^1]

**Role in tracking**

- GTM/gtag.js itself is mostly a **loader and router**: it manages which tags fire when and passes data into them (pageviews, events, IDs).[^2][^6][^1]
- Fingerprinting or more invasive tracking usually comes from scripts *loaded via* GTM (e.g. Fingerprint.js, custom measurement scripts), rather than GTM/gtag.js being the fingerprinting library by itself.[^7][^5]
