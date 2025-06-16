console.log("✅ content.js loaded");

const script = document.createElement("script");
script.src = chrome.runtime.getURL("inject.js");
script.onload = function () {
  console.log("✅ inject.js injected");
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

window.addEventListener("message", async (event) => {
  if (event.source !== window || event.data.type !== "GET_COOKIES_REQUEST") return;

  try {
    const cookies = await chrome.runtime.sendMessage({ type: "getCookies" });
    window.postMessage({ type: "GET_COOKIES_RESPONSE", cookieHeader: cookies.cookieHeader }, "*");
  } catch (err) {
    console.error("❌ Failed to get cookies:", err);
    window.postMessage({ type: "GET_COOKIES_RESPONSE", cookieHeader: null }, "*");
  }
});
