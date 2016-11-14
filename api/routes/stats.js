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
		Player.count({active: true, disabled: false}, function(err, numActivePlayers) {
			if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: "Failed to get active player count"});
        return;
			}
			Player.aggregate([
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
    Player.find({
      active: true,
      disabled: false,
      id: {$ne:"test"},
      achievements: {$exists:true},
      $where: "this.achievements.length > 1"
    }, function(err, players) {
      if (err) {
        logger.error(err.message);
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: "Failed to get top players"});
        return;        
      }
      stats.top_players = players;
      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.json(stats);
    });
  });

};
