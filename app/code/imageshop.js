/* 

===================[   imageshop   ]==================

Image processing module

Info:	
			imageshop.getSize
Operations:
			imageshop.resample

Debug:
			imageshop.resampleQueue			

Konstants:
			imageshop.k.maxDimensionKey
			imageshop.k.maxSafeInputAreaKey
			imageshop.k.defaultResampleOptions

======================================================

*/

var		assert		= require('assert')
	,	imagemagick	= require('imagemagick')
	,	fs			= require('fs')
	,	_			= require('underscore')

	,	handy		= require('./handy')

	,	OperationQueue	= require('./operation').queue
	;

var imageshop = exports;


imageshop.makeSize =
	function(width, height)
	{
		return	{	width:	width, 
					height:	height	};
	};


/* ======================================================== */
/* ======================================================== */
/* ========================= Info ========================= */
/* ======================================================== */
/* ======================================================== */



imageshop.getSize =
	function(filePath, success_f /* size{ width:XXX, height:XXX } */, error_f)
	{
		imagemagick.identify([ '-format', '%wx%h', filePath ]
			,	function(err, features) 
				{
		  			if (err) 
		  			{
						return _errorExit(err);
		  			}	
		  			else
		  			{
			  			var elements = features.split('x');
			  			if (elements.length != 2)
							return _errorExit('features.split returned array with len:' + elements.length);

			  			var size = _makeSafeSize(elements[0], elements[1]);
			  			
			  			if (success_f)
			  				success_f( size );
		  			}
				} );
		
		/* aux ========================== */

		function _errorExit(e)
		{
			var err = e;

			if ( _.isString(e) )
				err = new Error(e);

			err.filePath = filePath;

			if (error_f)
				error_f(err);
		}

		function _makeSafeSize(w, h)
		{
			var width;
			var height;

			if (_.isString(w)) {
				var candidate = w.trim();
				assert( handy.isNumberString(candidate), 'width is not a number' );
				width = Math.round(candidate);
			}

			if (_.isString(h)) {
				var candidate = h.trim();
				assert( handy.isNumberString(candidate), 'height is not a number' );
				height = Math.round(candidate);
			}

			return imageshop.makeSize(width, height);
		}
	}


/* ======================================================== */
/* ======================================================== */
/* =====================  Operations  ===================== */
/* ======================================================== */
/* ======================================================== */

/*

	Options{
			maxDimension: ...
		,	maxSafeInputArea: ...
	}

*/

imageshop.k = {};

imageshop.k.maxDimensionKey		= 'maxDimension';
imageshop.k.maxSafeInputAreaKey	= 'maxSafeInputArea';

imageshop.k.defaultResampleOptions = {};
imageshop.k.defaultResampleOptions[imageshop.k.maxDimensionKey]		= 2048;
imageshop.k.defaultResampleOptions[imageshop.k.maxSafeInputAreaKey]	= 3000 * 3000;

imageshop.resample = 
	function(filePath, options, success_f /* (outpath, size) */, error_f)
	{
		handy.assert_f(success_f);
		handy.assert_f(error_f);

		imageshop.getSize(filePath
			,	function success(size)
				{
					_assertSize(size);

					if	(	options			
						&&	options[imageshop.k.maxSafeInputAreaKey]
						&&	(size.width * size.height) > options[imageshop.k.maxSafeInputAreaKey] )
					{
						var tooBigError = new Error('Source image is too large');
						tooBigError.code = 'TOOBIG';

						error_f(tooBigError);
					}
					else if (	options
							&&	options[imageshop.k.maxDimensionKey]
							&&	Math.max(size.width, size.height) > options[imageshop.k.maxDimensionKey] )
					{
						// will need to resize the image...
						_resize(filePath, options[imageshop.k.maxDimensionKey], success_f, error_f);
					}
					else
					{
						// only resample...
						var outPath = handy.tmpFile('jpg');

						_convert( filePath, outPath, []
								,	function success(outpath) {
										success_f(outpath, size);
									}
								,	error_f );
					}
		 		}
		 	,	function error(e) {
		 			error_f(e);
		 		} );
	};

var MAX_CONCURRENT_OPS	= 1;
var MAX_NUM_WAITING_OPS	= 10;

var _resampleOperationQueue = new OperationQueue( MAX_CONCURRENT_OPS );

_resampleOperationQueue.on('abort', 
	function(e){ 
		console.error('A resampleOperation in the shared queue failed:');
		console.error(e);
		handy.errorLogStacktrace(e);

	});	

function _hasResampleOperationQueueCapacityFor(numOfOps, error_f)
{
	if ( _resampleOperationQueue.waitCount() + numOfOps > MAX_NUM_WAITING_OPS )
	{
		var tooBusy = new Error('_resampleOperationQueue is full');
		tooBusy.code = 'TOOBUSY';		
		process.nextTick( function(){ error_f(tooBusy); } );

		return false;
	}

	return true;
}


imageshop.safeResample = 
	function(filePath, options, success_f /* (outpath, size) */, error_f)
	{
		handy.assert_f(success_f);
		handy.assert_f(error_f);

		if ( !_hasResampleOperationQueueCapacityFor(1, error_f) ) {
			return;
		}

		_resampleOperationQueue.add(
			function resampleOperation(done) {
				imageshop.resample(filePath, options
					,	function success(outpath, size)
						{
							success_f(outpath, size);
							done();
						}
					,	function error(e)
						{
							error_f(e);
							done();
						} );
			} );
	};


imageshop.createThumbnails = 
	function(sourcePath, sourceSize, success_f /*(array)*/, error_f )
	{
		assert(sourcePath != undefined, 'sourcePath is undefined');
		handy.assert_f(success_f);
		handy.assert_f(error_f);
		_assertSize(sourceSize);
			
		var defaultThumbDimension = [ 130, 320, 720 ];
		var sourceMaxDimension = Math.max(sourceSize.width, sourceSize.height);

		var thumbToMake = _.filter( defaultThumbDimension, 
			function(num) {
				return num < sourceMaxDimension 
			} );

		if ( !_hasResampleOperationQueueCapacityFor(thumbToMake.length + 1, error_f) ) {
			return;
		}

		console.log(thumbToMake);

		var thumbResult = [];

		var error;

		for (var i in thumbToMake)
		{
			var thumbSize_i = thumbToMake[i]; // thum size

			_performResize(thumbSize_i);


			function _performResize(dimension)
			{
				_resampleOperationQueue.add(
					function makeThumbOperation(doneOp)
					{
						console.log(arguments.callee.name + '_resize ' + dimension);
				
						_resize(sourcePath
							,	dimension
							,	function success(outPath, size) {
									console.log('_resize success_f');


									thumbResult.push( { path:outPath, size:size } );
									doneOp();
								}
							,	function error(e) {

									console.log('_resize error');

									if (!error)
										error = e;
									doneOp();
								} );

					} );				
			}

		}

		console.log(arguments.callee.name + 'add finish');

		_resampleOperationQueue.add(
			function finish(doneOp)
			{
				console.log('finish');

				if (error)
					error_f(error);
				else
					success_f(thumbResult);

				doneOp();
			});

	}

imageshop.resampleQueue =
	function()
	{
		return _resampleOperationQueue;
	};


function _assertSize(size)
{
	assert( _.isObject(size), 'size not an object is ' + size );
	assert( size.width	!= undefined, 'size.width != undefined' );
	assert( size.height	!= undefined, 'size.height != undefined' );
}


function _resize(filePath, dimension, success_f /* (outPath, size) */, error_f)
{
	console.log(arguments.callee.name);

	handy.assert_f(success_f);
	handy.assert_f(error_f);
	assert( _.isNumber(dimension), 'dimension is expected to be a number');

	var outPath = handy.tmpFile('jpg');

	_convert( filePath, outPath, [ '-resize', dimension+'x'+dimension ]
		, 	function success(resultPath)
			{
				imageshop.getSize(resultPath
					,	function success(size)
						{
							success_f(resultPath, size);
						}
					,	error_f );
			}
		, 	error_f );
}

/*
 *	The single funnell:
 */

function _convert( srcPath, outPath, otherArgs, success_f /* (outpath) */, error_f)
{
	var args =	[	srcPath
				,	'-density',		'72'
				,	'-colorspace',	'rgb'
				,	'-format',		'jpg'
				,	'-quality',		'68'
				];

	args = _.union(args, otherArgs);

	args.push( outPath );
	
	// console.log(args);

	imagemagick.convert( args			
					,	function(err, stdout, stderr) 
						{

						/*
							console.log('err:');
							console.log(err);
							console.log('stdout:');
							console.log(stdout);
							console.log('stderr:');
							console.log(stderr);
						*/

							if (err)
								error_f(err);
							else if (success_f)
								success_f(outPath);
						} );
}



