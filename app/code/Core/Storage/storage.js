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
    function( userId, photoId, fbPhotoObject, success_f /* (copyObject) */, error_f /* (e) */ )
    {
        a.assert_uid(userId);
        a.assert_def(photoId,   'photoId');
        a.assert_obj(fbPhotoObject);
        a.assert_f(success_f);
        a.assert_f(error_f);
        
        if ( !_isFacebookPhotoObject(fbPhotoObject) ) {
            var err = new Error('Object is not a valid Facebook Photo');
            err.code = storage.kInvalidObjectError;
            return process.nextTick( function() { error_f(err) } );
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

        // Copy all images to S3
        var copyQ = new OperationQueue(10); 
        copyQ.context = {};
        copyQ.context.failure = false;

        for ( var i=0; i<imageURLs.length; i++ )
        {
            var srcURL    = imageURLs[i];
            var imageInfo = imageDictionary[srcURL];

            (function (srcURL, imageInfo, i) { /* force closure */
                copyQ.add(
                    function CopyImageToS3Operation(doneOp)
                    {
                        var options = { size:imageInfo.size, index:i }; 
                        var dstPath = _imageDestinationPath(userId, photoId, (imageInfo.original == true), options);

                        s3.copyURL( s3client, srcURL, dstPath
                                ,   function success(total) {
                                        var s3copyURL = s3client.URLForPath(dstPath);
                                        imageInfo.copyPath = dstPath;
                                        imageInfo.copyURL = s3copyURL;

                                        totalBytesWrittenToS3 += total;

                                        // console.log( srcURL + ' -> ' + dstPath);

                                        doneOp();
                                    }
                                ,   function error(e) {
                                        console.error('s3.copyURL failed');
                                        console.error(e.stack);

                                        copyQ.context.failure = true;
                                        doneOp();
                                    } 
                                );                  
                    } );
            }) (srcURL, imageInfo, i);
        }

        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // !!!      TODO: write fb object as info.json  
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

        // copyQ.context.failure = true;        

        // Once all the copy operations complete
        copyQ.wait( 
            function() {

                if (copyQ.context.failure)
                {
                    _rollback( 
                        function() { 
                            var error = new Error('Copy to S3 failed');
                            error_f(error);
                        } );
                }
                else
                {
                    var copyObject = _getCopyObject();
                    // console.log(copyObject);
                    success_f(copyObject);
                }

            });


        return copyQ; // return Q for unit testing pourposes.

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

            s3.delete(  s3client
                    ,   allPathsCopied
                    ,   function success(ponse) {
                            // console.log('S3 Copy - Rollback success');
                            done();
                        }
                    ,   function error(err) {
                            console.error('S3 Copy - Rollback Failed');
                            done();
                    } );
        }

        function _getCopyObject()
        {
            var result = {};

            result.picture = imageDictionary[fbPhotoObject.picture].copyURL;
            result.source = imageDictionary[fbPhotoObject.source].copyURL;
            result.images = [];

            for (var index in fbPhotoObject.images)
            {
                var imageInfo = fbPhotoObject.images[index];

                result.images[index] = {};
                result.images[index].source = imageDictionary[imageInfo.source].copyURL;
            }

            return result;
        }
    };

storage.deleteFilesInCopyObject = 
    function (userId, copyObject, success_f /* () */, error_f)
    {
        a.assert_uid(userId);
        a.assert_obj(copyObject);
        a.assert_f(success_f);
        a.assert_f(error_f);

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

        s3.delete(  s3client
                ,   info.paths
                ,   function(s3ponse)
                    {
                        success_f();
                    }
                ,   error_f
                );
    };


storage.copyImageURL = 
    function(userId, photoId, theURL, success_f /* () */, error_f) 
    {
        a.assert_uid(userId);
        a.assert_obj(photoId);
        a.assert_http_url(theURL);
        a.assert_f(success_f);
        a.assert_f(error_f);

        var q = new OperationQueue(1);

        // q.debug = true;

        q.context = {};

        q.on('abort',
            function(e) {
                if (error_f)
                    error_f(e); 
            });

        //
        // Download image locally
        //      -> q.context.downloadedPath
        q.add( 
            function DownloadOperation(doneOp) {
                _downloadImageURL( 
                        theURL
                    ,   function success(localPath) { 
                            q.context.downloadedPath = localPath;
                            // console.log('image downloaded: ' + localPath);
                            doneOp();
                        }
                    ,   function error(e){  q.abort(e); }
                    );
            });
        
        //
        // Resample original image
        //      ->  q.context.original = {path, size}
        q.add(
            function ResampleOperation(doneOp) {
                a.assert_def(q.context.downloadedPath, 'q.context.downloadedPath');

                imageshop.resample(
                        q.context.downloadedPath
                    ,   imageshop.k.DefaultResampleOptions
                    ,   function success(outPath, outSize)
                        {    
                            q.context.original = {};
                            q.context.original.path = outPath;
                            q.context.original.size = outSize;
                            doneOp();
                        }   
                    ,   function error(e){ q.abort(e); }
                    );
            });

        //
        // Make thumbnails
        //      ->  q.context.thumbnails = [ {path, size}, ... ]
        q.add( 
            function MakeThumbnails(doneOp) {
                a.assert_def(q.context.original.path, 'q.context.original.path');
                a.assert_def(q.context.original.size, 'q.context.original.size');

                imageshop.createThumbnails(
                        q.context.original.path
                    ,   q.context.original.size
                    ,   function success(array){
                            q.context.thumbnails = array;
                            // console.log('thumb array: ');
                            // console.log(array);
                            doneOp();
                        }
                    ,   function error(e){ q.abort(e); }
                    );
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
                    s3.copyFile( s3client, theFileInfo.path, s3path
                        ,   function success(byteLen)
                            {
                                theFileInfo.s3path = s3path;
                                theFileInfo.URL = s3client.URLForPath(s3path);
                                successCount++;
                                _checkDone();
                            }
                        ,   function error(e)
                            {
                                theFileInfo.error = e;  
                                errorCount++;
                                _checkDone();
                            } );
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
                success_f(q.context.copyObject);
                doneOp();
            } );

    };

storage.getUserFiles = 
    function (userId, success_f /* () */, error_f)
    {
        a.assert_uid(userId);
        a.assert_f(success_f);
        a.assert_f(error_f);

        var s3client = s3.production.clientR();

        s3.getPathsWithPrefix(
                s3client
            ,   userId
            ,   function(paths)
                {
                    var URLs = _.map(   paths
                                    ,   function(path) {
                                            return s3client.URLForPath(path);
                                        });
                    success_f(URLs)
                }
            ,   error_f
            );
    }



/* ========================================================== */
/* ========================================================== */
/* ======================[  Private  ]======================= */
/* ========================================================== */
/* ========================================================== */


function ___PRIVATE___(){}


storage.private = {};


function _downloadImageURL( theURL
                        ,   success_f /* (local_path) */
                        ,   error_f )
{
    var MAX_IMAGE_BYTE_SIZE = 1024 * 1024 * 1; // 1 MB

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
            var tmpFileStream = fs.createWriteStream(resultFilePath);

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

                    if (success_f)
                        success_f( resultFilePath );
                });
        
            /* aux =============================== */

            function _abortTransfer(msg)
            {
                if (error_f) {
                    error_f( new Error(msg) );
                    error_f = undefined; // makes sure this is the only invocation to error_f
                }
                    
                ponse.destroy();
            }

        } );

    quest.on('error',
        function(e) {
            // console.error(e);

            if (error_f)
                error_f(e);
        } );

    quest.end();

    /* aux ======================= */

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
}


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
