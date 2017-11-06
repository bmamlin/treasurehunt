var halson = require('halson');
var mongoose = require('mongoose');
var sanitize = require('mongo-sanitize');
var uuid = require('uuid/v4');
var User = mongoose.model('User');
var Player = require('../models/player');
var AuthToken = require('../models/authtoken');
var logger = require('../log');
var passphrase = require('../config/passphrase');
var sms = require('../sms');

function generateAuthToken(username) {
  var authToken = new AuthToken;
  authToken.id = uuid();
  authToken.username = username;
  authToken.save();
  // Limit user to one auth token
  AuthToken.remove({ $and: [
    { 'username': username },
    { 'id': { $ne: authToken.id } }
  ]}, function(err) {
    if (err) {
      logger.error(err);
    }
  });
  return authToken.id;
}

module.exports = function(app, router, requireAuth) {
  'use strict';

  // This will handle call to /users/:username
  router.route('/:username')

  .get(requireAuth, function(req, res) {
    // Return user
    var username = sanitize(req.params.username);
    if (!req.user.admin && req.user.username != username) {
      res.status(401);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: 'Not authorized'});
      return;
    }
    User.findOne({username: username}, function(err, user) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Failed to get user'});
      } else if (user === null) {
        res.status(404);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Not found'});
      } else {
        res.status(200);
        res.setHeader('Content-Type', 'application/json');
        var resource = halson({
          username: user.username,
          name: user.name,
          phone: user.phone,
          grants: user.grants,
          admin: user.admin,
          created_at: user.created_at,
          updated_at: user.updated_at
        }).addLink(
          'self',
          '/users/' + user.username
        );
        res.send(JSON.stringify(resource));        
      }
    });
  }) 

  .put(requireAuth, function(req, res) {
    // Replace or create user
    if (!req.user.admin) {
      res.status(401);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: 'Not authorized'});
      return;
    }
    var username = sanitize(req.params.username);
    User.update({
      id: username
    }, {
      username: username,
      name: sanitize(req.body.name),
      phone: sanitize(req.body.phone),
      grants: sanitize(req.body.grants),
      password: req.body.password || passphrase(),
      admin: sanitize(req.body.admin) || false
    }, {
      upsert: true
    }, function(err, raw) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({
          message: app.settings.env === 'development' ?
            err.message : 'Failed to update user'
        });
      } else {
        User.findOne({username: username}, function(err, user) {
          if (err) {
            res.status(500);
            res.setHeader('Content-Type', 'application/vnd.error+json');
            res.json({ message: 'Failed to get user'});
          } else {
            logger.info(username+' updated by '+req.user.username);
            res.status(200);
            res.setHeader('Content-Type', 'application/json');
            var resource = halson({
              username: user.id,
              name: user.name,
              phone: user.phone,
              grants: user.grants,
              admin: user.admin,
              created_at: user.created_at,
              updated_at: user.updated_at
            }).addLink(
              'self',
              '/players/' + user.username
            );
            res.send(JSON.stringify(resource));
          }
        });       
      }
    });
  })

  .patch(requireAuth, function(req, res) {
    // Patch user
    if (req.body.username && !req.user.admin) {
      res.status(401);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: 'Not authorized'});
      return;
    }
    if (req.body.new_password && !req.body.password) {
      res.status(400);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: 'Changing password requires password, and new_password'});
      return;
    }
    var target_username;
    if (req.user.admin && req.body.username) {
      target_username = req.body.username;
    } else {
      target_username = req.params.username;
    }
    User.findOne({username:target_username},function(err, user) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Failed to update user'});
      } else {
        var userChanged = false;
        if (req.body.name) {
          user.name = req.body.name;
          userChanged = true;
        }
        if (req.body.phone !== undefined) {
          user.phone = req.body.phone;
          userChanged = true;
        }
        if (req.body.grants !== undefined) {
          user.grants = req.body.grants;
          userChanged = true;
        }
        if (req.body.admin && req.user.admin) {
          user.admin = req.body.admin;
          userChanged = true;
        }
        if (userChanged) {
          user.save();
        }
        if (req.body.new_password) {
          user.comparePassword(req.body.password, function(err, isMatch) {
            if (err || !isMatch) {
              res.status(400);
              res.setHeader('Content-Type', 'application/vnd.error+json');
              res.json({ message: 'Incorrect password'});
            } else {
              user.password = req.body.new_password;
              user.save();
              res.status(204).send();
            }
          });
        } else {
          res.status(204).send();
        }
      }
    });
  })

  .delete(requireAuth, function(req, res) {
    // Delete user
    if (!req.user.admin) {
      res.status(401);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: 'Not authorized'});
      return;
    }
    var username = sanitize(req.params.username);
    User.find({username:username}).remove(function(err) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Failed to remove user'});
      } else {
        logger.info(username+' deleted by '+req.user.username);
        res.status(204).send();
      }
    });
    // Clear out any authentication tokens for the user
    AuthToken.find({username:username}).remove(function(err) {
      if (err) {
        logger.error('Error trying to clear auth tokens for '+username);
      } else {
        logger.info('Cleared auth tokens for '+username);
      }
    })
  });

  // This will handle calls to /users/:username/history
  router.route('/:username/history')

  .get(requireAuth, function(req, res) {
    // Return history of grants by current user

    User.findOne({username:req.user.username},function(err, user) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Failed to find user'});
      } else {
        Player.aggregate(
          { $match: {'achievements.achievement':{$in:user.grants} } },
          { 
            $project: {
              'id': '$id',
              'name': '$name',
              'org': '$org',
              'achievements': {
                $filter: {
                  input: '$achievements',
                  as: 'item',
                  cond: { $setIsSubset: [['$$item.achievement'], user.grants] }
                }
              }
            }
          },
          { $unwind: '$achievements' },
          { $sort: { 'achievements.achieved_at': 1 } },
          {
            $project: {
              'id': 1,
              'name': 1,
              'org': 1,
              'achieved_at': '$achievements.achieved_at'
            }
          },
          function(err, players) {
            res.status(200);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(players));
          }
        );
      }
    });

  });

  // This will handle calls to /users/:username/reset
  router.route('/:username/reset')
  
  .get(requireAuth, function(req, res) {
    // Reset user password
    if (!req.user.admin) {
      res.status(401);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: 'Not authorized'});
      return;
    }
    User.findOne({username: req.params.username}, function(err, user) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Failed to find user'});
      } else if (user === null) {
        res.status(404);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Not found'});
      } else if (!user.phone) {
        res.status(400);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Cannot reset password for user without phone.'});
        return;        
      } else {
        var newPassword = passphrase();
        user.password = newPassword;
        user.save();
        var authToken = generateAuthToken(user.username);
        sms.send(user.phone,
          'Welcome to the Regenstrief Treasurehunt! ' +
          'Get started at http://regen.st/treasure\n\n' +
          'username: ' + user.username + '\n' +
          'password: ' + newPassword + '\n\n' +
          'You can bypass login with this secret link:\n\n' +
          'https://treasurehunt.regenstrief.org' +
          '/admin/#/start?authToken=' + authToken);
        res.status(200);
        res.json({
          success: true,
          message: 'Password successfully reset. SMS sent to '+user.phone
        });
      }
    });
  });

  // This will handle calls to /users
  router.route('/')
  
  .get(requireAuth, function(req, res) {

    // Return all users
    if (!req.user.admin) {
      res.status(401);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: 'Not authorized'});
      return;
    }
    User.find({}, function(err, users) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Failed to get users'});
      } else {
        res.status(200);
        res.setHeader('Content-Type', 'application/json');
        var result = [];
        for (var i in users) {
          var resource = halson({
            username: users[i].username,
            name: users[i].name,
            phone: users[i].phone,
            grants: users[i].grants,
            admin: users[i].admin,
            created_at: users[i].created_at,
            updated_at: users[i].updated_at
          }).addLink(
            'self',
            '/users/' + users[i].username
          );
          result.push(resource);
        }
        res.send(JSON.stringify(result));
      }
    });
  })

  .post(requireAuth, function(req, res) {
    // Create new user
    if (!req.user.admin) {
      res.status(401);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: 'Not authorized'});
      return;
    }
    var autoPassword = undefined;
    if (!req.body.password) {
      autoPassword = passphrase();
    }
    if (autoPassword && !req.body.phone) {
      res.status(400);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: 'Either password or phone required.'});
      return;
    }
    User.create({
      username: req.body.username,
      name: req.body.name,
      phone: req.body.phone,
      grants: req.body.grants,
      password: req.body.password || autoPassword,
      admin: req.body.admin
    }, function(err, newUser) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Failed to save user'});
      } else {
        if (autoPassword) {
          var authToken = generateAuthToken(newUser.username);
          sms.send(newUser.phone,
            'Welcome to the Regenstrief Treasurehunt! ' +
            'Get started at http://regen.st/treasure\n\n' +
            'username: ' + newUser.username + '\n' +
            'password: ' + autoPassword + '\n\n' +
            'You can bypass login with this secret link:\n\n' +
            'https://treasurehunt.regenstrief.org' +
            '/admin/#/start?authToken=' + authToken);

        }
        res.status(201);
        res.setHeader('Content-Type', 'application/json');
        var resource = halson({
          id: newUser.username,
          name: newUser.name,
          phone: newUser.phone,
          grants: newUser.grants,
          admin: newUser.admin,
          created_at: newUser.created_at
        }).addLink(
          'self',
          '/users/' + newUser.username
        );
        res.send(JSON.stringify(resource));        
      }
    });
  });

};