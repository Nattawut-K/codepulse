/*
 * Code Pulse: A real-time code coverage testing tool. For more information
 * see http://code-pulse.com
 *
 * Copyright (C) 2014 Applied Visions - http://securedecisions.avi.com
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

;(function(exports){
	
	/* Command Path:
	 * Given a `path`, pad the path with the appropriate strings
	 * to make it part of the trace API.
	 *
	 * Example:
	 * page location is "localhost:8080/foo/traces/2"
	 * provided path is "/some/command"
	 *
	 * output is "/foo/trace-api/2/some/command"
	 */
	var commandPath = (function(){
		var pagePath = document.location.pathname
		var pathRegex = /(.*)\/traces\/([^\/]+)$/
		var pathParts = pathRegex.exec(pagePath)
		var pathPrefix = pathParts[1]
		var pathId = pathParts[2]

		return function(path){
			return pathPrefix + '/trace-api/' + pathId + path
		}
	})();

	/* Ajax Request:
	 * Wraps the given `path` in `commandPath`, then sends an ajax request to the resulting
	 * path, using the `params` as the URL query data, and `callback` as a way to get data back.
	 *
	 * The `callback` function should look like `function callback(data, error)`; if the request
	 * was successful, `data` will be defined and `error` will be null; otherwise, `data` will be
	 * null and `error` will be defined.
	 */
	function ajaxCommand(path, type, params, callback){
		type = type || 'GET'

		// allow for calling `ajaxCommand(path, type, callback)` i.e. no params
		if(!callback && typeof params == 'function'){
			callback = params
			params = undefined
		}
		callback = callback || function(){}

		$.ajax(commandPath(path), {
			data: params,
			type: type,
			error: function(xhr, status){ callback(null, status) },
			success: function(data){ callback(data, null) }
		})
	}

	/**
	 * Repeatedly makes an ajax request to a specified URL, returning
	 * a Bacon.Bus that emits the result of each request. The cycle will
	 * end if the ajax request fails too many times in a row.
	 *
	 * @param args - An object containing the actual arguments.
	 *   args.url - The requested URL
	 *   args.getData - A function or object. The object, or the return value
	 *                  of the function will be used as the 'data' param for
	 *                  the ajax request.
	 *   args.failThreshold - The number of consecutive failures to trigger the 
	 *                        end of the cycle. Defaults to 5.
	 *   args.interval - The number of milliseconds between completion of one
	 *                   request and the start of the next.
	 *
	 * @return - A stream of events containing the request results as time goes by.
	 */
	function repeatingGetCommand(args){
		var url = args['url'],
			getData = args['getData'],
			failThreshold = args['failThreshold'],
			interval = args['interval']

		if(typeof getData != 'function'){
			var d = getData
			getData = function(){ return d }
		}
		if(isNaN(interval)) throw 'interval missing'
		if(typeof url != 'string') throw 'invalid url'
		if(isNaN(failThreshold)) failThreshold = 5

		var numFailures = 0,
			events = new Bacon.Bus()

		function makeRequest(){
			$.ajax(url, {
				data: getData(),
				type: 'GET',
				error: function(xhr, status, errCode){
					numFailures++
					events.error('Error loading url "' + url + '"')
				},
				success: function(json){
					numFailures = 0
					events.push(json)
				},
				complete: function(){
					if(numFailures >= failThreshold){
						events.error('Request error threshold reached. Giving up')
						events.end()
					} else {
						setTimeout(makeRequest, interval)
					}
				}
			})
		}

		makeRequest()
		return events
	}

	/* Shortcut for calling `ajax` with a type of 'POST' */
	function postCommand(path, params, callback){
		ajaxCommand(path, 'POST', params, callback)
	}

	/* Shortcut for calling `ajax` with a type of 'GET' */
	function getCommand(path, params, callback){
		ajaxCommand(path, 'GET', params, callback)
	}

	function deleteCommand(path, params, callback){
		ajaxCommand(path, 'DELETE', params, callback)
	}

	function requestStart(){ postCommand('/start') }
	function requestEnd(){ postCommand('/end') }

	exports.TraceAPI = {
		'requestStart': function(){ postCommand('/start') },
		'requestEnd': function(){ postCommand('/end') },
		'requestStatus': function(callback){ getCommand('/status', callback) },
		'requestRecordings': function(callback){ getCommand('/recordings', callback) },
		'requestNewRecording': function(callback){ postCommand('/recording', callback) },

		'deleteRecording': function(id, callback){ deleteCommand('/recording/' + id, callback) },

		'updateRecordingRunning': function(id, running, callback){ 
			postCommand('/recording/' + id, {'running': running}, callback) 
		},
		'updateRecordingLabel': function(id, label, callback){ 
			postCommand('/recording/' + id, {'label': label}, callback) 
		},
		'updateRecordingColor': function(id, color, callback){ 
			postCommand('/recording/' + id, {'color': color}, callback) 
		},

		'streamTraceCoverageCounts': function(loadParams, interval){ 
			return repeatingGetCommand({ url: commandPath('/coverage'), getData: loadParams, interval: interval })
		},

		'streamTraceCoverageRecords': function(loadParams, interval){
			return repeatingGetCommand({ url: commandPath('/records'), getData: loadParams, interval: interval })
		},

		'streamTraceCoverageEvents': function(interval){
			return repeatingGetCommand({ url: commandPath('/accumulation'), getData: null, interval: interval })
		},

		'loadTreemap': function(callback){
			d3.json(commandPath('/treemap.json'), callback)
		},

		'renameTrace': function(newName, callback){
			postCommand('/rename', {'name': newName}, callback)
		}
	}

})(this);