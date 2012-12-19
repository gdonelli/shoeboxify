
var     _ = require('underscore')

    ,   a = use('a')
    ,   authentication = use('authentication')
    ;


var routeutil = exports;

routeutil.addRoutesFromModule =
    function(app, moduleName, options)
    {
        a.assert_def(moduleName,     'moduleName is undefined');
        console.log(moduleName);
     
        var module = use(moduleName);

        a.assert_def(module,         'module is undefined');
        a.assert_def(module.path,    'module.path is undefined');
        a.assert_def(module.route,   'module.route is undefined');

        var routePathDiff = _.difference(Object.keys(module.path), Object.keys(module.route) );

        if (routePathDiff.length > 0) {
            console.log('miss-match between module.path and module.route');

            console.log('Check the following routes:');
            console.log( routePathDiff );       
            
            throw new Error('setup route miss-match');
        }

        var moduleKeys = Object.keys(module.path);

        moduleKeys.sort(
            function byPathLength(a, b) {
                return module.path[a].length - module.path[b].length;
            });
        
        moduleKeys.forEach(
            function (key_i)
            {
                var path_i  = module.path[key_i];
                var route_i = module.route[key_i];

                a.assert_def(path_i, 'path_i is undefined, key=' + key_i);
                a.assert_def(route_i, 'route_i is undefined, path_i=' + path_i);

                var opt = '\t';
                if (options && options.admin == true)
                {
                    app.get(path_i, 
                            authentication.validateUserSession,  
                            authentication.validateAdminSession, 
                            route_i);

                    opt += '(admin)';
                }
                else if (options && options.user == true)
                {
                    app.get(path_i,
                            authentication.validateUserSession, 
                            route_i);

                    opt += '(user)';
                }
                else
                {
                    app.get(path_i, route_i);
                }

                console.log('   |=> ' + path_i + opt);
            });

    };
