var halson = require('halson');
var Player = require('../models/player');
var User = require('../models/user');
var mongoose = require('mongoose');
var sanitize = require('mongo-sanitize');
var Achievement = mongoose.model('Achievement');
var shortid = require('shortid');
var logger = require('../log');
var qr = require('qr-image');
ExtractJwt = require('passport-jwt').ExtractJwt;

module.exports = function(app, router, requireAuth) {
  'use strict';

  // This will handle call to /players/:player_id
  router.route('/:player_id')

  .get(function(req, res) {
    // Return player
    var playerId = sanitize(req.params.player_id);
    Player.findOne({id: playerId}, function(err, player) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Failed to get player'});
      } else if (player === null) {
        res.status(404);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Not found'});
      } else {
        res.status(200);
        res.setHeader('Content-Type', 'application/json');
        var resource = halson({
          id: player.id,
          url: player.url,
          name: player.name,
          org: player.org,
          achievements: player.achievements,
          active: player.active,
          disabled: player.disabled,
          created_at: player.created_at,
          updated_at: player.updated_at
        }).addLink(
          'self',
          '/players/' + player.id
        );
        res.send(JSON.stringify(resource));        
      }
    });
  })

  .put(requireAuth, function(req, res) {
    // Replace or create player
    if (!req.user.admin) {
      res.status(401);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: 'Not authorized'});
      return;
    }
    var playerId = sanitize(req.params.player_id);
    Player.update({
      id: playerId
    }, {
      id: sanitize(req.body.id) || playerId,
      url: sanitize(req.body.url),
      name: sanitize(req.body.name),
      org: sanitize(req.body.org),
      contact: sanitize(req.body.contact) || {},
      achievements: sanitize(req.body.achievements) || [],
      active: typeof req.body.active !== 'undefined' ? sanitize(req.body.active) : true,
      disabled: typeof req.body.disabled !== 'undefined' ? sanitize(req.body.disabled) : false
    }, {
      upsert: true
    }, function(err, raw) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Failed to update player'});
      } else {
        Player.findOne({id: playerId}, function(err, player) {
          if (err) {
            res.status(500);
            res.setHeader('Content-Type', 'application/vnd.error+json');
            res.json({ message: 'Failed to get player'});
          } else {
            res.status(200);
            res.setHeader('Content-Type', 'application/json');
            var resource = halson({
              id: player.id,
              url: player.url,
              name: player.name,
              org: player.org,
              contact: player.contact,
              achievements: player.achievements,
              active: player.active,
              disabled: player.disabled,
              created_at: player.created_at,
              updated_at: player.updated_at
            }).addLink(
              'self',
              '/players/' + player.id
            );
            res.send(JSON.stringify(resource));
          }
        });       
      }
    });
  })

  .patch(requireAuth, function(req, res) {
    // Patch player
    var playerId = sanitize(req.params.player_id);
    Player.findOne({
      id: playerId
    }, function(err, player) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Unable to find player'});
      } else {
        if (req.body.url) {
          logger.debug('Player %s url changed to %s',player._id,req.body.name);
          player.url = sanitize(req.body.url);
        }
        if (req.body.name) {
          logger.debug('Player %s name changed to %s',player._id,req.body.name);
          player.name = sanitize(req.body.name);
        }
        if (req.body.org != undefined) {
          logger.debug('Player %s org changed to %s',player._id,req.body.org);
          player.org = sanitize(req.body.org);
        }
        if (req.body.phone != undefined) {
          logger.debug('Player %s phone changed to %s',player._id,req.body.phone);
          player.phone = sanitize(req.body.phone);
        }
        if (req.body.email != undefined) {
          logger.debug('Player %s email changed to %s',player._id,req.body.email);
          player.email = sanitize(req.body.email);
        }
        if (req.body.achievements) {
          logger.debug('Player %s achievements changed to %s',player._id,req.body.achievements);
          player.achievements = sanitize(req.body.achievements);
        }
        if (typeof req.body.active !== 'undefined') {
          player.active = sanitize(req.body.active);
        } else {
          player.active = true;
        }
        if (typeof req.body.disabled !== 'undefined') {
          player.disabled = sanitize(req.body.disabled);
        }
        Player.update({_id:player._id},player,function(err, raw) {
          if (err) {
            res.status(500);
            res.setHeader('Content-Type', 'application/vnd.error+json');
            res.json({ message: 'Failed to update player'});
          } else {
            logger.debug('Response from mongo: %s', JSON.stringify(raw));
            Player.findOne({id: playerId}, function(err, player) {
              if (err) {
                res.status(500);
                res.setHeader('Content-Type', 'application/vnd.error+json');
                res.json({ message: 'Failed to update player'});
              } else {
                res.status(200);
                res.setHeader('Content-Type', 'application/json');
                var resource = halson({
                  id: player.id,
                  url: player.url,
                  name: player.name,
                  org: player.org,
                  email: player.email,
                  phone: player.phone,
                  achievements: player.achievements,
                  active: player.active,
                  disabled: player.disabled,
                  created_at: player.created_at,
                  updated_at: player.updated_at
                }).addLink(
                  'self',
                  '/players/' + player.id
                );
                res.send(JSON.stringify(resource));
              }
            });       
          }
        });
      }
    });
  })

  .delete(requireAuth, function(req, res) {
    // Delete player
    if (!req.user.admin) {
      res.status(401);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: 'Not authorized'});
      return;
    }
    var playerId = sanitize(req.params.player_id);
    logger.debug('Deleting player %s', playerId);
    Player.find({id:playerId}).remove(function(err) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Failed to remove player'});
      } else {
        res.status(204).send();
      }
    })
  });

  // This will handle call to /players/:player_id/admin
  router.route('/:player_id/admin')

  .get(requireAuth, function(req, res) {
    // Return player including contact info
    if (!req.user.admin) {
      res.status(401);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: 'Not authorized'});
      return;
    }
    var playerId = sanitize(req.params.player_id);
    Player.findOne({id: playerId}, function(err, player) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Failed to get player'});
      } else if (player === null) {
        res.status(404);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Not found'});
      } else {
        res.status(200);
        res.setHeader('Content-Type', 'application/json');
        var resource = halson({
          id: player.id,
          url: player.url,
          name: player.name,
          org: player.org,
          email: player.email,
          phone: player.phone,
          achievements: player.achievements,
          active: player.active,
          disabled: player.disabled,
          created_at: player.created_at,
          updated_at: player.updated_at
        }).addLink(
          'self',
          '/players/' + player.id
        );
        res.send(JSON.stringify(resource));        
      }
    });
  });

  // This will handle calls to /players/:player_id/qr
  router.route('/:player_id/qr')

  .get(function(req, res) {
    // Fetch player and generate their QR code
    var playerId = sanitize(req.params.player_id);
    logger.debug('fetching qr code for player '+playerId);
    Player.findOne({id: playerId}, function(err, player) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Failed to get player'});
      } else if (player === null) {
        res.status(404);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Not found'});
      } else {
        logger.debug('got player for qr generation');
        res.status(200);
        res.setHeader('Content-Type', 'image/svg+xml');
        var url = player.url || 'https://treasurehunt.regenstrief.org/p/'+player.id;        
        logger.debug('generating qr code for "'+url+'"');
        var svg = qr.image(url, {type: 'svg', size:4});
        svg.on('data', function(chunk) {
          res.write(chunk);
        });
        svg.on('end', function() {
          res.end();
        });
      }
    });
  })

  // This will handle calls to /players/:player_id/achievements
  router.route('/:player_id/achievements')

  .post(requireAuth, function(req, res) {
    var player;
    var playerId = sanitize(req.params.player_id);
    Player.findOne({id:playerId}).exec()
    .then(function(thePlayer) {
      player = thePlayer;
      return User.findOne({username:req.user.username}).exec();
    }).then(function(user) {
      var playerAchievements = player.achievements || [];
      for (var i=0; i < user.grants.length; i++) {
        var found = playerAchievements.filter(function(a, j) {
          return a.achievement === user.grants[i];
        });
        if (found.length < 1) {
          playerAchievements.push({
            achievement: user.grants[i],
            achieved_at: Date.now()
          });
        }
      }
      player.achievements = playerAchievements;
      player.active = true;
      return player.save();
    }).then(function(playerWithAchievement) {
      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      var resource = halson({
        id: playerWithAchievement.id,
        url: playerWithAchievement.url,
        name: playerWithAchievement.name,
        org: playerWithAchievement.org,
        contact: playerWithAchievement.contact,
        achievements: playerWithAchievement.achievements,
        active: playerWithAchievement.active,
        disabled: playerWithAchievement.disabled,
        created_at: playerWithAchievement.created_at,
        updated_at: playerWithAchievement.updated_at
      }).addLink(
        'self',
        '/players/' + playerWithAchievement.id
      );
      res.send(JSON.stringify(resource));
    }).catch(function(err) {
      res.status(500);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: app.settings.env === 'development' ?
            err.message : 'Not authorized'});
    });
  });

  // This will handle calls to /players/:player_id/achievements/:achievement_id
  router.route('/:player_id/achievements/:achievement_id')

  .post(requireAuth, function(req, res) {
    var player;
    var playerId = sanitize(req.params.player_id);
    Player.findOne({id:playerId}).exec()
    .then(function(thePlayer) {
      player = thePlayer;
      var achievementId = sanitize(req.params.achievement_id);
      return Achievement.findOne({id:achievementId}).exec();
    }).then(function(achievement) {
      var playerAchievements = player.achievements || [];
      var found = playerAchievements.filter(function(a) {
        return a.achievement === achievement.id;
      });
      if (found.length < 1) {
        logger.info(req.user.username+' granted '+achievement.id+' to '+player.id);
        playerAchievements.push({
          achievement: achievement.id,
          achieved_at: Date.now()
        });
        player.achievements = playerAchievements;
      }
      player.active = true;
      return player.save();
    }).then(function(playerWithAchievement) {
      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      var resource = halson({
        id: playerWithAchievement.id,
        url: playerWithAchievement.url,
        name: playerWithAchievement.name,
        org: playerWithAchievement.org,
        contact: playerWithAchievement.contact,
        achievements: playerWithAchievement.achievements,
        active: player.active,
        disabled: player.disabled,
        created_at: playerWithAchievement.created_at,
        updated_at: playerWithAchievement.updated_at
      }).addLink(
        'self',
        '/players/' + playerWithAchievement.id
      );
      res.send(JSON.stringify(resource));
    }).catch(function(err) {
      res.status(401);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: 'Not authorized'});
    });
  })

  // This will handle calls to /players
  router.route('/')
  
  .get(requireAuth, function(req, res) {
    // Return all players
    if (!req.user.admin) {
      res.status(401);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: 'Not authorized'});
      return;
    }
    Player.find({}, function(err, players) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Failed to get players'});
      } else {
        res.status(200);
        res.setHeader('Content-Type', 'application/json');
        var result = [];
        for (var i in players) {
          var resource = halson({
            id: players[i].id,
            url: players[i].url,
            name: players[i].name,
            org: players[i].org,
            email: players[i].email,
            phone: players[i].phone,
            achievements: players[i].achievements,
            active: players[i].active,
            disabled: players[i].disabled,
            created_at: players[i].created_at,
            updated_at: players[i].updated_at
          }).addLink(
            'self',
            '/players/' + players[i].id
          );
          result.push(resource);
        }
        res.send(JSON.stringify(result));
      }
    });
  })

  .post(requireAuth, function(req, res) {
    // Create new player
    if (!req.user.admin) {
      res.status(401);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: 'Not authorized'});
      return;
    }
    var id = sanitize(req.body.id) || shortid.generate();
    Player.create({
      id: id,
      url: sanitize(req.body.url) || 'https://treasurehunt.regenstrief.org/p/'+id,
      name: sanitize(req.body.name),
      org: sanitize(req.body.org),
      phone: sanitize(req.body.phone),
      email: sanitize(req.body.email),
      achievements: [],
      active: true
    }, function(err, newPlayer) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Failed to save player'});
      } else {
        res.status(201);
        res.setHeader('Content-Type', 'application/json');
        var resource = halson({
          id: newPlayer.id,
          url: newPlayer.url,
          name: newPlayer.name,
          org: newPlayer.org,
          achievements: newPlayer.achievements,
          active: newPlayer.active,
          disabled: newPlayer.disabled,
          created_at: newPlayer.created_at
        }).addLink(
          'self',
          '/players/' + newPlayer.id
        );
        res.send(JSON.stringify(resource));        
      }
    });
  });

};
