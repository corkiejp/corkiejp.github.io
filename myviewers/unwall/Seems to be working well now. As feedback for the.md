<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Seems to be working well now. As feedback for the developer of the userscript could make edits with comments to that script?  That would patch for these kind of frames blocking clicks?

Yes — this is good feedback for the userscript author. The current userscript already has generic popup/backdrop/scroll-lock cleanup, but its `hideElement()` and `cleanDetection()` paths do not explicitly handle **native `<dialog>` top-layer state** or do a final **interaction-unlock sweep** for leftover click-blocking overlays, which is exactly the class of issue you hit.[^1][^2]

## What to suggest

The most useful developer feedback is:

- close native `dialog[open]` elements instead of only hiding them,
- add a generic post-cleanup pass for leftover fullscreen click-catchers,
- keep it site-agnostic and heuristic-based rather than adding a The Sun rule.[^2][^3][^1]


## Suggested code edits

Here is a concise patch suggestion you can send, with comments explaining why.

### 1) Patch `hideElement()`

In `createRestoreSession()`, replace `hideElement()` with this:

```js
hideElement(element, reason) {
  records.push({
    type: "style-attribute",
    element,
    value: element.getAttribute("style")
  });

  this.setAttribute(element, "aria-hidden", "true");
  this.setAttribute(element, "data-unwall-hidden", reason);

  // Native dialogs can remain in the browser top layer / modal state
  // even if they are visually hidden with CSS, so close them explicitly.
  if (element instanceof HTMLDialogElement) {
    records.push({
      type: "attribute",
      element,
      name: "open",
      hadValue: element.hasAttribute("open"),
      value: element.getAttribute("open")
    });

    try {
      if (element.open) element.close();
    } catch {}

    element.removeAttribute("open");
  }

  element.style.setProperty("display", "none", "important");
  element.style.setProperty("pointer-events", "none", "important");
}
```

That change directly addresses native dialog blockers like the one you found.[^3][^1][^2]

### 2) Add generic leftover-blocker helpers

Add these helper functions near the other detection/cleanup helpers:

```js
function looksLikeLeftoverClickBlocker(element) {
  if (!(element instanceof Element)) return false;
  if (element.hasAttribute("data-unwall-hidden")) return false;
  if (isInUnwallUI(element)) return false;
  if (containsProtectedContent(element)) return false;

  const style = getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (style.pointerEvents === "none") return false;

  const rect = element.getBoundingClientRect();
  const z = numericZIndex(element);

  const coversViewport =
    rect.width >= window.innerWidth * 0.9 &&
    rect.height >= window.innerHeight * 0.9;

  const pinned =
    style.position === "fixed" ||
    style.position === "absolute" ||
    style.position === "sticky";

  const transparentish =
    getColorAlpha(style.backgroundColor) < 0.08 &&
    Number(style.opacity || 1) <= 1;

  const backdropish =
    hasBlur(style) ||
    transparentish ||
    style.cursor === "not-allowed";

  return coversViewport && pinned && z >= 5 && backdropish;
}

function centerHitCandidates() {
  const points = [
    [window.innerWidth / 2, window.innerHeight / 2],
    [window.innerWidth / 2, window.innerHeight * 0.25],
    [window.innerWidth / 2, window.innerHeight * 0.75]
  ];

  return uniqueElements(
    points
      .map(([x, y]) => document.elementFromPoint(x, y))
      .filter(Boolean)
  );
}

function unlockInteraction(restore) {
  const roots = [document.documentElement, document.body].filter(Boolean);
  let neutralizedCount = 0;

  for (const el of roots) {
    restore.setStyle(el, "pointer-events", "auto", "important");
    restore.setStyle(el, "touch-action", "auto", "important");
  }

  // Safety sweep: if any native dialogs are still open, close them.
  for (const dialog of document.querySelectorAll("dialog[open]")) {
    if (!(dialog instanceof HTMLDialogElement)) continue;

    restore.setAttribute(dialog, "open", null);

    try {
      if (dialog.open) dialog.close();
    } catch {}

    dialog.removeAttribute("open");
    restore.hideElement(dialog, "leftover-open-dialog");
    neutralizedCount++;
  }

  const allElements = [...document.querySelectorAll("body *")];
  const candidates = uniqueElements([...centerHitCandidates(), ...allElements]);

  for (const el of candidates) {
    if (!looksLikeLeftoverClickBlocker(el)) continue;
    restore.hideElement(el, "leftover-click-blocker");
    neutralizedCount++;
  }

  return neutralizedCount;
}
```

This adds a generic cleanup step for transparent fullscreen blockers that still intercept clicks after the main wall is removed.[^4][^5][^1]

### 3) Call it from `cleanDetection()`

In `cleanDetection(detection)`, after scroll unlock and before returning, add:

```js
const interactionUnlocked = unlockInteraction(restore);
```

and return it:

```js
return {
  restore,
  popupCount: detection.popups.length,
  backdropCount: detection.backdrops.length,
  blurCount: detection.blurElements.length,
  cssScrollUnlocked,
  jsScrollUnlocked,
  interactionUnlocked
};
```

That keeps the new logic as a final cleanup pass after the main removal work.[^1]

## Suggested note to the author

You could summarize it like this:

> I found a case where Unwall successfully hid the anti-adblock popup but the page underneath stayed unclickable. The blocker was implemented as a native `<dialog open>` and/or a leftover transparent fullscreen click-catching layer. A good generic fix would be:
> 1. explicitly close `HTMLDialogElement`s and remove `open` when hiding them,
> 2. run a final interaction-unlock sweep that restores root pointer/touch settings and hides leftover fullscreen fixed/absolute click blockers.

That is a clean, reusable contribution suggestion rather than a site-specific rule.[^2][^3][^1]

## One caution

Because `Unwall.user.js` is GPL-3.0-or-later, any shared patch should preserve the existing attribution and license notices, which the script already includes at the top. If you send code snippets, mention they are proposed edits to the GPL-covered userscript.[^1]

<div align="center">⁂</div>

[^1]: Unwall.user.js

[^2]: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog

[^3]: https://www.bennadel.com/blog/4861-exploring-the-dialog-element-in-html.htm

[^4]: https://robertnyman.com/2010/03/22/css-pointer-events-to-allow-clicks-on-underlying-elements/

[^5]: https://discourse.webflow.com/t/my-overlay-is-not-disabling-user-action-properly/244687

