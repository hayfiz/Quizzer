var passport = require('passport');
var User = require('./models/user');
var express = require('express');
var router = express.Router();

router.route('/register')
	.get(function(req, res, next) {
		res.render('',{});
	})
	.post(function(req, res, next) {
		User.register(new User({username: req.body.username}));
	})