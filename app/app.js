
require('./first'); // Setup 'use' command

var     express = require('express')
    ,   http    = require('http')
    ,   path    = require('path')
    ,   socketio= require('socket.io')
    ;

var     identity    = use('identity')
    ,   routeutil   = use('routeutil')
    ;


var MongoStore = require('connect-mongo')(express);

var app = express();


// Session

var cookieParser    = express.cookieParser( identity.sessionSecret() );
var sessionKey      = 'express.sid';
var sessionStore    = new MongoStore({
                                    cookie: { maxAge: 60000 * 60 }
                                ,   url: identity.sessionDatabaseURL()
                                ,   auto_reconnect: true
                            });

app.configure(
    function(){
        app.set('port', process.env.PORT || 3000);
        app.set('views', __dirname + '/views');
        app.set('view engine', 'jade');
        app.use(express.favicon(__dirname + '/public/image/favicon.ico') );
        app.use(express.logger('dev'));
        app.use(express.bodyParser());
        app.use(express.methodOverride());
        
        // Session
        app.use(cookieParser);
        app.use(express.session({   key:    sessionKey
                                ,   store:  sessionStore
                                }));

        app.use(app.router);
        app.use(require('stylus').middleware(__dirname + '/public'));
        app.use(express.static(path.join(__dirname, 'public')));
    });

app.configure('development',
    function(){
        app.use(express.errorHandler());
    });

app.settings['x-powered-by'] = false;

identity.validateEnviroment();

// ======================
// Express routes =======

// Public
routeutil.addRoutesFromModule(app, 'index');
routeutil.addRoutesFromModule(app, 'authentication');

// Admin
routeutil.addRoutesFromModule(app, 'admin',     { auth : 'admin' } );

// User
routeutil.addRoutesFromModule(app, 'view',      { auth : 'user' } );
routeutil.addRoutesFromModule(app, 'usertest',  { auth : 'user' } );
routeutil.addRoutesFromModule(app, 'service',   { auth : 'user' } );

routeutil.addRoutesFromModule(app, 'sandbox' ,  { auth : 'user' }  );

// ======================
// HTTP Server ==========

var server = http.createServer(app);

server.listen(app.get('port'),
    function(){
        console.log("Shoeboxify listening on port " + app.get('port'));
    });

// ======================
// Socket.io  ===========

var sio = socketio.listen(server);

sio.sockets.on('connection',
    function (socket) {
        socket.session = socket.handshake.session;

        socket.join(socket.handshake.sessionID);

        console.log('socket.handshake:');
        console.log(socket.handshake);
        
        socket.on('iotest',
            function (data)
            {
//                console.log('socket.session:');
//                console.log(socket.session);
                
                socket.emit( 'back', data );
            });
        });

sio.configure('development',
    function () {
        sio.set('log level', 3);
    });

// Setup Session for socket.io
sio.set('authorization',
    function(data, accept) {
        cookieParser(data, {},
            function(err) {
                if (err)
                {
                    console.error('cookieParser failed with error:');
                    console.error(err);
                    accept(err, false);
                }
                else
                {
                    sessionStore.get(data.signedCookies[sessionKey],
                        function(err, session)
                        {
                            if (err || !session)
                            {
                                console.error('Cannot find session in the sessionStore:');
                                console.error(err);
                                accept(err, false);
                            }
                            else
                            {
                                if ( session.hasOwnProperty('user') )
                                {
                                    data.session = session;
                                    accept(null, true);
                                }
                                else
                                {
//                                    console.error('Cannot find session in the sessionStore:');
                                    accept(new Error('session has no user property'), false);
                                }
                            }
                        });
                }
            });
    });


