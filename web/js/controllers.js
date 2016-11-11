angular.module('app')

.controller('AppCtrl', ['$scope', '$http', '$route', '$window', '$timeout', 'AuthService',
	function($scope, $http, $route, $window, $timeout, AuthService) {

		$scope.user = {};

	  $scope.login = function() {
	    AuthService.login($scope.user).then(function(resp) {
	    	$timeout(function() {$window.location.reload();});
	    });
	  };

	  $scope.isAuthenticated = function() {
	  	return AuthService.isAuthenticated();
	  }

  }
])

.controller('MainCtrl', ['$scope', '$http',
	function($scope, $http) {
		$scope.numberOfPlayers = '?';
		$scope.numberAchieved = '?';
		$http.get(__env.API+'/stats').then(function(resp) {
			$scope.numberOfPlayers = resp.data.num_active_players;
			$scope.numberAchieved = resp.data.num_achieved;
		});
	}
])


.controller('PlayerCtrl', ['$scope', '$location', 'AuthService', 'PlayerFactory',
	function($scope, $location, AuthService, PlayerFactory) {

		/*
	  if (AuthService.isAuthenticated()) {
	  	$location.path($location.path() + '/grant');
	  	return;
	  }
	  */

		$scope.player = PlayerFactory.getPlayer;
		$scope.goals = PlayerFactory.getGoals;

		$scope.numAchieved = function() {
			if ($scope.player() && $scope.player().achievements) {
				return $scope.player().achievements.length;
			} else {
				return 0;
			}
		}

		$scope.hasAchieved = function(goal) {
			function isMatch(value) {
				return value && goal && value.achievement === goal.id;
			}
			var hits = [];
			if ($scope.player() && $scope.player().achievements) {
				hits = $scope.player().achievements.filter(isMatch);
			}
			return hits.length > 0;
		};

		$scope.goalSorter = function(goal) {
			return $scope.hasAchieved(goal) ? 'zzz-' : '' + goal.name;
		};

		$scope.toggleLoginForm = function() {
			$scope.showLoginForm = !$scope.showLoginForm;
		};

  }
]);