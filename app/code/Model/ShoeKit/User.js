
var     assert  = require("assert")
    ,   _       = require("underscore")
    
    ,   a       = use('a')
    ,   fb      = use('fb')
    ,   database        = use('database')

    ,   FacebookAccess  = use('FacebookAccess')
    ,   OperationQueue  = use('OperationQueue')
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

function User(  fbAccess 
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


exports.User._init =
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
                fb.graph(fbAccess
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
            function InitDatabaseOperation(doneOp)
            {
                database.init(  
                        that.facebookId()
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

