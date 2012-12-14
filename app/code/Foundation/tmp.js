/* 

====================[   tmp   ]====================

            tmp.tmpFile
            tmp.testDirectory

======================================================

*/


var     path        = require('path')
    ,   fs          = require('fs')
    ,   nodeuuid    = require('node-uuid')
    ,   wrench      = require('wrench')
    ,   _           = require('underscore')

    ,   a   = use('a')
    ;

var tmp = exports;


var _TMP_DIR = __dirname + '/../../tmp';

var _tmpDirectory_exist = false;

tmp.rmTmpDirectory = 
    function()
    {
        if (fs.existsSync(_TMP_DIR)) {
            // console.log('TMP_DIR exist -> ' + _TMP_DIR);
            wrench.rmdirSyncRecursive(_TMP_DIR);
        }
    };

tmp.getDirectoryPath = 
    function() 
    {
        var result = _TMP_DIR;

        if (!_tmpDirectory_exist)
        {
            try
            {
                var r = fs.mkdirSync(result);
            }
            catch(e)
            {
                if (e.code != 'EEXIST')
                    throw e;
            }

            _tmpDirectory_exist = true;
        }

        return path.normalize( result + '/' );
    };

var _tmpFileIndex = 0;

tmp.getFile =
    function(extension) 
    {
        var result = tmp.getDirectoryPath();

        _tmpFileIndex++;
        
        result += _tmpFileIndex + '_' + nodeuuid.v1();

        if (extension)
            result += '.' + extension;

        return path.normalize(result);
    };

