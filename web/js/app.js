var env = {};

// Import variables if present (from env.js)
if(window){  
  Object.assign(env, window.__env);
}

var app = angular.module('app', ['ngRoute']);

app.constant('__env', env);

app.config(function($routeProvider) {
    $routeProvider
    .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
    })
    .when('/:player_id', {
        templateUrl : 'views/player.html',
        controller: 'PlayerCtrl'
    });
});