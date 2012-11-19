
var		assert	= require("assert")
	,	url		= require("url")
	
	,	mongo		= require("./mongo")
	,	shoebox		= require("./shoebox")
	,	authTest	= require("./authetication.test")
	;


describe('shoebox.js',
	function() {


		/* Authetication setup */

		describe( 'shoebox',
			function() 
			{

				it( 'init',
					function(done)
					{
						shoebox.init( 	function success(){	done();	}
									,	function error(e){	throw e;}	);
					} );

				it( 'user.init',
					function(done)
					{
						shoebox.user.init( testUserId
								,	function success(){	done();	}
								,	function error(e){	throw e;}	
							);
					} );

				var testUserId = 'T1';
				var sjPhotoId = '10151242148911730';

				function _addSJPhoto(done, processOptions_f /* (options) */ )
				{
					shoebox.user.add( testUserId
						,	sjPhotoId
						,	authTest.pseudoRequest
						,	function success(r, options)
							{	
								assert( sjPhotoId ==  mongo.entry.getFacebookId(r), ' sjPhotoId != fbObjectId(r)' );

								if (processOptions_f)
									processOptions_f(options);

								done();
							}
						,	function error(e) 
							{ 
								console.log( e );
							} );
				}

				it( 'add SJ photo',
					function(done)
					{
						_addSJPhoto(done);
					} );

				it( 'add SJ photo again',
					function(done)
					{
						_addSJPhoto(done, 
							function(optz) {
								assert( optz.already == true, 'photo should be there already' );
							});
					} );

			} );


	} );
