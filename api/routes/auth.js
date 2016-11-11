var halson = require('halson');
var jwt = require('jsonwebtoken');
var mongoose = require('mongoose');
var User = mongoose.model('User');
var Achievement = mongoose.model('Achievement')
var config = require('../config/main')
var logger = require('../log');

module.exports = function(app, router, requireAuth) {
  'use strict';

  // This will handle calls to /auth
  router.route('/')

  .get(requireAuth, function(req, res) {
    // Return authenticated user
    User.findOne({username: req.user.username}, function(err, user) {
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

  .post(function(req, res) {
    // Authenticate
    logger.debug('Authenticating %s', req.body.username);
    User.findOne({
      username: req.body.username
    }, function(err, user) {
      logger.debug('Found user: %s', JSON.stringify(user));
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Error during authorization'});
      } else if (user) {
        // check if password matches
        user.comparePassword(req.body.password, function(err, isMatch) {
          if (err || !isMatch) {
            res.status(401);
            res.json({
              success: false,
              message: 'Not authorized'
            });
          } else {
            logger.debug('Authenticated');
            // if user is found and password is right
            // create a token
            var token = jwt.sign(user.toObject(),config.secret,{
              expiresIn: '7 days'
            });
            // return the information including token as JSON
            res.status(200);
            res.setHeader('Content-Type', 'application/json');
            res.json({
              success: true,
              message: 'Authenticated as '+user.username,
              token: 'JWT '+token,
              admin: user.admin
            });
          }
        });
      } else {
        res.status(401);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({
          success: false,
          message: 'Not authorized'
        });
      }
    });
  })
};