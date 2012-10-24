/* utils */

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

if (typeof String.prototype.startsWith != 'function') {
	String.prototype.startsWith =
		function (str){
			return this.substring(0, str.length) === str;
		};
}