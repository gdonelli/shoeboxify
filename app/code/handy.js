
/* utils */

var		url		= require('url')
	,	http	= require('http')
	,	https	= require('https')
	,	assert	= require("assert")
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
	function( fileUrl, result_f  /* ( true_or_false ) */ )
	{
		assert(fileUrl != undefined, 'fileUrl is undefined');
		handy.assert_f(result_f);

		handy.HEAD(fileUrl
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
	function(	fileUrl
			,	success_f	/*	(ponse)	*/
			,	error_f		/*	(error)	*/
			)
	{
		return handy.makeHTTPRequest(
					fileUrl
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
	function(	fileUrl
			,	_200OK_f	/*	(read_s, ponse)	*/
			,	other_f		/*	(ponse)		*/
			,	error_f		/*	(error)		*/
			,	traverse
			)
	{
		return handy.makeHTTPRequest(
					fileUrl
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


handy.makeHTTPRequest =
	function(	fileUrl
			,	httpMethod
			,	success_f	/*	(read_s, ponse)	*/
			,	error_f		/*	(error)		*/
			,	traverse
			)
	{
		// console.log('GET ' + fileUrl);

		var fileUrlElements = url.parse(fileUrl);

		var questOptions = {
					  method:	httpMethod
				,	hostname:	fileUrlElements['hostname']
				,		path:	fileUrlElements['path']

//				,	 headers: {
//							'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/536.26.17 (KHTML, like Gecko) Version/6.0.2 Safari/536.26.17'
//						,	'Accept' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
//						,	'Connection' : 'keep-alive'

 					}

		if (fileUrlElements['port'] != undefined)
			questOptions['port'] = fileUrlElements['port'];

		var methodAgent = fileUrlElements['protocol'] == 'https:' ? https : http;

		// console.log('fileUrlElements:');
		// console.log(fileUrlElements);

		// console.log('questOptions:');
		// console.log(questOptions);

		var quest = methodAgent.request(questOptions,
			function(ponse) {
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
			});

		quest.on('error',
			function(e) {
				// console.error(e);

				if (error_f)
					error_f(e);
			});

		quest.end();
	};


/* ========================================================== */
/* ========================================================== */
/* ========================= Assert ========================= */
/* ========================================================== */
/* ========================================================== */


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


handy.elapsedTimeSince =
	function(startTime)
	{
		assert(startTime != undefined, 'startTime is undefined');

		var now = new Date();

		return now.getTime() - startTime.getTime();
	}


/* ============================================================= */
/* ============================================================= */
/* ========================= Extension ========================= */
/* ============================================================= */
/* ============================================================= */


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

