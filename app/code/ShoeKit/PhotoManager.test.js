
var     assert  =   require("assert")

    ,   a               =   use('a')
    ,   PhotoManager    =   use('PhotoManager')
    ,   Photo           =   use('Photo')

    ,   test_resources      =   use('test-resources')
    ,   authenticationTest  =   use('authentication.test')

    ;


describe('PhotoManager.js',
    function() 
    {   

        describe('basic one photo',
            function() 
            {   
                var photoManager;
                var photo;

                it( 'new PhotoManager',
                    function()
                    {
                        photoManager = new PhotoManager( authenticationTest.getUser() );
                        PhotoManager.assert(photoManager);
                    });

                it( 'PhotoManager.addPhotoWithFacebookId',
                    function(done)
                    {
                        photoManager.addPhotoWithFacebookId( 
                                test_resources.kSteveJobsPhotoId
                            ,   function success(newPhoto)
                                {
                                    Photo.assert(newPhoto);

                                    var photoId = newPhoto.getFacebookId();
                                    assert( photoId == test_resources.kSteveJobsPhotoId
                                        ,   'photoId dont match');

                                    photo = newPhoto;

                                    done();
                                }
                            ,   function error(e) {
                                    throw e;
                                } );
                    });

                it( 'PhotoManager.getPhotos',
                    function(done)
                    {
                        photoManager.getPhotos(
                                function success(array) {
                                    a.assert_def(array);
                                    assert(array.length == 1, 'array.length is expected to be #1 is: #' + array.length );
                                    done();
                                }
                            ,   function error(e) {
                                    throw e;
                                } );
                    });

                it( 'PhotoManager.removePhoto',
                    function(done)
                    {
                        photoManager.removePhoto(
                                photo
                            ,   function success() {
                                    done();
                                }
                            ,   function error(e) {
                                    throw e;
                                } );
                    });



            } );

    });