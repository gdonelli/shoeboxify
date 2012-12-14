/* 

====================[   Handy   ]====================


HTTP:
            httpx.is200OK
            httpx.HEAD
            httpx.GET
            httpx.requestURL
            httpx.downloadImageURL


======================================================

*/


var     url     = require('url')
    ,   fs      = require('fs')
    ,   http    = require('http')
    ,   https   = require('https')
    ;

var     a   = use('a')
    ;

var httpx = exports;


/* ======================================================== */
/* ======================================================== */
/* ========================= HTTP ========================= */
/* ======================================================== */
/* ======================================================== */

httpx.is200OK =
    function( theURL, result_f  /* ( true_or_false ) */ )
    {
        a.assert_def(theURL, 'theURL');
        a.assert_f(result_f);

        httpx.HEAD(theURL
            ,   function success(ponse) {
                    // console.log('success:');
                    // console.log('ponse.statusCode: ' + ponse.statusCode);

                    result_f( ponse.statusCode == 200 );
                }
            ,   function error(error) {
                    // console.log('error:');
                    // console.log(error);
                    
                    result_f(false);
                } );
    }


httpx.HEAD =
    function(   theURL
            ,   success_f   /*  (ponse) */
            ,   error_f     /*  (error) */
            )
    {
        a.assert_http_url(theURL);
        a.assert_f(success_f,   true);
        a.assert_f(error_f,     true);

        return _makeHTTPRequest(
                    theURL
                ,   'HEAD'
                ,   function(read_s, ponse)
                    {
                        /*                      
                        console.log('read_s:');
                        console.log(read_s);

                        console.log('ponse:');
                        console.log(ponse);
                        */

                        if (success_f)
                            success_f(ponse);
                    }
                ,   error_f
                ,   false);         

    };


httpx.GET =
    function(   theURL
            ,   _200OK_f    /*  (read_s, ponse) */
            ,   other_f     /*  (ponse)     */
            ,   error_f     /*  (error)     */
            ,   traverse
            )
    {
        return _makeHTTPRequest(
                    theURL
                ,   'GET'
                ,   function(read_s, ponse)
                    {

                        if (ponse.statusCode == 200)
                        {
                            if (_200OK_f)
                                _200OK_f(read_s, ponse);
                        }
                        else if (traverse == true && ponse.statusCode == 302)
                        {
                            a.assert_def(ponse.headers.location, 'ponse.headers.location');

                            httpx.GET(ponse.headers.location, _200OK_f, other_f, error_f, traverse);
                        }
                        else
                        {   
                            ponse.readBuffer = read_s;

                            if (other_f)
                                other_f(ponse);         
                        }
                    }
                ,   error_f
                ,   traverse);          
    };


httpx.requestURL =
    function(theURL, extraOpz, requestHandler /* (ponse) */)
    {
        var theURLElements = url.parse(theURL);

        var questOptions = {
                    hostname:   theURLElements['hostname']
                ,       path:   theURLElements['path']
                }

        if (extraOpz.method)
            questOptions.method = extraOpz.method;

        if (theURLElements.port)
            questOptions.port = theURLElements.port;

        var methodAgent = theURLElements['protocol'] == 'https:' ? https : http;

        var quest = methodAgent.request(questOptions, requestHandler);

        return quest;
    }
 

function _makeHTTPRequest(  theURL
                        ,   httpMethod
                        ,   success_f   /*  (read_s, ponse) */
                        ,   error_f     /*  (error)     */
                        ,   traverse
                        )
    {
        var quest = httpx.requestURL(
                theURL
            ,   {
                    method: httpMethod
                }
            ,   function(ponse) {
                    // console.log("statusCode: ", ponse.statusCode);
                    // console.log("headers: ", ponse.headers);

                    var read_s = '';

                    ponse.on('data',
                        function(chuck) {
                            read_s += chuck;
                        });

                    ponse.on('end',
                        function(p) {
                            if (success_f)
                                success_f(read_s, ponse);
                        });
                } );

        quest.on('error',
            function(e) {
                // console.error(e);

                if (error_f)
                    error_f(e);
            } );

        quest.end();
    };


httpx.downloadImageURL = 
    function( theURL, success_f /* (local_path) */, error_f)
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
                var resultFilePath = httpx.tmpFile(fileExtension);
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


