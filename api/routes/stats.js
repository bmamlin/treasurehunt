var halson = require('halson');
var Player = require('mongoose').model('Player');
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
				{ $project: { count: { $size: "$achievements" } } },
				{ $group:   {_id:null, n: { $sum: "$count" } } }
			], function(err, numAchieved) {
        res.status(200);
        res.setHeader('Content-Type', 'application/json');
        res.json({
        	num_active_players: numActivePlayers,
        	num_achieved: numAchieved[0].n
        });
			});
		});

  });

};
