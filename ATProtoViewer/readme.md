<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# ATProtoViewer - Bluesky PWA Client

A privacy-focused Progressive Web App for exploring Bluesky/ATProtocol data without authentication.  
[Live Demo](https://corkiejp.github.io/ATProtoViewer/) | [GitHub](https://github.com/corkiejp/corkiejp.github.io/tree/main/ATProtoViewer)

## 🌟 Features
- **Full PWA Support**
  - Installable on mobile/home screen
  - Service worker caching for fast reloads
- **Zero Authentication Required**
  - View public profiles, posts, likes, follows
  - Search handles/DIDs directly
- **Advanced Features**
  - **Feed & List Viewer** (supports custom algorithms)
  - DID ↔ Handle resolution
  - **Bookmark Manager** with editing
  - **List Member Browser** with avatars
  - Post viewer with nested replies
- **Privacy First**
  - No tracking
  - No server-side processing
  - All data stays in browser

## Tech Stack
- Vanilla JavaScript
- Service Workers (offline support)
- IndexedDB (bookmark storage)
- Bluesky Public API

## Usage
1. Visit [the live demo](https://corkiejp.github.io/ATProtoViewer/)
2. Enter a Bluesky handle/DID/post URI
3. Explore profiles, feeds, and lists

## Downloadable to run locally
Just download the 5 html files listed in the service work and place in a folder, you can then edit the hardcode links if any left in the html. Won't run locally as a PWA but you could put up on your own server? 

---

Older version of the readme file supplied below here:- 

---

## 📝 ATProto Record Viewer — Script Structure \& URL Parameters

### 📁 **Project Structure Overview**

- **Constants \& Configuration:**
Defined at the top of the main script file for easy reference and modification (e.g., `DEFAULT_PDS`, `DEFAULT_REPO`, etc.).
- **Helper Functions:**
Utility functions (such as `setDefaultIfEmpty`, `parseAtUri`, etc.) are grouped together near the top of the script for reuse and clarity.
- **Main Logic:**
All initialization and event listeners are placed inside a single `DOMContentLoaded` handler to ensure the DOM is ready before any manipulation.
- **Event Listeners:**
All button clicks, form submissions, and modal interactions are registered inside the main DOMContentLoaded block.

---

### 🔗 **URL Parameter Behavior**

The viewer supports direct linking and automatic form filling via URL parameters:

- **`uri` Parameter:**
    - If the page is loaded with a `?uri=at://...` parameter, the form fields (`repo`, `collection`, `rkey`, `pds`) are automatically filled based on the parsed AT URI.
    - The user can then fetch the single record or modify the fields for further queries. Also supports the Bluesky web urls. Both can be enter/pasted on the page URI field. 
    - Example:

```
https://corkiejp.github.io/ATProtoViewer/index.html?uri=at://did:plc:qxlh6bohvep3taqhmtpipx4b/app.bsky.feed.post/3lpx3s7avxc5r
```
```
https://bsky.app/profile/corkiejp.github.io/post/3lqb3j3wrocta
```

- **`pds` Parameter (optional):**
    - If provided, this value will prefill the PDS Host field.
    - Example:

```
https://corkiejp.github.io/ATProtoViewer/index.html?uri=at://did:plc:qxlh6bohvep3taqhmtpipx4b/app.bsky.feed.post/3lpx3s7avxc5r&pds=bsky.social
```

- **Default Values:**
    - If any fields are not filled by the URL parameters, they are set to sensible defaults as defined in the script constants.

---

### 🛠 **How It Works**

1. On page load, the script:
    - Parses URL parameters.
    - Fills form fields from `uri` and `pds` if present.
    - Sets default values for any remaining empty fields.
2. The user can:
    - Click "Show This Record Only" to fetch a single record.
    - Click "Fetch Records" to list 100 latest records for the specified repo/collection.
    - Edit any form field and re-submit as needed.

---

**For further details, see comments within the script or contact [@corkiejp](https://github.com/corkiejp).**

---

