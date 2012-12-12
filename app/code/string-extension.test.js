
var     assert  = require('assert')

    ,   string_extension = use('string-extension')
    ;


describe('string-extension.js',
    function() {

        describe('String',
            function() {
                var sampleText =  'Here s to the crazy one';

                it('String.startsWith', 
                    function() {
                        assert(sampleText.startsWith('Here'), 'expected to startsWith Here');
                        assert(!sampleText.startsWith('ere'), 'expected not to startsWith ere');
                    } );

                it('String.endsWith', 
                    function() {
                        assert(sampleText.endsWith('one'), 'expected to endsWith one');
                        assert( !sampleText.endsWith('cne'), 'expected not to endsWith cne');
                    } );

                it('String.contains', 
                    function() {
                        assert(sampleText.contains('Here'), 'expected to endsWith Here');
                        assert( !sampleText.contains('toz'), 'expected not to endsWith toz');
                    } );

                it('String.isNumber', 
                    function() {
                        assert( !sampleText.isNumber(),     'expected false');
                        assert('12345678901247'.isNumber(), 'expected true');
                        assert( !'T1'.isNumber() ,          'expected false');
                        assert( !'1T1'.isNumber(),          'expected false');
                        assert( '0'.isNumber(),             'expected true');
                        assert( '90'.isNumber(),            'expected true');
                    } );
            } );
    } );
