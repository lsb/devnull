var ms = 100; //between time steps
var nThreads = 6;
var colors;

var seqBlock = 10;

/** 

Stealer design:

	1. Do 10 * nThreads initial nodes as sequential BFS

	2. Each thread goes DFS until completion
		Try to do 0.1% of the tree in each time step without stealing.
		Randomly steal: smallest of 1/3rd of local task queue, or 1% * nThreads
		

**/



switch (nThreads) {
	case 1:
		colors = [[255, 0, 0]];
		break;
	case 2:
		colors = [[255, 0, 0], [0, 255, 255]];
		break;
	case 3:
		colors = [[255, 0, 0], [0, 255, 0], [0, 0, 255]];
		break;
	case 4:
		colors = [[153, 51, 0], [255, 0, 0], [0, 255, 0], [0, 0, 255]];
		break;
	case 5:
		colors = [[0, 255, 255], [255, 255, 0], [255, 0, 0], [0, 255, 0], [0, 0, 255]];
		break;
	case 6:
		colors = [[0, 255, 255], [255, 255, 0], [255, 0, 255], [255, 0, 0], [0, 255, 0], [0, 0, 255]];
		break;
	default:
		throw "Unsupported number of colors, set nThreads = 1-6";
}


var fontSize = "14px";
var paddingSize = "5px";

var marginSize = "5px";
var borderWidth = "5px";

var goodTagsArr = ["DIV","UL","OL","LI","P","SPAN","FORM","INPUT","TEXTAREA", "TABLE", "TR", "TD", "TBODY", "TD", "MENU", "LABEL", "BLOCKQUOTE", "H1", "H2", "H3", "H4", "H5", "BUTTON", "B", "A", "FOOTER", "STRONG", "BR", "IMG", "FIELDSET", "I", "SMALL", "TH", "COL", "IFRAME", "THEAD", "COLGROUP", "TFOOT", "EM", "LEGEND", "CITE", "WBR"];
var goodTags = {};
goodTagsArr.forEach(function (tagName) { goodTags[tagName] = true; });


if (!window.header) {
	window.header = document.createElement("div");
	header.style.backgroundColor = "#000";
	header.style.position = "fixed";
	header.style.top = "1em";
	header.style.left = "1em";
	header.style.zIndex = "100000";
	header.style.display = 'block';
	header.className = 'cursor';
	var body = document.getElementsByTagName("body")[0];
	body.insertBefore(header, body.childNodes[0]);
}


function computeTreeDepth(o) {
	var childDepths = o.childNodes ? Array.prototype.slice.apply(o.childNodes).map(computeTreeDepth) : [];
	var childMax = childDepths.reduce(function (a, b) { return Math.max(a,b); }, 0);
	return childMax + (o.className == 'cursor' ? 0 : 1);
}
var maxDepth = maxDepth ? maxDepth : computeTreeDepth(document);

function depthToOpacity(depth) {
	return Math.min((1.0) / (3 * maxDepth), 1);
}


function computeTreeSize(o, depth) {
	var res = o.className == 'cursor' ? 0 : 1;
	if (o.style && o.className != 'cursor') {
		o.style.backgroundColor = "rgba(0, 0, 0, " + depthToOpacity(1) + ")";
		o.style.color = "#000";
		o.style.borderColor = "transparent";
		o.style.padding = paddingSize;
//		o.style.margin = marginSize;
	}
	var children = Array.prototype.slice.apply(o.childNodes);
	if (o.childNodes)
		for (var i = 0; i < children.length; i++) 
			res += computeTreeSize(children[i], depth + 1);
	return res;
}
//document.body.style.backgroundColor = "rgb(" + colors[colors.length - 1].toString() + ")";
var treeSize = computeTreeSize(document, 0); //do to refresh colors
var traversed = 0; //incremented by various steppers
console.log('maxDepth', maxDepth);

if (!window.progressBar) {
	window.progressBar = document.createElement("span");
	progressBar.style.color = "#FFF";
	progressBar.style.backgroundColor = '#000';
	progressBar.style.fontSize = fontSize;
	progressBar.style.padding = paddingSize;
	progressBar.className = 'cursor';
	header.appendChild(progressBar);
}
function updateProgressBar () {
	progressBar.innerHTML = "" + Math.round(100 * (traversed / (treeSize + 1))) + "%";
}
updateProgressBar();


if (!window.cursors) window.cursors = [];

if (!window.threads) window.threads = [];

function makeThread (i) {

	var took, gave, steps, stack;
	
	function reset () {
		took = 0;
		gave = 0;
		steps = 0;
		stack = i == 0 ? [document] : [];	
	}
	reset();
	

	var status;
	if (threads.length > i) status = threads[i].status;
	else {
		status = document.createElement("span");
		status.className = "cursor";
		status.style.display = "inline-block";
		status.style.margin = "1em";
		status.style.padding = paddingSize;
		status.style.backgroundColor="rgba(" + colors[i][0] + "," + colors[i][1] + "," + colors[i][2] + ",1)";
		status.style.fontSize = fontSize;
		header.appendChild(status);
	}
	function idleStatus () { status.style.border="5px dotted red"; }
	function hotStatus () { status.style.border="5px solid white"; }
	function updateStatus () {
		var val = Math.round(100 * (took / (1.0 + steps)))
		status.innerHTML = "T" + i + ", steal: " + val + '%';
	}
	updateStatus();
	
	var cursor;
	if (threads.length > i) cursor = threads[i].cursor;
	else {
		cursor = document.createElement("span");
		cursor.style.backgroundColor="rgba(" + colors[i][0] + "," + colors[i][1] + "," + colors[i][2] + ",1)";
		cursor.style.border="1px solid black";
		cursor.style.position="absolute";
	//	cursor.style.top = "3em";
		cursor.style.color = "white";
		cursor.style.fontSize = fontSize;
		cursor.style.padding= paddingSize;
		cursor.className = "cursor";
		cursor.style.display = "inline-block";
		cursor.style.width="10em";		
		cursor.innerHTML = "Thread " + i;
	}

	function claim (o) {
		if (o.style && o.className != "cursor") {
			o.style.border= borderWidth + " dashed rgba(" + colors[i][0] + "," + colors[i][1] + "," + colors[i][2] + ",1)";	
			o.style.margin = marginSize;
		}
	}
	function drawComputePre (current) {
				if (!current || !current.style) return;
				current.style.backgroundColor="rgba(" + colors[i][0] + "," + colors[i][1] + "," + colors[i][2] + ",1)";
//				current.style.border="1px solid rgba(" + colors[i][0] + "," + colors[i][1] + "," + colors[i][2] + ",0.2)";
//				current.style.padding= paddingSize;
	}
	function drawComputePost (current) {
			if (!current || !current.style) return;
			if (current.style) {
				current.style.backgroundColor="rgba(" + colors[i][0] + "," + colors[i][1] + "," + colors[i][2] + ",0.05)";
//				current.style.border="1px solid rgba(" + colors[i][0] + "," + colors[i][1] + "," + colors[i][2] + ",0.2)";
//				current.style.padding= paddingSize;
			}	
	}
	var current = null;
	var res = {
		cursor: cursor,
		status: status,
		reset: reset,
		stepper: function (take, isDfs) {
			drawComputePost(current);
			steps++;
			current = stack.length > 0 ? (isDfs ? stack.pop() : stack.shift()) : null;
			if (!current) {
				var steal = take(i);				
				if (steal && steal.length > 0) {
					steal.forEach(claim);
					stack = steal;
					current = stack.pop();
					took++;
					updateStatus();
				} else {
					idleStatus();
					return 0;
				}
			}
			hotStatus();
			
			traversed++;
			try { current.appendChild(cursor); } catch (e) {}
			drawComputePre(current);
			var children = Array.prototype.slice.apply(current.childNodes)
				.filter(function (o) { return o.className != "cursor"; });
			if (isDfs) children.reverse(); //pop = go down leftmost
			stack = stack.concat(children); //maintain order
			if (current && current.tagName && !goodTags[current.tagName]) {
				console.log("do not visualize tag", current.tagName);
				steps--;
				return res.stepper(take, isDfs); //try again
			} else return 1;
		},
		step: function (take, isDfs) {
			if (i == 0) header.style.backgroundColor = "#000";
			var steps = 0;
//			console.warn("skip",  Math.round(0.01 * treeSize / (nThreads + 0.0)));
//			for (var j = 0; j < seqBlock; j++)
			for (var j = 0; j < Math.round(0.001 * treeSize / (nThreads + 0.0)); j++) 
				if (res.stepper(function () {}, isDfs)) {
					steps++
				} else break;
			return steps + res.stepper(take, isDfs);
		},
		give: function () { 
			if (stack.length > 0) {
				var res = stack.splice(0,Math.min(Math.round(stack.length/3), 1 + Math.round(treeSize * 0.01 / nThreads)));
				gave++;
				updateStatus();
				return res;
			}
		}	
	};
	return res;
}


if (threads.length > 0) threads.forEach(function (t) { t.reset(); });
else for (var i = 0; i < nThreads; i++) threads.push(makeThread(i));

var seed = 0;
var taker = function (giveTo) {	
	if (traversed > (0.95 * treeSize)) return;

//	return threads[(giveTo + 1) % nThreads].give();
	var start = Math.round((nThreads * ('0.'+Math.sin(seed++).toString().substr(6)) * 100));
	for (var i = 0; i < nThreads; i++) {
//		var steal = threads[(giveTo + 1 + i) % nThreads].give();
		var steal = threads[(start + i) % nThreads].give();
		if (steal) return steal;
	}
}

var step = 0;
function doStep() {
	var progress = 0;
	for (var i = 0; i < nThreads; i++) progress = Math.max(progress, threads[i].step(taker, true));
	updateProgressBar();
	if (!progress) {
		console.log('done', step, 'global steps for ' + treeSize + ' nodes');
		console.log('simulated speedup: ' + Math.round((10 * (treeSize + 0.0) / step))/10.0 + 'x on ' + nThreads + ' threads');
//		console.log(' vs ' + (Math.round(10 * (treeSize - seqBlock * nThreads) / (step - seqBlock * nThreads)) / 10.0) + 'x');
		return;
	} else {
		step += progress;
		setTimeout(doStep, ms);	
	}
}

function go () {
	while (true) {
		var progress = threads[0].step(function () {}, false);
		step += progress;
		if (!progress || (step > seqBlock * nThreads)) break;
	}
	setTimeout(doStep, ms);
}

progressBar.innerHTML = "<input style='font-size: " + fontSize + "' type=button value='start' />";
progressBar.addEventListener('click', go);