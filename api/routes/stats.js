var halson = require('halson');
var Player = require('mongoose').model('Player');
var Achievement = require('mongoose').model('Achievement');
var logger = require('../log');

module.exports = function(app, router, requireAuth) {
  'use strict';

  // This will handle call to /stats
  router.route('/')

  .get(function(req, res) {
    // Return stats
		Player.count({
      active: true,
      disabled: false,
      id: {$ne: 'test'}
    }, function(err, numActivePlayers) {
			if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: "Failed to get active player count"});
        return;
			}
			Player.aggregate([
        { $match:   { id: {$ne: "test"} } },
				{ $project: { count: { $size: { $ifNull: ["$achievements", []] } } } },
				{ $group:   {_id:null, n: { $sum: "$count" } } }
			], function(err, numAchieved) {
        res.status(200);
        res.setHeader('Content-Type', 'application/json');
        res.json({
        	num_active_players: numActivePlayers,
        	num_achieved: numAchieved && numAchieved[0] ? numAchieved[0].n : 0
        });
			});
		});

  });

  // This will handle call to /stats/admin
  router.route('/admin')

  .get(requireAuth, function(req, res) {
    // Return deeper stats
    var stats = {};
    Player.count({
      active: true,
      disabled: false,
      id: {$ne: 'test'},
      $where: "this.achievements.length > 0"
    }).exec()
    .then(function(numPlaying) {
      stats.num_playing = numPlaying;
      return Player.find({
        active: true,
        disabled: false,
        id: {$ne:"test"},
        achievements: {$exists:true},
        $where: "this.achievements.length > 1"
      }).exec();
    }).then(function(players) {
      stats.top_players = players;
      // Fetch number of players with each achievements
      return Player.aggregate([
        { $match: { id:{$ne:"test"} } },
        { $unwind: "$achievements" },
        { $project: { _id:0, id:"$id", achievement:"$achievements.achievement"} },
        { $group: { _id: "$achievement", count: { $sum:1 } } },
        { $project: { _id:0, id:"$_id", n:"$count" } }
      ]).exec();
    }).then(function(achievementCounts) {
      stats.achievement_counts = achievementCounts;
      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.json(stats);
    }).catch(function(err) {
      logger.error(err.message);
      res.status(500);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: "Failed to get admin stats"});
    });
  });

};
