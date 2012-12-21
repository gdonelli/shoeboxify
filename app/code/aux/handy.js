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

