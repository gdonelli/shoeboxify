/* 

==================[   Facebook Utils   ]==================

*/

var     assert  = require('assert')
    ,   url     = require('url')

    ,   a = use('a')
    ,   string_extension    = use('string-extension')

    ;


var fbutil = exports;


/*
 * Will extract the facebook ID from a URL if present
 * returns undefined if none is found.
 */
 
fbutil.facebookIdForURL =
    function( theURL )
    {
        a.assert_string(theURL);
        
        if (theURL.startsWith('http'))
        {
            // https://www.facebook.com/photo.php?fbid=426454000747131&set=a.156277567764777.33296.100001476042600&type=1&ref=nf

            if (theURL.indexOf('photo.php?') > 0 && theURL.indexOf('fbid=') > 0 )
            {
                var stringElements = url.parse(theURL, true);
                var stringQuery = stringElements['query'];
                var fbid = stringQuery['fbid'];

                return fbid;
            }

            // https://sphotos-b.xx.fbcdn.net/hphotos-ash3/599016_10151324834642873_1967677028_n.jpg
            
            var last4chars = theURL.substring((theURL.length-4), theURL.length );

            if ( last4chars == '.jpg')
            {
                var theURLSplitElements = theURL.split('/');

                var lastPathComponent = theURLSplitElements[theURLSplitElements.length-1];

                var numbers = lastPathComponent.split('_');

                var isnum0 = numbers[0].isNumber();
                var isnum1 = numbers[1].isNumber();
                var isnum2 = numbers[2].isNumber();

                if (isnum0 && isnum1 && isnum2)
                    return numbers[1];
            }
        }

        return undefined;
    }

