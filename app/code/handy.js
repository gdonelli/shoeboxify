
/* utils */

var		url		= require('url')
	,	http	= require('http')
	,	https	= require('https')
	,	assert	= require("assert")
	;


exports.ASCIItoBase64 =
	function(asciiString)
	{
		return new Buffer(asciiString).toString('base64');
	}


exports.Base64toASCII =
	function(string64)
	{
		return new Buffer(string64, 'base64').toString('ascii');
	}


exports.GET =
	function(	fileUrl
			,	_200OK_f	/*	(string)	*/
			,	other_f		/*	(ponse)		*/
			,	error_f		/*	(error)		*/
			,	traverse
			)
	{
		// console.log('GET ' + fileUrl);

		var fileUrlElements = url.parse(fileUrl);

		var questOptions = {
					  method:	'GET'
				,	hostname:	fileUrlElements['hostname']
				,		path:	fileUrlElements['path']

				,	 headers: {
							'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/536.26.17 (KHTML, like Gecko) Version/6.0.2 Safari/536.26.17'
						,	'Accept' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
						,	'Connection' : 'keep-alive'
 					}

			};

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

				var buffer = '';

				ponse.on('data',
					function(chuck) {
						buffer += chuck;
					});

				ponse.on('end',
					function() {
						// console.log("END statusCode: ", ponse.statusCode);

						if (ponse.statusCode == 200)
						{
							if (_200OK_f)
								_200OK_f(buffer, ponse);
						}
						else if (traverse == true && ponse.statusCode == 302)
						{
							assert(ponse.headers.location != undefined, 'ponse.headers.location is undefined');

							exports.GET(ponse.headers.location, _200OK_f, other_f, error_f, traverse);
						}
						else
						{	
							ponse.readBuffer = buffer;

							if (other_f) {
								other_f(ponse);
							}						
						}
					});
			})

		quest.on('error',
			function(e) {
				// console.error(e);

				if (error_f)
					error_f(e);
			});

		quest.end();
	}

/* ===================== Assert ===================== */

exports.assert_f = 
	function( candidate_f, canBeUndefined )
	{
		if (canBeUndefined != undefined) 
		{
			if (canBeUndefined && candidate_f == undefined)
				return;	
		}

		assert( (typeof candidate_f == 'function'), 'expected function, given: ' + candidate_f );	
	};


/* ===================== String Extension ===================== */

if (typeof String.prototype.startsWith != 'function') {
	String.prototype.startsWith =
		function (str){
			return this.substring(0, str.length) === str;
		};
}



/*
var R = 6371; // km
var dLat = (lat2-lat1).toRad();
var dLon = (lon2-lon1).toRad();
var lat1 = lat1.toRad();
var lat2 = lat2.toRad();

var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
var d = R * c;
*/