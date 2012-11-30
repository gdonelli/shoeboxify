
var		assert		=	require("assert")

	,	handy		=	require("./handy")
	,	imageshop	=	require("./imageshop")
	,	identity	=	require("./identity")
	;


describe('imageshop.js',
	function() 
	{	
		var googleImagePath	= handy.testDirectory('google.png');
		var nasaImagePath	= handy.testDirectory('nasa.jpg');
		var faceImagePath	= handy.testDirectory('face.jpg');
		var bigImagePath	= handy.testDirectory('big.jpg');
		var iphoneImagePath	= handy.testDirectory('iPhone4S.JPG');

		it( 'imageshop.getSize - google.png',
			function(done)
			{
				// console.log(googleImagePath);

				imageshop.getSize(	googleImagePath
						 	,	function success(size) {
						 			assert(size.width == 275, 'width expected to be 275 is:' + size.width);
						 			assert(size.height == 95, 'height expected to be 95 is: ' + size.height);

						 			done();	
						 		}
							,	function error(e){ throw e; } );
			} );

		it( 'imageshop.getSize - nasa.jpg',
			function(done)
			{
				// console.log(googleImagePath);

				imageshop.getSize(	nasaImagePath
						 	,	function success(size) {
						 			assert(size.width == 185, 'width expected to be 360 is:' + size.width);
						 			assert(size.height == 369, 'height expected to be 369 is: ' + size.height);

						 			done();	
						 		}
							,	function error(e){ throw e; } );
			} );

		it( 'imageshop.getSize - big.jpg',
			function(done)
			{
				// console.log(googleImagePath);

				imageshop.getSize(	bigImagePath
							 	,	function success(size) {
							 			assert(size.width == 5616, 'width expected to be 360 is:' + size.width);
							 			assert(size.height == 3744, 'height expected to be 369 is: ' + size.height);

							 			done();	
							 		}
								,	function error(e){ throw e; } );
			} );


		it( 'imageshop.resample - face.jpg',
			function(done)
			{
				imageshop.resample(	faceImagePath
								,	{}
							 	,	function success(path, size) {
							 			assert(size.width == 1536, 'face width expected to be 1536');
							 			assert(size.height == 1536, 'face width expected to be 1536');
							 			done();	
							 		}
								,	function error(e){ throw e; } );
			} );

		it( 'imageshop.resample - google.png',
			function(done)
			{
				imageshop.resample(	googleImagePath
								,	{}
							 	,	function success(path, size) {
							 			assert(size.width == 275, 'google width expected to be 275');
							 			assert(size.height == 95, 'google height expected to be 95');
							 			done();	
							 		}
								,	function error(e){ throw e; } );
			} );

		it( 'imageshop.resample - big',
			function(done)
			{
				var options = {};

				imageshop.resample(	bigImagePath
								,	options
							 	,	function success(path, size) {
							 			assert(size.width  == 5616,	'google width expected to be 5616');
							 			assert(size.height == 3744,	'google height expected to be 3744');
							 			done();	
							 		}
								,	function error(e){
										assert(e.code == 'TOOBIG', 'e.code should be TOOBIG, its:' + e.code);
										done();
									} );
			} );

		it( 'imageshop.resample - TOOBIG',
			function(done)
			{
				var options = {};
				options[imageshop.k.maxSafeInputAreaKey] = identity.maxImageAreaToProcess();
				var count=0;

				imageshop.safeResample(	bigImagePath
								,	options
							 	,	function success(path, size) {
							 			throw new Error('it should fail because the image is too big');	
							 		}
								,	function error(e){
										assert(e.code == 'TOOBIG', 'e.code should be TOOBIG');
										isDone();
									} );

				imageshop.safeResample(	bigImagePath
								,	options
							 	,	function success(path, size) {
							 			throw new Error('it should fail because the image is too big');	
							 		}
								,	function error(e){
										assert(e.code == 'TOOBIG', 'e.code should be TOOBIG');
										isDone();
									} );

				imageshop.safeResample(	bigImagePath
								,	options
							 	,	function success(path, size) {
							 			throw new Error('it should fail because the image is too big');	
							 		}
								,	function error(e){
										assert(e.code == 'TOOBIG', 'e.code should be TOOBIG');
										isDone();
									} );

				function isDone()
				{
					count++;
					
					if (count>=3)
						done();
				}

			} );

		it( 'imageshop.resample - iPhone4S',
			function(done)
			{
				var maxSize = identity.maxImageDimension();
				var options = {};
				options[imageshop.k.maxDimensionKey] = maxSize;

				imageshop.safeResample(	iphoneImagePath
								,	options
							 	,	function success(path, size) {
							 			assert(	size.width == maxSize || 
							 					size.height == maxSize,	
							 					'resample size doesnt match size.width:' + size.width +
							 												'size.height:' + size.height );
							 			done();
							 		}
								,	function error(e){ throw e; } );
			} );
	
	});

