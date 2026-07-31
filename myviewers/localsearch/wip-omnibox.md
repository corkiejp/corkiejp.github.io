# LocalSeacrh | Omnibox commands (desktop only)

This extension adds a keyword to the browser address bar to trigger different flows on **desktop** Chrome and Firefox.  

> Note: Omnibox commands are **not supported on mobile** browsers (Firefox for Android, Chromium-based mobile like Quetta). On mobile, use the normal UI pages instead.

## WIP Builds Manual Install Only

[Chromium .zip](https://corkiejp.github.io/myviewers/localsearch/WIP-local-search-new-tab-chrome-v1.3.5.zip) 

or 

[Firefox .xpi](https://corkiejp.github.io/myviewers/localsearch/WIP-local-search-new-tab-firefox-v1.3.5.xpi) 


## Keyword

The omnibox keyword is:

- `ails`

Type `ails`, followed by a space and a command.

## Commands

### 1. Web mode – local new tab

- **Syntax:** `ails web <search terms>`
- **What it does:**  
  - Opens the Local Search New Tab Plus page.  
  - Prefills the search box with `<search terms>`.

Examples:

- `ails web this is a test`  
- `ails web duck.ai routing`

### 2. Chat mode – Perplexity (default)

- **Syntax:** `ails chat <question>`
- **What it does:**  
  - Opens Perplexity.ai in a new tab.  
  - Uses the standard Perplexity flow (no explicit model selection).

Examples:

- `ails chat what is the weather in Ireland`  
- `ails chat explain the at protocol in simple terms`

> Perplexity model picker:  
> The extension does **not** currently control which Perplexity.ai model is used. Perplexity will use its default or the previously selected model.

### 3. Chat mode – duck.ai model shortcuts

- **Step 1:** Type `ails chat <question>` in the address bar.
- **Step 2:** Choose one of the **duck.ai suggestions** from the dropdown:
  - `duck.ai – GPT-5.4 nano: <question>`
  - `duck.ai – GPT-5.4 mini: <question>`
  - `duck.ai – Claude Haiku 4.5: <question>`
  - `duck.ai – Mistral Small 4: <question>`
  - `duck.ai – gpt-oss 120B: <question>`
  - `duck.ai – Gemma 4 31B: <question>`

The text `chat duck mini write a short summary of the at protocol` is the encoded command behind that suggestion, **not** a standalone trigger.  
You must select the suggestion row for the extension to route the request and change the duck.ai model.

Example:

1. Type: `ails chat write a short summary of the at protocol`
2. Select: `duck.ai – GPT-5.4 mini: write a short summary of the at protocol`

Result:

- duck.ai opens.
- The model picker switches to `GPT-5.4 mini`.
- The prompt is filled with your question.  

When you type `ails chat this is a test`, the omnibox will suggest these options. Choosing:

- “duck.ai – GPT-5.4 nano: this is a test”  
  will open duck.ai, switch to `GPT-5.4 nano`, and put “this is a test” into the prompt.

## Platform support

- **Desktop Chrome:**  
  - Omnibox keyword and all commands above are supported.  
  - duck.ai model selection is handled by the extension’s content script.

- **Desktop Firefox:**  
  - Omnibox keyword and commands are supported when the Firefox manifest is installed.  
  - Localhost remapping and duck.ai model selection work as described.

- **Mobile browsers (Firefox for Android, Quetta/Chromium on Android):**  
  - Omnibox is **not supported** by Firefox for Android.  
  - Chromium-based mobile browsers have incomplete extension and omnibox support.  
  - These omnibox commands are intended for **desktop only** and may not work on mobile.