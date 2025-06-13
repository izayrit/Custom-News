chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    fetch('http://localhost:3000/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: tab.url, timestamp: Date.now() }),
      mode: 'cors',
      cache: 'no-cache'
    }).catch(err => console.error('Fetch error:', err));
  }
});
