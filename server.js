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
  done(null, user)
});

var getVisitorId = async function(googleId){
  return new Promise((resolve, reject) => {    
    try{
      conn.query(`select v._id from visitor v where v._google_id = ?;`, [googleId], (error, results, fields) => {
        if(error) reject(error);
        console.log(results);
        resolve(results[0]._id);
      })
    }catch(e){
      reject(error);
      socket.emit('refresh');
    }
  })
};

passport.use(
  new GoogleStrategy({
    clientID: process.env.TEST_JM_GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.TEST_JM_GOOGLE_OAUTH_CLIENT_SECRET,
    callbackURL: "https://leudla.net/auth/google"
  },
  async function(accessToken, refreshToken, profile, cb){
    profile.visitorId = await getVisitorId(profile.id);
    return cb(null, profile);
  }
));

app.get(
  '/auth/google',
  passport.authenticate('google', {scope: ['profile', 'email']}),
  async (req, res) => {
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
var server = app.listen(port, () => console.log(`Leudla app listening on port ${port}!`))

var publicKeys = [];

const io = require('socket.io')(server)
io.use(function(socket, next){
  sessionMiddleware(socket.request, {}, next);
})
io.on('connection', function(socket){

  try{
    socket.visitorId = socket.request.session.passport.user.visitorId;
  }catch(e){
    socket.emit('refresh', e);
  }

  socket.on('item added', item => {
    console.log('item added', socket.visitorId, item)
    switch(item.type){
      case "person":
        conn.beginTransaction((error) => {
          conn.query('call insert_entity(?, ?, ?, ?, ?, ?, ?, ?, ?);', 
          [
            socket.visitorId,
            item.name, 
            item.from,
            item.until,
            item.texture,
            item.text, 
            item.data, 
            item.type, 
            item.graph_id
          ],
          function(error, results){
            console.log('insert_entity ', error, results)
            if(error) socket.emit('error', error)
            socket.emit('item added response', {"id": results.insertId, "item": item});
          });

          conn.commit(err => {
            console.log('err', err)
            socket.emit('error', err)
          });
        })
       break;
      case "relationship":
        break;

    }
    
    // here would be time to use that fancy currying they speak of, but maybe it's just that. 
    // also, is React a phase? 
  });

  socket.on('item updated', item => {
    console.log(socket.user.displayName, 'updated', item);
  });

  socket.on('deleting item', item => {
    console.log('deleted', item);
  });

  socket.on('publicKey', (publicKey) => {
    console.log('public key received')
    
    if(!publicKeys.find(key => key.id == socket.id)){
      publicKeys.push({id: socket.id, key: publicKey})
      socket.broadcast.emit('publicKey', {id: socket.id, key: publicKey});
    }

    try {
      conn.query(`
        insert into device (_visitor_id, _public_key)
        values (?, ?);
        select last_insert_id();
      `, [socket.visitorId, JSON.stringify(publicKey)], function(error, results, field){
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

  socket.on('add graph', name => {
    console.log('add graph, visitorId', socket.visitorId)
    conn.beginTransaction(err => {
      conn.query(`
        insert into graph (_visitor_id, _name)
        values (?, ?);
      `, [socket.visitorId, name], 
      function(error, result){
        if(error) console.error(error);
        conn.commit((err) => {
          if(err) conn.rollback();
          else socket.emit('add graph response', result.insertId);
        })
      })
    })
  })

  socket.on('graphs', () => {

    console.log('graphs, visitorId', socket.visitorId)
    conn.query(`
      select g._id, g._name 
      from graph g 
      where g._visitor_id = ?;`, 
      [socket.request.session.passport.user.visitorId], 
      function(error, result){
        if(error) console.error(error);
        socket.emit('graphs response', result);
      });
  })

  socket.on('persons', (graph_id) => {
    try {
      conn.query(`
        select e.*
        from entity e
        where e._visitor_id = ?
        and e._graph_id = ? 
        and e._type = 'person';
      `, [socket.visitorId, graph_id], 
      (error, result) => {
        if(error) throw error;
        else{
          console.log(result)
          socket.emit('persons response', result);
        }
      })
    }catch(e){
      socket.emit('error', e);
    }
  })

  /*
  socket.on('select graph', id => {
    /* let's skip that for now
    console.log(')
    if(socket.currentRoom);
    socket.leave(socket.currentRoom)
    socket.join(`graph ${id}`);
    socket.currentRoom = `graph ${id}`;
  })
  */
});