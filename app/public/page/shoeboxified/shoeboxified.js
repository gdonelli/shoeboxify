


function LoadPhotos()
{
    console.log('LoadPhotos');
    
    serviceAPI.getPhotos(
        function(err, ponse){
            if (err) {
                console.log('getPhotos err:');
                console.log(err);
                return;
            }
            
            var photos = ponse.data;
            
            $('#photos').html('');
            
            photos.forEach( function(photo) {
                    _addPhotos(photo);
                });
        });
}

function _addPhotos(photo)
{
    var photoHTML = '<div class="photo"><img src="';
    
    photoHTML += photo.copy.picture;
    
    photoHTML += '"></img></div>'

    $('#photos').append( photoHTML );
    
    console.log(photo.copy.picture);
}
