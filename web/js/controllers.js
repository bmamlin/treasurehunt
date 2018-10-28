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

.controller('MainCtrl', ['$scope', '$http', '$interval',
	function($scope, $http, $interval) {
		$scope.numberOfPlayers = '?';
		$scope.numberAchieved = '?';

		var updater;
		$scope.update = function() {
			if (angular.isDefined(updater)) return;
			var updateStats = function() {
				$http.get(__env.API+'/stats').then(function(resp) {
					$scope.numberOfPlayers = resp.data.num_active_players;
					$scope.numberAchieved = resp.data.num_achieved;
				})
			};
			updateStats();
			updater = $interval(updateStats, __env.MAIN_UPDATE_INTERVAL);
		};

		$scope.$on('$destroy', function() {
			if (angular.isDefined(updater)) {
				$interval.cancel(updater);
				updater = undefined;
			}
		});

		$scope.update();
	}
])


.controller('PlayerCtrl', ['$rootScope', '$scope', '$http', '$location', 'AuthService', 'PlayerFactory',
	function($rootScope, $scope, $http, $location, AuthService, PlayerFactory) {

		$scope.grantedAchievement = PlayerFactory.getGrantedAchievement;

	  if (AuthService.isAdmin()) {
	  	$location.path($location.path() + '/admin');
	  	return;
	  }

		$scope.player = PlayerFactory.getPlayer;
		$scope.goals = PlayerFactory.getGoals;

		$scope.numAchieved = function() {
			if ($scope.player() && $scope.player().achievements) {
				return $scope.player().achievements.length;
			} else {
				return 0;
			}
		}

		// If player doesn't exist, redirect to root page
		$rootScope.$on('player-not-found', function() {
			$location.path('/');
		});

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

		$scope.toggleQR = function(e) {
			console.log(e.target.style);
		};

		$scope.toggleLoginForm = function() {
			$scope.showLoginForm = !$scope.showLoginForm;
		};

		$scope.updatePlayerNameAndOrg = function(newName, newOrg) {
			$http.patch(
				__env.API+'/players/'+PlayerFactory.getPlayerId(),
				{ name: newName, org: newOrg }
			).then(function(resp) {
				$scope.player().name = newName;
				$scope.player().org = newOrg;
			}, function(err) {
				$scope.nameFormError = err.message;
			});
		}

  }
])

.controller('AdminCtrl', ['__env', '$scope', '$http', '$location', 'AuthService', 'PlayerFactory',
	function(__env, $scope, $http, $location, AuthService, PlayerFactory) {

		$scope.player = PlayerFactory.getPlayer;
		$scope.isAdmin = AuthService.isAdmin;

		$scope.$watch(PlayerFactory.getPlayerId(), function() {
		  if (!$scope.isAdmin()) {
		  	$location.path('/'+PlayerFactory.getPlayerId());
		  }			
		});

		$scope.submit = function() {
			var player = $scope.player();
			var playerInfo = {
				name: player.name,
				org: player.org,
				email: player.email,
				phone: player.phone
			};
			$scope.message = "Saving...";
			$http.patch(__env.API+'/players/'+$scope.player().id, playerInfo);
			$scope.message = "Saved";
		}

	}
])

.controller('DashboardCtrl', ['$scope', '$http', '$interval',
	function($scope, $http, $interval) {
		$scope.numberOfPlayers = '?';
		$scope.numberAchieved = '?';
		$scope.recentAchievements = [];

		var updater;
		$scope.update = function() {
			if (angular.isDefined(updater)) return;
			var updateStats = function() {
				$http.get(__env.API+'/stats').then(function(resp) {
					$scope.numberOfPlayers = resp.data.num_active_players;
					$scope.numberAchieved = resp.data.num_achieved;
					$scope.recentAchievements = resp.data.recent_achievements;
				})
			};
			updateStats();
			updater = $interval(updateStats, __env.MAIN_UPDATE_INTERVAL);
		};

		$scope.$on('$destroy', function() {
			if (angular.isDefined(updater)) {
				$interval.cancel(updater);
				updater = undefined;
			}
		});

		$scope.update();
	}
]);
