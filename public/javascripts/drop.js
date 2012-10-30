

function InstallDropListener()
{
	var target = /*document.getElementsByTagName("body")[0]; */  document.getElementById("droparea"); 

	if (target.addEventListener) 
	{
		// Firefox, Google Chrome, Safari, Internet Exlorer
		target.addEventListener ("dragenter", PerformDragEnter, false);
		// Firefox, Google Chrome, Safari, Internet Exlorer
		target.addEventListener ("dragover", PerformDragEnter, false);
		
		// Firefox from version 3.5, Google Chrome, Safari, Internet Exlorer
		target.addEventListener ("dragleave", PerformDragExit, false);
		// Firefox
		target.addEventListener ("dragexit", PerformDragExit, false);
		
		// Firefox from version 3.5, Google Chrome, Safari, Internet Exlorer
		target.addEventListener ("drop", PerformDrop, false);
		// Firefox before version 3.5
		target.addEventListener ("dragdrop", PerformDrop, false);
	}
	
	function PreventDropToCascade(theEvent)
	{
		if (theEvent.preventDefault)
			theEvent.preventDefault();

		return false;
	}

	function ExtractDropInfoForEvent(theEvent)
	{
		var result = [];

		var types = theEvent.dataTransfer.types;

		for (var i = 0; i < types.length; i++) 
		{
			if (types[i] == 'Files')
			{
				var files = event.dataTransfer.files;
				for (var j = 0; j < files.length; j++) {

					result.push({
							type:		'file'
						,	fileName:	files[j].fileName
						,	fileSize:	files[j].fileSize
					});
				}
			}
			else 
			{
				if (typeof event.dataTransfer.getData(theEvent[i]) !== 'undefined') 
				{
					var dataForType = theEvent.dataTransfer.getData(types[i]);

					console.log('type: ' + types[i] );
					console.log('dataForType: ' + dataForType );

					result.push({
						type: types[i],
						data: dataForType
					});

				}
			}
		}

		return result;
	}

	function PerformDrop(theEvent) 
	{
		var dropInfo = ExtractDropInfoForEvent(theEvent);

		console.log('DropInfo:');
		console.log(dropInfo);

		var types = event.dataTransfer.types;

		console.log('types:');
		console.log(types);

		var files = theEvent.dataTransfer.files;

		console.log('files:');
		console.log(files);

		var url = theEvent.dataTransfer.getData('text/uri-list');

		if (!url || url.length < 5) {
			ClearUI();
			console.error('drop URL is empty');
			return PreventDropToCascade(theEvent);		
		}
		else
			console.log( theEvent.type + ' url: ' +  url );

		PerformDragExit(theEvent);

		var urlEncoded = encodeURIComponent(url);

		var theCurrentHost = window.location.host;
		var o4u = 'http://' + theCurrentHost + '/o4u?u=' + urlEncoded;

		console.log('o4u: ' + o4u );

		var request = $.ajax( o4u );

		LoadingUI();

		request.done(
			function(responseObject) {
				console.log("ajax request sucess:");

				var responseStatus = responseObject['status'];

				if (responseStatus == 0) {
					var responseSource = responseObject['source'];
					var responseData = responseObject['data'];

					if (!responseSource)
						responseSource = '???';

					$('#sourceURL').text(responseSource);

					if (!responseData)
						responseData = '#?';

					$('#facebookObjectID').text(responseData);

					console.log(responseObject);

					var graphObject = responseObject['graphObject'];

					$('#objectInfo').html( common.objectToHTML(graphObject, 'Facebook Object') );

					$('#dropimage').attr('src', graphObject['picture']);

					if (graphObject['error'])
						$('#droparea').css('background-color', '#AA3333');
				}
				else
				{
					$('#sourceURL').text('o4u response withs status: ' + responseStatus);
					console.error('responseObject with error:');
					console.error(responseObject);
				}
				

			});

		request.fail(
			function(jqXHR, textStatus, thrownError) {
				console.log("ajax request fail: " + textStatus + " jqXHR:");
				console.log(jqXHR);
				console.log('thrownError: ' + thrownError);
			});

		return PreventDropToCascade(theEvent);
	}

	function PerformDragEnter(theEvent)
	{
		theEvent.dataTransfer.dropEffect = 'copy';

		console.log("--> DragEnter");
		
		$('#droparea').css('background-color', 'yellow');

		return PreventDropToCascade(theEvent);
	}

	function PerformDragExit(theEvent) {
		console.log("--> DragExit");

		$('#droparea').css('background-color', '#EEE');

		return PreventDropToCascade(theEvent);
	}

	function LoadingUI()
	{
		$('#dropimage').attr('src', '');	
		$('#sourceURL').text('Loading...');
		$('#facebookObjectID').text('-');
		$('#objectInfo').text('');

		$('#droparea').attr('background-color', '#EEE');
		
		$('#dropimage').remove();
		$('#droparea').html('<img id="dropimage"> </img>');
	}
}

function ClearUI()
{
	$('#sourceURL').text('Source of Image');
	$('#facebookObjectID').text('#');
	$('#objectInfo').text('');

	$('#droparea').attr('background-color', '#EEE');
	
	$('#dropimage').remove();
	$('#droparea').html('<img id="dropimage"> </img>');

	$('#shoeboxify').attr('disabled', 'disabled');
}

function ClearButtonAction()
{
	ClearUI();
}

function ShoeboxifyButtonAction()
{
	console.log('ShoeboxifyButtonAction');
}
