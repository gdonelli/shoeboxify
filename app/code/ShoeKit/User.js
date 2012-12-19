
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

function User(    fbAccess
              ,   success_f   /* (user) */
              ,   error_f     /* (err)  */    )
{
    if (fbAccess    == undefined &&
        success_f   == undefined &&
        error_f     == undefined) {  // Clone scenario
        return this;
    }
    
    FacebookAccess.assert(fbAccess);
    a.assert_f(success_f);
    a.assert_f(error_f);
    
    this._facebookAccess = fbAccess;
    
    return this._init(success_f, error_f);
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
    function(   success_f   /* (user) */
            ,   error_f     /* (err)  */    )
    {
        var that = this;

        var q = new OperationQueue(1);

        q.on('abort', 
            function(e){
                error_f(e);           
            });

        q.add( 
            function FetchMeOperation(doneOp)
            {
                fb.graph(that.getFacebookAccess()
                    ,   '/me'
                    ,   function success(fbObject) {
                            // console.log(fbObject);
                            var meKeys = [      'id'            ,   'name'
                                            ,   'first_name'    ,   'last_name'
                                            ,   'link'          ,   'username'
                                            ,   'gender'        ,   'email'
                                            ,   'timezone'      ,   'locale'
                                            ,   'updated_time'  ];
                                            
                            that._me = _.pick(fbObject, meKeys);
                            doneOp();
                        }
                    ,   function error(e) {
                            q.abort(e);
                        } );
            });

        q.add( 
            function InitPhotoDatabaseOperation(doneOp)
            {
                photodb.setup(  
                        that.getFacebookId()
                    ,   function success()
                        {
                            doneOp();   
                        }
                    ,   function error(e)
                        {
                            q.abort(e);
                        }
                    );
            });

        q.add( 
            function EndOperation(doneOp)
            {
                if (success_f) success_f(that);

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

