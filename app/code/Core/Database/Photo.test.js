
var   		assert  = require("assert")
		,	a       = use('a')

		,	Photo 	= use('Photo')
		;



describe(	'Photo.js',
	function() 
	{
		var emptyPhoto;

		it('new emptyPhoto',
			function()
			{	
				emptyPhoto = new Photo(true);
				Photo.assert(emptyPhoto);
			});

		it('emptyPhoto.getId',
			function()
			{	
				a.assert_def( emptyPhoto.getId() );
			});
		
		it('Photo.resurrect',
			function()
			{	
				var object = { casa: 'italy' };
				var photo = Photo.fromEntry(object);
				a.assert_def( photo.getId );
//				console.log(photo);
			});

		it('getters',
			function()
			{	
				emptyPhoto.getFacebookId();
				emptyPhoto.getSourceObject();
				emptyPhoto.getCopyObject();
			});


	});
