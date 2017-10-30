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

	  $scope.withAuthToken = function() {
	  	if ('authToken' in $location.search()) {
	  		var authToken = $location.search().authToken;
	  		$location.search({});
	  		$scope.loginWithToken(authToken);
	  	} else {
	  		return false;
	  	}
	  }

	  $scope.authToken = $location.search().authToken;

	  $scope.loginWithToken = function(authToken) {
	    AuthService.loginWithToken(authToken).then(function() {
	    	$scope.loginMessage = undefined;
	    }, function(err) {
	    	$scope.loginMessage = 'Invalid token';
	    });
	  };
  }
])

.controller('DashboardCtrl', ['__env', '$scope', '$http',
	function(__env, $scope, $http) {
		$scope.numberOfPlayers = '?';
		$scope.numberAchieved = '?';
		$scope.topPlayers = [];
		$scope.achievementsGranted = [];
		$http.get(__env.API+'/stats').then(function(resp) {
			$scope.numberOfPlayers = resp.data.num_active_players;
			$scope.numberAchieved = resp.data.num_achieved;
		});
		$http.get(__env.API+'/stats/admin').then(function(resp) {
			$scope.numPlaying = resp.data.num_playing;
			$scope.topPlayers = resp.data.top_players;
			var achievementCounts = resp.data.achievement_counts.reduce(function(map, obj) {
				map[obj.id] = obj.n;
				return map;
			}, {});
			$http.get(__env.API+'/achievements').then(function(resp) {
				var achievements = resp.data;
				for (var i=0; i<achievements.length; i++) {
					$scope.achievementsGranted.push({
						name: achievements[i].name,
						n: achievementCounts[achievements[i].id] || 0
					});
				}
			})
		});
	}
])

.controller('AchievementsCtrl', ['__env', '$scope', '$http', 'AuthService',
	function(__env, $scope, $http, AuthService) {
	  $scope.isAdmin = function() {
	  	return AuthService.isAdmin();
	  };
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
	  $scope.isAdmin = function() {
	  	return AuthService.isAdmin();
	  };
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
		$scope.updateUserName = function(u) {
			return $http.patch(__env.API+'/users/'+u.username,
				{ name: u.name });
		};
		$scope.updateUserPhone = function(u) {
			return $http.patch(__env.API+'/users/'+u.username,
				{ phone: u.phone });
		};
		$scope.updateUserGrants = function(u) {
			return $http.patch(__env.API+'/users/'+u.username,
				{ grants: u.grants.split(/[\s,]+/) });
		};
	}
])

.controller('PlayersCtrl', ['__env', '$scope', '$http', 'AuthService',
	function(__env, $scope, $http, AuthService) {
	  $scope.isAdmin = function() {
	  	return AuthService.isAdmin();
	  };
		$scope.player = {};
		$scope.sortOrder = '-achievements.length'
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
		$scope.updatePlayerName = function(p) {
			return $http.patch(__env.API+'/players/'+p.id,
				{ name: p.name });
		};
		$scope.updatePlayerOrg = function(p) {
			return $http.patch(__env.API+'/players/'+p.id,
				{ org: p.org });
		};
		$scope.updatePlayerEmail = function(p) {
			return $http.patch(__env.API+'/players/'+p.id,
				{ email: p.email });
		};
		$scope.updatePlayerPhone = function(p) {
			return $http.patch(__env.API+'/players/'+p.id,
				{ phone: p.phone });
		};
	}
])

.controller('ProfileCtrl', ['__env', '$scope', '$http', 'AuthService',
	function(__env, $scope, $http, AuthService) {

		$scope.username = AuthService.currentUser;

	  $scope.logout = function() {
	  	AuthService.logout();
	  };
	  $scope.history = function() {

	  }
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
				$scope.changePasswordMessage = 'Password changed';
				$scope.currentPassword = undefined;
				$scope.newPassword = undefined;
				$scope.confirmPassword = undefined;
			}, function(err) {
				$scope.changePasswordMessage = err.data.message;
			});
	  }
	}
])

.controller('StartCtrl', ['__env', '$scope', '$http',
	function(__env, $scope, $http) {
	}
]);