angular.module('app')

.controller('AppCtrl', ['$scope', '$http', '$location', 'AuthService',
	function($scope, $http, $location, AuthService) {

		$scope.$location = $location;

	  $scope.login = function() {
	    AuthService.login($scope.user).then(function() {
	    	$scope.loginMessage = undefined;
	    }, function(err) {
	    	$scope.loginMessage = 'Login failed';
	    });
	  };

	  $scope.isAuthenticated = function() {
	  	return AuthService.isAuthenticated();
	  };

	  $scope.isAdmin = function() {
	  	return AuthService.isAdmin();
	  };
  }
])

.controller('DashboardCtrl', ['__env', '$scope', '$http',
	function(__env, $scope, $http) {
		$scope.numberOfPlayers = '?';
		$scope.numberAchieved = '?';
		$http.get(__env.API+'/stats').then(function(resp) {
			$scope.numberOfPlayers = resp.data.num_active_players;
			$scope.numberAchieved = resp.data.num_achieved;
		});
	}
])

.controller('AchievementsCtrl', ['__env', '$scope', '$http',
	function(__env, $scope, $http) {
		$scope.achievement = {};
		function loadAchievements() {
			$http.get(__env.API+'/achievements').then(function(resp) {
				$scope.achievements = resp.data;
			});
		}
		loadAchievements();
		$scope.addAchievement = function() {
			$http.post(__env.API+'/achievements',JSON.stringify($scope.achievement)).then(function(resp) {
				$scope.achievement = {};
				loadAchievements();
			}, function(err) {
				$scope.achievement = {};
			});
		}
		$scope.deleteAchievement = function(a) {
			$http.delete(__env.API+'/achievements/'+a.id).then(function(resp) {
				loadAchievements();
			});
		}
	}
])

.controller('UsersCtrl', ['__env', '$scope', '$http', 'AuthService',
	function(__env, $scope, $http, AuthService) {
		$scope.user = {};
		function loadUsers() {
			$http.get(__env.API+'/users').then(function(resp) {
				$scope.users = resp.data;
			});
		}
		loadUsers();
		$scope.addUser = function() {
			$http.post(__env.API+'/users',JSON.stringify($scope.user)).then(function(resp) {
				$scope.user = {};
				loadUsers();
			}, function(err) {
				$scope.user = {};
			});
		};
		$scope.deleteUser = function(u) {
			$http.delete(__env.API+'/users/'+u.username).then(function(resp) {
				loadUsers();
			});
		};
		$scope.editUser = function(u) {
			$scope.user = u;
		};
		$scope.resetPassword = function(event, u) {
			var elem = event.target || event.srcElement;
			$http.get(__env.API+'/users/'+u.username+'/reset').then(function(resp) {
				if (resp.status == 200) {
					$(elem).hide();
				}
			});
		};
		$scope.currentUser = function() {
			return AuthService.currentUser();
		};
	}
])

.controller('PlayersCtrl', ['__env', '$scope', '$http',
	function(__env, $scope, $http) {
		$scope.player = {};
		function loadPlayers() {
			$http.get(__env.API+'/players').then(function(resp) {
				$scope.players = resp.data;
			});
		}
		loadPlayers();
		$scope.addPlayer = function() {
			$http.post(__env.API+'/players',JSON.stringify($scope.player)).then(function(resp) {
				$scope.player = {};
				loadPlayers();
			}).catch(function(err) {
				$scope.player = {};
			});
		};
		$scope.disablePlayer = function(p) {
			p.disabled = true;
			$http.patch(__env.API+'/players/'+p.id,JSON.stringify(p));
		};
		$scope.enablePlayer = function(p) {
			p.disabled = false;
			$http.patch(__env.API+'/players/'+p.id,JSON.stringify(p));
		};
		$scope.deletePlayer = function(p) {
			$http.delete(__env.API+'/players/'+p.id).then(function(resp) {
				loadPlayers();
			});
		};
	}
])

.controller('ProfileCtrl', ['__env', '$scope', '$http', 'AuthService',
	function(__env, $scope, $http, AuthService) {

		$scope.username = AuthService.currentUser;

	  $scope.logout = function() {
	  	AuthService.logout();
	  };
	  $scope.changePassword = function() {
	  	if ($scope.newPassword != $scope.confirmPassword) {
	  		$scope.changePasswordMessage = 'Passwords do not match';
	  		return;
	  	} else {
	  		$scope.changePasswordMessage = undefined;
	  	}
	  	var request = {
	  		password: $scope.currentPassword,
	  		new_password: $scope.newPassword
	  	};
			$http.patch(
				__env.API+'/users/'+AuthService.currentUser(),
				JSON.stringify(request)
			).then(function(resp) {
				$scope.currentPassword = undefined;
				$scope.newPassword = undefined;
				$scope.confirmPassword = undefined;
			}, function(err) {
				$scope.changePasswordMessage = err.data.message;
			});
	  }
	}
]);