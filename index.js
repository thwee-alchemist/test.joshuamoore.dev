const express = require('express')
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const app = express()
const port = 16013

app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({
  secret: process.env.TEST_JM_COOKIE_SECRET,
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : process.env.LEUDLA_DB_USER,
  password : process.env.LEUDLA_DB_PW
});

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

passport.use(
  new GoogleStrategy({
    clientID: process.env.TEST_JM_GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.TEST_JM_GOOGLE_OAUTH_CLIENT_SECRET,
    callbackURL: "https://test.joshuamoore.dev/auth/google"
  },
  function(accessToken, refreshToken, profile, cb){
    console.log({googleId: profile});
    return cb(null, {googleId: profile.id});
  }
));

app.get(
  '/auth/google',
  passport.authenticate('google', {scope: ['profile']}),
  (req, res) => {
    res.redirect('/protected');
  }
)

function isLoggedIn(req, res, next) {

  // if user is authenticated in the session, carry on
  if (req.isAuthenticated())
      return next();

  // if they aren't redirect them to the home page
  res.redirect('/');
}

app.use(
  '/protected',
  isLoggedIn,
  express.static('protected')
)

app.use('/', express.static('public'))

app.use('/secured', passport.authenticate('google'), express.static('public'))
app.listen(port, () => console.log(`Example app listening on port ${port}!`))