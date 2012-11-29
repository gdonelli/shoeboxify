/* 

===================[   imageshop   ]==================

Image processing module

Info:	
			imageshop.getSize
Operations:
			imageshop.resample

Konstants:
			imageshop.k.maxDimensionKey
			imageshop.k.maxSafeInputAreaKey


======================================================

*/

var		assert		= require('assert')
	,	imagemagick	= require('imagemagick')
	,	fs			= require('fs')
	,	_			= require('underscore')

	,	handy		= require('./handy')
	;

var imageshop = exports;

function _size(w, h)
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

	return	{	 width:	width
			,	height:	height	};
}


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

			  			var size = _size(elements[0], elements[1]);
			  			
			  			if (success_f)
			  				success_f( size );
		  			}
				} );

		function _errorExit(e)
		{
			var err = e;

			if ( _.isString(e) )
				err = new Error(e);

			err.filePath = filePath;

			if (error_f)
				error_f(err);
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



function _resize(filePath, dimension, success_f /* (outPath, size) */, error_f)
{
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


function _assertSize(size)
{
	assert( _.isObject(size), 'size not an object is ' + size );
	assert( size.width	!= undefined, 'size.width != undefined' );
	assert( size.height	!= undefined, 'size.height != undefined' );
}

