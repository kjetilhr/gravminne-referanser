let username;

chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  if (request && request.msg === 'gravminne') {
    chrome.tabs.query({}, (tabs) => {
      wikidataTabs = tabs.filter((tab) => tab.title.includes('Wikidata'));
      for (tab of tabs) {
        chrome.tabs.sendMessage(tab.id, request);
      }
    });
    sendResponse({});
  }
  if (request && request.msg === 'username') {
    sendResponse({
      username,
    });
  }
  if (request && request.msg === 'reload') {
    chrome.runtime.reload();
  }
});

fetch(
  'https://www.wikidata.org/w/api.php?action=query&format=json&meta=userinfo'
)
  .then((response) => response.json())
  .then((data) => {
    username = data.query.userinfo.name.replace(' ', '%20');
  });
