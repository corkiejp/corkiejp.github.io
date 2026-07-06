### How to find new providers

ExtScanAlert works best when `providers.json` contains vendors that show up repeatedly in interesting events, not just every generic tag loader on the web.

If you want to help identify new providers:

- Use your normal browsing patterns (news, ecommerce, login-heavy sites) rather than random “useless web” pages. Those are great for testing, but they mostly produce canvas/WebGL noise and Google Tag Manager.
- Export fingerprint logs after a browsing session and look for:
    - Events with higher scores and classifications like “likely WebGL-based fingerprinting” or “canvas-based fingerprinting.”
    - Third-party hosts in `recentScripts` that appear across multiple sites, especially measurement or anti-bot tags (`sb.scorecardresearch.com`, anti-adblock loaders, etc.).
- For candidates that appear often, open an issue or PR with:
    - the host(s),
    - a couple of example pages where they appeared,
    - and any public info you can find about what that vendor does.
 - No github account, find my threads on Reddit or contact me through [my socials](https://github.com/corkiejp/Corkiejp-notes-on-awesome-bluesky/blob/main/corkiejp-socials.md) listed on [corkiejp.github.io](https://corkiejp.github.io/)

Please don’t feel obliged to do deep research; even “this host keeps showing up in high-score events on these sites” is useful as a starting point.
