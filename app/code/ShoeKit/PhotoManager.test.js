
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

                it( 'PhotoManager.addPhotoWithFacebookId one',
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

                it( 'PhotoManager.addPhotoWithFacebookId same',
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

                                    done();
                                }
                            ,   function error(e) {
                                    throw e;
                                } );
                    });

                it( 'PhotoManager.addPhotoWithFacebookId other',
                    function(done)
                    {
                        photoManager.addPhotoWithFacebookId( 
                                test_resources.kProfilePhotoId
                            ,   function success(newPhoto)
                                {
                                    Photo.assert(newPhoto);

                                    var photoId = newPhoto.getFacebookId();
                                    assert( photoId == test_resources.kProfilePhotoId
                                        ,   'photoId dont match');

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
                            function(err, array) {
                                if (err)
                                    throw err;
                                    
                                a.assert_def(array);
                                assert(array.length == 2, 'array.length is expected to be #2 is: #' + array.length );
                                done();
                            });
                    });

                it( 'PhotoManager.removePhoto',
                    function(done)
                    {
                        photoManager.removePhoto( photo
                            ,   function success() {
                                    done();
                                }
                            ,   function error(e) {
                                    throw e;
                                } );
                    });



            } );

    });