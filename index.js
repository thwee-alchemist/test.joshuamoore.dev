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
    callbackURL: "https://leudla.net/auth/google"
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

var publicKeys = [];

const io = require('socket.io')(server)
io.use(function(socket, next){
  sessionMiddleware(socket.request, {}, next);
})
io.on('connection', function(socket){
  try{
    var user = socket.request.session.passport.user;
    socket.user = user;
    console.log('socket userId: ', user.displayName);

    /*
    conn.query(`
      select
    `, [user.userId])
    */
  }catch(e){
    console.error(e);
    socket.emit('refresh');
  }

  socket.on('item added', item => {
    console.log(socket.user.displayName, 'added', item);
  });

  socket.on('item updated', item => {
    console.log(socket.user.displayName, 'updated', item);
  });

  socket.on('deleting item', item => {
    console.log(socket.user.displayName, 'deleted', item);
  });

  socket.on('publicKey', (publicKey) => {
    
    if(!publicKeys.find(key => key.id == socket.id)){
      publicKeys.push({id: socket.id, key: publicKey})
      socket.broadcast.emit('publicKey', {id: socket.id, key: publicKey});
      console.log(publicKey)
    }

    try {
      conn.query(`
        update visitor
        set publicKey = ?
        where _id = ?;
      `, [JSON.stringify(publicKey), socket.user], function(error, results, field){
        if(error) throw error;
        socket.emit('publicKeyResponse', results)
      })
    }catch(e){
      socket.emit('publicKeyResponse', 'An error has occured');
    }
  });

  socket.emit('publicKeys', publicKeys)

  socket.on('disconnect', function(){
    console.log('a user disconnected')
    publicKeys = publicKeys.splice(publicKeys.findIndex(key => key.id == socket.id), 1)
    socket.broadcast.emit('left', socket.id);
    console.log('a user left')
  })

  socket.on('message', function(msg){
    console.log('relaying message')
    var t = (new Date()).toLocaleTimeString();
    var payload = {from: socket.id, to: msg.to, msg: msg.msg, iv: msg.iv, time: t}
    io.binary(true).to(msg.to).emit('message', payload);
  });
});
