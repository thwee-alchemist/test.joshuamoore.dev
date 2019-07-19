const express = require('express')
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const app = express()
const port = 16013

app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
var sessionMiddleware
app.use(sessionMiddleware = require('express-session')({
  secret: process.env.TEST_JM_COOKIE_SECRET,
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

var mysql = require('mysql');
var conn = mysql.createConnection({
  host     : 'localhost',
  user     : process.env.LEUDLA_DB_USER,
  password : process.env.LEUDLA_DB_PW,
  database: 'leudla',
  debug: false,
  multipleStatements: true
});

passport.serializeUser(function(user, done) {
  done(null, user)
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
    return cb(null, profile);
  }
));

app.get(
  '/auth/google',
  passport.authenticate('google', {scope: ['profile', 'email']}),
  (req, res) => {
    console.log('req.user', req.user);
    res.redirect('/protected');
  }
)

function isLoggedIn(req, res, next) {

  // if user is authenticated in the session, carry on
  if (req.isAuthenticated()){
    return next();
  }
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
var server = app.listen(port, () => console.log(`Example app listening on port ${port}!`))

const io = require('socket.io')(server)
io.use(function(socket, next){
  sessionMiddleware(socket.request, {}, next);
})
io.on('connection', function(socket){
  try{
    var userId = socket.request.session.passport.user;
    console.log('socket userId: ', userId);
  }catch(e){
    console.error(e);
    socket.emit('refresh');
  
  }
})