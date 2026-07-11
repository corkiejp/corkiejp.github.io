(() => {
  window.__fpHarnessExternalMarker = {
    loadedAt: new Date().toISOString(),
    src: document.currentScript ? document.currentScript.src : 'unknown'
  };

  const out = (type, detail) => {
    console.log(type, detail);
  };

  function externalNavigatorProbe() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages,
      platform: navigator.platform
    };
  }

  function externalCanvasProbe() {
    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.fillText('external-script-canvas', 8, 24);
    return canvas.toDataURL().slice(0, 64);
  }

  out('external-script-probe', {
    marker: window.__fpHarnessExternalMarker,
    navigator: externalNavigatorProbe(),
    canvasPrefix: externalCanvasProbe()
  });
})();
