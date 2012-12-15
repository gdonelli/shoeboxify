
var     assert	=   require("assert")

    ,   a           	=   use('a')
    ,   PhotoManager	=   use('PhotoManager')
	,   Photo			=   use('Photo')

    ,   test_resources		=   use('test-resources')
    ,   authenticationTest	=   use('authentication.test')
    
    ;


describe('PhotoManager.js',
    function() 
    {   
        it( 'PhotoManager.addPhotoWithFacebookId',
            function(done)
            {
            	var photoManager = new PhotoManager( authenticationTest.getUser() );
    			
            	PhotoManager.assert(photoManager);

	           	photoManager.addPhotoWithFacebookId( 
            								test_resources.k.SteveJobsPhotoId
            							,	function success(photo) {
            									Photo.assert(photo);
            									done();
            								}
            							,	function error(e) {
            									throw e;
            								} );
            });
    });