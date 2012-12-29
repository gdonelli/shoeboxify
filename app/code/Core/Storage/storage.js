/*

=======================[   Storage   ]=======================
Resource Storage based on S3


storage.copyFacebookPhoto

================================================================

*/

var     assert  = require('assert')
    ,   _       = require('underscore')
    ,   fs      = require('fs')
    ,   path    = require('path')

    ,   a       = use('a')
    ,   s3      = use('s3')
    ,   httpx   = use('httpx')
    ,   tmp     = use('tmp')

    ,   imageshop       = use('imageshop')
    ,   OperationQueue  = use('OperationQueue')
    ;


var storage = exports;

storage.kInvalidObjectError = 'INVALID_OBJ_ERR';

storage.copyFacebookPhoto =
    function( userId, photoId, fbPhotoObject, callback /* (err, copyObject) */)
    {
        a.assert_uid(userId);
        a.assert_def(photoId,   'photoId');
        a.assert_obj(fbPhotoObject);
        a.assert_f(callback);

        // Copy all images to S3
        var q = new OperationQueue(20);
        
        if ( !_isFacebookPhotoObject(fbPhotoObject) ) {
            var err = new Error('Object is not a valid Facebook Photo');
            err.code = storage.kInvalidObjectError;
            process.nextTick( function() { callback(err) } );
            
            return q;
        }
        
        var imageDictionary = _getImageDictionaryForFacebookPhoto(fbPhotoObject);
    
        var s3client = s3.production.clientRW();
        var totalBytesWrittenToS3 = 0;

        // Sort images by size
        var imageURLs = Object.keys(imageDictionary);
        imageURLs = imageURLs.sort(
            function(a, b) { 
                return imageDictionary[a].size.width - imageDictionary[b].size.width;
            });

        q.context = {};
        q.context.failure = false;
              
        for ( var i=0; i<imageURLs.length; i++ )
        {
            var srcURL    = imageURLs[i];
            var imageInfo = imageDictionary[srcURL];

            (function (srcURL, imageInfo, i) { /* force closure */
                q.add(
                    function CopyImageToS3Operation(doneOp)
                    {
                        var options = { size:imageInfo.size, index:i }; 
                        var dstPath = _imageDestinationPath(userId, photoId, (imageInfo.original == true), options);

                        var stream = s3.copyURL( s3client, srcURL, dstPath,
                            function(err, total)
                            {
                                if (err) {
                                    console.error('s3.copyURL failed');
                                    console.error(e.stack);
                                    q.context.failure = true;
                                }
                                else {
                                    var s3copyURL = s3client.URLForPath(dstPath);
                                    imageInfo.copyPath = dstPath;
                                    imageInfo.copyURL = s3copyURL;

                                    totalBytesWrittenToS3 += total;
                                }
                                
                                doneOp();
                            });
                          
                          stream.on('progress',
                            function(data) {
                                imageInfo.progress = {
                                        written:    data.written,
                                        total:      data.total
                                    };
                                    
                                var progress = _calculateProgess(imageDictionary);
                                q.emit('progress', { percentage: progress } );
                            });
                    });
            }) (srcURL, imageInfo, i);
        }
               
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // !!!      TODO: write fb object as info.json  
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

        // q.context.failure = true;        

        // Once all the copy operations complete
        q.wait(
            function() {
   
                if (q.context.failure)
                {
                    _rollback( 
                        function() { 
                            var error = new Error('Copy to S3 failed');
                            callback(error);
                        } );
                }
                else
                {
                    var copyObject = _getCopyObject();
                    callback(null, copyObject);
                }

            });


        return q; // return Q for unit testing pourposes.

        /* aux ==== */
        
        function _rollback(done)
        {
            var allPathsCopied = [];

            for ( var i=0; i<imageURLs.length; i++ )
            {
                var srcURL    = imageURLs[i];
                var imageInfo = imageDictionary[srcURL];

                if (imageInfo.copyPath)
                    allPathsCopied.push(imageInfo.copyPath);
            }

            // console.log('S3 Copy - Attampting to rollback:');
            // console.log(allPathsCopied); 

            s3.remove(s3client, allPathsCopied,
                function(err, ponse) {
                    if (err)
                        console.error('S3 Copy - Rollback Failed');
                    else
                        console.log('S3 Copy - Rollback success');
              
                    done();
                } );
        }

        function _getCopyObject()
        {
            var result = {};

            result.picture = imageDictionary[fbPhotoObject.picture].copyURL;
            result.source = imageDictionary[fbPhotoObject.source].copyURL;
            result.images = [];

            for (var index in fbPhotoObject.images) {
                var imageInfo = fbPhotoObject.images[index];

                result.images[index] = {};
                result.images[index].source = imageDictionary[imageInfo.source].copyURL;
            }

            return result;
        }
        
        function _calculateProgess()
        {
            var stateArray =
                _.map(Object.keys(imageDictionary),
                    function(key) {
                        var imageInfo = imageDictionary[key];
                        if (!imageInfo.progress)
                            return 0;
                        else
                            return imageInfo.progress.written / imageInfo.progress.total;
                    });

            var sumState = _.reduce(stateArray, function(memo, num){ return memo + num; }, 0);
            var percentage = sumState/stateArray.length;

            return percentage;
        }

    };

storage.deleteFilesInCopyObject = 
    function(userId, copyObject, callback /* (err) */)
    {
        a.assert_uid(userId);
        a.assert_obj(copyObject);
        a.assert_f(callback);

        var imageDict = _getImageDictionaryForFacebookPhoto(copyObject);
        var images = Object.keys(imageDict);

        var info = s3.getInfoForURLs(images);

        assert( images.length >= info.paths.length,
                'something is wrong with the paths images.length: ' + images.length + ' ' +
                'info.paths.length: ' + info.paths.length );

        for (var i in info.paths) {
            var path_i = info.paths[i];
            assert(path_i.startsWith('/' + userId), 'S3 path:' + path_i + ' doesnt match userId:' + userId );
        }

        var s3client = s3.getClient(info.bucket, 'RW');

        s3.remove( s3client, info.paths, callback );
    };


storage.copyImageURL =
    function(userId, photoId, theURL, callback /* (err, copyObject) */)
    {
        a.assert_uid(userId);
        a.assert_obj(photoId);
        a.assert_http_url(theURL);
        a.assert_f(callback);

        var q = new OperationQueue(1);

//        q.debug = true;

        q.context = {};

        q.on('abort', callback);

        //
        // Download image locally
        //      -> q.context.downloadedPath
        q.add( 
            function DownloadOperation(doneOp) {
                _downloadImageURL( theURL,
                    function(err, localPath) {
                        if (err)
                            return q.abort(err);
                            
                        q.context.downloadedPath = localPath;
                        doneOp();
                    });
            });
        
        //
        // Resample original image
        //      ->  q.context.original = {path, size}
        q.add(
            function ResampleOperation(doneOp) {
                a.assert_def(q.context.downloadedPath, 'q.context.downloadedPath');

                imageshop.resample( q.context.downloadedPath, imageshop.k.DefaultResampleOptions,
                    function(err, outPath, outSize)
                    {
                        if (err)
                            return q.abort(e);
                            
                        q.context.original = {};
                        q.context.original.path = outPath;
                        q.context.original.size = outSize;
                        doneOp();
                    } );
            });

        //
        // Make thumbnails
        //      ->  q.context.thumbnails = [ {path, size}, ... ]
        q.add( 
            function MakeThumbnails(doneOp) {
                a.assert_def(q.context.original.path, 'q.context.original.path');
                a.assert_def(q.context.original.size, 'q.context.original.size');

                imageshop.createThumbnails( q.context.original.path, q.context.original.size,
                    function(err, array){
                        if (err)
                            return q.abort(e);
                            
                        q.context.thumbnails = array;
                        doneOp();
                    });
            });

        //
        // Upload images to S3
        //      -> q.context.uploaded = [ { path, size, s3path, URL }, ... ]
        //      -> q.context.original
        //      -> q.context.thumbnail
        q.add( 
            function UploadToS3(doneOp) {
                q.context.uploaded = _.union( [ q.context.original ], q.context.thumbnails);

                var s3client = s3.production.clientRW();

                for ( var i in q.context.uploaded )
                {
                    var fileInfo = q.context.uploaded[i];
                    assert(fileInfo != undefined, 'fileInfo is undefined');
                    assert(fileInfo.path != undefined, 'fileInfo.path is undefined');
                    assert(fileInfo.size != undefined, 'fileInfo.size is undefined');

                    var imageOpz = {  index: i, 
                                       size:fileInfo.size
                                   };
                    
                    var original = ( fileInfo == q.context.original );

                    if (original)
                        q.context.original = fileInfo;
                    else if (i == 1)
                        q.context.thumbnail = fileInfo;

                    var s3path = _imageDestinationPath(userId, photoId, original, imageOpz);

                    _copyFileInfo(fileInfo, s3path);
                }

                /* aux ==== */

                var successCount = 0;
                var errorCount = 0;

                function _copyFileInfo(theFileInfo, s3path)
                {
                    s3.copyFile( s3client, theFileInfo.path, s3path,
                        function(err, byteLen)
                        {
                            if (err) {
                                theFileInfo.error = err;
                                errorCount++;
                                return _checkDone();
                            }
                            
                            theFileInfo.s3path = s3path;
                            theFileInfo.URL = s3client.URLForPath(s3path);
                            successCount++;
                            _checkDone();
                        });
                }

                function _checkDone()
                {
                    if (successCount + errorCount >= q.context.uploaded.length)
                    {
                        if (errorCount == 0)
                            doneOp();
                        else
                            q.abort(e);
                    }
                }               
            });

        //
        // <!!!> Compose CopyObject entry <!!!>
        //          -> q.context.copyObject
        //
        q.add( 
            function MakeEntryOperation(doneOp)
            {
                var entry = {};

                entry.picture = q.context.thumbnail.URL;
                entry.source  = q.context.original.URL; 
                entry.width   = q.context.original.size.width;
                entry.height  = q.context.original.size.height;
                entry.images  = [];

                for (var i in q.context.uploaded) {
                    var imageInfo = q.context.uploaded[i];

                    entry.images.push( {    source: imageInfo.URL
                                        ,     size: imageInfo.size  }   );
                }

                q.context.copyObject = entry;

                doneOp();
            });


        //
        // Clean up tmp files
        //
        q.add(
            function CleanUpTempFilesOperation(doneOp)
            {
                var allTmpPath =    [   q.context.downloadedPath
                                    ,   q.context.original.path     ];

                for (var i in q.context.uploaded) {
                    var image_i     = q.context.uploaded[i];
                    var imagePath_i = image_i.path;

                    allTmpPath.push(imagePath_i);
                }
                
                var removedCount = 0;

                for (var j in allTmpPath)
                {
                    var path_j = allTmpPath[j];

                    fs.unlink(path_j, 
                        function() {
                            removedCount++;

                            if (removedCount >= allTmpPath.length) {
                                doneOp();
                            }
                        });
                }
            } );

        //
        // Done!
        //
        q.add(
            function SuccessOperation(doneOp)
            {
                callback(null, q.context.copyObject);
                doneOp();
            } );

    };

storage.getPaths = 
    function (userId, callback /* (err, paths) */)
    {
        a.assert_uid(userId);
        a.assert_f(callback);

        var s3client = s3.production.clientR();

        s3.getPathsWithPrefix(s3client, userId, callback);
    }

storage.remove =
    function (userId, callback /* (err) */)
    {
        storage.getPaths(userId,
            function(err, paths)
            {
                var s3client = s3.production.clientRW();
                
                s3.remove(s3client, paths, callback);
            });
    }

/* ========================================================== */
/* ========================================================== */
/* ======================[  Private  ]======================= */
/* ========================================================== */
/* ========================================================== */


function ___PRIVATE___(){}


storage.private = {};

var MAX_IMAGE_BYTE_SIZE = 1024 * 1024 * 1; // 1 MB

function _downloadImageURL( theURL, callback /* (err, local_path) */ )
{
    var quest = httpx.requestURL(theURL, {},
        function(ponse) {

            var contentLength = ponse.headers['content-length'];

            if (contentLength != undefined && 
                Math.round(contentLength) > MAX_IMAGE_BYTE_SIZE )
            {
                return _abortTransfer('File is too big');
            }

            var fileExtension = _isImageResponse(ponse);

            if ( fileExtension == undefined )
            {
                return _abortTransfer('File is not an image');
            }

            // Download file locally first...
            var resultFilePath = tmp.getFile(fileExtension);
            var tmpFileStream  = fs.createWriteStream(resultFilePath);

            ponse.pipe(tmpFileStream);

            tmpFileStream.on('error',
                function (err) {
                    console.log(err);
                } );

            var totBytes = 0;

            ponse.on('data',
                function(chuck) {
                    totBytes += chuck.length;
                    // console.log('totBytes# ' + totBytes);

                    if ( totBytes > MAX_IMAGE_BYTE_SIZE ) {
                        _abortTransfer('File is too big (on stream)');
                    }
                });

            ponse.on('end',
                function(p) {
                    // console.log('httpx.requestURL -> done');

                    callback( null, resultFilePath );
                });
        
            /* aux =============================== */

            function _abortTransfer(msg)
            {
                callback( new Error(msg) );
                callback = undefined; // makes sure this is the only invocation to callback
                    
                ponse.destroy();
            }

        } );

    quest.on('error',
        function(e) {
            // console.error(e);

            if (callback)
                callback(e);
        } );

    quest.end();
}

function _isImageResponse(ponse) // returns file extension...
{   
    a.assert_def(ponse, 'ponse');

    // console.log("statusCode: " + ponse.statusCode);
    // console.log("headers: ");
    // console.log(ponse.headers);

    var contentLength = ponse.headers['content-length'];
    
    if (Math.round(contentLength) > MAX_IMAGE_BYTE_SIZE)
        return undefined;

    var contentType = ponse.headers['content-type'];
    
    if ( contentType.startsWith('image/') )
    {
        var elements = contentType.split('/');

        if (elements.length == 2);
        {
            var result = elements[1];

            if (result.length <= 4)
                return result;
        }
    }
        
    return undefined;
};

/*  

returns:
    {
        URL :   {
                    size: { width, height }
                    original: (opt. boolean)
                }
        [...]
    }

*/

storage.private.getImageDictionaryForFacebookPhoto = _getImageDictionaryForFacebookPhoto;

function _getImageDictionaryForFacebookPhoto(fbPhotoObject)
{
    var result = {};

    var originalEntry = undefined;
    var originalEntryArea = 0;

    var pictureURL = fbPhotoObject.picture;

    result[pictureURL] = {};

    _addEntry(fbPhotoObject);

    for (var i in fbPhotoObject.images) {
        var image_i = fbPhotoObject.images[i];
        _addEntry(image_i);
    }

    return result;

    /* ===== */
    
    function _addEntry(imageInfo)
    {
        var sourceURL   = imageInfo.source;
        var sourceWidth = imageInfo.width;
        var sourceHeight= imageInfo.height;
        var sourceArea = sourceWidth * sourceHeight;

        if (result[sourceURL]) // Does it exist already?
        {
            var hitWidth  = result[sourceURL].width;
            var hitHeight = result[sourceURL].height;

            if ( hitWidth == imageInfo.width && 
                 hitHeight == imageInfo.height )
            {
                // all good, nothing to do
                return;
            }
            if (hitWidth == undefined && hitHeight == undefined)
            {
                // we have more information about a picture we saw already, we will add it
            }
            else
            {
                console.error(  'Duplicate image with size not matching: ' + 
                                    hitWidth + 'x' + hitHeight + ' vs ' +
                                    sourceWidth + 'x' + sourceHeight);
            }
        }

        result[sourceURL] = {};

        result[sourceURL].size = { width:sourceWidth, height:sourceHeight };

        if (sourceArea > originalEntryArea) {
            if (originalEntry) {
                delete originalEntry.original;
            }
            originalEntryArea = sourceArea;
            originalEntry = result[sourceURL];
            originalEntry.original = true;
        }

    }
}



/* ============================== */

function _isFacebookPhotoObject(object)
{
    return (object          != undefined    &&
            object.id       != undefined    &&
            object.from     != undefined    &&
            object.from.id  != undefined    &&
            object.images   != undefined    &&
            object.picture  != undefined );
}


function _resourceBundlePath(userId, objectId)
{
    assert(_.isString(userId),      'userId is not string');
    assert( _.isString(objectId) ||
            _.isObject(objectId),   'objectId is not a string or an object');

    return '/' + userId + '/' + objectId + '/';
}


storage.private.jsonDestinationPath = _jsonDestinationPath;

function _jsonDestinationPath(userId, objectId)
{
    var result = _resourceBundlePath(userId, objectId);
    return result + 'info.json';
}


/*
    options:    {
                    index   (required)
                    size    (optional)
                }
*/

storage.private.imageDestinationPath = _imageDestinationPath;

function _imageDestinationPath(userId, objectId, isOriginal, options)
{
    var result = _resourceBundlePath(userId, objectId);

    assert(_.isBoolean(isOriginal), 'isOriginal is not a boolean');
    assert(_.isObject(options),     'index is not a number');

    if (!isOriginal)
        result += 'thumbnail' + '/' ;

    assert( options.index != undefined, 'options.index is required' );
    
    result += options.index;

    if (options.size) {
        assert(options.size.width && options.size.height, 'options.size expected to have {width, height} fields' );
        result += '_' + options.size.width + 'x' + options.size.height;
    }

    result += '.jpg';

    return result;
}
