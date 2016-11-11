var changeCase = require('change-case');
var express = require('express');
var passport = require('passport');
var jwt = require('jsonwebtoken');
var routes = require('require-dir')();
var logger = require('../log');

const requireAuth = passport.authenticate('jwt', { session: false });

module.exports = function(app) {
  'use strict';

  app.use(passport.initialize());
  require('../config/passport')(passport);
  
  // Initialize all routes
  logger.debug('looping over routes');
  Object.keys(routes).forEach(function(routeName) {

    logger.debug('setting up routes for %s', routeName);

    var router = express.Router();
    
    // Initialize the route to add its functionality to router
    require('./' + routeName)(app, router, requireAuth);

    // Add router to the specified route name in the app
    app.use('/' + changeCase.paramCase(routeName), router);
  }); 
};