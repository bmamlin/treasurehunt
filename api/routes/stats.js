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
    logger.debug("stats requested");
    Promise.all([
      Player.count({active: true, disabled: false, id: {$ne: 'test'}}),
      Player.aggregate([
        { $match:   { id: {$ne: "test"} } },
        { $project: { count: { $size: { $ifNull: ["$achievements", []] } } } },
        { $group:   {_id:null, n: { $sum: "$count" } } }
      ]),
      Player.aggregate([
        { $match:   { id: {$ne: "test"} } },
        { $unwind: { path:"$achievements" } },
        { $project: { _id:0, name:1, org:1, achievement:"$achievements.achievement", achieved_at:"$achievements.achieved_at" } },
        { $sort: { achieved_at:-1 } },
        { $limit: 10 },
        { $lookup: { from:"achievements", localField:"achievement", foreignField:"id", as:"achievement"} },
        { $project: { name:1, org:1, achieved_at:1, achievement:{$arrayElemAt:["$achievement.name",0]} } }
      ])
    ])
    .then( ([numActivePlayers, numAchieved, recentAchievements]) => {
      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.json({
        num_active_players: numActivePlayers,
        num_achieved: numAchieved && numAchieved[0] ? numAchieved[0].n : 0,
        recent_achievements: recentAchievements
      });
    })
    .catch( (err) => {
      res.status(500);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: "Failed to get stats"});
      return;
    });

  });

  // This will handle call to /stats/admin
  router.route('/admin')

  .get(requireAuth, function(req, res) {
    // Return deeper stats
    logger.debug("admin stats requested");
    Promise.all([
      Player.count({
        active: true,
        disabled: false,
        id: {$ne: 'test'},
        $where: "this.achievements.length > 0"
      }),
      Player.find({
        active: true,
        disabled: false,
        id: {$ne:"test"},
        achievements: {$exists:true},
        $where: "this.achievements.length > 1"
      }),
      Player.aggregate([
        { $match: { id:{$ne:"test"} } },
        { $unwind: "$achievements" },
        { $project: { _id:0, id:"$id", achievement:"$achievements.achievement"} },
        { $group: { _id: "$achievement", count: { $sum:1 } } },
        { $project: { _id:0, id:"$_id", n:"$count" } }
      ])
    ])
    .then( ([numPlaying, topPlayers, achievementCounts]) => {
      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.json({
        num_playing: numPlaying,
        top_players: topPlayers,
        achievement_counts: achievementCounts
      });
    })
    .catch( (err) => {
      res.status(500);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: "Failed to get admin stats"});
      return;
    });

  });

};
