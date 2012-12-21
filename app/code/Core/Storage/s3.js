/*

====================[   Amazon S3 Facade   ]====================
Minimal API to access S3

S3 Client:  
            s3.getClient()
            s3.production.clientRW()    defult client with RW permissions
Operations:
            s3.writeJSON    write JSON file to s3
            s3.remove       delete files from s3
            s3.copyURL      copy content from any URL to s3
            s3.copyFile     copy local file to S3   
Meta:
            s3.getInfoForURL    { bucket, path } from s3 URL

================================================================

*/

var     assert  = require('assert')
    ,   knox    = require('knox')
    ,   path    = require('path')
    ,   url     = require('url')
    ,   fs      = require("fs")
    ,   mime    = require("mime")
    ,   _       = require("underscore")

    ,   a       = use('a')
    ,   handy   = use('handy')
    ,   httpx   = use('httpx')
    ,   identity= use('identity')
    ;


var s3 = exports;

/* === Clients */

s3.production = {};
s3.production.bucket    = identity.s3.bucket.production();
s3.production.clientR   = function(){ return s3.getClient(s3.production.bucket, 'R' ); };
s3.production.clientRW  = function(){ return s3.getClient(s3.production.bucket, 'RW'); };

s3.test = {};
s3.test.bucket      = identity.s3.bucket.test();
s3.test.clientR     = function(){ return s3.getClient(s3.test.bucket, 'R' ); };
s3.test.clientRW    = function(){ return s3.getClient(s3.test.bucket, 'RW'); };


s3.getClient = function(bucket, permission)
{
    _s3_assert_bucket(bucket);

    return _getCachedClient(bucket, permission);
};


var CLIENT_CACHE_DURATION = 60 * 1000; // 1 minute


var _clientCache = {
            test: {
                    R:  null
                ,   RW: null
            }
        ,   production: {
                    R:  null
                ,   RW: null
            }
    };

function _cacheKeyForBucket(bucket)
{
    if ( bucket == s3.test.bucket )
        return 'test';
    else if ( bucket == s3.production.bucket )
        return 'production';
    else
        return undefined;
}

function _getCachedClient(bucket, permission)
{
    var bucketCacheKey = _cacheKeyForBucket(bucket);

    a.assert_def(bucketCacheKey, 'Wrong bucket name');

    if (_clientCache[bucketCacheKey][permission] == null)
    {

        _clientCache[bucketCacheKey][permission] = _s3client(bucket, permission);
        _clearCache(bucketCacheKey, permission);
    }

    return _clientCache[bucketCacheKey][permission];

    /* ========================================================== */
    
    function _clearCache(n, p)
    {
        setTimeout( function() {
            console.log('Clearning S3 Client ' + n + ' ' + p );
            _clientCache[n][p] = null;
        }, CLIENT_CACHE_DURATION);

    }
}

 // do not use directly. Use _getCachedClient instead

function _s3client( bucket, permission )
{
    var key     = identity.s3.user[permission].key();
    var secret  = identity.s3.user[permission].secret();

    assert( (key != undefined),     's3 key is undefined');
    assert( (secret != undefined),  's3 secret is undefined');
    assert( (bucket != undefined),  's3 bucket is undefined');

    var result = knox.createClient({
                   key: key
            ,   secret: secret
            ,   bucket: bucket
            ,   region: 'us-west-2'
            });

    result.URLForPath = 
        function(filePath) {
            return 'https://' + identity.s3.host() + '/' + path.normalize(bucket + '/' + filePath);         
        };

    return result;
}


/*  === API - Meta  */



/*
*   Given a URL of a S3 object it returns an object:
*       {   bucket: ... , 
*       ,     path: ... } 
*
*   @method s3.getInfoForURL
*   @param {String} an s3 URL
*   @return {Object} Returns object with 'bucket' and 'path' property
**/

s3.getInfoForURL = 
    function(theURL)
    {
        var result = {};

        var urlElements = url.parse(theURL);
        assert( urlElements.host == identity.s3.host(), 
                'url host (' + urlElements.host + ') doesnt match expected s3 host:' + identity.s3.host());

        var urlPath = urlElements.path;
        var urlPathElements = urlPath.split('/');

        if (urlPathElements.length < 3)
            return undefined;

        // Get bucket
        result.bucket = urlPathElements[1];
        _s3_assert_bucket(result.bucket);

        // Get path
        var s3Path = '';       
        for (var i=2; i<urlPathElements.length; i++) {
            s3Path += '/' + urlPathElements[i];
        }
        result.path = s3Path;

        return result;  
    };


/*
 *  Given a URL returns {   bucket: ... , 
 *                           paths: [...] } 
 *
 *  if the URLs are on a different bucket it will throw an exception
 */

s3.getInfoForURLs = 
    function(arrayOfURLs)
    {
        var result = {};

        result.bucket = null;
        result.paths = [];

        for (var i in arrayOfURLs)
        {
            var URL_i = arrayOfURLs[i];
            var info_i = s3.getInfoForURL(URL_i);

            if (!result.bucket)
                result.bucket = info_i.bucket;
            else
                assert(result.bucket == info_i.bucket, ' URLs are in different buckets');

            result.paths.push(info_i.path);
        }

        return result;
    };

/*  === API - Operations */

// http://docs.amazonwebservices.com/AmazonS3/latest/API/RESTObjectPUT.html
/*
 */

s3.writeJSON = 
	function( client, object, filePath, callback /* (err, reponse) */)
    {
        _s3_assert_client(client);
        assert(object != undefined, " object is undefined");
        _s3_assert_path(filePath);
        a.assert_f(callback);

        var string = JSON.stringify(object);
        var questToS3 = client.put(filePath,    {
                    'Content-Length': string.length
                ,   'Content-Type': 'application/json'
                ,   'x-amz-acl': 'public-read'
            /*  ,   'x-amz-storage-class' : 'REDUCED_REDUNDANCY'    */
            });
        
        questToS3.on('response', 
            function(ponse) {
                if (ponse.statusCode == 200)
                {
                    callback(null, ponse);
                }
                else
                {
                    var err = new Error('Failed with statusCode: ' + ponse.statusCode);
                    err.response = ponse;
                    callback(err);
                }
            });
        
        questToS3.on('error', callback);

        questToS3.end(string);

        return string;
    };


/*
 * s3.remove
 * it will use 'deleteMultiple' when removing multiple files
 *
 */

 /* _using_deleteMultiple */
 
s3.remove =
    function(client, filePath_or_arrayOfPaths, callback /* (err, reponse) */ )
    {
        _s3_assert_client(client);
        assert(filePath_or_arrayOfPaths != undefined, 'filePath_or_arrayOfPaths ios undefined' );
        assert(_.isString(filePath_or_arrayOfPaths) || _.isArray(filePath_or_arrayOfPaths), 'filePath_or_arrayOfPaths not a string or array');  
        a.assert_f(callback);

        // console.log(typeof filePath_or_arrayOfPaths);

        var deleteMethod = null;

        if ( _.isString(filePath_or_arrayOfPaths) )
            deleteMethod = 'deleteFile';
        else if ( _.isArray(filePath_or_arrayOfPaths) )
        {
            deleteMethod = 'deleteMultiple';
        }

        assert(deleteMethod != null, 'Couldnt find method to deal with input type');

        client[deleteMethod](filePath_or_arrayOfPaths,
            function(err, ponse)
            {
                if (err)
                    return callback(err);
                    
                if (ponse && ponse.statusCode >= 200 && ponse.statusCode < 300)
                    return callback(null, ponse);

                if (!ponse)
                    err = new Error('s3.remove response is undefined');
                else
                    err = new Error('s3.remove response with statusCode: ' + ponse.statusCode);

                return callback(err);
            });
    };


function _copyStreamToS3(   client 
                        ,   srcStream,  srcStreamLength,    srcMIMEType
                        ,   pathOnS3
                        ,   callback )
{
    var written = 0;
    var total = 0;

    var headers = {};

    headers['x-amz-acl'] = 'public-read';

    if (srcStreamLength)
        headers['Content-Length'] = srcStreamLength;

    if (srcMIMEType)
        headers['Content-Type'] = srcMIMEType;

    var putStream = client.putStream(srcStream, pathOnS3, headers, 
        function(err, streamPonse) {  
            streamPonse.on('end',
                function() {
                    if  ( written == total && total != 0 ) 
                    {
                        callback( null, Math.round(total) );

                    }
                    else
                    {
                        srcStream.destroy();
                        streamPonse.destroy();
                        
                        var err = new Error(1, 'Couldnt write stream to S3:' + pathOnS3);
                        callback(err);
                    }
                });

        });

    putStream.on('progress',
        function(progressObj) {
            written = progressObj.written;
            total   = progressObj.total;

        });

    putStream.on('error', 
        function(err) {
            console.log('stream->error: ' + err);
            callback(err);
        });
    
    return putStream;
}

s3.copyURL =
    function(client, remoteURL, pathOnS3, callback /* (err, num_byte_written) */ )
    {
        _s3_assert_client(client);
        _s3_assert_path(pathOnS3);
        a.assert_http_url(remoteURL);
        a.assert_f(callback);

        var quest = httpx.requestURL(remoteURL, {},
            function handleResponseStream(ponse) {

                if (ponse.statusCode != 200)
                {
                    var errMessage = 'GET ' + remoteURL + ' failed, statusCode:' + ponse.statusCode;
                    var err =  new Error(errMessage)
                    err.code = ponse.statusCode;
                    
                    return callback(err);
                }

                var ponseLength = ponse.headers['content-length'];
                var ponseType   = ponse.headers['content-type'];

                _copyStreamToS3(client, ponse, ponseLength, ponseType, pathOnS3, callback);
            });

        quest.end();
    };

s3.copyFile = 
    function(client, localPath, pathOnS3, callback  /* (err, num_byte_written) */ )
    {
        _s3_assert_client(client);
        _s3_assert_path(pathOnS3);
        _s3_assert_path(localPath);
        a.assert_f(callback);

        fs.stat(localPath, 
            function(err, stats) {

                if (err)
                    return callback(err);

                var fileSize = stats.size;
                var fileType = mime.lookup(localPath);

                var fileStream = fs.createReadStream(localPath);

                _copyStreamToS3(client, fileStream, fileSize, fileType, pathOnS3, callback);
            } );
    }

s3.getPathsWithPrefix =
    function(client, prefix, callback /* (err, paths) */)
    {
        _s3_assert_client(client);
        a.assert_string(prefix, 'prefix');
        assert( prefix[0] != '/', 'leading / is not valid in path prefix');
        a.assert_f(callback);
        
        client.list({ prefix: prefix },
            function(err, data) {
                if (err)
                    return callback(err);

                a.assert_obj(data);
                var contents = a.assert_array(data.Contents);

                var result = [];

                for (var i in contents)
                {
                    var fileInfo_i = contents[i];
                    var filepath_i = fileInfo_i.Key;
                    
                    result.push(filepath_i);
                }

                callback(null, result);
            } );
    }

/* ============================================== */
/* ============================================== */
/* =================[  Utils  ]================== */
/* ============================================== */
/* ============================================== */

 
function _s3_assert_client(client)
{
    assert( client != undefined,        'client is undefined');
    assert( client.key != undefined,    'client.key is undefined');
    assert( client.secret != undefined, 'client.secret is undefined');
    assert( client.bucket != undefined, 'client.bucket is undefined');
};


function _s3_assert_path(filePath)
{
    assert( filePath != undefined,  'filePath is undefined');
    assert( _.isString(filePath),   'filePath is not string');
    assert( filePath.length > 1,    'filePath.length not valid');
};


function _s3_assert_bucket(bucket)
{
    assert( bucket != undefined,    'bucket is undefined');
    assert( bucket == s3.test.bucket ||
            bucket == s3.production.bucket, 'bucket is not test or production, is: ' + bucket);
}

