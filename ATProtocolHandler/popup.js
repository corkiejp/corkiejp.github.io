document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('atForm');
  const input = document.getElementById('aturl');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const aturl = input.value.trim();

    if (!aturl.startsWith('at://')) {
      alert('Please enter a valid at:// URI');
      return;
    }

    const encoded = encodeURIComponent(aturl);

    chrome.tabs.create({
      url: `list.html?aturl=${encoded}`
    });
  });
});