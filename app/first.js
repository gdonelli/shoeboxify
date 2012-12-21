
require( __dirname + '/code/Foundation/use' ).setup(
            [ 
                __dirname + '/code'
            ,   __dirname + '/public/script'
            ]);

var isApp = ( require.main.filename.indexOf('app.js') > 0 );

if ( isApp ) // enable profiling
{
    console.log(' [ nodefly running... ] ');
    
    require('nodefly').profile(
            process.env.NODEFLY_ID
        ,   ['Shoeboxify', process.env.SUBDOMAIN, process.env.NODE_ENV ] );
}

