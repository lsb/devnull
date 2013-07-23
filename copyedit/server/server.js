var express = require('express');
var request = require("request");
var app = express();
app.enable('trust proxy'); //for nginix etc..
var qs = require('querystring');


app.use(express.static(__dirname + '/public'));
app.use(express.bodyParser());

/*
app.get('/hello.txt', function(req, res){
  res.send('Hello World');
});
*/

var delay = 10 * 1000;


var jobCounter = 0;
var batches = [];
function makeBatch (sentences, batchID) {
	jobCounter++;
	var res = [];
	res.count = 0;
	res.batchID = batchID;
	batches[jobCounter] = res;	
	return jobCounter;
}
function getBatch (jobID) {
    return batches[jobID];
}
function updateBatch(jobID, i, result) {
	batches[jobID][i] = result;
	batches[jobID].count++;
}


function fetchGet (url, sent, sentenceI, jobID) {
	request(url, function (err, response, body) {
		if (!response) {
			console.log('no response (offline?), try again in ' + (delay / 1000) + ' seconds...');
			setTimeout(function () { fetchGet(url, sent, sentenceI, jobID); }, delay);
		} else if (response.statusCode == 404) {
			console.log('404, try again in ' + (delay / 1000) + ' seconds...');
			setTimeout(function () { fetchGet(url, sent, sentenceI, jobID); }, delay);
		} else {
			try {
				var out = JSON.parse(body)[0];				
				console.log('Result');
				console.log(out, sent);
				updateBatch(jobID, sentenceI, out);
			} catch (exn) {
				console.log('error', err);
				console.log('response', response);
				console.log('body', body);
				console.log('exn', exn);
			}
		}
	});
}

app.get('/api/improvements', function (req, res) {
	var jobID = req.query.jobID; 
	
	console.log('got request for batch', jobID);
	var currentResult = getBatch(jobID);
	
	var out = {
		count: currentResult.count, 
		sentences: currentResult, 
		jobID: jobID, 
		batchID: currentResult.batchID,
		repollDelayMS: delay};
	console.log('sending result', out);
	res.send(JSON.stringify(out));	
}); 

app.post('/api/turkit', function (req, res) {
	var sents = req.body.sentences ? req.body.sentences : [];
	var batchID = req.body.batchID;
	var jobID = makeBatch(sents, batchID);
	res.send(JSON.stringify({jobID: jobID}));
	console.log('got sents', sents);
	
	function buildUrl (sent) {
		return 'http://vivam.us/human/ask?' + qs.stringify({
			instructions: //task description
				'Copy editing: are there spelling or grammar mistakes in the following sentences? Ignore style formatting hints such as "\section{Chapter name.}" and "\ref{??}"', 
			question: 
				JSON.stringify({Radio: {
					questionText: sent,
					chooseOne: ['yes','no']
				}})
			});
	}	
	
	sents.map(function (sent, idx) {
		console.log('asking for', sent);
		var url = buildUrl(sent);
		console.log('url', url);	
		request.put(url, function (error, response, body) { /* whatevs */  });
		fetchGet(url, sent, idx, jobID);	
	});

});

app.listen(3000);
console.log('Listening on port 3000');
