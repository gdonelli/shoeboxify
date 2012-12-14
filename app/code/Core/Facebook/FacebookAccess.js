
var     assert  = require("assert")

    ,   a       = use('a')
    ;

exports.FacebookAccess = FacebookAccess;

exports.FacebookAccess.fromRequest =
    function _c_fromRequest(quest)
    {
        a.assert_def(quest);
        a.assert_def(quest.session);
        a.assert_def(quest.session.user);
        var sessionUser = quest.session.user;

        var result = new FacebookAccess(    sessionUser._facebookAccess._token, 
                                            sessionUser._facebookAccess._expires );

        FacebookAccess.assert(result);
        
        return result;
    };


function FacebookAccess(token, expires)
{
    a.assert_def(token);
    a.assert_def(expires);

    this._token   = token;
    this._expires = expires;

    return this;
}

exports.FacebookAccess.assert = 
    function _c_assert(fbAccess)
    {
       a.assert_def(fbAccess, 'fbAccess');
       a.assert_def(fbAccess._token, 'fbAccess._token');
       a.assert_def(fbAccess._expires, 'fbAccess._expires');
    };

FacebookAccess.prototype.token = 
    function _i_token()
    {
        return this._token;
    };

FacebookAccess.prototype.expires = 
    function _i_expires()
    {
        return this._expires;
    };