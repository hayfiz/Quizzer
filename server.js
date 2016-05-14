//Dependencies

var http = require('http');
var fs = require('fs');
var url = require('url');
var querystring = require('querystring');
var jsonfile = require('jsonfile');
var json2csv = require('json2csv');
var phantom = require('phantom');
var ejs = require('ejs');
var webshot = require('webshot');
var mongojs = require('mongojs');
var crypto = require('crypto'),
	algorithm = 'aes-256-ctr',
	password = 'd6F3Efeq';
var path = require('path');
var util = require('util');
var bodyParser = require('body-parser');

//express
var express = require('express'),
    app = express(),
    port = process.env.PORT || 3000;


var session = require('express-session');
// var mongoose = require('mongoose');

//passport authentication
var passport = require('passport');
var localStrategy = require('passport-local').Strategy;

//local storage
if (typeof localStorage === "undefined" || localStorage === null) {
  var LocalStorage = require('node-localstorage').LocalStorage;
  localStorage = new LocalStorage('./scratch');
}

//express middleware
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/bower_components',  express.static(__dirname + '/bower_components'));
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());

app.use(session({
	secret: process.env.SESSION_SECRET || 'quizzer',
	resave: false,
	saveUninitialized: false
}));

// passport configuration
app.use(passport.initialize());
app.use(passport.session());

passport.use(new localStrategy(function(username, password, done) {
	db.users.find({username: encrypt(username)}, function(err, foundUser) {
		if (err) {
			console.log(err);
		}
		else if (!foundUser || foundUser.length == 0) {
			console.log('That user does not exist');
			done(null, null);
		}
		else {
			if (encrypt(password)===foundUser[0].password) {
				done(null, foundUser);
			}
			else {
				done(null, null);
			}
		}
	})
}));


passport.serializeUser(function(user, done) {
	done(null, user);
});
passport.deserializeUser(function(user, done) {
	done(null, user);
});

//db
var dburl = 'localhost/quizzer';
var collections = ['users','quizzes','responses','results','feedback','question_pools'];
var db = mongojs(dburl, collections);


//Routes

//index
app.get('/', function(req, res) {
  res.render('index');
});

app.get('/create_options', function(req, res) {
	res.render('create_options');
});

//Signup
app.get('/signup', function(req, res) {
	res.render('Administrator/signup');
});

app.post('/signup', function(req,res) {
	user = req.body;
	for (param in user) {
		user[param] = encrypt(user[param]);
	};
	db.users.save(user, function(err, savedUser) {
		if (err || !savedUser) {
			console.log('Oops something went wrong: '+ err);
		}
		else {
			res.render('Administrator/successful_signup', {name: decrypt(user.name)});
		};
	}); 
});

//Test route, solely for development purposes
/*
app.get('/tester', function(req, res) {
	res.render('test', {
		isAuthenticated: req.isAuthenticated(),
		user: req.user
	});
});
*/

//login
app.get('/login', function(req, res) {
	res.render('Administrator/login');
});

app.post('/login', passport.authenticate('local'), function(req, res) {
	localStorage.setItem('username', req.body.username);
	res.redirect('/dashboard');
});

//logout
app.get('/logout', function(req,res) {
	localStorage.removeItem('username');
	req.logout();
	res.redirect('/');
});

/*Quiz creation routes*/

//stanalone quiz creation
app.get('/create_quiz', function(req, res) {
	res.render('new_quiz');
});

app.post('/createNewQuiz', function(req, res) {
	var body = req.body;
	/* Parser */
	var d = {};
	d.questions = [];
	var staticKeys = ['quizName', 'quizDescription','timeLimit','randomise'];
	for (var key in body){
		if (body.hasOwnProperty(key)){
			var val = body[key];
			if (staticKeys.indexOf(key) > -1){
				d[key] = val;
			} else {
				// its a question
				var n = key.split('_');
				if (typeof d.questions[n[1]] == "undefined"){
					d.questions[n[1]] = {};
				}
				if (n[2] == 'Optiontext'){
					if(typeof d.questions[n[1]]['Optiontext'] == "undefined"){
						d.questions[n[1]]['Optiontext'] = [];
					}
					for (var i = 0; i<val.length;i++) {
						d.questions[n[1]]['Optiontext'].push(val[i]);
					}
				} else {
					d.questions[n[1]][n[2]] = val;
				}
			}
		}
	}
	/* Parser/ */
	data = d;
	//save quiz to db
  	db.quizzes.save(d, function(err, savedQuiz) {
  		if (err||!savedQuiz) console.log("Quiz: "+ d.quizName + "not saved because of error " + err);
  		else console.log("Quiz: "+d.quizName+" saved");
  	});

	res.render('success', data);
	
});

//Administrator quiz creation

app.get('/admin_create_quiz', function(req, res) {
	res.render('Administrator/admin_new_quiz', {isAuthenticated: req.isAuthenticated()});
});


app.post('/adminCreateNewQuiz', function(req, res) {
	var body = req.body;
	/* Parser */
	var d = {};
	d.creator_username = localStorage.getItem('username');
	if (body.activate == 'YES') {
		d.active = true;
	} else {
		d.active = false;
	};
	d.questions = [];
	var staticKeys = ['quizName', 'quizDescription','timeLimit','attemptLimit','feedback','randomise', 'activate'];
	for (var key in body){
		if (body.hasOwnProperty(key)){
			var val = body[key];
			if (staticKeys.indexOf(key) > -1){
				d[key] = val;
			} else {
				// its a question
				var n = key.split('_');
				if (typeof d.questions[n[1]] == "undefined"){
					d.questions[n[1]] = {};
				}
				if (n[2] == 'Optiontext'){
					if(typeof d.questions[n[1]]['Optiontext'] == "undefined"){
						d.questions[n[1]]['Optiontext'] = [];
					}
					for (var i = 0; i<val.length;i++) {
						d.questions[n[1]]['Optiontext'].push(val[i]);
					}
				} else {
					d.questions[n[1]][n[2]] = val;
				}
			}
		}
	}
	/* Parser/ */
	data = d;
	//save quiz to db
  	db.quizzes.save(d, function(err, savedQuiz) {
  		if (err||!savedQuiz) console.log("Quiz: "+ d.quizName + "not saved because of error " + err);
  		else console.log("Quiz: "+d.quizName+" saved");
  	});
	res.render('success', data);
	
});

/***************************************************/

/*Dashboard routes*/
//dashboard
app.get('/dashboard', function(req, res) {
	username = localStorage.getItem('username'); //Retrieve username from local storage
	db.responses.find({creator_username: localStorage.getItem('username'), evaluated: false}, function(err, foundResponse) { //DB check for unevaluated responses, with foundResponse as callback
						if (err||!foundResponse) {console.log(err)}
							else {
								unevaluated = foundResponse.length; //store unevaluated variable
								console.log(unevaluated);
								getFeedback(unevaluated); //call feedback function
							};
					});

	function getFeedback(unevaluated) {
		db.feedback.find({creator_username: localStorage.getItem('username'), seen: false}, function(err, foundFeedback) { //DB check for unseen feedback, with foundFeedback as callback
							if (err||!foundFeedback) {
								console.log(err)
							} else {
								unseen_feedback = foundFeedback.length;
								getActive(unevaluated, unseen_feedback); //call active quizzes function
							}
		})
	}

	function getActive(unevaluated, unseen_feedback) {
		db.quizzes.find({creator_username: localStorage.getItem('username'), active:true}, function(err, foundQuiz) { //DB check for active quizzes, with foundQuiz as callback
							if (err||!foundQuiz) {
								console.log(err)
							} else {
								active_quizzes = foundQuiz.length;
								done(unevaluated, unseen_feedback, active_quizzes); 
							}
		})
	}
	//function to render dashboard on completion of all callback tasks
	function done(unevaluated, feedback, active) {
		res.render('Administrator/dashboard', {
		isAuthenticated: req.isAuthenticated(),
		username: username,
		unevaluated: unevaluated,
		feedback: feedback,
		active: active
	});
	}
	
});

/** Quizzes sub-routes **/
app.get('/quizzes', function(req, res) {
	db.quizzes.find({creator_username: localStorage.getItem('username')}, function(err, foundQuiz) {
		if (err||!foundQuiz) {console.log("Quiz not found because of error " + err); }
		else {
			data = foundQuiz;
			res.render('Administrator/dashboard_routes/quizzes', {
				isAuthenticated: req.isAuthenticated(),
				data: data
			});
		}
	})
}); 

//download quiz
app.post('/download_quiz', function(req, res) {
 	var data = JSON.parse(req.body.data);
	var file = data.quizName+'.json';
	var obj = data;
 
jsonfile.writeFile(file, obj, function (err) {
	if (err!= null) {
		console.error(err)
		};
	});

	res.end(data.quizName);
});

//print quiz
app.post('/print_quiz', function(req, res) {
	var data = JSON.parse(req.body.data);
	console.log(data);
});

//preview quiz
app.post('/preview_quiz', function(req, res) {
	 datax = JSON.parse(req.body.data);
	 res.render('Administrator/dashboard_routes/quizzes_sub_routes/preview_quiz', {data: datax});
});

//edit quiz
app.post('/edit_quiz', function(req, res) {
	data = JSON.parse(req.body.data);
	res.render('Administrator/dashboard_routes/quizzes_sub_routes/edit_quiz', {isAuthenticated: req.isAuthenticated(),
							data: data});
});

//update quiz
app.post('/update_quiz', function(req, res) {
	body = req.body;
	data = {};
	data.questions = [];
	//activate quiz if checked during editing
	if (body.activate == 'YES') {
		data.active = true;
		delete body.activate;
	} else {
		data.active = false;
		delete body.activate;
	};
	/* Parser */
	var staticKeys = ['creator_username','quizName', 'quizDescription','timeLimit','attemptLimit','feedback','randomise'];
	for (var key in body){
		if (body.hasOwnProperty(key)){
			var val = body[key];
			if (staticKeys.indexOf(key) > -1){
				data[key] = val;
			} else {
				var n = key.split('_');
				if (typeof data.questions[n[1]] == "undefined"){
					data.questions[n[1]] = {};
				}
				if (n[2] == 'Optiontext'){
					if(typeof data.questions[n[1]]['Optiontext'] == "undefined"){
						data.questions[n[1]]['Optiontext'] = [];
					}
					for (var i = 0; i<val.length;i++) {
						data.questions[n[1]]['Optiontext'].push(val[i]);
					}
				} else {
					data.questions[n[1]][n[2]] = val;
				}
			}
		}
	}
	/*Parser/*/
	//update quiz in db
	db.quizzes.remove({creator_username: data.creator_username, quizName: data.quizName}, function(err, removedQuiz) {
		if (err||!removedQuiz) {
			console.log(err);
		} else {
			db.quizzes.save(data, function(err, savedQuiz) {
				if (err||!savedQuiz) console.log("Quiz: "+ data.quizName + "not updated because of error: " + err);
  				else {
  					console.log("Quiz: "+data.quizName+" saved");
  					res.render('Administrator/dashboard_routes/quizzes_sub_routes/preview_quiz', {data})
  				}
			});
		};
	});
});

//delete quiz
app.post('/delete_quiz', function(req, res) {
	data = JSON.parse(req.body.data);
	db.quizzes.remove({creator_username: data.creator_username, quizName: data.quizName}, function(err, removedQuiz) {
		if (err||!removedQuiz) {
			console.log("Quiz not removed because of error "+ err);
		} else {
			res.end(JSON.stringify(data));
		};
	});
	
});

//activate quiz
app.post('/activate_quiz', function(req, res) {
	data = JSON.parse(req.body.data);
	db.quizzes.update({creator_username: data.creator_username, quizName: data.quizName}, {$set: {active: true}}, function(err, activatedQuiz) {
		if (err||!activatedQuiz) {
			console.log("Quiz not activated because of error "+ err);
		} else {
			db.quizzes.find({creator_username: data.creator_username}, function(err, foundQuiz) {
				if (err||!foundQuiz) {console.log("Quiz not found because of error " + err); }
				else {
					data = foundQuiz;
					res.render('Administrator/dashboard_routes/quizzes', {
						isAuthenticated: req.isAuthenticated(),
						data: data
					});
				}
			})
		}
	});
});

//deactivate quiz
app.post('/deactivate_quiz', function(req, res) {
	data = JSON.parse(req.body.data);
	db.quizzes.update({creator_username: data.creator_username, quizName: data.quizName}, {$set: {active: false}}, function(err, deactivatedQuiz) {
		if (err||!deactivatedQuiz) {
			console.log("Quiz not activated because of error "+ err);
		} else {
			db.quizzes.find({creator_username: data.creator_username}, function(err, foundQuiz) {
				if (err||!foundQuiz) {console.log("Quiz not found because of error " + err); }
				else {
					data = foundQuiz;
					res.render('Administrator/dashboard_routes/quizzes', {
						isAuthenticated: req.isAuthenticated(),
						data: data
					});
				}
			})
		}
	});
});

/*********************/

/** Responses sub-routes **/
app.get('/responses', function(req, res) {
	quizJson = {};
	responseJson = {};
	db.quizzes.find({creator_username: localStorage.getItem('username')}, function(err, foundQuiz) {
		if (err||!foundQuiz) {console.log("Quiz not found because of error " + err); }
		else {
			if (foundQuiz.length == 0) { //if no quizzes exist
				res.render('Administrator/dashboard_routes/responses', {
					isAuthenticated: req.isAuthenticated(),
					data: responseJson});
			} 
			//else parse quiz names and descriptions into json
			for (quiz in foundQuiz) {
				quizJson[quiz] = {quizName: foundQuiz[quiz].quizName,
									quizDescription: foundQuiz[quiz].quizDescription};
			}

			//get responses for each quiz found
			function getResponses(quizzes, cb) {
				var complete = Object.keys(quizzes).length;
				
				for (var quiz in quizzes) {
					var responses = [];
					db.responses.find({quizName: quizzes[quiz].quizName, creator_username: localStorage.getItem('username'), evaluated: false}, function(err, foundResponse) {
						if (err||!foundResponse) {console.log(err)}
							else { 
								responses.push(foundResponse);
								complete--;
								if (complete == 0) {
									cb(quizzes, responses);
								};
							};
					});
				};
			};

			//when done parse data to be passed to view and render view
			function done(quizArray, responsesArray) {
				for (i = 0; i<Object.keys(quizArray).length; i++) {
					if (responsesArray[i][0] != undefined) {
						responseJson[responsesArray[i][0].quizName] = {
						quizName:responsesArray[i][0].quizName,
					 	responses: responsesArray[i]
						};
					}
					
					
				};
				res.render('Administrator/dashboard_routes/responses', {
					isAuthenticated: req.isAuthenticated(),
					data: responseJson});
			}
			getResponses(quizJson, done);
		} 
	});
});

//evaluate
app.post('/evaluate', function(req, res) {
	data = JSON.parse(req.body.data);
	console.log(data);
	res.render('Administrator/dashboard_routes/responses_sub_routes/evaluate', {
		isAuthenticated: req.isAuthenticated(),
		data: data
	})
});

//evaluate specific quiz
app.post('/eval_specific', function(req, res) {
	body = JSON.parse(req.body.data);
	/* Parser */
	data = {};
	data.questions = [];
	data.grades = [];
	var staticKeys = ['creator_username','score','quizName', '_id','studentID','evaluated','attempted'];
	for (var key in body){
		if (body.hasOwnProperty(key)){
			var val = body[key];
			if (staticKeys.indexOf(key) > -1){
				data[key] = val;
			} else {
				// its a question
				var n = key.split('_');
				var x = n[1]-1;
			 	var y = 'Question '+ (x+1);
			 	console.log(n);
			 	if (n[2] == "choice") {
			 		if (typeof data.questions[y] == "undefined"){
						
						data.questions[y] = {};
						data.questions[y][n[2]] = val;
					} else {
						data.questions[y][n[2]] = val;
					}
			 	} else {
			 		if (typeof data.grades[y] == "undefined"){
						
						data.grades[y] = {};
						data.grades[y][n[2]] = val;
					} else {
						data.grades[y][n[2]] = val;
					}
			 	}
				
			}
		}
	}
	/* Parser /*/
	//retrieve original quiz and pass information to view
	db.quizzes.find({creator_username: body.creator_username, quizName: body.quizName}, function(err, foundQuiz) {
		if (err||!foundQuiz) {console.log(err)}
		else {
			quiz = foundQuiz[0];
			response = data;
			console.log(response)
			res.render('Administrator/dashboard_routes/responses_sub_routes/eval_specific', {
				isAuthenticated: req.isAuthenticated(),
				quiz: quiz,
				response: response
			});
		}
	})


	
});

//save evaluated response
app.post('/save_graded_response', function(req, res) {
	body = req.body;
	/* Parser */
	data = {};
	data.questions = [];
	data.grades = [];
	var staticKeys = ['creator_username','quizName', '_id','studentID','evaluated','attempted', 'score'];
	for (var key in body){
		if (body.hasOwnProperty(key)){
			var val = body[key];
			if (staticKeys.indexOf(key) > -1){
				data[key] = val;
			} else {
				// its a question
				var n = key.split('_');
					var x = n[1]-1;
					var z = x+1;
				 	var y = 'Question '+ (x+1);
					if (typeof data.questions[n[1]-1] == "undefined"){
						
						data.questions[n[1]-1] = { Question: z};
						data.questions[n[1]-1][n[2]] = val;
					} else {
						data.questions[n[1]-1][n[2]] = val;
					}
			}
		}
	}

	data.evaluated = true;
	delete data._id;
	/* Parser /*/

	/*Parse function for evaluated responses*/
	function parser(body) {
		data = {};
	data.questions = [];
	data.grades = [];
	var staticKeys = ['creator_username','quizName', '_id','studentID','evaluated','attempted', 'score'];
	for (var key in body){
		if (body.hasOwnProperty(key)){
			var val = body[key];
			if (staticKeys.indexOf(key) > -1){
				data[key] = val;
			} else {
				// its a question
				var n = key.split('_');
					var x = n[1]-1;
					var z = x+1;
				 	var y = 'Question '+ (x+1);
					if (typeof data.questions[n[1]-1] == "undefined"){
						
						data.questions[n[1]-1] = { Question: z};
						data.questions[n[1]-1][n[2]] = val;
					} else {
						data.questions[n[1]-1][n[2]] = val;
					}
			}
		}
	}

	data.evaluated = true;
	delete data._id;

	return data;
	}
	//record changes made for re-marking
	changes = {};
	for (question in data.questions) {
		if (data.questions[question].original != data.questions[question].grade) {
			questionNo = parseInt(question)+1
			changes[questionNo] = {
									Response: data.questions[question].response,
									Grade: data.questions[question].grade,
									}
		}
	}

	//check all other responses and update grades based on changes made
	db.responses.find({quizName: data.quizName, creator_username: localStorage.getItem('username'), evaluated: false}, function(err, foundResponse) {
		if (err||!foundResponse) {
			console.log(err)
		} else {
			if (Object.keys(changes).length === 0) {
				done()
			}
			else {
				for (response in foundResponse) { 
					for (change in changes) {
						var attr = 'question_'+change+'_choice';
						if (foundResponse[response][attr] == changes[change].Response) {
							//call update function to apply changes to all other responses
							update(foundResponse[response], changes[change], change, response, foundResponse.length, completed);
						}
				}	
				};
			}
		}
	});

	//function for updating responses
	function update(response, changes, questionNo, current, complete, callback) {
		console.log(current);
		console.log(complete);
		db.responses.remove(response,function(err, removedResponse) {
							if (err||!removedResponse) {
								console.log(err)
							} else {
								var question = 'question_'+questionNo+'_grade';
								response[question] = changes.Grade;
								db.responses.save(response, function(err, updatedResponse) {
									if (err|| !updatedResponse) {
										console.log(err)
									} else {
										if (current == (complete-1)) {
											completed();
										}
									}
								});
							}
						})
	}

	//callback function to update results
	function completed() {
		var data = parser(body);
		db.responses.remove({creator_username: data.creator_username, studentID:data.studentID, quizName: data.quizName}, function(err, removedResponse) {
				if (err||!removedResponse) {
					console.log(err)
				}
				else {
					db.responses.save(data, function(err, savedResponse) {
						if(err||!savedResponse) {
							console.log(err)
						} else {
							db.results.update(
							{quizName: data.quizName, studentID:data.studentID, creator_username:data.creator_username},
							{$set: {score: data.score}},
							function(err, updatedResult) {
								if(err||!updatedResult) {
									console.log(err);
								} else {
									console.log('reached')
									res.redirect('/responses');
									}
							})
										
							
						}
					})
				}
			})
	}
	function done() {
		//callback function to be called on final return
		db.responses.remove({creator_username: data.creator_username, studentID:data.studentID, quizName: data.quizName}, function(err, removedResponse) {
				if (err||!removedResponse) {
					console.log(err)
				}
				else {
					db.responses.save(data, function(err, savedResponse) {
						if(err||!savedResponse) {
							console.log(err)
						} else {
							res.redirect('/responses');
						}
					})
				}
			})
	}
	
});

//mark responses as evaluated
app.post('/mark_evaluated', function(req, res) {
	data = JSON.parse(req.body.data);
	console.log(data);
	db.responses.update({creator_username: data.responses[0].creator_username, quizName: data.quizName},
		{$set: {evaluated: true} },
		{multi: true},
	 function(err, updatedResponse) {
		if (err||!updatedResponse) {console.log(err)}
		else {
			res.end(JSON.stringify(data));
		}
	});
});

/***********************/

/** Reports sub-routes **/
app.get('/reports', function(req, res) {
	responseJson = {};
	db.quizzes.find({creator_username: localStorage.getItem('username')}, function(err, foundQuiz) {
		if (err||!foundQuiz) {console.log("Quiz not found because of error " + err); }
		else {
			if (foundQuiz.length == 0) {
				res.render('Administrator/dashboard_routes/reports', {
					isAuthenticated: req.isAuthenticated(),
					data: foundQuiz[0]});
			}
			//retreive results for every quiz within the system
			function getResults(quizzes, cb) {
				var complete = Object.keys(quizzes).length;
				
				for (var quiz in quizzes) {
					var results = [];

					db.results.find({quizName: quizzes[quiz].quizName, creator_username: localStorage.getItem('username')}, function(err, foundResult) {
						if (err||!foundResult) {console.log(err)}
							else { 
								if (foundResult.length == 0) {
									res.render('Administrator/dashboard_routes/reports', {
									isAuthenticated: req.isAuthenticated(),
									data: 'no results'});
								} else {
									results.push(foundResult);
									complete--;
									if (complete == 0) {
										cb(quizzes, results);
									};
								}
								
							};
					});
				};
			};
			//on completion parse data and render view
			function done(quizArray, resultsArray) {
				console.log(resultsArray);
				for (i = 0; i<Object.keys(quizArray).length; i++) {
					if (resultsArray[i] != undefined) {
						responseJson[resultsArray[i][0].quizName] = {
						quizName:resultsArray[i][0].quizName,
						results: resultsArray[i]
						};
					}
				};
				console.log(responseJson);
				res.render('Administrator/dashboard_routes/reports', {
					isAuthenticated: req.isAuthenticated(),
					data: foundQuiz,
					results: responseJson});
			}
			getResults(foundQuiz, done);
		}
	})
});

//view results
app.post('/view_results', function(req, res) {
	data =JSON.parse(req.body.data);
	res.render('Administrator/dashboard_routes/reports_sub_routes/view_results', {
				isAuthenticated: req.isAuthenticated(),
				data: data
			});
});

//download scores
app.post('/download_scores', function(req, res) {
	data = JSON.parse(req.body.data);
	results = [];
	for (index in data) {
		temp = {};
		 temp.studentID = data[index].studentID;
		 temp.score = data[index].score;
		 results[index] = temp;
	}
	var fields = ['studentID', 'score'];
	var fieldNames = ['ID', 'Score'];
	var opts = {
	  data: results,
	  fields: fields,
	  fieldNames: fieldNames,
	  quotes: ''
	};

	json2csv(opts, function(err, csv) {
	  if (err) console.log(err);
	  fs.writeFile((data[0].quizName)+' results.csv', csv, function(err) {
	    if (err) throw err;
	    console.log('file saved');
	    res.end('saved');
	  });
	});
});

/*************************/

/** Feedback sub routes **/
//feedback
app.get('/feedback', function(req,res) {
	db.quizzes.find({creator_username: localStorage.getItem('username')}, function(err, foundQuiz) {
		if (err||!foundQuiz) {console.log("Quiz not found because of error " + err); }
		else {
			feedbackJson = {};
			quizJson = {};
			if (foundQuiz.length == 0) {
				res.render('Administrator/dashboard_routes/feedback', {
					isAuthenticated: req.isAuthenticated(),
					data: feedbackJson});
			}
			for (quiz in foundQuiz) {
				quizJson[quiz] = {
					quizName: foundQuiz[quiz].quizName,
					creator_username: foundQuiz[quiz].creator_username
				};
			}
			function getFeedback(quizzes, cb) {
				var complete = Object.keys(quizzes).length;
				
				for (var quiz in quizzes) {
					var feedback = [];
					db.feedback.find({quizName: quizzes[quiz].quizName, creator_username: quizzes[quiz].creator_username }, function(err, foundFeedback) {
						if (err||!foundFeedback) {console.log(err)}
							else { 
								feedback.push(foundFeedback);
								complete--;
								if (complete == 0) {
									cb(quizzes, feedback);
								};
							};
					});
				};
			};
			function done(quizArray, feedbackArray) {
				for (i = 0; i<Object.keys(quizArray).length; i++) {
					if (feedbackArray[i][0] != undefined) {
						feedbackJson[feedbackArray[i][0].quizName] = {
						quizName:feedbackArray[i][0].quizName,
					 	feedback: feedbackArray[i]
						};
					}
				};
				res.render('Administrator/dashboard_routes/feedback', {
					isAuthenticated: req.isAuthenticated(),
					data: feedbackJson});
			}
			getFeedback(quizJson, done);

		}
	})
})

//view feedback
app.post('/view_feedback', function(req, res) {
	var data = JSON.parse(req.body.data);
	res.render('Administrator/dashboard_routes/feedback_sub_routes/view_feedback', {
				isAuthenticated: req.isAuthenticated(),
				data: data
			})
});

//remove feedback
app.post('/remove_feedback', function(req,res) {
	var data = JSON.parse(req.body.data);
	response = data._id;
	delete data._id;
	db.feedback.remove(data, function(err, removedFeedback) {
		if(err||!removedFeedback) {
			console.log(err);
		} else {
			res.end(response);
		}
	})
});

/**************************/
/*******************************************/

/*Test taker routes*/

//select quiz
app.get('/select_quiz', function(req, res) {
	res.render('Test_Taker/take_quiz');
});

//quiz
app.post('/takeQuiz', function(req, res) {
	//localStorage.removeItem('attempts');
	if (req.body.quizName != undefined) {
		var body = req.body;
	localStorage.setItem('quizName', body.quizName);
	localStorage.setItem('studentID', body.studentID);
	if (localStorage.getItem(body.quizName+'_attempts') == null) {
		localStorage.setItem(body.quizName+'_attempts', '1')
		} else {
			x = parseInt(localStorage.getItem(body.quizName+'_attempts'));
			y = x+1;
			localStorage.setItem(body.quizName+'_attempts', y);
			console.log(localStorage.getItem(body.quizName+'_attempts')+'localStorage attempts');
			localStorage.removeItem('attempts');
		}
	} 	else if (req.body.quizName == undefined) {
		var body = {};
		body.quizName = localStorage.getItem('quizName');
		body.studentID = localStorage.getItem('studentID');

	}

	db.quizzes.find({ quizName: body.quizName }, function(err, foundQuiz) {
  		if (err||!foundQuiz) {console.log("Quiz: "+ body.quizName + "not found because of error " + err); }
  		else { var quiz = {}; 
  				quiz.quizName = foundQuiz[0].quizName;
  				quiz.quizDescription = foundQuiz[0].quizDescription;
  				quiz.timeLimit = foundQuiz[0].timeLimit;
  				quiz.attemptLimit = foundQuiz[0].attemptLimit;
  				quiz.feedback = foundQuiz[0].feedback;
  				quiz.randomise = foundQuiz[0].randomise;
  				quiz.questions = [];
  				quiz.active = foundQuiz[0].active;
  				quiz.studentID = body.studentID;
  				console.log(quiz.attemptLimit+' attemptLimit');

  				if ( parseInt(localStorage.getItem(quiz.quizName+'_attempts')) > quiz.attemptLimit ) {
  					localStorage.removeItem(quiz.quizName+'_attempts');
  					res.render('Test_Taker/max');
  				} 
  				else {
  					for (var i=0; i<foundQuiz[0].questions.length; i++) {
  					if (typeof quiz.questions[i] == "undefined"){
						quiz.questions[i] = {};
					}
  					quiz.questions[i]['text'] = foundQuiz[0].questions[i].text;
  					quiz.questions[i]['type'] = foundQuiz[0].questions[i].type;
  					if (typeof foundQuiz[0].questions[i].Optiontext != "undefined") {
  						quiz.questions[i]['Optiontext'] = foundQuiz[0].questions[i].Optiontext;
  					}
  				}

  				res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
				res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
				res.setHeader("Expires", "0"); // Proxies.

  				res.render('Test_Taker/quiz2', {data: quiz});
  			};

  				
  	} ;
  	});

});

//submit & mark quiz
app.post('/submitQuiz', function(req, res) {
	var body = req.body;
	console.log(body);
	body.studentID = localStorage.getItem('studentID');
	body.evaluated = false;		
	//retreive original quiz for marking
	data = [];
	datax = db.quizzes.find({ quizName: body.quizName }, function(err, foundQuiz) {
  		if (err||!foundQuiz) {console.log("Quiz: "+ body.quizName + "not found because of error " + err); }
  		else { 
  			data = foundQuiz[0];
  			if (data.creator_username!= undefined){
  				body.creator_username = data.creator_username;
  			}
	//results variable declarations
  	results = {};
  	results.incorrect = [];
  	results.score = 0;
  	results.tot_pos = 0;
  	result = {};

  	//Marker function for standalone quizzes
	function marker() {
		for (var key in body) {
			if (body.hasOwnProperty(key)) {
			 	var n = key.split('_');
			 	results.no_of_questions = data.questions.length;
			 	if (n.length>2) {
			 		var questionNo = parseInt(n[1]);
			 		if (body[key] == data.questions[questionNo-1].correctOption) {
					results.score++;
					}
					else {
						results.incorrect.push(questionNo);
					}
			 	}
			 }
		}
	}

	//Marker function for administrator quizzes
	function adminMarker() {
		for (var key in body) {
			if (body.hasOwnProperty(key)) {
				var n = key.split('_');
				if (n.length > 2) {
					var questionNo = parseInt(n[1]);
					//if statements for scoring different question types
					if(( (data.questions[questionNo-1].type == 'essay') && (data.questions[questionNo-1].markingstyle == 'EXACT')) || (data.questions[questionNo-1].type == 'fillInTheBlank')) {
						if (body[key] == data.questions[questionNo-1].correctOption) {
							grade = data.questions[questionNo-1].weight;
							body['question_'+questionNo+'_grade'] = grade;
							results.score+= parseInt(grade);
							results.tot_pos += parseInt(grade);
						}
						else {
							body['question_'+questionNo+'_grade'] = 0;
							grade = data.questions[questionNo-1].weight;
							results.incorrect.push(questionNo);
							results.tot_pos += parseInt(grade);
						}
					} else if (data.questions[questionNo-1].type == 'essay' && data.questions[questionNo-1].markingstyle == 'CONTAINS') {
						answerStr = data.questions[questionNo-1].correctOption;
						if (answerStr.includes(body[key])) {
							grade = data.questions[questionNo-1].weight
							body['question_'+questionNo+'_grade'] = data.questions[questionNo-1].weight;
							results.score+= parseInt(grade);
							results.tot_pos += parseInt(grade);
						}
						else {
							body['question_'+questionNo+'_grade'] = 0;
							grade = data.questions[questionNo-1].weight;
							results.incorrect.push(questionNo);
							results.tot_pos += parseInt(grade);
						}
					} else {
						if (body[key] == data.questions[questionNo-1].correctOption) {
							body['question_'+questionNo+'_grade'] = 1;
							results.score++;
							results.tot_pos++;
						}
						else {
							body['question_'+questionNo+'_grade'] = 0;
							results.incorrect.push(questionNo);
							results.tot_pos++;

						}
					}	
				}
			}
		}
		
		result.quizName = body.quizName;
		result.studentID = body.studentID;
		result.creator_username = body.creator_username;
		result.score = results.score;
	}

	if (data.creator_username == undefined) {	//standalone quizzes
		marker();
	 	res.render('Test_Taker/results', {data: results});
	} else if (data.feedback == 'YES') { 	//instant feedback checked
		body.evaluated = true;
		adminMarker();
		console.log(result);
		//check if quiz has previously been responded to
		db.responses.find({quizName:body.quizName, studentID: body.studentID}, function(err, foundResponse) {
			//if NO save response and render results page
			if (foundResponse.length==0) {
				body.attempted = "1";
				db.responses.save(body, function(err, savedResponse) {
						if (err||!savedResponse) {console.log("Response not saved because of error " + err)}
						else {
							console.log('response saved');
							db.results.save(result, function(err, savedResult) {
								if (err||!savedResult) {
									console.log(err)
								} else {
									
									}
								});
							}
						results.quizName = body.quizName;
									results.creator_username = body.creator_username;
									results.remaining_attempts = data.attemptLimit-parseInt(body.attempted);
									res.render('Test_Taker/results', {data: results});
					});
			}
			//If YES increment attempts, remove previous response and save new response, display results page
			else {
				body.attempted = parseInt(foundResponse[0].attempted ) + 1 ;
				db.responses.remove({quizName:body.quizName, studentID: body.studentID}, function(err, removedResponse) {
					if (err) {
						console.log(err);
					}
					else {
						db.responses.save(body, function(err, savedResponse) {
						if (err||!savedResponse) {console.log("Response not saved because of error " + err)}
							else {
									db.results.save(result, function(err, savedResult) {
										if (err||!savedResult) {
											console.log(err)
										} else {
											}
										});
								}
							results.quizName = body.quizName;
							results.creator_username = body.creator_username;
							results.remaining_attempts = data.attemptLimit-body.attempted;
							res.render('Test_Taker/results', {data: results});
						});
					}
				});
			}
		 });
		
	}
	else { //instant feedback not checked
		adminMarker();
		console.log(result);
		//check if quiz has previously been responded to
		db.responses.find({quizName:body.quizName, studentID: body.studentID}, function(err, foundResponse) {
			//if NO save response and render results page
			if (foundResponse.length==0) {
				body.attempted = "1";
				db.responses.save(body, function(err, savedResponse) {
						if (err||!savedResponse) {console.log("Response not saved because of error " + err)}
						else {
							console.log('respnose saved');
								db.results.save(result, function(err, savedResult) {
								if (err||!savedResult) {
									console.log(err)
								} else {
									results.remaining_attempts = data.attemptLimit-body.attempted;
								resData = {};
								resData.quizName = body.quizName;
								resData.creator_username = body.creator_username;
								resData.feedback = "no_instant_feedback";
								resData.remaining_attempts = results.remaining_attempts;
								res.render('Test_Taker/results', {data: resData});
									}
								});
							}
						
					});
			}
			//If YES increment attempts, remove previous response and save new response, display results page
			else {
				body.attempted = parseInt(foundResponse[0].attempted ) + 1 ;
				db.responses.remove({quizName:body.quizName, studentID: body.studentID}, function(err, removedResponse) {
					if (err) {
						console.log(err);
					}
					else {
						db.responses.save(body, function(err, savedResponse) {
						if (err||!savedResponse) {console.log("Response not saved because of error " + err)}
							else {
									db.results.find({quizName: result.quizName, studentID:result.studentID, creator_username:result.creator_username}, function(err, foundResult) {
										if (err||!foundResult) {
											console.log(err)
										} else if (foundResult.length > 0) {
											db.results.update(foundResult[0],{$set: {score: result.score}}, function(err, updatedResult) {
												if (err||!updatedResult) {
													console.log(err);
												} else {
													results.remaining_attempts = data.attemptLimit-parseInt(body.attempted);
													resData = {};
													resData.quizName = body.quizName;
													resData.creator_username = body.creator_username;
													resData.feedback = "no_instant_feedback";
													resData.remaining_attempts = results.remaining_attempts;
													res.render('Test_Taker/results', {data: resData});
												}
											})
											} else {
												console.log('it got here');
												db.results.save(result, function(err, savedResult) {
													if (err||!savedResult) {
														console.log(err)
													} else {
														results.remaining_attempts = data.attemptLimit-body.attempted;
													resData = {};
													resData.quizName = body.quizName;
													resData.creator_username = body.creator_username;
													resData.feedback = "no_instant_feedback";
													resData.remaining_attempts = results.remaining_attempts;
													res.render('Test_Taker/results', {data: resData});
														}
													});
											}
										});
								}
						});
					}
				});
			}
		 });
		};
  	};

  	});
});

//provide feedback
app.post('/provide_feedback', function(req, res) {
	data = req.body;
	res.render('Test_Taker/provide_feedback', {data})
});

//save feedback
app.post('/save_feedback', function(req, res) {
	body = req.body;
	body.seen = false;
	db.feedback.save(body, function(err, savedFeedback) {
		if(err||!savedFeedback) {
			console.log(err)
		} else {
			res.redirect('/');
		}
	});
});

/*********************************************************/

//Encryption and decryption functions
function encrypt(text){
  var cipher = crypto.createCipher(algorithm,password)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}

function decrypt(text){
  var decipher = crypto.createDecipher(algorithm,password)
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}

//Form Validation Calls
app.post('/checkQuizname', function(req, res) {
	db.quizzes.find({quizName: req.body.data}, function(err, foundQuiz) {
		if (err||!foundQuiz) {
			console.log(err);
		} else if (foundQuiz.length == 0) {
			res.end('invalid');
		} else {
			res.end('valid');
		}
	})
});

app.post('/checkUsername', function(req, res) {
	db.users.find({username: encrypt(req.body.data)}, function(err, foundUser) {
		if (err||!foundUser) {
			console.log(err);
		} else if (foundUser.length == 0) {
			console.log(foundUser);
			res.end('valid');
		} else {
			res.end('invalid');
		}
	})
});


app.listen(port);

console.log('server started on port %s', port);

