angular.module('app')
 
.service('AuthService', ['__env', '$q', '$http', function(__env, $q, $http) {
  var isAuthenticated = false;
  var auth = {};
 
  function loadUserCredentials() {
    var credentials = window.localStorage.getItem(__env.LOCAL_TOKEN_KEY);
    if (credentials) {
      credentials = JSON.parse(credentials);
    }
    if (credentials && credentials.token) {
      useCredentials(credentials);
    }
  }
 
  function storeUserCredentials(credentials) {
    window.localStorage.setItem(
      __env.LOCAL_TOKEN_KEY,
      JSON.stringify(credentials)
    );
    useCredentials(credentials);
  }
 
  function useCredentials(credentials) {
    isAuthenticated = true;
    auth = {
      token: credentials.token,
      username: credentials.username,
      admin: credentials.admin
    };
 
    // Set the token as header for your requests!
    $http.defaults.headers.common.Authorization = auth.token;
  }
 
  function destroyUserCredentials() {
    auth = {};
    isAuthenticated = false;
    $http.defaults.headers.common.Authorization = undefined;
    window.localStorage.removeItem(__env.LOCAL_TOKEN_KEY);
  }
 
  var login = function(user) {
    return $q(function(resolve, reject) {
      $http.post(__env.API + '/auth', user).then(function(result) {
        if (result.data.success) {
          var credentials = {
            token: result.data.token,
            username: user.username,
            admin: result.data.admin
          };
          storeUserCredentials(credentials);
          resolve(result.data.message);
        } else {
          reject(result.data.message);
        }
      }, function(err) {
        reject(err.data.message);
      });
    });
  };
 
  var logout = function() {
    destroyUserCredentials();
  };
 
  loadUserCredentials();
 
  return {
    login: login,
    logout: logout,
    isAuthenticated: function() {return isAuthenticated;},
    currentUser: function() { return isAuthenticated ?
      auth.username : undefined; },
    isAdmin: function() { return isAuthenticated ? auth.admin : false; }
  };
}]);

/*
 
.factory('AuthInterceptor', ['$rootScope', '$q', function ($rootScope, $q) {
  return {
    responseError: function (response) {
      $rootScope.$broadcast({
        401: 'auth-not-authenticated',
      }[response.status], response);
      return $q.reject(response);
    }
  };
}])
 
.config(function ($httpProvider) {
  $httpProvider.interceptors.push('AuthInterceptor');
});

*/