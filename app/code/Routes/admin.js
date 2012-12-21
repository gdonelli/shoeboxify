/* 

==================[   Admin  Routes   ]==================

Routes:
            admin.route.unitTest
            admin.route.intense
            admin.route.info
            admin.route.restart
            admin.route.resampleQueueCount
            admin.route.cmd
            admin.route.tmp
            admin.route.tmpFile
            admin.route.rmtmp
        
=========================================================

*/

var     assert  = require('assert')
    ,   spawn   = require('child_process').spawn
    ,   fs      = require('fs')
    ,   path    = require('path')
    ,   url     = require('url')
    ,   util    = require('util')
    ,   mime    = require('mime')
    ,   _       = require('underscore')

    ,   a   = use('a')
    ,   fb  = use('fb')
    ,   tmp = use('tmp')
    ,   handy   = use('handy')
    ,   common  = use('common')
    ,   imageshop   = use('imageshop')
    ,   routeutil   = use('routeutil')
    ,   test_resources  = use('test-resources')

    ,   User            = use('User')
    ,   OperationQueue  = use('OperationQueue')

    ;

var admin = exports;

admin.k         = {}
admin.path      = {};
admin.route     = {};

var basePath = '/admin';

// Konstant

admin.k.AccessTokenCacheFilePath = '/tmp/com.shoeboxify.accessTokenCache.json';

/* Route ===== */

admin.path.index = basePath;

admin.route.index =
    function(quest, ponse)
    {
        routeutil.renderIndexPage(quest, ponse, admin, 'Admin Routes' );
    }


/* Route ===== */

admin.path.unitTest = basePath + '/unit/:module?';

admin.route.unitTest =
    function(quest, ponse)
    {   
        var q = new OperationQueue(1);
        
        q.debug = true;

        q.context = {};
        
        q.on('abort', 
            function(e) { 
                console.error(e);

                ponse.write( '<code>' + e.stack.toHTMLString() + '</code>');

                ponse.end('</body></html>');
            } );

        q.add(
            function StartOperation(doneOp)
            {
                ponse.writeHead( 200, { 'Content-Type': 'text/html' } );
                ponse.write('<html><body>');
                // var urlElements = url.parse(quest.url, true);

                doneOp();
            });

        q.add(
            function GetAccessTokenOperation(doneOp)  //      --> q.context.cache
            {
                var user = User.fromRequest(quest);
                var fbAccess = user.getFacebookAccess();

                var accessToken = fbAccess.getToken();
                var expiresToken= fbAccess.getExpires();

                assert(accessToken  != undefined, 'accessToken is undefined');
                assert(expiresToken != undefined, 'expiresToken is undefined');

                var object = {  'accessToken'   : accessToken,
                                'expires'       : expiresToken  };

                var cacheFileContent = {};
                cacheFileContent.payload = object;

                q.context.cache = cacheFileContent;

                doneOp();
            } );

        q.add(
            function WriteFacebookTokenCacheOperation(doneOp)
            {
                var cacheContent = JSON.stringify(q.context.cache)

                console.log('cacheContent: ' + cacheContent);

                fs.writeFile(admin.k.AccessTokenCacheFilePath, cacheContent,
                    function(err) 
                    {
                        if(err)
                        {
                    		console.log('fs.writeFile error:');
                            console.error(err);
                            q.abort(err);
                        }
                        else
                        {
                            console.log("The file was saved!");
                            doneOp();
                        }
                    } ); 
            } );

        q.add(
            function GetTestFilesOperation(doneOp)    //      --> q.context.files
            {
                q.context.files = [];
                var allModules =  use.lib.modules();

                var globalFile = allModules['global'];
                a.assert_def(globalFile);

                q.context.files.push(globalFile);

                if ( quest.params.module && 
                    !quest.params.module.startsWith(':'))
                {
                    var moduleToTest = quest.params.module + '.test';

                    var pathToTest = allModules[moduleToTest];

                    ponse.write('<h1>Running unit test: ' + moduleToTest + '</h1>');
                    ponse.write('<p>' + pathToTest + '</p>');
                    
                    q.context.files.push(pathToTest);
                }
                else
                {
                    ponse.write('<h1>Running all unit tests</h1>');

                    for (var module in allModules)
                    {
                        if (module.endsWith('.test'))
                        {
                            var pathToTest = allModules[module];
                            q.context.files.push(pathToTest);
                        }
                    }
                }

                doneOp();
            } );

        q.add(
            function RunTestsOperation(doneOp)
            {
                var modulesPath = path.dirname(require.main.filename) + '/node_modules';

                // console.log(modulesPath);

                var mochaBin = modulesPath + '/mocha/bin/mocha' ;
                
                var basicArgs = [mochaBin, '-t', '10000', '-R', 'spec', '--no-colors' ];

                var args = _.union(basicArgs, q.context.files);

                ponse.write('<h2>Test files:</h2>');
                ponse.write('<code>');

                for (var i in q.context.files) {
                    var file_i = q.context.files[i];
                    ponse.write(path.basename(file_i) + '<br>');
                }

                ponse.write('</code>');

                ponse.write('<h2>command:</h2>');
                ponse.write('<code>' + args.toString() + '</code>');

                ponse.write('<h2>Run:</h2>');

                var mochaProcess = spawn('node', args);

                setTimeout( _kill, 5 * 60 * 1000 ); // 5 minutes max to complete

                mochaProcess.stdout.on('data',
                    function (data) {
                        var dataString = data.toString();
                                            
                        var heristicEnd = ( dataString.contains('tests complete') );

                        dataString = dataString.toHTMLString();

                        dataString = dataString.replace('✔', '<span style="color: green;">[OK]</span>');
                        dataString = dataString.replace('◦', '[--]');

                        dataString = dataString.replace('[2K', '');
                        dataString = dataString.replace('[0G', '');

                        ponse.write('<code>');
                        ponse.write( dataString );

                        if (data.length > 8)
                            ponse.write( '<br>' );

                        ponse.write('</code>');

                        if (heristicEnd) {
                            ponse.write('will send KILL in 3 seconds, just in case...');        
                            setTimeout( _kill, 3000 );
                        }
                    
                    });

                mochaProcess.stderr.on('data',
                    function (data) {
                        var dataString = data.toString();

                        ponse.write('<code style="color:red;">');
                        ponse.write( dataString.toHTMLString() );
                        ponse.write('</code>');

                        if ( dataString.contains('tests failed') )
                        {
                            ponse.write('will send KILL in 3 seconds');     
                            setTimeout( _kill, 3000 );
                        }

                    });

                mochaProcess.on('exit',
                    function (code) {
                        ponse.write('<p>exit with code: ' + code + '</p>');
                        ponse.end('</body></html>');
                        doneOp();
                    });

                function _kill() 
                {
                    ponse.write('<p>Sending SIGKILL</p>');

                    mochaProcess.kill('SIGKILL');
                }

            } );

    };


/* Route ===== */

admin.path.intense = basePath + '/intense-image-resample';

admin.route.intense =
    function(quest, ponse)
    {
        var iphoneImagePath = test_resources.getPath('iPhone4S.JPG');

        console.log('-> ' + admin.path.intense);

        ponse.writeHead( 200, { 'Content-Type': 'text/html' } );

        ponse.write('<html><body>');
        ponse.write('<h1>intense-image-resample</h1>');

        var count = 0;
        var maxCount = 20;

        for ( var i=0; i<maxCount; i++ )
        {
            imageshop.safeResample( iphoneImagePath
                                ,   imageshop.k.DefaultResampleOptions
                                ,   function success(path, size)
                                    {
                                        assert(size.width == 2048, 'image width expected to be 2048');                                  
                                        ponse.write(path + '<br>');
                                        fs.unlink(path);
                                        isDone();
                                    }
                                ,   function error(e)
                                    { 
                                        ponse.write( e.message + ' code: '+ e.code + '<br>' );
                                        isDone();
                                    } );            
        }   

        function isDone()
        {
            count++;

            if (count >= maxCount)
            {
                ponse.end('</body></html>');
            }
        }
    }


/* Route ===== */

admin.path.info = basePath + '/info';

admin.route.info =
    function(quest, ponse)
    {
        ponse.writeHead( 200, { 'Content-Type': 'text/html' } );

        ponse.write('<html><body>');

        ponse.write( common.objectToHTML(process.versions, 'process.versions') );

        ponse.write( common.objectToHTML( process.memoryUsage(), 'process.memoryUsage()') );

        ponse.write( common.objectToHTML( process.uptime(), 'process.uptime() - seconds') );

        ponse.write( common.objectToHTML( process.platform, 'process.platform') );
        
        ponse.write( common.objectToHTML( process.arch, 'process.arch') );

        ponse.write( common.objectToHTML( process.title, 'process.title') );

        ponse.write( common.objectToHTML( process.config, 'process.config') );


        ponse.end('</body></html>');
    };


/* Route ===== */

admin.path.restart = basePath + '/restart';

admin.route.restart =
    function(quest, ponse)
    {
        ponse.writeHead( 200, { 'Content-Type': 'text/html' } );

        ponse.write('<html><body>');
        ponse.write('Restarting in 1 second');

        setTimeout( function() { process.exit(1); } , 1000 );

        ponse.end('</body></html>');
    };


/* Route ===== */

admin.path.resampleQueueCount = basePath + '/resample-queue-count';

admin.route.resampleQueueCount =
    function(quest, ponse)
    {
        ponse.writeHead( 200, { 'Content-Type': 'text/html' } );

        ponse.write('<html><body>');
        ponse.write('<h1> imageshop.resampleQueue().waitCount() = ' + imageshop.resampleQueue().waitCount() + '</h1>');
        ponse.end('</body></html>');
    };


/* Route ===== */

admin.path.cmd = basePath + '/cmd/:command?';

admin.route.cmd =
    function(quest, ponse)
    {
        ponse.writeHead( 200, { 'Content-Type': 'text/html' } );

        ponse.write('<html><body>');

        if (    quest.params.command == undefined || 
                quest.params.command.startsWith(':') )
        {
            ponse.write('<h1>Expected shell command</h1>');
            return ponse.end('</body></html>');
        }


        ponse.write('<h1>' + quest.params.command + '</h1>');

        var elements = quest.params.command.split(' ');

        var cmd = elements[0];
        
        var args = [];

        if (elements.length > 2)
            args = _.range( 1, elements.length );

        var cmdProcess = spawn( cmd, args );

        setTimeout( _kill, 60 * 1000 ); // one minute max to complete

        cmdProcess.stdout.on('data',
            function (data) {
                ponse.write('<code>');
                
                var inputString = data.toString();
                ponse.write( inputString.toHTMLString() );           
                
                console.log(inputString);
                
                ponse.write('</code>');
            });

        cmdProcess.stderr.on('data',
            function (data) {
                ponse.write('<code style="color:red;">');

                var inputString = data.toString();
                ponse.write( inputString.toHTMLString()  );           

                ponse.write('</code>');
            });

        cmdProcess.on('exit',
            function (code) {
                ponse.write('<p>exit with code: ' + code + '</p>');
                ponse.end('</body></html>');
            });

        function _kill() 
        {
            cmdProcess.kill();
        }
    };

/* Route ===== */

admin.path.tmp = basePath + '/tmp';

admin.route.tmp =
    function(quest, ponse)
    {
        ponse.writeHead( 200, { 'Content-Type': 'text/html' } );
        ponse.write('<html><body>');

        var tmpDirectory = tmp.getDirectoryPath();

        ponse.write('<h1>' + tmpDirectory + '</h1>');

        tmp.getFileList(
            function(err, files) {

                for (var i = 0; i < files.length; i++ )
                {
                    var file_i = files[i];
                    ponse.write('<a href="' + admin.path.tmp + '/' + file_i + '">' + file_i + '</a> <br>');
                }

                ponse.end('</body></html>');
            } );
    };

/* Route ===== */

admin.path.tmpFile = basePath + '/tmp/:filename?';

admin.route.tmpFile =
    function(quest, ponse)
    {
        if ( quest.params.filename.startsWith(':') )
            return admin.route.tmp(quest, ponse);

        var tmpDirectory = tmp.getDirectoryPath();
        var filePath = path.normalize( tmpDirectory + '/' + quest.params.filename );

        var fileReadStream = fs.createReadStream(filePath);

        fileReadStream.on('error', 
            function(e) {
                ponse.writeHead( 404, { 'Content-Type': 'text/html' } );
                ponse.write('<html><body>');
                ponse.write( common.objectToHTML(e, filePath) );
                ponse.end('</body></html>');
            } );

        fileReadStream.on('open', 
            function(e) {

            var mimeType = mime.lookup(filePath);

            // console.log('did fileReadStream:');
            // console.log(fileReadStream);

            fs.stat(filePath,
                function(err, stat) {
                    if (err)
                        return console.log(err);

                    ponse.writeHead( 200, { 'Content-Type': mimeType,
                                            'Content-Length': stat.size } );
                    fileReadStream.pipe(ponse);
                });
            } );
    }

/* Route ===== */

admin.path.rmtmp = basePath + '/rmtmp';

admin.route.rmtmp =
    function(quest, ponse)
    {
        ponse.writeHead( 200, { 'Content-Type': 'text/html' } );

        ponse.write('<html><body>');

        ponse.write('<h1>handy.rmTmpDirectory()</h1>');

        tmp.rmTmpDirectory();

        ponse.end('</body></html>');
    }
