
var     assert  = require('assert')
    ,   _       = require('underscore')
    ;

use('string-extension');

var a = exports;

a.assert_f = 
    function( candidate_f, canBeUndefined )
    {
        if (canBeUndefined != undefined) 
        {
            if (canBeUndefined && candidate_f == undefined)
                return; 
        }

        assert( (typeof candidate_f == 'function'), 'expected function, given: ' + candidate_f );

        return candidate_f;
    };

a.assert_session =
    function(quest)
    {
        assert(quest != undefined,          'quest is undefined');
        assert(quest.session != undefined,  'quest.session is undefined');
        return quest;
    };

a.assert_http_url = 
    function(url)
    {
        assert( url != undefined, 'url is undefined');
        assert( url.startsWith('http') != undefined, 'url doesnt start with http');
        return url;
    };

a.assert_fbId =
    function(value)
    {
        assert( value != undefined, 'fbId is undefined' );
        assert( value.isNumber(), 'Not a valid Facebook Id' );
        return value;
    };

a.assert_def =
    function(value, name_opz)
    {
        assert( value != undefined, ( name_opz ? name_opz : 'value' ) + ' is undefined' );
        return value;
    };

a.assert_obj =
    function(value)
    {
        assert( value != undefined, 'object is undefined' );
        assert( _.isObject(value), 'object expected' );
        return value;
    };

a.assert_uid = 
    function(value)
    {
        assert( value != undefined, 'uid is undefined' );
        assert( typeof value == 'string', 'uid is not a string' );
        
        return value;
    };
