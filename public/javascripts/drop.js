
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

		var droppedURL = dropEvent.dataTransfer.getData('text/uri-list');

		if (!droppedURL || droppedURL.length < 5) {
			ClearUI();
			ui.error('droppedURL is empty');
			return PreventDropToCascade(dropEvent);		
		}
		else
			ui.log( dropEvent.type + ' droppedURL: ' +  droppedURL );

		PerformDragExit(dropEvent);

		serviceUI.objectForURL(droppedURL
			,	function success(ponse) {
					var responseSource = ponse['source'];
					var responseData = ponse['data'];

					if (!responseSource)
						responseSource = '???';

					$('#sourceURL').text(responseSource);

					if (!responseData)
						responseData = '#?';

					$('#facebookObjectID').text(responseData);

					ui.log(ponse);

					var graphObject = ponse['graphObject'];

					$('#objectInfo').html( common.objectToHTML(graphObject, 'Facebook Object') );
					$('#dropimage').attr('src', graphObject['picture']);

					if (graphObject['error']) {
						$('#droparea').css('background-color', '#AA3333');
						$('#shoeboxify').attr('disabled', 'disabled');
					}
					else
						$('#shoeboxify').removeAttr('disabled');

					window.droppedURL = droppedURL;
				}
			,	function error(error) {
					ui.error('ponse with error:');
					ui.error(error);
				} );

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

	window.droppedURL = undefined;
}

function ClearButtonAction()
{
	ClearUI();
}

function ShoeboxifyButtonAction()
{
	ui.log('ShoeboxifyButtonAction');

		serviceUI.copyObject(window.droppedURL
			,	function success(ponse) {
					console.log('ponse:');
					console.log(ponse);
				}
			,	function error(error) {
					console.log('error:');
					console.log(error);
				
				} );

}
