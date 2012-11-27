/* 

====================[   Handy   ]====================

Data:	
			handy.ASCIItoBase64
			handy.Base64toASCII

HTTP:
			handy.is200OK
			handy.HEAD
			handy.GET
			handy.requestURL

Debug:
			handy.assert_f
			handy.assert_http_url
			handy.writeHTMLstacktrace
			handy.errorLogStacktrace

Other:
			String.startsWith
			String.endsWith
			handy.elapsedTimeSince

======================================================

*/


var		url		= require('url')
	,	fs		= require('fs')
	,	http	= require('http')
	,	https	= require('https')
	,	assert	= require('assert')
	, 	nodeuuid= require('node-uuid')
	,	wrench	= require('wrench')

	,	stacktrace	= require('./stacktrace')
	;

var handy = exports;

/* ======================================================== */
/* ======================================================== */
/* ========================= Data ========================= */
/* ======================================================== */
/* ======================================================== */

handy.ASCIItoBase64 =
	function(asciiString)
	{
		return new Buffer(asciiString).toString('base64');
	}


handy.Base64toASCII =
	function(string64)
	{
		return new Buffer(string64, 'base64').toString('ascii');
	}


/* ======================================================== */
/* ======================================================== */
/* ========================= HTTP ========================= */
/* ======================================================== */
/* ======================================================== */


handy.is200OK =
	function( theURL, result_f  /* ( true_or_false ) */ )
	{
		assert(theURL != undefined, 'theURL is undefined');
		handy.assert_f(result_f);

		handy.HEAD(theURL
			,	function success(ponse) {
					// console.log('success:');
					// console.log('ponse.statusCode: ' + ponse.statusCode);

					result_f( ponse.statusCode == 200 );
				}
			,	function error(error) {
					// console.log('error:');
					// console.log(error);
					
					result_f(false);
				} );
	}


handy.HEAD =
	function(	theURL
			,	success_f	/*	(ponse)	*/
			,	error_f		/*	(error)	*/
			)
	{
		return _makeHTTPRequest(
					theURL
				,	'HEAD'
				,	function(read_s, ponse)
					{
						/*						
						console.log('read_s:');
						console.log(read_s);

						console.log('ponse:');
						console.log(ponse);
						*/

						if (success_f)
							success_f(ponse);
					}
				,	error_f
				,	false);			

	};


handy.GET =
	function(	theURL
			,	_200OK_f	/*	(read_s, ponse)	*/
			,	other_f		/*	(ponse)		*/
			,	error_f		/*	(error)		*/
			,	traverse
			)
	{
		return _makeHTTPRequest(
					theURL
				,	'GET'
				,	function(read_s, ponse)
					{

						if (ponse.statusCode == 200)
						{
							if (_200OK_f)
								_200OK_f(read_s, ponse);
						}
						else if (traverse == true && ponse.statusCode == 302)
						{
							assert(ponse.headers.location != undefined, 'ponse.headers.location is undefined');

							handy.GET(ponse.headers.location, _200OK_f, other_f, error_f, traverse);
						}
						else
						{	
							ponse.readBuffer = read_s;

							if (other_f)
								other_f(ponse);			
						}
					}
				,	error_f
				,	traverse);			
	};


handy.requestURL =
	function(theURL, extraOpz, requestHandler /* (ponse) */)
	{
		var theURLElements = url.parse(theURL);

		var questOptions = {
					hostname:	theURLElements['hostname']
				,		path:	theURLElements['path']
 				}

 		if (extraOpz.method)
 			questOptions.method = extraOpz.method;

		if (theURLElements.port)
			questOptions.port = theURLElements.port;

		var methodAgent = theURLElements['protocol'] == 'https:' ? https : http;

		var quest = methodAgent.request(questOptions, requestHandler);

		return quest;
	}
 

function _makeHTTPRequest(	theURL
						,	httpMethod
						,	success_f	/*	(read_s, ponse)	*/
						,	error_f		/*	(error)		*/
						,	traverse
						)
	{
		var quest = handy.requestURL(
				theURL
			,	{
					method: httpMethod
				}
			,	function(ponse) {
					// console.log("statusCode: ", ponse.statusCode);
					// console.log("headers: ", ponse.headers);

					var read_s = '';

					ponse.on('data',
						function(chuck) {
							read_s += chuck;
						});

					ponse.on('end',
						function(p) {
							if (success_f)
								success_f(read_s, ponse);
						});
				} );

		quest.on('error',
			function(e) {
				// console.error(e);

				if (error_f)
					error_f(e);
			} );

		quest.end();
	};


/* ========================================================= */
/* ========================================================= */
/* ========================= Debug ========================= */
/* ========================================================= */
/* ========================================================= */


handy.assert_f = 
	function( candidate_f, canBeUndefined )
	{
		if (canBeUndefined != undefined) 
		{
			if (canBeUndefined && candidate_f == undefined)
				return;	
		}

		assert( (typeof candidate_f == 'function'), 'expected function, given: ' + candidate_f );	
	};


handy.assert_http_url = 
	function(url)
	{
		assert( url != undefined, 'url is undefined');
		assert( url.startsWith('http') != undefined, 'url doesnt start with http');
	};


handy.writeHTMLstacktrace =
	function( ponse, forError )
	{
		var options;

		if (forError)
			options = { e : forError };

		var trace = stacktrace.process( options );

		for (var i in trace)
		{
			var line_i = trace[i];
			ponse.write( line_i.replace( " ", '&nbsp;' ) );
			ponse.write('<br>');
		}
	};


handy.errorLogStacktrace =
	function(forError)
	{
		var options;

		if (forError)
			options = { e : forError };

		var trace = stacktrace.process( options );
		
		console.error(trace);

		return trace;
	};


/* ========================================================= */
/* ========================================================= */
/* ========================= Other ========================= */
/* ========================================================= */
/* ========================================================= */


if (typeof String.prototype.startsWith != 'function') {
	String.prototype.startsWith =
		function (str){
			return this.substring(0, str.length) === str;
		};
}


if (typeof String.prototype.endsWith != 'function') {
	String.prototype.endsWith =
		function (str){
			return this.substring(this.length-str.length, this.length) === str;
		};
}


handy.elapsedTimeSince =
	function(startTime)
	{
		assert(startTime != undefined, 'startTime is undefined');

		var now = new Date();

		return now.getTime() - startTime.getTime();
	};





var _TMP_DIR = __dirname + '/../tmp';

var _tmpDirectory_exist = false;

handy.rmTmpDirectory = 
	function()
	{
		if (fs.existsSync(_TMP_DIR)) {
			console.log('TMP_DIR exist -> ' + _TMP_DIR);
			wrench.rmdirSyncRecursive(_TMP_DIR);
		}
	}

handy.tmpDirectory = 
	function() 
	{
		var result = _TMP_DIR;

		if (!_tmpDirectory_exist)
		{
			var r = fs.mkdirSync(result);

			console.log('fs.mkdirSync(' + result + ') result: ' + r);

			_tmpDirectory_exist = true;
		}

		return result + '/';
	}


handy.tmpFile =
	function(extension) 
	{
		var result = handy.tmpDirectory();

		result += nodeuuid.v1();

		if (extension)
			result += '.' + extension;

		return result;
	}

