/* 

====================[   Handy   ]====================

String: 
            handy.ASCIItoBase64
            handy.Base64toASCII
Debug:
            handy.writeHTMLstacktrace
            handy.errorLogStacktrace
            handy.elapsedTimeSince
            handy.routeDebugPage

======================================================

*/


var     url     = require('url')
    ,   path    = require('path')
    ,   fs      = require('fs')
    ,   assert  = require('assert')
    ,   _       = require('underscore')

    ,   a       = use('a')
    ;

var handy = exports;

/* ======================================================== */
/* ======================================================== */
/* ========================= Data ========================= */
/* ======================================================== */
/* ======================================================== */

handy.ASCIItoBase64 =
    function(asciiString)
    {
        return new Buffer(asciiString).toString('base64');
    }

handy.Base64toASCII =
    function(string64)
    {
        return new Buffer(string64, 'base64').toString('ascii');
    }

/* ========================================================= */
/* ========================================================= */
/* ========================= Debug ========================= */
/* ========================================================= */
/* ========================================================= */

handy.logErrorStacktrace =
    function(err)
    {
        console.error(err.stack);
    };


handy.writeErrorStacktraceToHTMLStream =
    function( ponse, err )
    {
        var options;

        var trace = err.stack.split('\n');

        for (var i in trace)
        {
            var line_i = trace[i];
            ponse.write( line_i.replace( " ", '&nbsp;' ) );
            ponse.write('<br>');
        }
    };


/* ========================================================= */


handy.elapsedTimeSince =
    function(startTime)
    {
        assert(startTime != undefined, 'startTime is undefined');

        var now = new Date();

        return now.getTime() - startTime.getTime();
    };


handy.routeDebugPage =
    function( ponse, module, moduleName )
    {
        assert(module != undefined,         'module is undefined');
        assert(module.path != undefined,    'module.path is undefined');
        assert(module.route != undefined,   'module.route is undefined');

        ponse.writeHead( 200, { 'Content-Type': 'text/html' } );

        ponse.write('<html><body>');
        ponse.write('<h1>' + moduleName + '</h1>');

        for (var key in module.path)
        {
            var path_i  = module.path[key];
            var route_i = module.route[key];

            ponse.write('<p>');
            ponse.write('&nbsp;&nbsp;&nbsp;&nbsp;');
            ponse.write('<a href="' + path_i + '">' + key + '</a>');
            ponse.write('</p>');
        }
        
        ponse.end('</body></html>');
    }
