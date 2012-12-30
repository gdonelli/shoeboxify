
/*
 *      view.js
 */

var     https   = require('https')
    ,   url     = require('url')
    ,   path    = require('path')

    ,   mongo   = use('mongo')
    ,   common  = use('common')
    ,   PhotoManager	= use('PhotoManager')
    ;

var view = exports;


view.route  = {}; 
view.path   = {}; 


view.path.shoeboxified = '/shoeboxified';

view.route.shoeboxified =
    function(quest, ponse)
    {
        ponse.writeHead(200, {'Content-Type': 'text/html'});

        ponse.write('<html>');
        ponse.write('<script> function view(id) { window.open("' +view.path.shoeboxified + '/"+id, "_blank"); } </script>');

        ponse.write('<body>');
        ponse.write('<h1>' + 'Shoeboxified' + '</h1><div>');

        var photoManager = PhotoManager.fromRequest(quest);
        
        photoManager.getPhotos(
                function(err, photos)
                {
                    if (err) {
                        ponse.write( common.objectToHTML(err, 'photoManager.getPhotos error') );
                        ponse.end('</div></body></html>');
                    }
                    
                    photos.forEach(
                        function(photo) {
                            var cpObject = photo.getCopyObject();
                            
                            
                            ponse.write('<img src="' + cpObject.picture + '" ');
                            ponse.write('onclick="view(\'' + photo.getId() + '\')" ');
                            ponse.write('></img>\n');
                        });
                        
                    ponse.end('</div></body></html>');
                });
        
    };



view.path.shoeboxified_id = '/view/shoeboxified/:oid?';

view.route.shoeboxified_id =
    function(quest, ponse)
    {
        ponse.writeHead(200, {'Content-Type': 'text/html'});

        ponse.write('<html>');

        ponse.write('<body>');

        ponse.write('<h1>' + quest.params.oid + '</h1>');

/*
        memento.findId(
                fb.me(quest, 'id')
            ,   quest.params.oid
            ,   function success(entry) {
                    console.log(entry);
                    ponse.write( common.objectToHTML(entry, quest.params.oid) );
                    _theEnd();
                }
            ,   function error(e) {
                    ponse.write( common.objectToHTML(e, quest.params.oid) );
                    _theEnd();
                } );
*/

        function _theEnd()
        {
            ponse.write('</body>');
            ponse.end('</html>');           
        }
    };



view.path.drop = /*basePath +*/ '/drop';

view.route.drop =
    function(quest, ponse)
    {
        ponse.render('drop');
    }


