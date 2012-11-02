

function InstallDropListener( target )
{
	if (target && target.addEventListener) 
	{
		var dragEventHandlers = {
			'dragenter'	:	PerformDragEnter
		,	'dragover'	:	PerformDragEnter
		
		,	'dragleave'	:	PerformDragExit
		,	'dragexit'	:	PerformDragExit

		,	'drop'		:	PerformDrop
		,	'dragdrop'	:	PerformDrop
		}


		for (eventName in dragEventHandlers)
		{
			target.addEventListener(eventName,	dragEventHandlers[eventName], false);
		}
	}
	else
	{
		ui.error('target or target.addEventListener is undefined');
	}

	/* ================================================ */

	function ExtractDropInfoForEvent(dropEvent)
	{
		if (!dropEvent) {
			ui.error('dropEvent is undefined');
			return undefined;
		}

		var dropTransfer = dropEvent.dataTransfer;
		if (!dropTransfer) {
			ui.error('dropEvent.dataTransfer is undefined');
			return undefined;
		}

		var types = dropEvent.dataTransfer.types;
		if (!types) {
			ui.error('dropEvent.dataTransfer.types is undefined');
			return undefined;
		}

		var result = [];

		for (var i = 0; i < types.length; i++) 
		{
			if (types[i] == 'Files')
			{
				var files = dropEvent.dataTransfer.files;
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
				if (typeof dropEvent.dataTransfer.getData(dropEvent[i]) !== 'undefined') 
				{
					var dataForType = dropEvent.dataTransfer.getData(types[i]);

					ui.log('type: ' + types[i] );
					ui.log('dataForType: ' + dataForType );

					result.push({
						type: types[i],
						data: dataForType
					});

				}
			}
		}

		return result;
	}


	function PerformDrop(dropEvent) 
	{
		// Important we do this first, in case exceptions are thrown 
		if (dropEvent.preventDefault)
			dropEvent.preventDefault();

		var dropInfo = ExtractDropInfoForEvent(dropEvent);

		if (!dropInfo){
			ui.error('dropInfo is undefined');
			return PreventDropToCascade(dropEvent);
		}

		ui.log('DropInfo:');
		ui.log(dropInfo);

		var types = dropEvent.dataTransfer.types;

		ui.log('types:');
		ui.log(types);

		var files = dropEvent.dataTransfer.files;

		ui.log('files:');
		ui.log(files);

		var url = dropEvent.dataTransfer.getData('text/uri-list');

		if (!url || url.length < 5) {
			ClearUI();
			ui.error('drop URL is empty');
			return PreventDropToCascade(dropEvent);		
		}
		else
			ui.log( dropEvent.type + ' url: ' +  url );

		PerformDragExit(dropEvent);

		var urlEncoded = encodeURIComponent(url);

		var theCurrentHost = window.location.host;
		var o4u = 'http://' + theCurrentHost + '/o4u?u=' + urlEncoded;

		ui.log('o4u: ' + o4u );

		var request = $.ajax( o4u );

		LoadingUI();

		request.done(
			function(responseObject) {
				ui.log("ajax request sucess:");

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

					ui.log(responseObject);

					var graphObject = responseObject['graphObject'];

					$('#objectInfo').html( common.objectToHTML(graphObject, 'Facebook Object') );

					$('#dropimage').attr('src', graphObject['picture']);

					if (graphObject['error'])
						$('#droparea').css('background-color', '#AA3333');
				}
				else
				{
					$('#sourceURL').text('o4u response withs status: ' + responseStatus);
					ui.error('responseObject with error:');
					ui.error(responseObject);
				}
				

			});

		request.fail(
			function(jqXHR, textStatus) {
				ui.log("ajax request fail: " + textStatus + " jqXHR:");
				ui.log(jqXHR);
			});

		return false;
	}


	function PerformDragEnter(dropEvent)
	{
		if (dropEvent.preventDefault)
			dropEvent.preventDefault();

		dropEvent.dataTransfer.dropEffect = 'copy';

		ui.log("--> DragEnter");
		
		$('#droparea').css('background-color', 'yellow');

		return false;
	}


	function PerformDragExit(dropEvent)
	{
		if (dropEvent.preventDefault)
			dropEvent.preventDefault();

		ui.log("--> DragExit");

		$('#droparea').css('background-color', '#EEE');

		return false;
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

	$('#droparea').css('background-color', '#EEE');
	
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
	ui.log('ShoeboxifyButtonAction');
}
