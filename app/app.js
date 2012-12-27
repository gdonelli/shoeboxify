
require('./first'); // Setup 'use' command

var     express = require('express')
    ,   http    = require('http')
    ,   path    = require('path')
    ;

var     identity    = use('identity')
    ,   routeutil   = use('routeutil')
    ,   io          = use('io')
    ;


var MongoStore = require('connect-mongo')(express);

var app = express();


// Session

var cookieParser    = express.cookieParser( identity.sessionSecret() );

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
        app.use(express.session({   key:    identity.sessionKey()
                                ,   store:  sessionStore			}));

        app.use(app.router);
        app.use(require('stylus').middleware(__dirname + '/public'));
        app.use(express.static(path.join(__dirname, 'public')));

/*
        app.use(
            function(err, req, res, next) {
                console.error(err);
                res.send('Fail Whale, yo.');
            });
*/
            
    });

express.errorHandler.title = 'bug@shoeboxify.com'

app.configure('development',
    function(){
        app.use( express.errorHandler() );
    });


//console.log(express.errorHandler.toString());

//app.settings['x-powered-by'] = false;

identity.validateEnviroment();

// ======================
// Express routes =======

// Public Routes
routeutil.addRoutesFromModule(app, 'index');
routeutil.addRoutesFromModule(app, 'authentication');

// Admin Routes
routeutil.addRoutesFromModule(app, 'admin',     { auth: 'admin' } );

// User Routes
routeutil.addRoutesFromModule(app, 'view',      { auth: 'user' } );
routeutil.addRoutesFromModule(app, 'usertest',  { auth: 'user' } );
routeutil.addRoutesFromModule(app, 'service',   { auth: 'user' } );
routeutil.addRoutesFromModule(app, 'sandbox' ,  { auth: 'user' } );

// ======================
// HTTP Server ==========

var expressServer = http.createServer(app);

expressServer.listen(app.get('port'),
    function(){
        console.log("Shoeboxify listening on port " + app.get('port'));
    });

// ======================
// Socket.io  ===========

io.setup(expressServer, cookieParser, sessionStore);


io.event('io-latency',
    function (socket, data, response) {
        console.log(data);
        response(data);
    });

io.addRoutesFromModule('service');


