## HTML‑Load (`html-load.com` / `html-load.cc`)

For a `notes/html-load.com.md`:

**What it is**

- `html-load.com` and `html-load.cc` have been identified in blocklists and analysis as domains used to load ads or “recover” ads when ad blockers are present.[^15][^16][^17]
- They’re associated with adware / anti‑adblock mechanisms and scripts that attempt to bypass or undo ad‑blocking behaviour on sites.[^17][^18][^15]

**Role in tracking / fingerprinting**

- Sites may include HTML‑Load scripts as a **canary**: if the script fails to load, they infer ad blocking and potentially alter behaviour or show warnings.[^16][^19]
- When it does load, it can pull in ad content and related tracking, which makes it a good candidate for the extension to flag when fingerprint‑style events are seen around those scripts.[^20][^15]


[^15]: https://github.com/celenityy/BadBlock/issues/78

[^16]: https://adguard.com/en/blog/ad-blockers-website-crash-blame.html

[^17]: https://mastodon.ar.al/@aral/115821580850841254

[^18]: https://greatis.com/unhackme/help/remove/remove-html-load-cc-completely.htm

[^19]: https://www.techradar.com/pro/how-sites-are-falsely-blaming-ad-blockers-for-site-breakdowns

[^20]: https://www.joesandbox.com/analysis/1784139/0/html
