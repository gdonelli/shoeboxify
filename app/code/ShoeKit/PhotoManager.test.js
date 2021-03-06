
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
                        var emitter = photoManager.addPhotoWithFacebookId(test_resources.kSteveJobsPhotoId,
                            function(err, newPhoto)
                            {
                                if (err)
                                    throw err;
                                    
                                Photo.assert(newPhoto);

                                var photoId = newPhoto.getFacebookId();
                                assert( photoId == test_resources.kSteveJobsPhotoId
                                    ,   'photoId dont match');

                                photo = newPhoto;
                                
                                a.assert_def( photo.getCopyObject(),    'photo.getCopyObject()' );
                                a.assert_def( photo.getSourceObject(),  'photo.getSourceObject()' );
                                
                                done();
                            });
                   
                        var progressWasSent = false;
                   
                        emitter.on('progress',
                            function(data) {
                                a.assert_def(data, 'data');
                                a.assert_def(data.percentage, 'data.percentage');
                                progressWasSent = true;
                            });
                   
                        setTimeout(
                            function() {
                                assert(progressWasSent, 'progress data was not sent');
                            }, 100);

                    });

                it( 'PhotoManager.addPhotoWithFacebookId same',
                    function(done)
                    {
                        photoManager.addPhotoWithFacebookId(test_resources.kSteveJobsPhotoId,
                            function(err, newPhoto)
                            {
                                if (err)
                                    throw err;
                                    
                                Photo.assert(newPhoto);

                                var photoId = newPhoto.getFacebookId();
                                assert( photoId == test_resources.kSteveJobsPhotoId
                                    ,   'photoId dont match');

                                done();
                            } );
                    });

                it( 'PhotoManager.addPhotoWithFacebookId other',
                    function(done)
                    {
                        photoManager.addPhotoWithFacebookId( test_resources.kProfilePhotoId,
                            function(err, newPhoto)
                            {
                                if (err)
                                    throw err;
                                    
                                Photo.assert(newPhoto);

                                var photoId = newPhoto.getFacebookId();
                                assert( photoId == test_resources.kProfilePhotoId
                                    ,   'photoId dont match');

                                done();
                            } );
                    });

                it( 'PhotoManager.addPhotoWithFacebookId fail',
                    function(done)
                    {
                        photoManager.addPhotoWithFacebookId( '10200427572197705',
                            function(err, newPhoto)
                            {
                                if (err)
                                    done();
                                else
                                    throw new Error('should fail');
                            });
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
                        photoManager.removePhoto(photo,
                            function(err) {
                                if (err)
                                    throw err;
                                else
                                    done();
                            });
                    });

                it( 'PhotoManager.removeAllPhotos',
                    function(done)
                    {                  
                        photoManager.removeAllPhotos(
                            function(err) {
                                if (err)
                                    throw err;
                                else
                                    done();
                            });
                    });

            } );

    });