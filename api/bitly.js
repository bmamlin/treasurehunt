'use strict';

var http = require('http');
var logger = require('./log.js');

const BITLY_TOKEN = process.env.BITLY_TOKEN;

module.exports = function(longUrl, callback) {
	var escapedLongUrl = encodeURIComponent(longUrl);
	return http.get({
	  host: 'https://ssl-api.bitly.com',
	  path: '/v3/shorten?access_token='+BITLY_TOKEN+'&longUrl='+escapedLongUrl
	}, function(resp) {
		callback(resp.data.url);
	});
}