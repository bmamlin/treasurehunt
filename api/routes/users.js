var halson = require('halson');
var mongoose = require('mongoose');
var User = mongoose.model('User');
var logger = require('../log');
var passphrase = require('../config/passphrase');
var sms = require('../sms');

module.exports = function(app, router, requireAuth) {
  'use strict';

  // This will handle call to /users/:username
  router.route('/:username')

  .get(requireAuth, function(req, res) {
    // Return user
    if (!req.user.admin && req.user.username != req.params.username) {
      res.status(401);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: 'Not authorized'});
      return;
    }
    User.findOne({username: req.params.username}, function(err, user) {
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
    User.update({
      id: req.params.username
    }, {
      username: req.params.username,
      name: req.body.name,
      phone: req.body.phone,
      grants: req.body.grants,
      password: req.body.password || passphrase(),
      admin: req.body.admin || false
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
        User.findOne({username: req.params.username}, function(err, user) {
          if (err) {
            res.status(500);
            res.setHeader('Content-Type', 'application/vnd.error+json');
            res.json({ message: "Failed to get user"});
          } else {
            logger.info(req.params.username+' updated by '+req.user.username);
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
    // Patch user to change password
    if (req.body.username && !req.user.admin) {
      res.status(401);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: 'Not authorized'});
      return;
    }
    if (!req.body.password || !req.body.new_password) {
      res.status(400);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: 'Changing password requires password, and new_password'});
      return;
    }
    var target_username;
    if (req.user.admin && req.body.username) {
      target_username = req.body.username;
    } else {
      target_username = req.user.username;
    }
    User.findOne({username:target_username},function(err, user) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: "Failed to update user"});
      } else {
        user.comparePassword(req.body.password, function(err, isMatch) {
          if (err || !isMatch) {
            logger.debug('Password mismatch');
            logger.debug(err);
            res.status(400);
            res.setHeader('Content-Type', 'application/vnd.error+json');
            res.json({ message: "Incorrect password"});
          } else {
            logger.debug('passwords match');
            user.password = req.body.new_password;
            user.save();
            logger.info(user.username + ' created by '+req.user.username);
            res.status(204).send();
          }
        });
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
    User.find({username:req.params.username}).remove(function(err) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Failed to remove user'});
      } else {
        logger.info(req.params.username+' deleted by '+req.user.username);
        res.status(204).send();
      }
    })
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
        sms.send(user.phone, 'Your new treasurehunt password is:\n\n'+newPassword);
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
          sms.send(newUser.phone,
            'Welcome to the Regenstrief Treasurehunt! ' +
            'Get started at http://bit.ly/treasurehunt-help\n\n' +
            'Your treasurehunt username is "' + newUser.username +
            '" and your password is:\n\n' + autoPassword);
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