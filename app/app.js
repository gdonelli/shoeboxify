var		express	= require('express')
	,	assert	= require('assert')
	,	http	= require('http')
	, 	path	= require('path')

	/* routes */

	,	code	= require('./code')
	,	fb		= require('./code/fb')
	,	dev		= require('./code/dev')
	,	utest	= require('./code/utest')
	,	service	= require('./code/service')
	,	view	= require('./code/view')
	,	handy	= require('./code/handy')

	/* libs */

	,	identity	= require('./code/identity')
	,	memento		= require('./code/memento')
	;


var MongoStore = require('connect-mongo')(express);

var app = express();

app.configure(
	function(){
		app.set('port', process.env.PORT || 3000);
		app.set('views', __dirname + '/views');
		app.set('view engine', 'jade');
		app.use(express.favicon(__dirname + '/public/images/favicon.ico') );
		app.use(express.logger('dev'));
		app.use(express.bodyParser());
		app.use(express.methodOverride());

		app.use(express.cookieParser());

		app.use(express.session({
		    	secret: identity.sessionSecret()
		    ,	store: new MongoStore({		cookie: { maxAge: 60000 * 60 }
										,	url: identity.sessionDatabaseURL()
										,	auto_reconnect: true })

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

memento.init(	function success() {}
			,	function error(e) {
					throw new Error(e);
				} );

identity.validateEnviroment();

/*********************/
/*   Public Routes   */
/*********************/

app.get('/', code.index);

_setupRoutesForModule( fb,		{},	'fb' );
_setupRoutesForModule( service,	{},	'service' );


// Admin Routes

app.get( utest.path.utest,		fb.requiresAuthentication,	fb.requiresAdmin,	utest.route.utest	);
app.get( utest.path.intense,	fb.requiresAuthentication,	fb.requiresAdmin,	utest.route.intense	);

// app.get( utest.path.cmd,	fb.requiresAuthentication,	fb.requiresAdmin,	utest.route.cmd);


/**************************/
/*   Development Routes   */
/**************************/

app.get('/dev/exploreGraph',	fb.requiresAuthentication, dev.exploreGraph);
app.get('/dev/me',				fb.requiresAuthentication, dev.me);
app.get('/dev/checkfriends',	fb.requiresAuthentication, dev.checkfriends);
app.get('/dev/test-email',		fb.requiresAuthentication, dev.testEmail);

app.get('/dev/whoami',		fb.requiresAuthentication, dev.whoami);
app.get('/dev/myphotos',	fb.requiresAuthentication, dev.myphotos);

app.get('/dev/drop',		fb.requiresAuthentication, dev.drop);
app.get('/dev/permissions',	fb.requiresAuthentication, dev.permissions);

app.get('/dev/s3test',	dev.s3test);

app.get('/dev/shoeboxified', fb.requiresAuthentication, dev.shoeboxified);

app.get('/dev/session',		dev.session);
app.get('/dev/rmsession',	dev.rmsession);



/*******************/
/*   HTTP Server   */
/*******************/

http.createServer(app).listen(app.get('port'), function(){
	console.log("Shoeboxify Server listening on port " + app.get('port'));
});


function _setupRoutesForModule(module, options, name)
{
	assert(module != undefined,			'module is undefined');
	assert(module.path != undefined,	'module.path is undefined');
	assert(module.route != undefined,	'module.route is undefined');

	console.log(name);

	for (var key in module.path)
	{
		var path_i  = module.path[key];
		var route_i = module.route[key];

		assert(path_i != undefined, 'path_i is undefined, key=' + key);
		assert(route_i != undefined, 'route_i is undefined, path_i=' + path_i);

		if (options && options.requiresAdmin == true)
			app.get(path_i, fb.requiresAuthentication,	fb.requiresAdmin, route_i);
		if (options && options.requiresAuthentication == true)
			app.get(path_i, fb.requiresAuthentication, route_i);
		else
			app.get(path_i, route_i);

		console.log(' |=> ' + path_i);
	}

}
