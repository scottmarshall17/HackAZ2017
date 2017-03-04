var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var express = require('express');
var mongoose = require('mongoose');
var path = require('path');
var express_session = require('express-session');
var cookieParser = require('cookie-parser');
var express_json = require('express-json');
var fs = require('fs');

var userSchema = new mongoose.Schema({
    facebook: String,
    accessToken: String,
    email: String,
    firstName: String,
    lastName: String,
    profileUrl: String,
    gender: String,
    picture: String
});

var m_clientID = JSON.parse(fs.readFileSync(path.join(__dirname, '/private/clientID.json'), 'utf8')).clientID;
var m_clientSecret = JSON.parse(fs.readFileSync(path.join(__dirname, '/private/clientSecret.json'), 'utf8')).clientSecret;
var m_mongoURL = JSON.parse(fs.readFileSync(path.join(__dirname, '/private/mongoURL.json'), 'utf8')).mongoURL;

var User = mongoose.model('User', userSchema);
//mongoose.connect('mongodb://localhost:27017/test');
mongoose.connect(m_mongoURL);


passport.use(new FacebookStrategy({
    clientID: m_clientID,
    clientSecret: m_clientSecret,
    callbackURL: 'http://www.vocabulagent.me/auth/facebook/callback',
    enableProof: true
    },
    function (accessToken, refreshToken, profile, done) {
        console.log(profile);
        User.findOne( {facebook: profile.id }, function (err, existingUser) {
            if (existingUser) {
                console.log('User found!');
                console.log(profile._json.name.split(' ')[0]);
                console.log(profile._json.name.split(' ')[1]);
                return done(null, existingUser);	//return?
            }
            var user = new User({
                facebook: profile.id,
                accessToken: accessToken,
                email: profile._json.email,
                profileUrl: profile.profileUrl,
                firstName: profile._json.name.split(' ')[0],
                lastName: profile._json.name.split(' ')[1],
                gender: profile._json.gender,
                picture: 'https://graph.facebook.com/' + profile.id + '/picture?width=9999&height=9999'
            });
            user.save(function (err) {
                done(err, user);
            });
        }

        );
    }
));

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

var app = express();

app.set('port', 8080);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
/*
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
*/
app.use(express_json());
// ...
app.use(cookieParser());
app.use(express_session({secret: 'keyboard cat'}));
app.use(passport.initialize());
app.use(passport.session());
// ...
/*
app.use(app.router);
*/
app.use(express.static(path.join(__dirname, 'stylesheets')));

app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login', successRedirect: '/'}));
app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/', function (req, res) {
    res.render('index', {
        user: req.user
    });
});

app.get('/login', function (req, res) {
    res.render('login', {
        user: req.user
    });
});

app.get('/me', ensureAuthenticated, function (req, res) {
    res.render('me', {
        user:req.user
    });
});

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

app.listen(app.get('port'), function () {
    console.log('Express server is listening on port ' + app.get('port'));
});

function ensureAuthenticated (req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}
