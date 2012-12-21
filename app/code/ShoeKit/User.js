
var     assert  = require("assert")
    ,   _       = require("underscore")
    
    ,   a       = use('a')
    ,   fb      = use('fb')
    ,   photodb = use('photodb')

    ,   FacebookAccess  = use('FacebookAccess')
    ,   OperationQueue  = use('OperationQueue')
    ;


var Class = exports;

Class.User = User;

function User(fbAccess, callback /* (err, user) */ )
{
    // Clone scenario
    if (!fbAccess && !callback)
        return this;
    
    FacebookAccess.assert(fbAccess);
    a.assert_f(callback);
    
    this._facebookAccess = fbAccess;
    
    return this._init(callback);
}

//
// Class Methods
//

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

exports.User.assert = 
    function(user)
    {
        a.assert_def(user,                  'user'          );
        a.assert_def(user._facebookAccess,  'user._facebookAccess');
        a.assert_def(user._me ,             'user._me'      );
        a.assert_def(user._me.id,           'user._me.id'   );
    }

//
// Methods
//

User.prototype._init =
    function( callback /* (err, user) */ )
    {
        a.assert_f(callback);
        
        var that = this;

        var q = new OperationQueue(1);

        q.on('abort', callback);

        q.add( 
            function FetchMeOperation(doneOp)
            {
                fb.graph(that.getFacebookAccess(), '/me',
                    function(err, fbObject) {
                        if (err)
                            return q.abort(err);
    
                        var meKeys = [      'id'            ,   'name'
                                        ,   'first_name'    ,   'last_name'
                                        ,   'link'          ,   'username'
                                        ,   'gender'        ,   'email'
                                        ,   'timezone'      ,   'locale'
                                        ,   'updated_time'  ];
                                        
                        that._me = _.pick(fbObject, meKeys);
                        doneOp();
                    });
            });

        q.add( 
            function InitPhotoDatabaseOperation(doneOp)
            {
                photodb.setup(that.getId(),
                    function(err)
                    {
                        if (err)
                            q.abort(err);
                        else
                            doneOp();
                    });
            });

        q.add( 
            function EndOperation(doneOp)
            {
                callback(null, that);

                doneOp();   
            });

        return this;
    };

User.prototype.getFacebookAccess =
    function()
    {
        return this._facebookAccess;
    };

User.prototype.getFacebookId =
    function()
    {
        return this._me.id;
    };

User.prototype.getId =
    function()
    {
        return this._me.id;
    };

