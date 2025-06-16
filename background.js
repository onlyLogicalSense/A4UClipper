chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getCookies') {
    chrome.cookies.getAll({ domain: '.acmemarkets.com' }, (cookies) => {
      const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      sendResponse({ cookieHeader });
    });
    return true; // Keep message channel open
  }
});
