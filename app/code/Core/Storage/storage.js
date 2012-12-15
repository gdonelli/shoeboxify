/*

=======================[   Storage   ]=======================
Resource Storage based on S3


storage.copyFacebookPhoto

================================================================

*/

var     assert  = require('assert')
    ,   _       = require('underscore')

    ,   a               = use('a')
    ,   s3              = use('s3')
    ,   OperationQueue  = use('OperationQueue')
    ;


var storage = exports;

storage.k = {};

storage.k.InvalidObjectError = 'INVALID_OBJ_ERR';

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
            err.code = storage.k.InvalidObjectError;
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

// TODO: storage.copyImageURL


/* ========================================================== */
/* ========================================================== */
/* ======================[  Private  ]======================= */
/* ========================================================== */
/* ========================================================== */


storage.private = {};

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
