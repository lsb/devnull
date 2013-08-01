var DEBUG = false;
var MAX_DOLLARS_BATCH = 2.50; 
var DOLLARS_PER_LETTER = 0.00007;
var NUM_READERS = 4;

//=================
/*
	/api/turkit POST 
		{sentences: [ string ], 
		 batchID: int}   //nonce
		-> {jobID: int}
	/api/improvements?jobID=int GET
		->
		{
			startTime: int,  //ms
			lastTime: int, //most recent mturk response, ms
			responseTime: int, //ms
			ticks: [ {i: int, time: ms} ] //for each sentence that came in, {i: int, time: ms}
			count: int, //how many have come in
			sentences: //{i: [ String ]}, the result
			jobID: int, //internal id
			batchID: int, //user id
			repollDelayMS: int}; //server delay in ms between batches, use for polling
		}
		 
*/
//=================

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
	res.startTime = new Date().getTime();
	res.lastTime = new Date().getTime();
	res.ticks = [];
//	res.sentences = sentences;
	batches[jobCounter] = res;	
	return jobCounter;
}
function getBatch (jobID) {
    return batches[jobID];
}
function updateBatch(jobID, i, result) {
	var time = new Date().getTime();
	batches[jobID][i] = result;
	batches[jobID].count++;
	batches[jobID].ticks.push({i: i, time: time});
	batches[jobID].lastTime = time;
}


function fetchGet (url, sent, sentenceI, jobID) {

	if (DEBUG) {
		if (Math.random() > 0.5) {
			console.log('GET fake delay', sent);
			setTimeout(
				function () { fetchGet(url, sent, sentenceI, jobID); }, 
				Math.random() * 3 * 1000);
		} else {
			var nonce = Math.random();
			var out = 
				Math.random() > 0.5 ?
					['ok', 'ok', '<or> ' + nonce + ' asdf asdf']
				: Math.random() > 0.5 ?
					['<is> ' + nonce + ' ha hah a long description goes here ok', 
					 '<the> ' + nonce + ' another long description goes here asdf asdf asdf',
					 '<if> ' + nonce + ' this sentence is going to be long and take space too due to its redundancy']
				: ['ok','ok','ok'];
			console.log('GET fake result', out);
			updateBatch(jobID, sentenceI, out);			
		}	
		return;
	}

	//////////////////////////////////////////

	request(url, function (err, response, body) {
		if (!response) {
			console.log('no response (offline?), try again in ' + (delay / 1000) + ' seconds...');
			setTimeout(function () { fetchGet(url, sent, sentenceI, jobID); }, delay);
		} else if (response.statusCode == 404) {
			console.log('404, try again in ' + (delay / 1000) + ' seconds...');
			setTimeout(function () { fetchGet(url, sent, sentenceI, jobID); }, delay);
		} else if (response.statusCode == 412) {
			console.log('412, ERROR: need to do a PUT before a GET');
			//die
			//TODO: tell client?
		} else if (response.statusCode == 502) {
			console.log('502 (down), try again in ' + (delay / 1000) + ' seconds...'); 
			setTimeout(function () { fetchGet(url, sent, sentenceI, jobID); }, delay);
		} else {
			try {
				var out = JSON.parse(body);
				console.log('Result');
				console.log(body, sent);
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
	
	if (!currentResult) {
		res.send(JSON.stringify({error: 'could not find GET request, did you forget to PUT?'}));
		console.log('GET without PUT');
		return;
	}
	
	var out = {
		startTime: currentResult.startTime, //put
		lastTime: currentResult.lastTime, //most recent mturk response
		responseTime: new Date().getTime(), //now
		ticks: currentResult.ticks, //for each sentence that came in, {i: int, time: ms}
		count: currentResult.count,  //how many have come in
		sentences: currentResult,  //{i: [ String ]}
		jobID: jobID, //internal id
		batchID: currentResult.batchID, //user id
		repollDelayMS: delay}; //server delay; no point in polling faster than this
	console.log('sending result', out);
	res.send(JSON.stringify(out));	
}); 


//DEPRECATED
function askAsRadio (sent) {
	return qs.stringify({
				distinctUsers: 2,
				instructions: //task description
					'Proofread: at first glance, which sentences have spelling or grammar mistakes?\nAnswer for each sentence and ignore formatting hints such as "\\section{Chapter name}" and "\\ref{??}"', 
				question: 
					JSON.stringify({Radio: {
						questionText: '"' + sent + '"',
						chooseOne: ['mistake','ok']
					}}),
				knownAnswerQuestionsIgnore: JSON.stringify({
					answeredQuestions: [
						{question: 
							{Radio: {questionText: "The schedule is combined with the attribute grammar to form an intermediate representation, and different code generators target different backends such as JavaScript, OpenCL, and C++.",
									 chooseOne: ['mistake','ok']}},
						answer: 'ok'}, 
						{question: 
							{Radio: {questionText: "Many of the difficulty in computer science stem from handling loops.",
									 chooseOne: ['mistake','ok']}},
						 answer: 'mistake'}], //difficulties => difficulty
					percentCorrect: 100
				})
			});
}

function askAsText (sent) {

	var instructions = 
	  'Proofread: describe mistakes in these sentences\n'
	+ [
	  'Mistakes can be anything, such as spelling, grammar, awkward phrasing, and run-on sentences.',
	  'Describe each mistake on a new line (multiple mistakes may appear in a sentence).',
	  'Describe a mistake by first labeling a word in it with "<the_word>" and then what is wrong, such as "<hellllo> spelling mistake".',
	  'If there are no mistakes, leave the box as "ok".',
	  'You can ignore text formatting notes such as \\Chapter{The Beginning}, Figure~., [ii], and ----',
	  '',
	  'Here are two examples:',
	  '',
	  '=== Example 1 Sentence ===',
	  'The quick \\highlight{brown} fox jumps over the lazy dog.',
	  '----Answer -----',
	  'ok',
	  '==========================',
	  '=== Example 2 Sentence ===',
////////////////
/*
	  'The quickly broown fox jumps over the lazy dog.',
	  '--- Answer -----',
	  "<quickly> looks wrong",
	  '<broown> spelling',
*/
////////////////
	  'The quickly broown fox jumps over the lazy dog, I ate a fish.',
	  '--- Answer -----',
	  "<quickly> doesn't agree with fox",
	  '<broown> spelling',
	  '<I> run-on sentence',
////////////////
	  '==========================',
	  '',
	  'If you have suggestions on how to improve the design of this HIT, please email LMeyerov+mt@gmail.com .',
	  'Thank you for helping!'
	].join('\n');
/*	
	var instructions = 
	  'Proofread: at first glance, which sentences have spelling mistakes, grammar mistakes, or seem awkward?\n'
	+ [
	  'Put every mistake in the sentence on a new line.',
	  'If there are no mistakes, leave the box as "ok".',
	  'Here are two examples:',
	  '=====',
	  '"The quickly broown fox juumps over the lazy fog."',
	  '-----',
	  'broown -> brown',
	  'quickly looks wrong',
	  'juumps -> jumps',
	  '*fog* cannot be jumped over, did you mean dog?',
	  '=====',
	  '"The quick brown fox jumps over the lazy dog."',
	  '-----',
	  'ok',
	  '=====',	  
	  'If you have suggestions on how to improve the design of the HIT, please email LMeyerov+mt@gmail.com .',
	  'Thank you for helping!'
	].join('\n');
*/
	var format = "(^ok$)|(^(<([^>]+)>[^\\n]+)(\\n+<([^>]+)>[^\\n]+)*\\n*$)";

	return qs.stringify({
//				cost: 2,
				distinctUsers: NUM_READERS,
				instructions: instructions,
				question: 
					JSON.stringify({
					  ConstrainedText: {
						questionText: '"' + sent + '"',
						defaultText: 'ok',
						regex: format
					}})					
				,	
				uniqueAskID: 07302013, //date
				knownAnswerQuestions:
					JSON.stringify({
						answeredQuestions: [
							{question: {
								ConstrainedText:{
									questionText: 'Lomonosov sent me to Sweden to inspect the route.',
									defaultText: 'ok',
									regex: format}},
							 match: {Exact: 'ok'}},
							{question: {
								ConstrainedText:{
									questionText: 'Derutra asked me to find as steamer whose dimensions allowed through the locks.',
									defaultText: 'ok',
									regex: format}},
							 match: {Inexact: '^[^o].*$'}}
						],
						percentCorrect: 100})						
			});
}

app.post('/api/turkit', function (req, res) {
	var sents = req.body.sentences ? req.body.sentences : [];

	for (var i = 0; i < Math.min(sents.length, 5); i++) {
		console.log("PUT");
		console.log('sample',i, sents[i]);
	}
	
	
	var estCost = sents.join(',').length * DOLLARS_PER_LETTER * NUM_READERS;
	if (estCost >  MAX_DOLLARS_BATCH) {	
		console.error('Too big a job!');
		console.error('Estimated cost', estCost);
		console.error('Max cost', MAX_DOLLARS_BATCH);
		console.error('Characters', sents.join(',').length);
		console.error('Readers', NUM_READERS);
		res.send({error: 'Estimated cost of $' + estCost +  ' bigger than cap of $' + MAX_DOLLARS_BATCH});
		return;
	} else {
		console.log("Estatimated cost: $" + estCost + " for " + sents.join(',').length + " characters");
	}
	
	
	var batchID = req.body.batchID;
	var jobID = makeBatch(sents, batchID);
	res.send(JSON.stringify({jobID: jobID}));
	console.log('got sents', sents);
	
	function buildUrl (sent) {
		return 'http://vivam.us/human/ask?' + askAsText(sent);
	}	
	
	sents.map(function (sent, idx) {
		console.log('asking for', sent);
		var url = buildUrl(sent);
		console.log('url', url);	
		if (DEBUG) {
			console.log("Fake PUT");
			console.log(url);
		} else {
			request.put(url, function (error, response, body) { /* whatevs */  });
		}
		fetchGet(url, sent, idx, jobID);	
	});

});

app.listen(3000);
console.log('Listening on port 3000');
