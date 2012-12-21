

var     assert  = require("assert")
    ,   path    = require("path")
    ;


var test_resources = exports;


test_resources.kTestUserId  = 'T1';

//Photos
test_resources.kSteveJobsPhotoId    = '10151242148911730';
test_resources.kPublicPhotoId       = '426454000747131';

test_resources.kSamplePhotoDirectURL    = 'https://sphotos-b.xx.fbcdn.net/hphotos-ash3/599016_10151324834642873_1967677028_n.jpg';
test_resources.kSamplePhotoId           = '10151324834642873';

test_resources.kOldPhotoId      = '515258326088';
test_resources.kProfilePhotoId  = '10152170979900707';

// Others
test_resources.kFacebookUserId  = '554390706';


test_resources.getPath =
    function(filename)
    {
        var result = __dirname + '/../../test/';

        if (filename)
            result += filename;

        return path.normalize(result); 
    };

