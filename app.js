/**************************/
/*   SHOEBOXIFY: App.js   */
/**************************/

var		express	= require('express')
	,	http	= require('http')
	, 	path	= require('path')

	/* routes */

	,	routes	= require('./routes')
	,	fb		= require('./routes/fb')
	,	dev		= require('./routes/dev')
	,	service	= require('./routes/service')
	,	view	= require('./routes/view')

	/* libs */

	,	shoeboxify = require('./lib/shoeboxify')
	,	mongo = require('./lib/mongo')
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
		    	secret: shoeboxify.sessionSecret()
		    ,	store: new MongoStore({		cookie: { maxAge: 60000 * 60 }
										,	url: shoeboxify.sessionDatabaseURL()
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

/****************/
/*   Database   */
/****************/

mongo.init(	shoeboxify.dbServerHost(), 
			shoeboxify.dbServerPort(), 
			shoeboxify.dbName(), 
			shoeboxify.dbServerUsername(), 
			shoeboxify.dbServerPassword() );


/*********************/
/*   Public Routes   */
/*********************/

app.get('/', routes.index);

// FB Module Routes

app.get(fb.path.login,		fb.route.login);
app.get(fb.path.response,	fb.route.response);
app.get(fb.path.logout,		fb.route.logout);

// Service Module Routes
app.get( service.path.objectForURL,	service.route.objectForURL );
app.get( service.path.copyObject, 	service.route.copyObject );

app.get( view.route.viewObject, view.viewObject );

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

app.get('/dev/shoeboxified', fb.requiresAuthentication, fb.requiresAdmin, dev.shoeboxified);

app.get('/dev/session',		dev.session);
app.get('/dev/rmsession',	dev.rmsession);



/* Self Test */
shoeboxify.validateEnviroment();

/*******************/
/*   HTTP Server   */
/*******************/

http.createServer(app).listen(app.get('port'), function(){
	console.log("Shoeboxify Server listening on port " + app.get('port'));
});
