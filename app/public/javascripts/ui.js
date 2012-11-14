
//
// ui.js 
//
// Shoeboxify UI lib
//


var _ui = (function () 
{
	var consoleDefined = false;

	// constructor
	var ui = function(){
	if (window.console)
		consoleDefined = true;
	};

	// prototype
	ui.prototype = {
		constructor: ui

		,	  log: log
	/*	,	debug: debug */
		,	error: error	
	};


	function log(string)
	{
		if (window.console)
			console.log(string);
	}
	
	function error(string)
	{
		if (window.console)
			console.error('**** ' + string);
	}

	// return ui
	return ui;
})();

var ui =  new _ui();


var _serviceUI = (function () 
{
	var consoleDefined = false;

	// constructor
	var serviceUI = function(){
	if (window.console)
		consoleDefined = true;
	};

	// prototype
	serviceUI.prototype = {
		constructor: serviceUI

		,	objectForURL: objectForURL
		,	copyObject: copyObject
	};

	function objectForURL(theURL, success_f /* (ponseObject) */, error_f)
	{
		return _sevice_processURL( '/o4u', theURL, success_f, error_f);
	}

	function copyObject(theURL, success_f /* ponse */, error_f)
	{
		return _sevice_processURL( '/cp', theURL, success_f, error_f);
	}

	function _sevice_processURL(servicePath, theURL, success_f /* ponse */, error_f)
	{
		var urlEncoded = encodeURIComponent(theURL);

		var theCurrentHost = window.location.host;
		var o4u = 'http://' + theCurrentHost + servicePath + '?u=' + urlEncoded;

		var quest = $.ajax( o4u );

		quest.done(
			function(ponse) {
				// ajax quest sucess

				var responseStatus = ponse['status'];

				if (responseStatus == 0)
				{
					// Success
					if (success_f)
						success_f(ponse)
				}
				else
				{
					/*
						ERROR: 
							/o4u response with status: responseStatus
					 */

					var error = new Error( o4u + ' response with status: ' + responseStatus);
					error.code = responseStatus;
					error.response = ponse;
					if (error_f)
						error_f(error);
				}
			});
		
		quest.fail(
			function(jqXHR, textStatus) 
			{	
				/*
					Ajax failed
				 */

				var error = new Error( 'AJAX request to ' + o4u + ' failed with status:' + textStatus);
				error.code = 3;
				error.response = ponse;
				if (error_f)
					error_f(error);

				ui.log('AJAX request to ' + o4u + ' failed with status:' + textStatus + " jqXHR:");
				ui.log(jqXHR);
			});
		

	}
	



	// return serviceUI
	return serviceUI;
})();

var serviceUI =  new _serviceUI();


