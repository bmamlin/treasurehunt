var halson = require('halson');
var jwt = require('jsonwebtoken');
var mongoose = require('mongoose');
var sanitize = require('mongo-sanitize');
var uuid = require('uuid/v4');
var User = mongoose.model('User');
var Achievement = mongoose.model('Achievement');
var AuthToken = require('../models/authtoken');
var config = require('../config/main');
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
    var username = sanitize(req.body.username);
    logger.debug('Authenticating %s', username);
    User.findOne({
      username: username
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
  });

  // Handle authentication tokens
  router.route('/token')

  .post(function(req, res) {
    var token = sanitize(req.body.token);
    logger.debug('Auth token %s', token);

    // Look for token and authenticate if found
    AuthToken.findOne({id: token}, function(err, authToken) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Unable to find token'});
      } else if (authToken === null) {
        res.status(404);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: 'Invalid token'});
      } else {
        // Valid authentication token
        User.findOne({username: authToken.username}, function(err, user) {
          if (err) {
            logger.warn('Token with invalid username: %s', authToken.id)
            res.status(404);
            res.setHeader('Content-Type', 'application/vnd.error+json');
            res.json({ message: 'Invalid token'});
          }
          // Valid authentication token, return JWT token
          var token = jwt.sign(user.toObject(),config.secret,{
            expiresIn: '7 days'
          });
          // return the information including token as JSON
          res.status(200);
          res.setHeader('Content-Type', 'application/json');
          res.json({
            success: true,
            message: 'Authenticated via token as '+user.username,
            username: user.username,
            token: 'JWT '+token,
            admin: user.admin
          });
        });
      }
    });

  })
};