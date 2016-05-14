var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');

var User = new Schema({
	name: String,
	email: String,
	created_at: Date,
	last_sign_in: Date
});

User.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', User);