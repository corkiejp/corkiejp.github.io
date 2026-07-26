const api = typeof browser !== 'undefined' ? browser : chrome;

async function getLikelySourceFromBackground() {
  if (!api.runtime?.sendMessage) return null;

  try {
    const response = await api.runtime.sendMessage({ type: 'get-likely-source-tab' });
    if (!response || typeof response !== 'object') return null;

    const sourceUrl = typeof response.url === 'string' ? response.url : '';
    const sourceTitle = typeof response.title === 'string' ? response.title : '';

    return { sourceUrl, sourceTitle };
  } catch (error) {
    console.error('Could not get likely source tab from background', error);
    return null;
  }
}

(async function () {
  try {
    const url = new URL(window.location.href);
    const query = (url.searchParams.get('q') || '').trim();
    const target = new URL(api.runtime.getURL('newtab.html'));

    if (query) {
      target.searchParams.set('prefill', query);
    }

    const source = await getLikelySourceFromBackground();
    if (source?.sourceUrl) {
      target.searchParams.set('sourceUrl', source.sourceUrl);
    }
    if (source?.sourceTitle) {
      target.searchParams.set('sourceTitle', source.sourceTitle);
    }

    window.location.replace(target.toString());
  } catch (error) {
    console.error('Redirect helper failed', error);
  }
})();