// Stealth init script for headless Chromium.
// Injected via @playwright/mcp --init-script to reduce bot detection.
// This runs before any page content loads.

// 1. Remove navigator.webdriver — the #1 detection vector
delete Object.getPrototypeOf(navigator).webdriver;

// 2. Mock chrome runtime to look like a real browser
if (!window.chrome) {
  window.chrome = {};
}
if (!window.chrome.runtime) {
  window.chrome.runtime = {};
}

// 3. Override permissions query
const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) =>
  parameters.name === 'notifications'
    ? Promise.resolve({ state: Notification.permission })
    : originalQuery(parameters);

// 4. Set realistic languages (zh-CN for Chinese sites)
Object.defineProperty(navigator, 'languages', {
  get: () => ['zh-CN', 'zh', 'en-US', 'en'],
});
