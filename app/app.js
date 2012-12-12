var     express = require('express')
    ,   assert  = require('assert')
    ,   http    = require('http')
    ,   path    = require('path')
    ,   _       = require('underscore')

require('./code/global'); // Setup 'use' command

var     handy           = use('handy')
    ,   identity        = use('identity')
    ,   authentication  = use('authentication')
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

/************/
/*   init   */
/************/


memento.init(   function success() {
                    console.log('memento.init');
                }
            ,   function error(e) {
                    throw new Error(e);
                } );

identity.validateEnviroment();

/*********************/
/*   Public Routes   */
/*********************/

// app.get('/', code.index);

_setupRoutesForModule(  'authentication',   {             } );
_setupRoutesForModule(  'admin',            { admin: true } );
_setupRoutesForModule(  'view',             { user:  true } );

// _setupRoutesForModule( 'admin-test',    { admin: true } );


/*
_setupRoutesForModule( view,    { name: 'view',     user: true  } );
_setupRoutesForModule( service, { name: 'service'   } );
*/


/**************************/
/*   Development Routes   */
/**************************/

/*
app.get('/dev/exploreGraph',    fb.requiresAuthentication, dev.exploreGraph);
app.get('/dev/me',              fb.requiresAuthentication, dev.me);
app.get('/dev/checkfriends',    fb.requiresAuthentication, dev.checkfriends);
app.get('/dev/test-email',      fb.requiresAuthentication, dev.testEmail);

app.get('/dev/whoami',      fb.requiresAuthentication, dev.whoami);
app.get('/dev/myphotos',    fb.requiresAuthentication, dev.myphotos);

app.get('/dev/drop',        fb.requiresAuthentication, dev.drop);
app.get('/dev/permissions', fb.requiresAuthentication, dev.permissions);

app.get('/dev/s3test',  dev.s3test);

app.get('/dev/shoeboxified', fb.requiresAuthentication, dev.shoeboxified);

app.get('/dev/session',     dev.session);
app.get('/dev/rmsession',   dev.rmsession);
*/

/*******************/
/*   HTTP Server   */
/*******************/

http.createServer(app).listen(app.get('port'), function(){
    console.log("Shoeboxify Server listening on port " + app.get('port'));
});


/* aux ==== */

function _setupRoutesForModule(moduleName, options)
{
    assert(moduleName != undefined,     'moduleName is undefined');
    console.log(moduleName);
 
    var module = use.lib.module(moduleName);

    assert(module != undefined,         'module is undefined');
    assert(module.path != undefined,    'module.path is undefined');
    assert(module.route != undefined,   'module.route is undefined');

    var routePathDiff = _.difference(Object.keys(module.path), Object.keys(module.route) );

    if (routePathDiff.length > 0) {
        console.log('miss-match between module.path and module.route');

        console.log('Check the following routes:');
        console.log( routePathDiff );       
        
        throw new Error('setup route miss-match');
    }

    var moduleKeys = Object.keys(module.path);

    moduleKeys.sort(
        function byPathLength(a, b) {
            return module.path[a].length - module.path[b].length;
        });

    for (var i in moduleKeys)
    {
        var key_i = moduleKeys[i];
        var path_i  = module.path[key_i];
        var route_i = module.route[key_i];

        assert(path_i != undefined, 'path_i is undefined, key=' + key_i);
        assert(route_i != undefined, 'route_i is undefined, path_i=' + path_i);

        var opt = '\t';
        if (options && options.admin == true)
        {
            app.get(path_i, 
                    authentication.validateUserSession,  
                    authentication.validateAdminSession, 
                    route_i);

            opt += '(admin)';
        }
        else if (options && options.user == true)
        {
            app.get(path_i,
                    authentication.validateUserSession, 
                    route_i);

            opt += '(user)';
        }
        else
        {
            app.get(path_i, route_i);
        }

        console.log('   |=> ' + path_i + opt);
    }

}
