
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

app.configure(
    function(){
        app.set('port', process.env.PORT || 3000);
        app.set('views', __dirname + '/views');
        app.set('view engine', 'jade');
        app.use(express.favicon(__dirname + '/public/image/favicon.ico') );
        app.use(express.logger('dev'));
        app.use(express.bodyParser());
        app.use(express.methodOverride());

        app.use(express.cookieParser());

        app.use(express.session({
                secret: identity.sessionSecret()
            ,   store: new MongoStore({     cookie: { maxAge: 60000 * 60 }
                                        ,   url: identity.sessionDatabaseURL()
                                        ,   auto_reconnect: true })

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


// Routes =======

// Public
routeutil.addRoutesFromModule(app, 'index');
routeutil.addRoutesFromModule(app, 'authentication');

// Admin
routeutil.addRoutesFromModule(app, 'admin',     { admin: true } );

// User
routeutil.addRoutesFromModule(app, 'view',      { user:  true } );
routeutil.addRoutesFromModule(app, 'usertest',  { user:  true } );
routeutil.addRoutesFromModule(app, 'service',   { user:  true } );

routeutil.addRoutesFromModule(app, 'sandbox',   { user:  true } );


// HTTP Server =======

var server = http.createServer(app);

server.listen(app.get('port'),
    function(){
        console.log("Shoeboxify listening on port " + app.get('port'));
    });

// Socket.io
var io = socketio.listen(server);

io.sockets.on('connection',
    function (socket) {
        
        //socket.emit('hello', { id : 'Ciao Bambino!' });
        
        socket.on('iotest',
            function (data)
            {
                socket.emit( 'back', data );
            });
        });


