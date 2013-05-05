/***

About: Animated visualization of work stealing

	Animated visualization of a work stealer partitioning a webpage as part of a top-down (parallel preorder) tree traversal.

Usage:

	Option 1: copy the following into a webpage or jsconsole and then hit start
	
	  var s = document.createElement("script"); 
	  s.type = 'text/javascript'; 
	  s.src = 'https://raw.github.com/lmeyerov/devnull/master/one-offs/worksteal.js'; 
	  document.getElementsByTagName('head')[0].appendChild(s);
	  
	
	Option 2: copy this file into a webpage or jsconsole and then hit start  

***/

var wsim = {
	ms: 100,
	nThreads: 6,
	seqBlock: 10,
	fontSize: "14px",
	paddingSize: "5px",
	marginSize: "5px",
	borderWidth: "5px"
};
wsim.colors =
		(function () {
		switch (wsim.nThreads) {
			case 1:
				return [[255, 0, 0]];
			case 2:
				return [[255, 0, 0], [0, 255, 255]];
			case 3:
				return [[255, 0, 0], [0, 255, 0], [0, 0, 255]];
			case 4:
				return [[153, 51, 0], [255, 0, 0], [0, 255, 0], [0, 0, 255]];
			case 5:
				return [[0, 255, 255], [255, 255, 0], [255, 0, 0], [0, 255, 0], [0, 0, 255]];
			case 6:
				return [[0, 255, 255], [255, 255, 0], [255, 0, 255], [255, 0, 0], [0, 255, 0], [0, 0, 255]];
			default:
				throw "Unsupported number of colors, set nThreads = 1-6";
		} }());

/** 

Stealer design:

	1. Do 10 * nThreads initial nodes as sequential BFS

	2. Each thread goes DFS until completion
		Try to do 0.1% of the tree in each time step without stealing.
		Randomly steal: smallest of 1/3rd of local task queue, or 1% * nThreads
		

**/


(function (wsim) {
////////////////////////////////////////
	
	var goodTagsArr = ["DIV","UL","OL","LI","P","SPAN","FORM","INPUT","TEXTAREA", "TABLE", "TR", "TD", "TBODY", "TD", "MENU", "LABEL", "BLOCKQUOTE", "H1", "H2", "H3", "H4", "H5", "BUTTON", "B", "A", "FOOTER", "STRONG", "BR", "IMG", "FIELDSET", "I", "SMALL", "TH", "COL", "IFRAME", "THEAD", "COLGROUP", "TFOOT", "EM", "LEGEND", "CITE", "WBR", "HR", "HEADER", "ARTICLE", "ASIDE", "TIME"];
	var goodTags = {};
	goodTagsArr.forEach(function (tagName) { goodTags[tagName] = true; });
	
	
	var header = wsim.header;
	if (!header) {
		wsim.header = document.createElement("div");
		header = wsim.header;

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
	var maxDepth = wsim.maxDepth;
	if (!wsim.maxDepth) {
		wsim.maxDepth = computeTreeDepth(document);
		maxDepth = wsim.maxDepth;
	}
	
	function depthToOpacity(depth) {
		return Math.min((1.0) / (3 * maxDepth), 1);
	}
	
	
	function computeTreeSizeAndRecolor(o, depth) {
		var res = o.className == 'cursor' ? 0 : 1;
		if (o.style && o.className != 'cursor') {
			o.style.backgroundColor = "rgba(0, 0, 0, " + depthToOpacity(1) + ")";
			o.style.color = "#000";
			o.style.borderColor = "transparent";
			o.style.padding = wsim.paddingSize;
	//		o.style.margin = wsim.marginSize;
		}
		var children = Array.prototype.slice.apply(o.childNodes);
		if (o.childNodes)
			for (var i = 0; i < children.length; i++) 
				res += computeTreeSizeAndRecolor(children[i], depth + 1);
		return res;
	}
	//document.body.style.backgroundColor = "rgb(" + wsim.colors[wsim.colors.length - 1].toString() + ")";
	var treeSize = computeTreeSizeAndRecolor(document, 0);
	var traversed = 0; //incremented by various steppers
	console.log('maxDepth', maxDepth);
	
	var progressBar = wsim.progressBar;
	if (!progressBar) {
		wsim.progressBar = document.createElement("span");
		progressBar = wsim.progressBar;
		
		progressBar.style.color = "#FFF";
		progressBar.style.backgroundColor = '#000';
		progressBar.style.fontSize = wsim.fontSize;
		progressBar.style.padding = wsim.paddingSize;
		progressBar.className = 'cursor';
		header.appendChild(progressBar);
	}
	function updateProgressBar () {
		progressBar.innerHTML = "" + Math.round(100 * (traversed / (treeSize + 1))) + "%";
	}
	updateProgressBar();
	
	
	var cursors = wsim.cursors;
	if (!wsim.cursors) {
		wsim.cursors = [];
		cursors = wsim.cursors;
	}
	
	var threads = wsim.threads;
	if (!wsim.threads) {
		wsim.threads = [];
		threads = wsim.threads;
	}
	
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
			status.style.padding = wsim.paddingSize;
			status.style.backgroundColor="rgba(" + wsim.colors[i][0] + "," + wsim.colors[i][1] + "," + wsim.colors[i][2] + ",1)";
			status.style.fontSize = wsim.fontSize;
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
			cursor.style.backgroundColor="rgba(" + wsim.colors[i][0] + "," + wsim.colors[i][1] + "," + wsim.colors[i][2] + ",1)";
			cursor.style.border="1px solid black";
			cursor.style.position="absolute";
		//	cursor.style.top = "3em";
			cursor.style.color = "white";
			cursor.style.fontSize = wsim.fontSize;
			cursor.style.padding= wsim.paddingSize;
			cursor.className = "cursor";
			cursor.style.display = "inline-block";
			cursor.style.width="10em";		
			cursor.innerHTML = "Thread " + i;
		}
	
		function claim (o) {
			if (o.style && o.className != "cursor") {
				o.style.border= wsim.borderWidth + " dashed rgba(" + wsim.colors[i][0] + "," + wsim.colors[i][1] + "," + wsim.colors[i][2] + ",1)";	
				o.style.margin = wsim.marginSize;
			}
		}
		function drawComputePre (current) {
					if (!current || !current.style) return;
					current.style.backgroundColor="rgba(" + wsim.colors[i][0] + "," + wsim.colors[i][1] + "," + wsim.colors[i][2] + ",1)";
	//				current.style.border="1px solid rgba(" + wsim.colors[i][0] + "," + wsim.colors[i][1] + "," + wsim.colors[i][2] + ",0.2)";
	//				current.style.padding= wsim.paddingSize;
		}
		function drawComputePost (current) {
				if (!current || !current.style) return;
				if (current.style) {
					current.style.backgroundColor="rgba(" + wsim.colors[i][0] + "," + wsim.colors[i][1] + "," + wsim.colors[i][2] + ",0.05)";
	//				current.style.border="1px solid rgba(" + wsim.colors[i][0] + "," + wsim.colors[i][1] + "," + wsim.colors[i][2] + ",0.2)";
	//				current.style.padding= wsim.paddingSize;
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
	//			console.warn("skip",  Math.round(0.01 * treeSize / (wsim.nThreads + 0.0)));
	//			for (var j = 0; j < wsim.seqBlock; j++)
				for (var j = 0; j < Math.round(0.001 * treeSize / (wsim.nThreads + 0.0)); j++) 
					if (res.stepper(function () {}, isDfs)) {
						steps++
					} else break;
				return steps + res.stepper(take, isDfs);
			},
			give: function () { 
				if (stack.length > 0) {
					var res = stack.splice(0,Math.min(Math.round(stack.length/3), 1 + Math.round(treeSize * 0.01 / wsim.nThreads)));
					gave++;
					updateStatus();
					return res;
				}
			}	
		};
		return res;
	}
	
	
	if (threads.length > 0) threads.forEach(function (t) { t.reset(); });
	else for (var i = 0; i < wsim.nThreads; i++) threads.push(makeThread(i));
	
	var seed = 0;
	var taker = function (giveTo) {	
		if (traversed > (0.95 * treeSize)) return;
	
	//	return threads[(giveTo + 1) % wsim.nThreads].give();
		var start = Math.round((wsim.nThreads * ('0.'+Math.sin(seed++).toString().substr(6)) * 100));
		for (var i = 0; i < wsim.nThreads; i++) {
	//		var steal = threads[(giveTo + 1 + i) % wsim.nThreads].give();
			var steal = threads[(start + i) % wsim.nThreads].give();
			if (steal) return steal;
		}
	}
	
	var step = 0;
	function doStep() {
		var progress = 0;
		for (var i = 0; i < wsim.nThreads; i++) progress = Math.max(progress, threads[i].step(taker, true));
		updateProgressBar();
		if (!progress) {
			console.log('done', step, 'global steps for ' + treeSize + ' nodes');
			console.log('simulated speedup: ' + Math.round((10 * (treeSize + 0.0) / step))/10.0 + 'x on ' + wsim.nThreads + ' threads');
	//		console.log(' vs ' + (Math.round(10 * (treeSize - wsim.seqBlock * wsim.nThreads) / (step - wsim.seqBlock * wsim.nThreads)) / 10.0) + 'x');
			return;
		} else {
			step += progress;
			setTimeout(doStep, wsim.ms);	
		}
	}
	
	function go () {
		while (true) {
			var progress = threads[0].step(function () {}, false);
			step += progress;
			if (!progress || (step > wsim.seqBlock * wsim.nThreads)) break;
		}
		setTimeout(doStep, wsim.ms);
	}
	
	progressBar.innerHTML = "<input style='font-size: " + wsim.fontSize + "' type=button value='start' />";
	progressBar.addEventListener('click', go);

////////////////////////////////////////

}(wsim));