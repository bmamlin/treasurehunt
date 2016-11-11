"use strict";

const winston = require("winston");
require("winston-loggly-bulk");
const fs = require("fs");

const env = process.env.NODE_ENV || "development";

const logDir = "../log";
// Create the log directory if it does not exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const tsFormat = () => (new Date()).toLocaleTimeString();
const logger = new (winston.Logger)({
  transports: [
    // colorize the output to the console
    new (winston.transports.Console)({
      timestamp: tsFormat,
      colorize: true,
      level: env === "development" ? "debug" : "info"
    }),
    new (require("winston-daily-rotate-file"))({
      filename: `${logDir}/-results.log`,
      timestamp: tsFormat,
      datePattern: "yyyy-MM-dd",
      prepend: true,
      level: env === "development" ? "debug" : "info"
    }),
    new (winston.transports.Loggly)({
      token: process.env.LOGGLY_TOKEN,
      subdomain: process.env.LOGGLY_DOMAIN,
      tags: ["Winston-NodeJS"],
      json:true,
      level: env === "development" ? "debug" : "info"
    })
  ]
});

module.exports = logger;