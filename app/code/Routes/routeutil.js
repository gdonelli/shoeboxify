
var     _       = require('underscore')
    ,   assert  = require('assert')

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
                var auth_i  = (module.auth && module.auth[key_i]) || (options && options.auth);
                
                a.assert_def(path_i, 'path_i is undefined, key=' + key_i);
                a.assert_def(route_i, 'route_i is undefined, path_i=' + path_i);
                assert( auth_i == undefined ||
                        auth_i == 'user'||
                        auth_i == 'admin',
                        'Unknown auth directive for for path_i=' + path_i);
                
                var opt = '\t';
                if (auth_i == 'admin')
                {
                    app.get(path_i, 
                            authentication.userSessionMiddleware,  
                            authentication.adminSessionMiddleware, 
                            route_i);

                    opt += '(admin)';
                }
                else if (auth_i == 'user')
                {
                    app.get(path_i,
                            authentication.userSessionMiddleware, 
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


routeutil.renderIndexPage =
    function(quest, ponse, module, title )
    {
        a.assert_def(module,         'module is undefined');
        a.assert_def(module.path,    'module.path is undefined');
        a.assert_def(module.route,   'module.route is undefined');

        ponse.writeHead( 200, { 'Content-Type': 'text/html' } );

        ponse.write('<html><body>');
        ponse.write('<h1>' + title + '</h1>');

        for (var key in module.path)
        {
            var path_i  = module.path[key];
            var route_i = module.route[key];

            ponse.write('<p>');
            ponse.write('&nbsp;&nbsp;&nbsp;&nbsp;');
            ponse.write('<a href="' + path_i + '">' + key + '</a>');
            ponse.write('</p>');
        }
        
        ponse.end('</body></html>');
    }
