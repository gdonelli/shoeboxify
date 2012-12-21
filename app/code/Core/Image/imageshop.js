/* 

===================[   imageshop   ]==================

Image processing module

Info:   
            imageshop.getSize
Operations:
            imageshop.resample
            imageshop.safeResample
            imageshop.createThumbnails
Debug:
            imageshop.resampleQueue         

======================================================

*/

var     assert      = require('assert')
    ,   imagemagick = require('imagemagick')
    ,   fs          = require('fs')
    ,   _           = require('underscore')

    ,   a       = use('a')
    ,   handy   = use('handy')
    ,   tmp     = use('tmp')
    ,   OperationQueue      = use('OperationQueue')
    ,   string_extension    = use('string-extension')

    ;

var imageshop = exports;

// Konstants

imageshop.k = {};

imageshop.k.MaxDimensionKey     = 'MaxDimension';
imageshop.k.MaxSafeInputAreaKey = 'MaxSafeInputArea';

// Default Resample Options
imageshop.k.DefaultResampleOptions = {};
imageshop.k.DefaultResampleOptions[imageshop.k.MaxDimensionKey]     = 2048;
imageshop.k.DefaultResampleOptions[imageshop.k.MaxSafeInputAreaKey] = 3000 * 3000;

// Safe resample queue
imageshop.k.MaxConcurrentOperations     = 1;
imageshop.k.MaxNumOfWaitingOperations   = 16;

// Thumbnails
imageshop.k.ThumbnailDimensions = [ 130, 320, 720 ];


imageshop.makeSize =
    function(width, height)
    {
        return  {   width:  width, 
                    height: height  };
    };

// Globals

var _resampleOperationQueue = new OperationQueue( imageshop.k.MaxConcurrentOperations );

//_resampleOperationQueue.debug = true;

_resampleOperationQueue.on('abort', 
    function(e){ 
        console.error('A resampleOperation in the shared queue failed:');
        console.error(e);
        handy.logErrorStacktrace(e);
    }); 


/* ======================================================== */
/* ======================================================== */
/* ========================= Info ========================= */
/* ======================================================== */
/* ======================================================== */

imageshop.getSize =
    function(filePath, callback /* ( err, size{ width:XXX, height:XXX } ) */ )
    {
        a.assert_f(callback, 'callback');
        
        imagemagick.identify([ '-format', '%wx%h', filePath ],
            function(err, features)
            {
                if (err) 
                    return _errorExit(err);
                else
                {
                    var elements = features.split('x');
                    if (elements.length != 2)
                        return _errorExit('features.split returned array with len:' + elements.length);

                    var size = _makeSafeSize(elements[0], elements[1]);
                    
                    callback( null, size );
                }
            } );
        
        /* aux ========================== */

        function _errorExit(e)
        {
            var err = e;

            if ( _.isString(e) )
                err = new Error(e);

            err.filePath = filePath;

            callback(err);
        }

        function _makeSafeSize(w, h)
        {
            var width;
            var height;

            if (_.isString(w)) {
                var candidate = w.trim();
                assert( candidate.isNumber(), 'width is not a number' );
                width = Math.round(candidate);
            }

            if (_.isString(h)) {
                var candidate = h.trim();
                assert( candidate.isNumber(), 'height is not a number' );
                height = Math.round(candidate);
            }

            return imageshop.makeSize(width, height);
        }
    }


/* ======================================================== */
/* ======================================================== */
/* =====================  Operations  ===================== */
/* ======================================================== */
/* ======================================================== */

/*
    Options
        {
                    imageshop.k.MaxDimensionKey: [...]
            ,   imageshop.k.MaxSafeInputAreaKey: [...]
        }
*/

imageshop.resample = 
    function(filePath, options, callback /* (err, outpath, size) */)
    {
        a.assert_f(callback);

        imageshop.getSize(filePath,
            function(err, size)
            {
                if (err)
                    return callback(err);

//                console.log('input size: ' + size);
//                console.log(size);
                
                _assertSize(size);
                
                if  (   options         
                    &&  options[imageshop.k.MaxSafeInputAreaKey]
                    &&  (size.width * size.height) > options[imageshop.k.MaxSafeInputAreaKey] )
                {
                    var tooBigError = new Error('Source image is too large');
                    tooBigError.code = 'TOOBIG';

                    callback(tooBigError);
                    
                    console.log('tooBigError');
                }
                else if (   options
                        &&  options[imageshop.k.MaxDimensionKey]
                        &&  Math.max(size.width, size.height) > options[imageshop.k.MaxDimensionKey] )
                {
                    // will need to resize the image...
                    _resize(filePath, options[imageshop.k.MaxDimensionKey], callback);
                }
                else
                {
                    // only resample...
                    var outPath = tmp.getFile('jpg');

                    _convert( filePath, outPath, [],
                        function(err, outpath) {
                            if (err)
                                callback(err);
                            else
                                callback(null, outpath, size);
                        });
                }
            });
    };


function _hasResampleOperationQueueCapacityFor(numOfOps, callback)
{
    if ( _resampleOperationQueue.waitCount() + numOfOps > imageshop.k.MaxNumOfWaitingOperations )
    {
        var tooBusy = new Error('_resampleOperationQueue is full');
        tooBusy.code = 'TOOBUSY';       
        process.nextTick( function(){ callback(tooBusy); } );

        return false;
    }

    return true;
}

imageshop.safeResample = 
    function(filePath, options, callback /* (err, outpath, size) */ )
    {
        a.assert_string(filePath, 'filePath');
        a.assert_obj(options, 'options');
        a.assert_f(callback);

        if ( !_hasResampleOperationQueueCapacityFor(1, callback) ) {
            return;
        }
               
        _resampleOperationQueue.add(
            function resampleOperation(doneOp) {
                
//                console.log('filePath: ' + filePath);
//                console.log('options: ');
//                console.log(options);
            
                imageshop.resample(filePath, options,
                    function(err, outpath, size)
                    {
                        if (err)
                            callback(err);
                        else
                            callback(null, outpath, size);
                            
                        doneOp();
                    });
            } );
    };


imageshop.createThumbnails = 
    function(sourcePath, sourceSize, callback /*(err, array)*/ )
    {
        assert(sourcePath != undefined, 'sourcePath is undefined');
        a.assert_f(callback);
        _assertSize(sourceSize);
        
        var sourceMaxDimension = Math.max(sourceSize.width, sourceSize.height);

        // console.log('sourceMaxDimension: ' + sourceMaxDimension);

        var thumbToMake = _.filter( imageshop.k.ThumbnailDimensions, 
            function(num) {
                // console.log('num:' + num + ' sourceMaxDimension:' + sourceMaxDimension );
                return num < sourceMaxDimension ;
            } );

        if ( !_hasResampleOperationQueueCapacityFor(thumbToMake.length + 1, callback) ) {
            return;
        }

        // console.log(thumbToMake);

        var thumbResult = [];

        var error;

        for (var i in thumbToMake)
        {
            var thumbSize_i = thumbToMake[i]; // thum size

            _performResize(thumbSize_i);

            function _performResize(dimension)
            {
                _resampleOperationQueue.add(
                    function MakeThumbOperation(doneOp)
                    {
                        _resize(sourcePath, dimension,
                            function(err, outPath, size) {
                                    if (err)
                                        error = err;
                                    else
                                        thumbResult.push( { path:outPath, size:size } );
                                
                                    doneOp();
                                });

                    } );                
            }

        }

        // console.log(arguments.callee.name + 'add finish');

        _resampleOperationQueue.add(
            function finish(doneOp)
            {
                // console.log('finish');

                if (error)
                    callback(error);
                else
                    callback(null, thumbResult);

                doneOp();
            });

    }

imageshop.resampleQueue =
    function()
    {
        return _resampleOperationQueue;
    };


function _assertSize(size)
{
    assert( _.isObject(size), 'size not an object is ' + size );
    assert( size.width  != undefined, 'size.width != undefined' );
    assert( size.height != undefined, 'size.height != undefined' );
}


function _resize(filePath, dimension, callback /* (err, outPath, size) */)
{
    a.assert_string(filePath);
    a.assert_f(callback);
    assert( _.isNumber(dimension), 'dimension is expected to be a number');

    var outPath = tmp.getFile('jpg');

    _convert( filePath, outPath, [ '-resize', dimension+'x'+dimension ],
            function(err, resultPath)
            {
                if (err)
                    callback(err);
             
                imageshop.getSize(resultPath,
                    function(err, size)
                    {
                        if (err)
                            callback(err);
                        else
                            callback(null, resultPath, size);
                    });
            } );
}

/*
 *  The single funnell:
 */

function _convert( srcPath, outPath, otherArgs, callback /* (err, outpath) */ )
{
    var args =  [   srcPath
                ,   '-density',     '72'
                ,   '-colorspace',  'rgb'
                ,   '-format',      'jpg'
                ,   '-quality',     '68'
                ];

    args = _.union(args, otherArgs);

    args.push( outPath );
    
    // console.log(args);

    imagemagick.convert( args           
                    ,   function(err, stdout, stderr) 
                        {
                        /*
                            console.log('err:');
                            console.log(err);
                            console.log('stdout:');
                            console.log(stdout);
                            console.log('stderr:');
                            console.log(stderr);
                        */
                        
                            if (err)
                                callback(err);
                            else
                                callback(null, outPath);
                        } );
}



