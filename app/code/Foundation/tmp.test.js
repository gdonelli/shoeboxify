
var     assert  = require('assert')

    ,   a           = use('a')
    ,   tmp         = use('tmp')
    ,   string_x    = use('string-extension')
    ;


describe('tmp.js',
    function() {

        it('tmp.rmTmpDirectory',
            function() {
                tmp.rmTmpDirectory();
            } );

        it('tmp.tmpDirectory',
            function() {
                var tmpDir = tmp.tmpDirectory();
                console.log(tmpDir);

                var local = '/shoeboxify/app/tmp/'
                var jitsu = '/shoeboxify/package/tmp/'

                assert( tmpDir.endsWith(local) ||
                        tmpDir.endsWith(jitsu)
                    , 'tmp dir is wrong is ' + tmpDir );
            } );

    } );
