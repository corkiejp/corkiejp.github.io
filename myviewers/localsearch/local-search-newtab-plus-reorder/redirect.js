const api = typeof browser !== 'undefined' ? browser : chrome;

(function () {
  try {
    const url = new URL(window.location.href);
    const query = (url.searchParams.get('q') || '').trim();
    const target = new URL(api.runtime.getURL('newtab.html'));
    if (query) {
      target.searchParams.set('prefill', query);
    }
    window.location.replace(target.toString());
  } catch (error) {
    console.error('Redirect helper failed', error);
  }
})();