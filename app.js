
/**
 * Module dependencies.
 */


var		express	= require('express')
	,	http	= require('http')
	, 	path	= require('path')

	/* routes */

	,	routes	= require('./routes')
	,	user	= require('./routes/user')
	,	fb		= require('./routes/fb')
	,	dev		= require('./routes/dev')

	/* libs */

	,	shoeboxify = require('./lib/shoeboxify')

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
		    ,
		    store: new MongoStore({
		    	cookie: { maxAge: 60000 * 60 },
				url: shoeboxify.sessionDatabaseURL()
			} )

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



/*****************/
/* Public Routes */
/*****************/

app.get(shoeboxify.facebookLoginPath(),		fb.login);
app.get(shoeboxify.facebookResponsePath(),	fb.response);

app.get(shoeboxify.objectForURL(),	fb.objectForURL);

app.get('/', routes.index);
app.get('/users', user.list);


/**********************/
/* Development Routes */
/**********************/

app.get('/dev/exploreGraph',	fb.requiresAuthentication, dev.exploreGraph);
app.get('/dev/me',				fb.requiresAuthentication, dev.me);
app.get('/dev/checkfriends',	fb.requiresAuthentication, dev.checkfriends);
app.get('/dev/test-email',		fb.requiresAuthentication, dev.testEmail);

app.get('/dev/whoami',		fb.requiresAuthentication, dev.whoami);
app.get('/dev/myphotos',	fb.requiresAuthentication, dev.myphotos);

app.get('/dev/session',	dev.session);

app.get('/dev/drop',	fb.requiresAuthentication,	dev.drop);

app.get('/dev/s3test',	dev.s3test);


/**********/
/* Server */
/**********/

/* Self Test */
shoeboxify.validateEnviroment();

http.createServer(app).listen(app.get('port'), function(){
	console.log("Shoeboxify Server listening on port " + app.get('port'));
});
