

var		assert  = require("assert")
	,	path	= require("path")
	;


var test_resources = exports;

test_resources.k = {};

test_resources.k.TestUserId          = 'T1';

//Photos
test_resources.k.SteveJobsPhotoId    = '10151242148911730';
test_resources.k.PublicPhotoId       = '426454000747131';

test_resources.k.SamplePhotoDirectURL    = 'https://sphotos-b.xx.fbcdn.net/hphotos-ash3/599016_10151324834642873_1967677028_n.jpg';
test_resources.k.SamplePhotoId           = '10151324834642873';

// Others
test_resources.k.FacebookUserId      = '554390706';


test_resources.getPath =
    function(filename)
    {
        var result = __dirname + '/../test/';

        if (filename)
            result += filename;

        return path.normalize(result); 
    };

