## ExtScanAlert WIP update/build

[Download the current Chromium WIP build](https://corkiejp.github.io/ExtScanAlert/ExtScanAlert+Fingerprint-observe-block-chromium.zip)

I’ve pushed a work‑in‑progress build with a few practical improvements:

- Mobile‑friendly UI (for Quetta): the interface now behaves properly on smaller screens, with working controls first, looks second.[^1]
- Third‑party vendor tracking: ExtScanAlert can spot and follow vendor activity across sites (within the usual limits of changing subdomains and inconsistent naming).
- Not an ad blocker: it doesn’t try to block ads itself, but it can show where sites lean on third‑party scripts for ads, analytics, anti‑bot checks, or fingerprinting.

A nice real‑world example is Euronews:

- ExtScanAlert flagged `html-load.com` as an ad/fingerprinting “canary” script used for ad‑blocker detection.
- With that vendor blocked, the video stream still plays, but the ad‑wall prompt breaks — which says a lot about how dependent these anti‑adblock messages are on external scripts.[^2][^3]

To keep the signal‑to‑noise ratio sane, common ad and CDN infrastructure (DoubleClick, Google Ads, big CDNs, etc.) is treated as “noise” and ignored, so alerts focus on the more interesting third‑party vendors instead of the usual ad pipes.

## Testing notes and observations
Adding these here for my own refference mainly.

“Ad and tracker blocking doesn’t just hide obvious ads; it also reduces the number of third‑party measurement scripts that can run fingerprint‑style code. My extension is there to show you which ones still get through and what kind of behaviour they’re performing.”


[^1]: https://www.tinystruggles.com/posts/extension_release_checklist/

[^2]: https://adguard.com/en/blog/ad-blockers-website-crash-blame.html

[^3]: https://adblock-tester.com/ad-blockers/why-do-websites-detect-ad-blocker/
