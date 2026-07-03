# ExtScanAlert WIP build

[Download the current Chromium WIP build](https://corkiejp.github.io/ExtScanAlert/ExtScanAlert+Fingerprint-observe-block-chromium.zip)

[ExtScanAlert WIP update/build 03-07](WIP-release03-07.md)

[Latest Patched issue](https://github.com/corkiejp/corkiejp.github.io/issues/27)

## What this is

ExtScanAlert is a work-in-progress Chrome/Chromium extension focused on two things:

- detecting extension-probe attempts,
- monitoring likely fingerprinting and anti-bot vendor activity.

This build grows out of an earlier manually installed extension and adds a stronger privacy and visibility layer around extension enumeration and vendor-linked fingerprint activity.

## Why it is manual-install only for now

The current build is distributed as a manual-install ZIP so the project can stay easy to inspect and modify while the provider model is still evolving.

That also makes it easier for testers to edit JSON provider definitions locally and add or refine vendors they encounter in the wild.

## What the extension does

ExtScanAlert currently aims to:

- Detect when pages try to probe for installed extensions using extension-enumeration style checks.
- Hook common fingerprint-related APIs such as Canvas, WebGL, and OffscreenCanvas to log where they are being used.
- Score and label suspicious activity with readable classifications such as `canvas-based fingerprinting` or likely vendor-linked anti-bot activity.
- Use a curated provider list to identify known anti-bot, fraud, captcha, and analytics/session-replay vendors.
- Apply policy modes such as **Block**, **Observe**, and **Allow** at the site level.
- Apply provider-specific overrides on a per-host basis when a known provider is detected.
- Export and import saved rules for testing across profiles and devices.

## What it is not

This is not trying to be a full anti-fingerprinting suite that spoofs everything in the browser.

The project is better described as a visibility-and-control tool focused on extension probes, vendor awareness, and targeted handling of known third-party anti-bot or fingerprint-related services.

## What is different

Compared with many spoofing-focused privacy extensions, this project is centered on:

- detection and attribution rather than blanket spoofing,
- vendor-aware handling instead of treating every script the same,
- extension-probe detection as a first-class feature,
- per-site and per-provider policy control instead of a single global setting.

## Privacy / data handling

ExtScanAlert is designed as a local-only tool.

- No backend: the extension does not talk to any remote server owned by the author.
- No telemetry or analytics: it does not send usage data, browsing history, or logs off your machine.
- Storage: all configuration, logs, and provider definitions are stored locally in your browser via the extension storage APIs.

In other words, everything the extension records or configures stays in your browser profile unless you explicitly export it yourself.

## Current status

This is still a WIP build.

Source cleanup, fuller documentation, and a more complete public repo layout are still in progress. The ZIP is being shared early to get testing feedback before the project is packaged more formally.

## Feedback wanted

Useful feedback would include:

- sites where the extension catches something interesting,
- false positives or broken-site behavior,
- providers that should be added or refined in the provider list,
- cases where third-party infrastructure appears to inject fingerprinting or anti-bot behavior.

Real-world testing across rough environments is especially helpful.
