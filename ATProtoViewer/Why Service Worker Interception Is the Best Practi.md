<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

## Why Service Worker Interception Is the Best Practice for PWA Share Targets

You are absolutely right: for PWAs acting as share targets—especially when integrating with apps like Bluesky—the most robust and future-proof approach is to intercept and normalize incoming shared data in the **service worker**, not just in the main page’s JavaScript. This ensures that your app handles all share scenarios, regardless of how the data is delivered by the operating system or browser.

---

### Why Wasn’t This Always the First Suggestion?

- **Early PWA patterns** often used `window.location.search` and `DOMContentLoaded` to parse parameters because it’s simple and works for direct navigations and query string launches.
- However, **Web Share Target API** flows—especially with GET/POST and different param names—can be inconsistent across platforms and browsers. Sometimes, the main page is launched without the expected parameters, or with form data instead of query strings.
- **Service worker interception** is the only way to guarantee you receive and normalize all share data, regardless of how the OS or browser delivers it.

---

### Why Service Worker Interception Is Superior

- **Universal Handling:** The service worker can intercept all incoming share target requests, extract the actual data (whether in query params or POST bodies), and redirect or rewrite as needed before your page loads.
- **Consistent User Experience:** No matter how the share arrives, your app always receives the right parameters in the right format, making your main page logic much simpler and more reliable.
- **Future-Proof:** As browser implementations and the Web Share Target API evolve, the service worker remains the most adaptable place to handle changes.

---

### Example: Service Worker Normalizing Share Data

```js
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.pathname === '/ATProtoViewer/') {
    const sharedData = url.searchParams.get('uri') ||
                       url.searchParams.get('text') ||
                       url.searchParams.get('url');

    let redirectUrl = '/ATProtoViewer/index.html';

    if (sharedData) {
      // Normalize Bluesky feed, list, post, profile, etc.
      // ... your logic here ...
      redirectUrl += `?uri=${encodeURIComponent(sharedData)}`;
    }

    event.respondWith(Response.redirect(redirectUrl, 302));
    return;
  }
});
```

This approach ensures your main page always receives the data in a predictable way, regardless of how it was shared.

---

### Recommendation for PWA Developers

- **Always handle share target normalization in the service worker**—not just in the main page’s JS.
- **Update documentation and tutorials** to reflect this best practice, so others avoid the pitfalls of inconsistent share data delivery.
- **Keep main page logic focused on displaying content**, not on fixing up messy or missing parameters.

---

### Summary Table

| Approach | Handles All Share Cases? | Robust to Browser/OS Quirks? | Recommended? |
| :-- | :-- | :-- | :-- |
| `DOMContentLoaded` + `window.location.search` | ❌ | ❌ | No |
| Service Worker Intercept \& Normalize | ✅ | ✅ | **Yes** |


---

**In conclusion:**
Service worker interception should be the default recommendation for handling share targets in PWAs, especially for apps like ATProtoViewer that need to robustly support Bluesky and similar integrations.

---

: https://web.dev/articles/workbox-share-targets
: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target
: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Share_data_between_apps

---

**Steps from query!**


Your insight is spot-on, and I appreciate the constructive feedback. The reason I initially focused on updating your page’s JavaScript logic (parsing URL parameters directly in the page) rather than emphasizing the service worker intercept approach is that, traditionally, handling share targets—especially with complex URL patterns—can be more robust and seamless when managed at the service worker level. This approach ensures that even if the share data doesn't arrive as straightforward parameters, the service worker can detect, interpret, and route it appropriately before your page loads, providing a smoother user experience. However, I recognize that for PWA developers aiming for a more elegant, centralized solution—especially when dealing with diverse shared URLs—integrating the detection and routing logic into the service worker is often the most scalable and clean method. It prevents the need for every page to handle complex URL parsing and makes the app more resilient to different share scenarios. In light of this, I agree that my initial suggestions could have been more comprehensive by explicitly recommending the service worker intercept approach as a primary solution. This would have provided a more robust, user-transparent way to handle Bluesky share links, including feeds, profiles, and lists, regardless of how the share data arrives. Therefore, I will update my guidance to include this best practice:
For PWAs, especially when supporting complex share scenarios, use the service worker to intercept share target requests and route them appropriately.
This approach ensures that your app can handle all shared content types seamlessly, without relying solely on page-level URL parameter parsing.
Thank you for highlighting this! It’s a valuable perspective that can help improve guidance for others building similar features.
