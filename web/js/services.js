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
}])

.factory('PlayerFactory', ['__env', '$rootScope', '$http', '$routeParams', 'AuthService',
  function(__env, $rootScope, $http, $routeParams, AuthService) {

    var service = {};
    var player_id = $routeParams.player_id;
    var player = {};
    var goals = [];
    var user = undefined;

    if (AuthService.isAuthenticated()) {
      $http.get(__env.API+'/users/'+AuthService.currentUser()).then(function(resp) {
        user = resp.data;
        loadPlayer();
      });      
    } else {
      loadPlayer();
    }

    function loadPlayer() {
      console.log('load player');
      $http.get(__env.API+'/players/'+player_id).then(function(resp) {
        var thePlayer = resp.data;
        if (user) {
          $http.post(__env.API+'/players/'+thePlayer.id+'/achievements', '').then(function(resp) {
            // resp.data should contain player with granted achievements
            service.setPlayer(resp.data);
          });
        } else {
          service.setPlayer(thePlayer);
        }
      }, function(err) {
        console.log('player not found');
        $rootScope.$emit('player-not-found');
      });
    }

    $http.get(__env.API+'/achievements').then(function(resp) {
      service.setGoals(resp.data);
    });

    service.getPlayerId = function() {
      return player_id;
    };
    service.getPlayer = function() {
      return player;
    };
    service.setPlayer = function(newPlayer) {
      player = newPlayer;
    };
    service.getGoals = function() {
      return goals;
    };
    service.setGoals = function(newGoals) {
      goals = newGoals;
    };

    return service;
  }
]);

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