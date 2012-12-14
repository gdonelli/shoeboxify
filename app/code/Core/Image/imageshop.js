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
    function(filePath, success_f /* size{ width:XXX, height:XXX } */, error_f)
    {
        imagemagick.identify([ '-format', '%wx%h', filePath ]
            ,   function(err, features) 
                {
                    if (err) 
                    {
                        return _errorExit(err);
                    }   
                    else
                    {
                        var elements = features.split('x');
                        if (elements.length != 2)
                            return _errorExit('features.split returned array with len:' + elements.length);

                        var size = _makeSafeSize(elements[0], elements[1]);
                        
                        if (success_f)
                            success_f( size );
                    }
                } );
        
        /* aux ========================== */

        function _errorExit(e)
        {
            var err = e;

            if ( _.isString(e) )
                err = new Error(e);

            err.filePath = filePath;

            if (error_f)
                error_f(err);
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
    function(filePath, options, success_f /* (outpath, size) */, error_f)
    {
        a.assert_f(success_f);
        a.assert_f(error_f);

        imageshop.getSize(filePath
            ,   function success(size)
                {
                    _assertSize(size);

                    if  (   options         
                        &&  options[imageshop.k.MaxSafeInputAreaKey]
                        &&  (size.width * size.height) > options[imageshop.k.MaxSafeInputAreaKey] )
                    {
                        var tooBigError = new Error('Source image is too large');
                        tooBigError.code = 'TOOBIG';

                        error_f(tooBigError);
                    }
                    else if (   options
                            &&  options[imageshop.k.MaxDimensionKey]
                            &&  Math.max(size.width, size.height) > options[imageshop.k.MaxDimensionKey] )
                    {
                        // will need to resize the image...
                        _resize(filePath, options[imageshop.k.MaxDimensionKey], success_f, error_f);
                    }
                    else
                    {
                        // only resample...
                        var outPath = tmp.getFile('jpg');

                        _convert( filePath, outPath, []
                                ,   function success(outpath) {
                                        success_f(outpath, size);
                                    }
                                ,   error_f );
                    }
                }
            ,   function error(e) {
                    error_f(e);
                } );
    };


function _hasResampleOperationQueueCapacityFor(numOfOps, error_f)
{
    if ( _resampleOperationQueue.waitCount() + numOfOps > imageshop.k.MaxNumOfWaitingOperations )
    {
        var tooBusy = new Error('_resampleOperationQueue is full');
        tooBusy.code = 'TOOBUSY';       
        process.nextTick( function(){ error_f(tooBusy); } );

        return false;
    }

    return true;
}

imageshop.safeResample = 
    function(filePath, options, success_f /* (outpath, size) */, error_f)
    {
        a.assert_f(success_f);
        a.assert_f(error_f);

        if ( !_hasResampleOperationQueueCapacityFor(1, error_f) ) {
            return;
        }

        _resampleOperationQueue.add(
            function resampleOperation(done) {
                imageshop.resample(filePath, options
                    ,   function success(outpath, size)
                        {
                            success_f(outpath, size);
                            done();
                        }
                    ,   function error(e)
                        {
                            error_f(e);
                            done();
                        } );
            } );
    };


imageshop.createThumbnails = 
    function(sourcePath, sourceSize, success_f /*(array)*/, error_f )
    {
        assert(sourcePath != undefined, 'sourcePath is undefined');
        a.assert_f(success_f);
        a.assert_f(error_f);
        _assertSize(sourceSize);
            
        var sourceMaxDimension = Math.max(sourceSize.width, sourceSize.height);

        // console.log('sourceMaxDimension: ' + sourceMaxDimension);

        var thumbToMake = _.filter( imageshop.k.ThumbnailDimensions, 
            function(num) {
                // console.log('num:' + num + ' sourceMaxDimension:' + sourceMaxDimension );
                return num < sourceMaxDimension ;
            } );

        if ( !_hasResampleOperationQueueCapacityFor(thumbToMake.length + 1, error_f) ) {
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
                    function makeThumbOperation(doneOp)
                    {
                        // console.log(arguments.callee.name + '_resize ' + dimension);
                
                        _resize(sourcePath
                            ,   dimension
                            ,   function success(outPath, size) {
                                    // console.log('_resize success_f');
                                    
                                    thumbResult.push( { path:outPath, size:size } );
                                    doneOp();
                                }
                            ,   function error(e) {
                                    // console.log('_resize error');

                                    if (!error)
                                        error = e;
                                    doneOp();
                                } );

                    } );                
            }

        }

        // console.log(arguments.callee.name + 'add finish');

        _resampleOperationQueue.add(
            function finish(doneOp)
            {
                // console.log('finish');

                if (error)
                    error_f(error);
                else
                    success_f(thumbResult);

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


function _resize(filePath, dimension, success_f /* (outPath, size) */, error_f)
{
    a.assert_f(success_f);
    a.assert_f(error_f);
    assert( _.isNumber(dimension), 'dimension is expected to be a number');

    var outPath = tmp.getFile('jpg');

    _convert( filePath, outPath, [ '-resize', dimension+'x'+dimension ]
        ,   function success(resultPath)
            {
                imageshop.getSize(resultPath
                    ,   function success(size)
                        {
                            success_f(resultPath, size);
                        }
                    ,   error_f );
            }
        ,   error_f );
}

/*
 *  The single funnell:
 */

function _convert( srcPath, outPath, otherArgs, success_f /* (outpath) */, error_f)
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
                                error_f(err);
                            else if (success_f)
                                success_f(outPath);
                        } );
}



