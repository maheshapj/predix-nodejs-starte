
/**
Global variables
**/
var lineChartMap ;
var connectedDeviceConfig = '';

/**
This function is called on the submit button of Get timeseries data to fetch
data from TimeSeries.
**/
function onclick_machineServiceData() {
	lineChartMap = getMachineServiceData();
	setInterval(updateChart,3000);
}

/**
 * gets time series data for tags
**/
function getMachineServiceData() {
	var tagString = getTagsSelectedValue();

	if (connectedDeviceConfig.isConnectedTimeseriesEnabled) {
		// If the Connected Device attribute exists, then
		// update the chart without using the Microservice
		getMachineServiceDataWithoutMicroservice();
	}
	else {

		
		var starttime = getStartTimeSelectedValue();
		var datapointsUrl = "https://geo-optimised-route8-timeseries-service.run.aws-usw02-pr.ice.predix.io/services/binanalytical/yearly_data/vizag/"+tagString+"?order=asc";
		if(starttime) {
			datapointsUrl = datapointsUrl + "&starttime="+starttime;
		}
		//console.log(tagString);
		
		$.ajax({     
       url: datapointsUrl,
       error: function (jqXHR, textStatus, errorThrown) {
           document.getElementById("windService_machine_yearly").innerHTML = "Error getting data for tags";
       },
       success: function (obj) {
				var data = JSON.parse(obj);
				document.getElementById("line_chart_info").innerHTML = 'Chart for Tags';
				lineChartMap = constructMachineChartResponse(data);
				document.getElementById("windService_machine_yearly").innerHTML = '';
				return lineChartMap;
		}
		});
	}

	// Call the Asset service if applicable
	if (connectedDeviceConfig.isConnectedAssetEnabled) {
		// Get the Asset data if the Asset URI is enabled
		var table = document.getElementById("aTable");
		var assetGetData = new XMLHttpRequest();
		var assetGetDataURL = "/predix-api/predix-asset/" + tagString;

		assetGetData.open('GET', assetGetDataURL, true);
		assetGetData.onload = function() {
			if (assetGetData.status >= 200 && assetGetData.status < 400) {
				document.getElementById("predix_asset_table").innerHTML = '';
				var resultJSON = JSON.parse(assetGetData.response)[0];
				if (resultJSON) {						
					var nameOfTable = document.getElementById("predix_asset_table");
					nameOfTable.innerHTML = "Asset Information";

					while (table.firstChild) {
						table.removeChild(table.firstChild);
					}
					var keys = Object.keys(resultJSON);
					for(var i = 0; i<keys.length; i++) {
						// Create an empty <tr> element and add it to the 1st position of the table:
						var row = table.insertRow(i);
						// Insert new cells (<td> elements) at the 1st and 2nd position of the "new" <tr> element:
						var cell1 = row.insertCell(0);
						var cell2 = row.insertCell(1);
						cell1.style.borderWidth = "1px";
						cell1.style.borderStyle = "solid";
						cell1.style.borderColor = "black";

						cell2.style.borderWidth = "1px";
						cell2.style.borderStyle = "solid";
						cell2.style.borderColor = "black";
						// Add some text to the new cells:
						cell1.innerHTML = keys[i];
						cell2.innerHTML = resultJSON[keys[i]];
					}
					table.style.borderCollapse= "collapse";
				} else {
					document.getElementById("predix_asset_table").innerHTML = "No asset model info available for tag: " + tagString;
					while (table.firstChild) {
						table.removeChild(table.firstChild);
					}
				} 
			} else {
				document.getElementById("predix_asset_table").innerHTML = "Error fetching asset model info for tag: " + tagString;
			}
		};
		assetGetData.onerror = function() {
			document.getElementById("predix_asset_table").innerHTML = "Error fetching asset model info for tag: " + tagString;
		};
		if (tagString != undefined)
		{
			assetGetData.send();
		}
	}
}

/**
This function actually performs the retrieval of TimeSeries tags as well as
the data of those tags chosen by the user. Data is queried directly from Timeseries.
**/
function getMachineServiceDataWithoutMicroservice() {

	var myTimeSeriesBody = {
		tags: []
	};
	var timeSeriesGetData = new XMLHttpRequest();
	var tagString = getTagsSelectedValue();
	var starttime = getStartTimeSelectedValue();
	timeSeriesGetData.open('POST', '/predix-api/predix-timeseries/v1/datapoints', true);

	var tags = tagString.split(",");
	for (var i=0; i < tags.length; i++)
	{
		myTimeSeriesBody.tags.push({
			"name" : tags[i],
			"limit": 25,
			"order": "desc"
		});
	}
	if(starttime) {
		myTimeSeriesBody.start = starttime;
	}

	timeSeriesGetData.onload = function() {
		if (timeSeriesGetData.status >= 200 && timeSeriesGetData.status < 400) {
			var data = JSON.parse(timeSeriesGetData.responseText);
			document.getElementById("line_chart_info").innerHTML = 'Chart for Tags';
			var str = JSON.stringify(timeSeriesGetData.responseText, null, 2);
			console.log('First call to Timeseries returned data:'+ str);
			lineChartMap = constructMachineChartResponse(data);
			document.getElementById("windService_machine_yearly").innerHTML = '';
			return lineChartMap;
		} else {
			document.getElementById("windService_machine_yearly").innerHTML = "Error getting data for tags";
		}
	};
	timeSeriesGetData.onerror = function() {
		document.getElementById("windService_machine_yearly").innerHTML = "Error getting data for tags";
	};

	if (tagString != undefined)
	{
		timeSeriesGetData.send(JSON.stringify(myTimeSeriesBody));
	}
}

/**
Fetching the selected tags
**/
function getTagsSelectedValue() {
	var tagString = "";
	var tagAppender = "";
	var tagList = document.getElementById('tagList');
	for (var tagCount = 0; tagCount < tagList.options.length; tagCount++) {
		if(tagList.options[tagCount].selected === true){
			tagString = tagString+tagAppender+tagList.options[tagCount].value ;
			tagAppender = ",";
		}
	}
	return tagString;
}

/**
Fetching the selected start time value
**/
function getStartTimeSelectedValue() {
	var startTime;

	var startTimeList = document.getElementById('start-time');
	for (var stCount = 0; stCount < startTimeList.options.length; stCount++) {
		if(startTimeList.options[stCount].selected === true){

			startTime = startTimeList.options[stCount].value ;
			return startTime;
		}
	}
	return startTime;
}

/**
Method to draw chart as per tags and construct html for same
**/
function constructMachineChartResponse(data) {
	var lineChartMap = new Map();
	// remove exisitn elements -reset
	document.getElementById('add_machine_canvas').innerHTML = "";
	// get the base element
	var  add_machine_canvas = document.getElementById('add_machine_canvas');

	for(var i = 0; i < data.tags.length; i++) {
		var divTag = document.createElement('div');
		divTag.id="windService_machine_div_"+i;
		divTag.setAttribute("class", "windyservice_chart_div");

		add_machine_canvas.appendChild(divTag);

		var add_machine_div = document.getElementById('windService_machine_div_'+i);
		var pTagName = document.createElement('p');
		pTagName.id="windService_machine_tag_"+i;
		pTagName.class="windyservice_machine_tag";
		add_machine_div.appendChild(pTagName);

		document.getElementById("windService_machine_tag_"+i).innerHTML = data.tags[i].name;

		var canvas = document.createElement('canvas');
		canvas.id="machine_canvas_"+i;
		canvas.setAttribute("class", "windyservice_chart_canvas");
		add_machine_div.appendChild(canvas);

		var ctx = document.getElementById(canvas.id).getContext("2d");
		// console.log('constructing new chart, with points: ' + data.tags[i].length);
		var lineChartDemo = new Chart(ctx).Line(getMachineLineChartData_each(data.tags[i]), {
			responsive: true,
			animation: false
		});
		lineChartMap.set(data.tags[i].name,lineChartDemo);

	}
	return lineChartMap;
}

/**
Method to update the Chart with the latest data from the selected tags
This method quries the Microservice created in the 'Build a Basic App Journey'
**/
function updateChart() {
	if (connectedDeviceConfig.isConnectedTimeseriesEnabled) {
		// If the Connected Device attribute exists, then
		// update the chart without using the Microservice
		updateChartWithoutMicroservice();
	}
	else {
		var tagString = getTagsSelectedValue();
		var request = new XMLHttpRequest();
		var datapointsUrl = "https://geo-optimised-route8-timeseries-service.run.aws-usw02-pr.ice.predix.io/services/binanalytical/yearly_data/vizag/"+tagString+"?order=asc&starttime=5mi-ago";
		//console.log(datapointsUrl);
		request.open('GET', datapointsUrl, true);
		request.onload = function() {
			if (request.status >= 200 && request.status < 400) {
				var data = JSON.parse(request.responseText);
				//console.log('updated data is '+str);
				for(var i = 0; i < data.tags.length; i++) {
					var datapoints = data.tags[i].results[0].values;
					for(var j = 0; j < datapoints.length; j++) {
						var lineChartDemo = lineChartMap.get(data.tags[i].name);
						var d = new Date(datapoints[j][0]);
						var formatDate = d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
						lineChartDemo.addData([datapoints[j][1]],formatDate);
						lineChartDemo.removeData();
					}
				}
				document.getElementById("windService_machine_yearly").innerHTML = '';
			}
		};
		request.onerror = function() {
			document.getElementById("windService_machine_yearly").innerHTML = "Error getting data for tags";
		};
		request.send();
	}
}


/**
Method to update the Chart with the latest data from the selected tags
This method queries Timeseries directly. (not wind data service)
**/
function updateChartWithoutMicroservice() {
	var myTimeSeriesBody = {
		tags: []
	};
	var timeSeriesGetData = new XMLHttpRequest();
	var tagString = getTagsSelectedValue();
	var tags = tagString.split(",");
	// Should we use the selected start time?  Or just use 5 minutes on each update?
	// var starttime = getStartTimeSelectedValue();
	timeSeriesGetData.open('POST', '/predix-api/predix-timeseries/v1/datapoints', true);

	for (var i=0; i < tags.length; i++)
	{
		myTimeSeriesBody.tags.push({
			"name" : tags[i],
			"limit": 25,
			"order": "desc"
		});
	}
	myTimeSeriesBody.start = "5mi-ago";

	timeSeriesGetData.onload = function() {
		if (timeSeriesGetData.status >= 200 && timeSeriesGetData.status < 400) {
			var data = JSON.parse(timeSeriesGetData.responseText);
			console.log("Updated data: " + JSON.stringify(timeSeriesGetData.responseText, null, 2))

			for(i = 0; i < data.tags.length; i++) {
				var datapoints = data.tags[i].results[0].values;
				for(var j = datapoints.length - 1; j >= 0; j--) {
					// console.log('j: ' + j);
					var lineChartDemo = lineChartMap.get(data.tags[i].name);
					var d = new Date(datapoints[j][0]);
					var formatDate = d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
					// console.log('formatDate: ' + formatDate);
					lineChartDemo.removeData();
					lineChartDemo.addData([datapoints[j][1]],formatDate);
				}
			}
		}
		else {
				console.log("Error on updating the chart...");
		}
	};
	timeSeriesGetData.send(JSON.stringify(myTimeSeriesBody));
}

	/*
	Method that get the timeseries data and convert that in Chart format.
	*/
function getMachineLineChartData_each(tag){
	var dataset = {
		label: tag.name,
		fillColor: "rgba(220,220,220,0.2)",
		strokeColor: "rgba(220,220,220,1)",
		pointColor: "rgba(220,220,220,1)",
		pointStrokeColor: "#fff",
		pointHighlightFill: "#fff",
		pointHighlightStroke: "rgba(220,220,220,1)",
		data: []
	};

	var lineChartData = {
		labels : [],
		datasets : [dataset]
	};
	var datapoints = tag.results[0].values;
	for(var j = datapoints.length - 1; j >= 0; j--) {
		var d = new Date(datapoints[j][0]);
		var formatDate = d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
		lineChartData.labels.push(formatDate);
		lineChartData.datasets[0].data.push(datapoints[j][1]);
	}
	document.getElementById('windService_machine_yearly').scrollIntoView();
	return lineChartData;
}

/**
Method to generate the list of tags to choose from
(Called from secure page on load.)
**/
function configureTagsTimeseriesData() {

	getConnectedDeviceConfig().then(
		function(response) {
			connectedDeviceConfig = JSON.parse(response);

			if (connectedDeviceConfig.isConnectedTimeseriesEnabled) {
				var headerTitle = document.getElementById('tag_list_title');
				if (headerTitle) {
					headerTitle.innerHTML = 'Connected Device Tag List';
				}
				var select = document.getElementById('tagList');
				if (select) {

					var timeSeriesGetAllTags = new XMLHttpRequest();
					// call timeseries through the proxy routes set up in express.
					timeSeriesGetAllTags.open('GET', '/predix-api/predix-timeseries/v1/tags', true);

					timeSeriesGetAllTags.onload = function() {
						if (timeSeriesGetAllTags.status >= 200 && timeSeriesGetAllTags.status < 400) {
							var data = JSON.parse(timeSeriesGetAllTags.responseText);

							// Create all Tags (assuming separated by comma)
							var tagsToGenerate = (connectedDeviceConfig.assetTagname).split(",");

							// Make call to timeseries to get all Tags
							for (var i = 0; i < data.results.length; i++) {
								var tagname = data.results[i];
								if (tagsToGenerate.indexOf(tagname) < 0) {
									tagsToGenerate.push(tagname);
									console.log("Adding timeseries tag: " + tagname);
								}
							}
							var tagListElement = document.getElementById('tagList');
							while (tagListElement.firstChild) {
								tagListElement.removeChild(tagListElement.firstChild);
							}

							for (i=0; i < tagsToGenerate.length; i++) {
								var opt = document.createElement('option');
								opt.value = tagsToGenerate[i].trim();
								opt.innerHTML = tagsToGenerate[i].trim();
								tagListElement.appendChild(opt);
							}
						}
						else {
							document.getElementById("windService_machine_yearly").innerHTML = "Error getting tags from Timeseries";
						}
					};
					timeSeriesGetAllTags.onerror = function() {
						document.getElementById("windService_machine_yearly").innerHTML = "Error getting tags from Timeseries";
					};
					timeSeriesGetAllTags.send();
				}
			}
			else {
				getTagsFromMicroservice();
			}

		},
		function(error) {
			console.error("Failed when getting the RaspberryPi Configurations", error);
		});
}

function getTagsFromMicroservice (){
	var request = new XMLHttpRequest();
	request.open('GET', '/api/services/binanalytical/tags', true);
	request.onload = function() {
		if (request.status >= 200 && request.status < 400) {
			var data = JSON.parse(request.responseText);
			//console.log('tags response is '+JSON.stringify(request.responseText, null, 2));
			var select = document.getElementById('tagList');
			if (select) {
				for(var tagCount = 0; tagCount < data.results.length; tagCount++) {
					var opt = document.createElement('option');
					opt.value = data.results[tagCount];
					if(tagCount === 0){
						opt.selected = "selected";
					}
					opt.innerHTML = data.results[tagCount];
					select.appendChild(opt);
				}
			}
			document.getElementById("windService_machine_yearly").innerHTML = '';
		} else {
			document.getElementById("windService_machine_yearly").innerHTML = "Error getting data for tags";
		}
	};
	request.onerror = function() {
		document.getElementById("windService_machine_yearly").innerHTML = "Error getting data for tags";
	};
	request.send();
}

/**
Method to make the necessary rest call and get the raspberry PI configurations
from the server
**/
function getConnectedDeviceConfig() {
	console.log("Making call to /secure/data to get raspberry pi configurations...");
	return new Promise(function(resolve, reject) {
		var request = new XMLHttpRequest();
		request.open('GET', '/secure/data');
		request.onload = function() {
			if (request.status == 200) {
				resolve(request.response);
			}
			else {
				reject(Error(request.statusText));
			}
		};
		request.send();
	});
}
