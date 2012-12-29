
var     assert  = require('assert')

    ,   fbutil          = use('fbutil')
    ,   test_resources  = use('test-resources')
    ;


describe('fbutil.js',
    function() 
    {
        it( 'photo.php',
            function()
            {
                var link = 'https://www.facebook.com/photo.php?fbid=426454000747131&set=a.156277567764777.33296.100001476042600&type=1&ref=nf';
                var id = fbutil.facebookIdForURL(link);
                var expected = '426454000747131';

                assert(id == expected, 'wrong id: ' + id + ' expected: ' + expected);
            } );

        it( 'direct link',
            function()
            {
                var link = test_resources.kSamplePhotoDirectURL;
                var id = fbutil.facebookIdForURL(link);
                var expected = test_resources.kSamplePhotoId;

                assert(id == expected, 'wrong id: ' + id + ' expected: ' + expected);
            } );

        it( 'bonny link',
            function()
            {
                var link = 'https://fbcdn-sphotos-h-a.akamaihd.net/hphotos-ak-snc7/v/566064_10152370502085125_471417010_n.jpg?oh=a045253851d9f41c434c5c02616b34b7&oe=50E06A34&__gda__=1356890142_cb6deb5649a8ffde52f75e9a83485c81';
                var id = fbutil.facebookIdForURL(link);
                var expected = '10152370502085125';

                assert(id == expected, 'wrong id: ' + id + ' expected: ' + expected);
            } );
        
        
        it( 'wrong link',
            function()
            {
                var link = 'https://sphotos-b.xx.fbcdn.net/hphotos-ash3/10151324834642873_1967677028_n.jpg';
                var id = fbutil.facebookIdForURL(link);
                var expected = undefined;

                assert(id == expected, 'wrong id: ' + id + ' expected: ' + expected);
            } );

        it( 'wrong link 2',
            function()
            {
                var link = 'https://sphotos-b.xx.fbcdn.net/hphotos-ash3';
                var id = fbutil.facebookIdForURL(link);
                var expected = undefined;

                assert(id == expected, 'wrong id: ' + id + ' expected: ' + expected);
            } );
    } );

