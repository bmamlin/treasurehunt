'use strict';

var twilio = require('twilio');
var logger = require('./log.js');

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_NUMBER = process.env.TWILIO_NUMBER;

var client = new twilio.RestClient(ACCOUNT_SID, AUTH_TOKEN);

client.send = function(phone, message) {
	client.messages.create({
    body: message,
    to: phone,
    from: TWILIO_NUMBER
	}, function(err, message) {
		if (err) {
			logger.error('Error messaging ' + phone);
			logger.error(err);
			return;
		}
		logger.info('Message sent to ' + phone + ' (' + message.sid + ')');
	});
}

module.exports = client