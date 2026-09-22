chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.url) return;
  const url = tab.url;
  const isPdf = /\.pdf(?:$|[?#])/i.test(url);
  if (isPdf) {
    const viewer = chrome.runtime.getURL("viewer/index.html") + "?file=" + encodeURIComponent(url);
    await chrome.tabs.update(tab.id, { url: viewer });
  }
});