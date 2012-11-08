
/* utils */

var		url		= require('url')
	,	http	= require('http')
	,	https	= require('https');


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
	function(fileUrl, successF /* (string) */, errorF)
	{
		// console.log('GET ' + fileUrl);

		var fileUrlElements = url.parse(fileUrl);

		var questOptions = {
					  method:	'GET'
				,	hostname:	fileUrlElements['hostname']
				,	path:	fileUrlElements['path']
			};

		var methodAgent = fileUrlElements['method'] == 'http' ? http : https;

		console.log(fileUrlElements);

		var quest = methodAgent.request(questOptions,
			function(ponse) {
				console.log("statusCode: ", ponse.statusCode);
				console.log("headers: ", ponse.headers);

				var buffer = '';

				ponse.on('data',
					function(chuck) {
						buffer += chuck;
					});

				ponse.on('end',
					function() {

						console.log("END statusCode: ", ponse.statusCode);

						if (ponse.statusCode == 200){
							if (successF)
								successF(buffer);						
						}
						else
						{
							if (errorF) {
								var e = new Error('response.statusCode: ' + ponse.statusCode);
								e.response = ponse;
								errorF(e);
							}						
						}
					});
			})

		quest.on('error',
			function(e) {
				console.error(e);

				if (errorF)
					errorF(e);
			});

		quest.end();
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