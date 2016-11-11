'use strict';

var express = require('express'),
  path = require('path'),
  bodyParser = require('body-parser'),
  cookieParser = require('cookie-parser'),
  cors = require('cors'),
  logger = require('./log'),
  halson = require('halson'),
  config = require('./config/main'),
  mongoose = require('mongoose'),
  User = require('./models/user');

var app = express();

// Use body parse to get data from POSTs
app.use(bodyParser.urlencoded({ extended: true }));  
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors({origin:true, credentials:true}));

app.use(function(err, req, res, next) {
  logger.error(err.stack);
  res.status(500);
  res.setHeader('Content-Type', 'application/vnd.error+json');
  res.json({
    message: app.settings.env === 'development' ?
      err.stack : 'Bummer. Server error. Try again?'
  });
})

var port = process.env.PORT || 3000;

// Use native promises
mongoose.Promise = global.Promise;
mongoose.connect(config.db[app.settings.env]);

// Create admin user if no users exist
User.count({}, function(err, numUsers) {
  if (err) {
    logger.warn('Error trying to count users on startup');
  } else {
    if (numUsers < 1) {
      var default_admin = config.default_admin;
      default_admin.admin = true;
      new User(default_admin).save();
    }
  }
});

logger.info('Initializing routes...');
require('./routes')(app);

// Initialize the app.
var server = app.listen(port, function () {
  var host = server.address().address;
  host = (host === '::' ? 'localhost' : host);
  var port = server.address().port;
  logger.info('listening at http://%s:%s', host, port);
});