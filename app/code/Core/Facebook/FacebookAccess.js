
var     assert  = require("assert")
    ,   a       = use('a')
    ;

var Class = exports;

Class.FacebookAccess = FacebookAccess;

function FacebookAccess(token, expires)
{
    a.assert_def(token);
    a.assert_def(expires);

    this._token   = token;
    this._expires = expires;

    return this;
}

Class.FacebookAccess.resurrect =
    function(fbAccess)
    {
        a.assert_def(fbAccess._token);
        a.assert_def(fbAccess._expires);

        var result = new FacebookAccess(fbAccess._token, fbAccess._expires);

        return result;
    };

Class.FacebookAccess.fromRequest =
    function(quest)
    {
        a.assert_def(quest);
        a.assert_def(quest.session);
        a.assert_def(quest.session.user);
        var sessionUser = quest.session.user;

        var result = Class.FacebookAccess.resurrect(sessionUser._facebookAccess);

        FacebookAccess.assert(result);
        
        return result;
    };

Class.FacebookAccess.assert =
    function(fbAccess)
    {
       a.assert_def(fbAccess, 'fbAccess');
       a.assert_def(fbAccess._token, 'fbAccess._token');
       a.assert_def(fbAccess._expires, 'fbAccess._expires');
    };

FacebookAccess.prototype.getToken = 
    function()
    {
        return this._token;
    };

FacebookAccess.prototype.getExpires = 
    function()
    {
        return this._expires;
    };
