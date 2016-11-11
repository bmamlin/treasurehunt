(function (window) {
  window.__env = window.__env || {};

  // API url
  window.__env.API = 'http://localhost/api';
//  window.__env.API = 'http://10.0.11.161:3000';

  // Key for auth token in local storage
  window.__env.LOCAL_TOKEN_KEY = 'org.regenstrief.treasurehunt';

  window.__env.debug = true;
}(this));