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
function fetchGet (url, sent) {
	request(url, function (err, response, body) {
		if (response.statusCode == 404) {
			console.log('404, try again in ' + (delay / 1000) + ' seconds...');
			setTimeout(function () { fetchGet(url, sent); }, delay);
		} else {
			try {
				var out = JSON.parse(body)[0];
				console.log('Result');
				console.log(out, sent);
			} catch (exn) {
				console.log('error', err);
				console.log('response', response);
				console.log('body', body);
				console.log('exn', exn);
			}
		}
	});
}

app.post('/api/turkit', function (req, res) {
	var sents = req.body.sentences;
	res.send(JSON.stringify({succ: true}));
	console.log('got sents', sents);
	
	function buildUrl (sent) {
		return 'http://vivam.us/human/ask?' + qs.stringify({
			instructions: 'Copy editing: are there spelling or grammar mistakes in the following sentences?', //task description
			question: 
				JSON.stringify({Radio: {
					questionText: sent,
					chooseOne: ['yes','no']
				}})
			});
	}
	
	sents.map(function (sent) {

		console.log('asking for', sent);
		var url = buildUrl(sent);
		console.log('url', url);	
		request.put(url, function (error, response, body) { /* whatevs */  });
		fetchGet(url, sent);
	
	});

});

app.listen(3000);
console.log('Listening on port 3000');
