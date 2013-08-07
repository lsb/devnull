var DEBUG = false;
var MAX_DOLLARS_BATCH = 7.50; 
var DOLLARS_PER_LETTER = 0.00007;
var NUM_READERS = 3;

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
function updateBatch(jobID, i, resultRaw) {
	var result = 
		resultRaw
			.filter(function (o) { 
		  		return o.hasOwnProperty('Pass') && o.Pass.hasOwnProperty('value'); })
		  	.map(function (o) { return o.Pass.value; });

	var time = new Date().getTime();
	batches[jobID][i] = result;
	batches[jobID].count++;
	batches[jobID].ticks.push({i: i, time: time});
	batches[jobID].lastTime = time;
}

function fetchGet (url, sent, sentenceI, jobID, cb) {

	if (DEBUG) {
		if (Math.random() > 0.5) {
			console.log('GET fake delay', sent);
			setTimeout(
				function () { fetchGet(url, sent, sentenceI, jobID, cb); }, 
				Math.random() * 3 * 1000);
		} else {
			var nonce = Math.random();
			function toRec(v) { return {Pass: {value: v}}; }
			var out = 
				Math.random() > 0.5 ?
					['ok', 'ok', '<or> ' + nonce + ' asdf asdf']
				: Math.random() > 0.5 ?
					['<is> ' + nonce + ' ha hah a long description goes here ok', 
					 '<the> ' + nonce + ' another long description goes here asdf asdf asdf',
					 '<the> ' + nonce + ' short des',
					 '<if> ' + nonce + ' this sentence is going to be long and take space too due to its redundancy']
				: ['ok','ok','ok'];
			out = out.map(toRec);
			console.log('GET fake result', out);
			updateBatch(jobID, sentenceI, out);			
			cb(out);
		}	
		return;
	}

	//////////////////////////////////////////

	request(url, function (err, response, body) {
		if (!response) {
			console.log('no response (offline?), try again in ' + (delay / 1000) + ' seconds...');
			setTimeout(function () { fetchGet(url, sent, sentenceI, jobID, cb); }, delay);
		} else if (response.statusCode == 404) {
			console.log('404, try again in ' + (delay / 1000) + ' seconds...');
			setTimeout(function () { fetchGet(url, sent, sentenceI, jobID, cb); }, delay);
		} else if (response.statusCode == 412) {
			console.log('412, ERROR: need to do a PUT before a GET');
			//die
			//TODO: tell client?
		} else if (response.statusCode == 502) {
			console.log('502 (down), try again in ' + (delay / 1000) + ' seconds...'); 
			setTimeout(function () { fetchGet(url, sent, sentenceI, jobID, cb); }, delay);
		} else {
			try {
				var out = JSON.parse(body);
				console.log('Result');
				console.log(body, sent);
				updateBatch(jobID, sentenceI, out);
				cb(out);
			} catch (exn) {
				console.log('error', err);
				console.log('response', response);
				console.log('body', body);
				console.log('exn', exn);
			}
		}
	});
}



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

function askAsText (sent, batchID) {

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
				uniqueAskId: '' + batchID,
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



function askAsTextStyle (sent, batchID) {

	var instructions = 
	  'Proofread: describe style mistakes in these sentences\n'
	+ [
	  'Is the phrasing awkward or unclear? Does it feel clunky?',
	  'Describe each issue on a new line (a sentence may have multiple problems).',
	  'Preface each issue by a key word in it and then what is the issue, such as "<hellllo> spelling mistake".',
	  'If there are no issues, leave the box as "ok".',
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
	  ' I am not, indeed, sure whether it is not true to say that the Milton who once seemed not unlike a seventeenth-century Shelley had not become, out of an experience ever more bitter in each year, more alien [sic] to the founder of that Jesuit sect which nothing could induce him to tolerate.',
	  '--- Answer -----',
	  "<not> The negatives are confusing",
	  '<,> Difficult to follow and communicating too many ideas',
////////////////
	  '==========================',
	  '',
	  'If you have suggestions on how to improve the design of this HIT, please email LMeyerov+mt@gmail.com .',
	  'Thank you for helping!'
	].join('\n');

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
				uniqueAskId: '' + batchID,
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




function makePut(putUrl, asker) {
	app.post('/api/' + putUrl, function (req, res) {
		var sents = req.body.sentences ? req.body.sentences : [];
	
		console.log('PUT batchID', req.body.batchID);
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
		
		sents.map(function (sent, idx) {
			console.log('asking for', sent);
			var url = 'http://vivam.us/human/ask?' + asker(sent, batchID);
			console.log('url', url);	
			if (DEBUG) {
				console.log("Fake PUT");
				console.log(url);
			} else {
				request.put(url, function (error, response, body) { /* whatevs */  });
			}
			fetchGet(url, sent, idx, jobID, 
				function (answers) {
					/* noop */
				}); 
		});
	
	});
} 

function makeGet(getUrl) {
	app.get('/api/' + getUrl, function (req, res) {
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
}

makePut('turkit', askAsText);
makeGet('improvements');


makePut('turkitStyle', askAsTextStyle);
makeGet('improvementsStyle');


app.listen(3000);
console.log('Listening on port 3000');
