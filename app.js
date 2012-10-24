
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


var MemStore = require('connect/lib/middleware/session/memory');

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
		app.use(express.cookieParser( shoeboxify.cookieParserHashString() ));
		app.use(express.session(
			{	store:	MemStore({
						reapInterval: 60000 * 10
					})
			}));
		app.use(app.router);
		app.use(require('stylus').middleware(__dirname + '/public'));
		app.use(express.static(path.join(__dirname, 'public')));
	});

app.configure('development',
	function(){
		app.use(express.errorHandler());
	});

app.get('/', routes.index);
app.get('/users', user.list);


/*****************/
/* Public Routes */
/*****************/

app.get(shoeboxify.facebookLoginPath(),		fb.login);
app.get(shoeboxify.facebookResponsePath(),	fb.response);


/**********************/
/* Development Routes */
/**********************/

app.get('/dev/exploreGraph',	fb.requiresAuthentication, dev.exploreGraph);
app.get('/dev/me',				fb.requiresAuthentication, dev.me);
app.get('/dev/checkfriends',	fb.requiresAuthentication, dev.checkfriends);
app.get('/dev/test-email',		fb.requiresAuthentication, dev.testEmail);

app.get('/dev/whoami',		fb.requiresAuthentication, dev.whoami);
app.get('/dev/myphotos',	fb.requiresAuthentication, dev.myphotos);


http.createServer(app).listen(app.get('port'), function(){
	console.log("Shoeboxify Server listening on port " + app.get('port'));
});
