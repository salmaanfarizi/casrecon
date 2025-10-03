// config.js
const CONFIG = {
  GOOGLE_SCRIPT_URL: '/.netlify/functions/gas', // Proxy to Netlify Function
  HEARTBEAT_INTERVAL: 15_000, // 15 seconds
  POLLING_INTERVAL: 5_000,    // 5 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2_000,
  USER_ID: localStorage.getItem('userId') || createUserId()
};

function createUserId() {
  const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  localStorage.setItem('userId', id);
  return id;
}
