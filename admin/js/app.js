var env = {};

// Import variables if present (from env.js)
if(window){  
  Object.assign(env, window.__env);
}

var app = angular.module('app', ['ngRoute']);

app.constant('__env', env);

app.config(function($routeProvider) {
    $routeProvider
    .when("/", {
        templateUrl : 'views/main.html',
        controller: 'DashboardCtrl'
    })
    .when("/achievements", {
        templateUrl : 'views/achievements.html',
        controller: 'AchievementsCtrl'
    })
    .when("/users", {
        templateUrl : 'views/users.html',
        controller: 'UsersCtrl'
    })
    .when("/players", {
        templateUrl : 'views/players.html',
        controller: 'PlayersCtrl'
    })
    .when("/profile", {
        templateUrl : 'views/profile.html',
        controller: 'ProfileCtrl'
    });
});