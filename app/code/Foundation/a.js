
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

function _assert_valid_string(value, name)
{
    assert( value != undefined,         name + ' is undefined' );
    assert( typeof value == 'string',   name + ' is not string is:' + typeof value );
    assert( value.length > 0,           'Not a valid ' + name + ', len == 0' );
}
    
a.assert_http_url = 
    function(value)
    {
        _assert_valid_string(value, 'url');
        assert( value.startsWith('http') != undefined, 'url doesnt start with http');
        return value;
    };

a.assert_fbId =
    function(value)
    {
        _assert_valid_string(value, 'fbId');
        assert( value.isNumber(),   'Not a valid Facebook Id' );
        
        return value;        
    };

a.assert_def =
    function(value, name_opz)
    {
        assert( value != undefined, ( name_opz ? name_opz : 'value' ) + ' is undefined' );
        return value;
    };

a.assert_obj =
    function(value, name_opz)
    {
        assert( value != undefined, ( name_opz ? name_opz : 'object' ) + ' is undefined' );
        assert( _.isObject(value),  ( name_opz ? name_opz : 'object' ) + ' expected' );
        return value;
    };

a.assert_uid = 
    function(value)
    {
        assert( value != undefined,         'uid is undefined' );
        assert( typeof value == 'string',   'uid is not a string' );
        assert( value.length > 0,           'invalid uid, len == 0' );
        return value;
    };

a.assert_array = 
    function(value, name_opz)
    {
        assert( value != undefined,   ( name_opz ? name_opz : 'value' ) + ' is undefined' );
        assert( Array.isArray(value), ( name_opz ? name_opz : 'value' ) + ' is not a array' );
        return value;
    };

a.assert_string =
    function(value, name_opz)
    {
        assert( value != undefined,         ( name_opz ? name_opz : 'value' ) + ' is undefined' );
        assert( typeof value == 'string',   ( name_opz ? name_opz : 'value' ) + ' is not a string' );
        return value;
    };


