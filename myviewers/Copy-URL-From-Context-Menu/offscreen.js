chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target !== "offscreen" || message?.type !== "copy-text") {
    return;
  }

  try {
    const ok = copyTextWithExecCommand(message.text);
    sendResponse({
      ok,
      error: ok ? null : "document.execCommand('copy') returned false"
    });
  } catch (err) {
    sendResponse({ ok: false, error: String(err) });
  }

  return false;
});

function copyTextWithExecCommand(text) {
  const el = document.createElement("textarea");
  el.value = String(text);
  document.body.appendChild(el);
  el.focus();
  el.select();
  el.setSelectionRange(0, el.value.length);
  const ok = document.execCommand("copy");
  el.remove();
  return ok;
}