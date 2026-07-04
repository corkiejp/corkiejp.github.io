# What sb.scorecardresearch.com is
It’s part of Comscore’s ScorecardResearch beacon, used for audience and advertising measurement.

Partner/privacy docs describe it as a tracking tag that collects page‑view and visitor behaviour data for market research and ad analytics.

Because it’s a shared measurement script, it’s normal for you to see it across multiple, unrelated sites (space.com, apnews.com, etc.).


**What it is**

- ScorecardResearch is a measurement program run by Full Circle Studies, Inc., part of Comscore’s market research group.[^9][^10]
- It uses tags like `scorecardresearch.com` / `sb.scorecardresearch.com` to collect **digital consumption behaviour data**: page views, online activity, video streaming, and related signals.[^10][^9]

**Role in tracking / fingerprinting**

- The tag functions as an **audience and advertising measurement beacon**, often loaded via ad tech or tag managers alongside other analytics scripts.[^11][^12]
- Extension has seen WebGL fingerprint‑style calls (e.g. `webgl.getParameter` on a `WebGLRenderingContext`) while ScorecardResearch’s beacon script is active, so you treat it as a tracking/measurement vendor that can appear in the fingerprinting chain.[^13][^14]


[^9]: https://www.opel.ie/content/dam/opel/ireland/tools/pdf/cookies/GDPR_ScorecardResearch.pdf

[^10]: https://www.scorecardresearch.com

[^11]: https://lokker.com/topics/comscore

[^12]: https://www.feroot.com/trackers-database/scorecard-research/

[^13]: https://dataimpulse.com/blog/4-ways-to-align-with-webgl-fingerprinting-in-web-scraping/

[^14]: https://www.thumbmarkjs.com/content/browser-fingerprinting-techniques/

