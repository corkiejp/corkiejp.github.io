***

## Duck.ai Auto-Select Model (Tampermonkey userscript)

This userscript automatically selects your preferred Duck.ai model from the model picker when the page loads. It’s useful if you always want to start on the same model (e.g. `GPT-5.4 nano` or `Claude Haiku 4.5`) without manually clicking the dropdown every time.

### What it does

- Waits for Duck.ai to load.
- Opens the model dropdown using a stable `data-testid` hook.
- Clicks the model whose label matches the string you configure (e.g. `GPT-5.4 nano`).
- Stops once the selection is made.

It does **not** change your Duck.ai mode (Fast/Reasoning), only the model. That part turned out to be more timing-sensitive, so this script focuses on the reliably working behavior.

### Script

```js
// ==UserScript==
// @name         Duck.ai Auto-Select Model
// @namespace    https://duck.ai/
// @version      1.0
// @description  Automatically selects a preferred Duck.ai model on load
// @match        https://duck.ai/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Set this to one of the current model labels shown in the dropdown, e.g.:
    //
    //   'GPT-5.4 nano'
    //   'GPT-5.4 mini'
    //   'Claude Haiku 4.5'
    //   'Mistral Small 4'
    //   'gpt-oss 120B'
    //   'Gemma 4 31B'
    //
    const TARGET_MODEL = 'GPT-5.4 nano';

    // Opens the model picker dropdown once, using its data-testid.
    function openModelMenuOnce() {
        const btn = document.querySelector('button[data-testid="model-picker-button"]');
        if (!btn) return false;
        if (btn.getAttribute('aria-expanded') === 'true') {
            // Already open
            return true;
        }
        btn.click();
        return true;
    }

    // Attempts to click the menu entry whose text contains TARGET_MODEL.
    function clickModelIfPresent() {
        const candidates = document.querySelectorAll('button, [role="menuitem"], [role="option"]');
        for (const el of candidates) {
            const text = (el.innerText || '').trim();
            if (!text) continue;
            if (text.includes(TARGET_MODEL)) {
                el.click();
                return true;
            }
        }
        return false;
    }

    function setModel() {
        if (!openModelMenuOnce()) {
            return;
        }

        let attempts = 0;
        const maxAttempts = 20;

        const interval = setInterval(() => {
            attempts++;

            // Stop if the picker button disappears or the menu closes.
            const btn = document.querySelector('button[data-testid="model-picker-button"]');
            if (!btn || btn.getAttribute('aria-expanded') === 'false') {
                clearInterval(interval);
                return;
            }

            // Try to click the target model.
            if (clickModelIfPresent()) {
                clearInterval(interval);
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
            }
        }, 150);
    }

    // Give the app a moment to mount, then run the selection logic.
    setTimeout(setModel, 800);
})();
```


### How to install

1. Install [Tampermonkey](https://www.tampermonkey.net/) (or a compatible userscript manager) in your browser.
2. Create a new script and paste the code above.
3. Save the script.
4. Visit `https://duck.ai/` and make sure the script is enabled in the Tampermonkey popup.
5. Edit the `TARGET_MODEL` constant if you want a different model.

### Notes and limitations

- This script depends on Duck.ai’s current DOM structure (`data-testid="model-picker-button"` and menu item labels). If the UI changes, it may need updating.
- It only selects the model, not the Fast/Reasoning mode. Mode automation is possible but currently less reliable and was intentionally left out to keep this script simple and shareable.
- It doesn’t modify any browser settings or search defaults; it only clicks on elements within the Duck.ai page.

***