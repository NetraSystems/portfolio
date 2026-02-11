const nunjucks = require('nunjucks');
const express = require('express');
const app = express();

nunjucks.configure('public', {
  autoescape: true,
  express: app
});

module.exports = app;
