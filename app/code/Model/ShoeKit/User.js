
var     assert  = require("assert")
    ,   _       = require("underscore")
    
    ,   a   = use('a')
    ,   fb  = use('fb')
    ,   FacebookAccess  = use('FacebookAccess')
    ;

exports.User = User;

exports.User.fromRequest =
    function(quest)
    {
        a.assert_def(quest);
        a.assert_def(quest.session);
        a.assert_def(quest.session.user);

        var result = new User();

        result._facebookAccess = FacebookAccess.fromRequest(quest);

        var questUser = quest.session.user;
        result._me = questUser._me;

        User.assert(result);
        
        return result; 
    }

function User(  fbAccess, success_f /* (user) */, error_f /* (err) */)
{
    if (fbAccess == undefined && 
        success_f == undefined && 
        error_f == undefined )
    {
        return this;
    }

    FacebookAccess.assert(fbAccess);
    a.assert_f(success_f);
    a.assert_f(error_f);

    this._facebookAccess = fbAccess;
    
    var that = this;

    // Init User!

    // Get User Facebook Profile Object

    fb.graph(fbAccess
        ,   '/me'
        ,   function success(fbObject)
            {
                // console.log(fbObject);
                var meKeys = ['id', 'name', 'first_name', 'last_name', 'link', 'username', 'gender', 'email', 'timezone', 'locale', 'updated_time'];
                that._me = _.pick(fbObject, meKeys);
                success_f(that);
            }
        ,   function error(e){
                error_f(e);
            } );

    // Should initialize user database
/*
            mongo.memento.init(
                    quest.session.me.id
                ,   function success(collection) {
                        assert(collection != undefined, 'user collection is undefined');
                        LastStep();
                    }
                ,   function error(e) {
                        RespondWithError('mongo.user.init failed', e);
                    } );

*/


    return this;
}

exports.User.assert = 
    function(user)
    {
        a.assert_def(user);
        a.assert_def(user._facebookAccess);
        a.assert_def(user._me);
        a.assert_def(user._me.id);          
    }


User.prototype.facebookAccess =
    function()
    {
        return this._facebookAccess;
    };

User.prototype.facebookId =
    function()
    {
        return this._me.id;
    };

