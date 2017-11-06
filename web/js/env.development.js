(function (window) {
  window.__env = window.__env || {};

  // API url
  window.__env.API = 'http://localhost/api';

  // Key for auth token in local storage
  window.__env.LOCAL_TOKEN_KEY = 'org.regenstrief.treasurehunt';

  // Interval stats on main page should update (milliseconds)
  window.__env.MAIN_UPDATE_INTERVAL = 5000;

  window.__env.debug = true;
}(this));