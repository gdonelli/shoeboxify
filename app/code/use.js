
var     assert  = require("assert")
    ,   path    = require("path")
    ,   fs      = require("fs")


var use = exports;

var MODULE_FILE_EXTENSION = '.js';

use.setup =
    function( source /* path or array of paths */ )
    {
        use.modules(source);
        global.use = use.use;
        global.use.lib = use;
    }

use.use = function(name)
    {
        assert( name && name.length>0 , 'invalid name');

        var isClassName = name[0].toUpperCase() == name[0];

        if (isClassName)
            return use.class(name);
        else
            return use.module(name);
    };

use.module =
    function(name)
    {
        var modules = use.modules();

        var modulePath = modules[name];

        if (modulePath)
        {
            var moduleId = modulePath.substring(0, modulePath.length - MODULE_FILE_EXTENSION.length);
            return require(moduleId);
        }
        else
            throw new Error('Cannot find module: `'+ name +'`');
    };

use.class =
    function(name)
    {
        var module = use.module(name);
        var classInModule = module[name];

        if (classInModule == undefined)
        {
            if ( Object.keys(module).length == 0 )
            {
                var circularErrString = 'Module: `' + name + '` appears to be empty - Is there circular dependency?';
                console.error(circularErrString);
                console.error('Circular dependency are not supported by the `use` directive');
                throw new Error(circularErrString);
            }
            else
            {
                console.error('Error finding main class in module: `' + name + '`');
                console.error('Module:');
                console.error(module);                
                throw new Error(name + '.' + name + ' is undefined');
            }
        }
        else if (typeof classInModule == 'function')
            return classInModule;
        else
            throw new Error(name + '.' + name + ' is not a function');       
    }


var _modules;

use.modules = 
    function(source /* path or array of paths */)
    {
        if (!_modules) {
            if (source == undefined) {
                throw new Error('use.setup was not called');
            }

            if (typeof source == 'string')
                source = [ source ];

            // console.log('source: ' + source);
            // console.log('Loading modules to use...');

           _modules = _loadModules(source);
        }
        
        return _modules;
    }

/* aux ==================================================== */

function _loadModules(srcArray)
{
    var result = {};

    for (i in srcArray)
    {
        var src_i = srcArray[i];

        _loadModulesForDir(src_i);
    }

    return result;

    /* aux ==== */

    function _loadModulesForDir(dirPath)
    {

        var files = fs.readdirSync(dirPath);

        for (var i in files)
        {
            var file_i = files[i];
            var filepath_i = path.normalize(dirPath + '/' + file_i);

            if (path.extname(file_i) == MODULE_FILE_EXTENSION)
            {
                var moduleName = path.basename(file_i, MODULE_FILE_EXTENSION);

                _addModule(moduleName, filepath_i);
            }
            else
            {
                var subdirectory;

                try {
                    subdirectory = _loadModulesForDir(filepath_i); // assume is a directory
                }
                catch(e) {
                    if (e.code != 'ENOTDIR')
                        throw e;
                }

                // Merge modules
                for (var module in subdirectory) {
                    _addModule(module, subdirectory[module]);
                }
            }
            
            /* aux ==== */

            function _addModule(name, filepath)
            {
                if (result.hasOwnProperty(name))
                {
                    throw new Error('Duplicate module: ' + filepath + ' and '+ result[name].path );
                }
                else
                {
                    result[name] = filepath;
                }
            }
        }
    }
}
