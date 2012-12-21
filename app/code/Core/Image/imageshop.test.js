
var     assert      =   require("assert")

    ,   a           =   use('a')
    ,   imageshop   =   use('imageshop')
    ,   identity    =   use('identity')
    ,   test_resources   =   use('test-resources')
    ;


describe('imageshop.js',
    function() 
    {   
        var googleImagePath = test_resources.getPath('google.png');
        var googleImageSize = imageshop.makeSize(275, 95);

        var nasaImagePath = test_resources.getPath('nasa.jpg');
        var nasaImageSize = imageshop.makeSize(185, 369);

        var bigImagePath = test_resources.getPath('big.jpg');
        var bigImageSize = imageshop.makeSize(5616, 3744);

        var faceImagePath   = test_resources.getPath('face.jpg');
        var faceImageSize = imageshop.makeSize(1536, 1536);
    

        var iphoneImagePath = test_resources.getPath('iPhone4S.JPG');

        it( 'imageshop.getSize - google.png',
            function(done)
            {
                // console.log(googleImagePath);
                // console.log(googleImageSize);

                imageshop.getSize(  googleImagePath
                            ,   function success(size) {
                                    assert(size != undefined, 'size is undefined');
                                    assert(size.width == googleImageSize.width, 'width expected to be '+googleImageSize.width+' is:' + size.width);
                                    assert(size.height== googleImageSize.height, 'height expected to be '+googleImageSize.height+' is: ' + size.height);

                                    done(); 
                                }
                            ,   function error(e){ throw e; } );
            } );

        it( 'imageshop.getSize - nasa.jpg',
            function(done)
            {
                // console.log(googleImagePath);

                imageshop.getSize(  nasaImagePath
                            ,   function success(size) {
                                    assert(size.width  == nasaImageSize.width,  'width expected to be '+nasaImageSize.width+' is:' + size.width);
                                    assert(size.height == nasaImageSize.height, 'height expected to be '+nasaImageSize.height+' is: ' + size.height);

                                    done(); 
                                }
                            ,   function error(e){ throw e; } );
            } );

        it( 'imageshop.getSize - big.jpg',
            function(done)
            {
                // console.log(googleImagePath);

                imageshop.getSize(  bigImagePath
                                ,   function success(size) {
                                        assert(size.width == bigImageSize.width,    'width expected to be ' + bigImageSize.width    + ' is:'    + size.width);
                                        assert(size.height == bigImageSize.height,  'height expected to be '+ bigImageSize.height   + ' is: '   + size.height);

                                        done(); 
                                    }
                                ,   function error(e){ throw e; } );
            } );


        it( 'imageshop.resample - face.jpg',
            function(done)
            {
                imageshop.resample( faceImagePath
                                ,   {}
                                ,   function success(path, size) {
                                        assert(size.width == faceImageSize.width, 'face width expected to be '      + faceImageSize.width+' is:'    + size.width);
                                        assert(size.height == faceImageSize.height, 'face height expected to be '   + faceImageSize.height+' is:'   + size.height);
                                        done(); 
                                    }
                                ,   function error(e){ throw e; } );
            } );

        it( 'imageshop.resample - google.png',
            function(done)
            {
                imageshop.resample( googleImagePath
                                ,   {}
                                ,   function success(path, size) {
                                        assert(size.width == googleImageSize.width,     'google width expected to be '  + googleImageSize.height);
                                        assert(size.height == googleImageSize.height,   'google height expected to be ' + googleImageSize.height);
                                        done(); 
                                    }
                                ,   function error(e){ throw e; } );
            } );

        it( 'imageshop.resample - big',
            function(done)
            {
                var options = {};

                imageshop.resample( bigImagePath
                                ,   options
                                ,   function success(path, size) {
                                        assert(size.width  == bigImageSize.width,   'google width expected to be '  + bigImageSize.width);
                                        assert(size.height == bigImageSize.height,  'google height expected to be ' + bigImageSize.height);
                                        done(); 
                                    }
                                ,   function error(e){
                                        throw e;
                                    } );
            } );

        it( 'imageshop.resample - TOOBIG',
            function(done)
            {
                var options = {};
                options[imageshop.k.MaxSafeInputAreaKey] = identity.maxImageAreaToProcess();
                var count=0;

                imageshop.safeResample( bigImagePath
                                ,   options
                                ,   function success(path, size) {
                                        throw new Error('it should fail because the image is too big'); 
                                    }
                                ,   function error(e){
                                        assert(e.code == 'TOOBIG', 'e.code should be TOOBIG');
                                        done();
                                    } );

            } );

        it( 'imageshop.resample - iPhone4S',
            function(done)
            {
                var maxSize = identity.maxImageDimension();
                var options = {};
                options[imageshop.k.MaxDimensionKey] = maxSize;

                imageshop.safeResample( iphoneImagePath
                                ,   options
                                ,   function success(path, size) {
                                        assert( size.width == maxSize || 
                                                size.height == maxSize, 
                                                'resample size doesnt match size.width:' + size.width +
                                                                            'size.height:' + size.height );
                                        done();
                                    }
                                ,   function error(e){ throw e; } );
            } );
        

        it( 'imageshop.resample - TOOBUSY',
            function(done)
            {
                var maxSize = identity.maxImageDimension();
                var options = {};
                options[imageshop.k.maxDimensionKey] = maxSize;

                var tooBusyCount = 0;

                for (var i=0; i<100; i++)
                {
                    imageshop.safeResample( iphoneImagePath
                                    ,   options
                                    ,   function success(path, size) {}
                                    ,   function error(e){ 
                                            tooBusyCount++;
                                            // console.log(e.code);
                                            assert(e.code == 'TOOBUSY', 'expected TOOBUSY');
                                        } );
                }

                setTimeout(
                        function(){
                            // console.log( tooBusyCount );
                            imageshop.resampleQueue().purge();
                            if (tooBusyCount > 70)
                                done();
                        },
                        250);
            } );
        

        it( 'imageshop.createThumbnails - face',
            function(done)
            {
                imageshop.createThumbnails(
                        faceImagePath
                    ,   faceImageSize
                    ,   function success(array) {
                            // console.log(array);
                            assert( array.length == imageshop.k.ThumbnailDimensions.length, 'thumbnail count doesnt match');
                            done();
                        }
                    ,   function error(e) {
                            console.log(e);
                        } );
            } );

        it( 'imageshop.createThumbnails - google',
            function(done)
            {
                imageshop.createThumbnails(
                        googleImagePath
                    ,   googleImageSize
                    ,   function success(array) {
                            // console.log(array);
                            assert( array.length == 1, 'thumbnail count doesnt match');
                            done();
                        }
                    ,   function error(e) {
                            console.log(e);
                        } );
            } );


    });

