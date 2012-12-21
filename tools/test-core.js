var     assert  = require("assert")
    ,   path    = require("path")
    ,   fs      = require("fs")
	,	child_process	= require('child_process')
	;

var GLOBAL_FILE = path.normalize( __dirname + '/../app/first.js' );

require(GLOBAL_FILE); // Setup out custom import module: use

function main()
{
	var thisFile = __filename;

	var unitTestToMatch;
	var subsystemMatch;

	if (process.argv.length == 3)
	{
		var inputArg = process.argv[2];

		unitTestToMatch	= inputArg + '.test.js';
		subsystemMatch	= '/' + inputArg + '/' ;
	}

	var modules = use.lib.modules();

	var fileToRun = [ GLOBAL_FILE ];

	for (var module in modules)
	{
		var modulePath = modules[module];
		var fileName = path.basename(modulePath);

		if ( fileName.endsWith('.test.js') ) 
		{
			if (unitTestToMatch && subsystemMatch)
			{
				if ( fileName == unitTestToMatch || modulePath.contains(subsystemMatch) )
					fileToRun.push(modulePath);
			}
			else
			{
				fileToRun.push(modulePath);		
			}
		}
	}
	var debugString = '';

	for (var i in fileToRun)
	{
		var file_i = fileToRun[i];
		var fileName = path.basename(file_i);
		debugString += ' ' + fileName;
	}

	var mochaBin = path.normalize( __dirname + '/../app/node_modules/mocha/bin/mocha' );

	var basicArgs = [mochaBin, '-t', '10000', '-R', 'spec' ];

	var args = basicArgs.concat(fileToRun);


	var appDir = path.normalize( __dirname + '/../app' );

	// spawn
	/*
	var mochaProcess = child_process.spawn('node', args, { cwd: appDir } );

	mochaProcess.stdout.pipe(process.stdout);
	mochaProcess.stderr.pipe(process.stderr);
	mochaProcess.on('exit', function(code) { process.exit(code); } );
	*/
	
	var cmdString = 'node ';
	for (var i in args)
	{
		var arg_i = args[i];
		cmdString += ' ' + arg_i; 
	}
	
	console.log(cmdString);
    
    process.exit(0);
}

/*
function secret_env() // no used
{
	var value = fs.readFileSync( '../secret/setenv.sh', 'utf-8');

	var lines = value.split('\n');

	var result = {};
	// console.log(lines);

	for (var i in lines)
	{
		var line_i = lines[i].trim();

		if (line_i.startsWith('export'))
		{
			var assign = line_i.substring(7, line_i.length);
			assign = assign.trim();

			var elements = assign.split('=');
			var leftValue	= elements[0];
			var rightValue	= elements[1];
			var rightValueElements = rightValue.split('"');

			assert(rightValueElements.length == 3, 'Line ' + i + ' | ' + line_i);

			var rightValueClean = rightValueElements[1];

			result[leftValue] = rightValueClean;
		}
	}

	return result;
}
*/


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

if (typeof String.prototype.contains != 'function') {
	String.prototype.contains =
		function (str){
			return this.indexOf(str) >= 0;
		};
}

main();


