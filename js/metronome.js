$(function() {

	var audioContext = null;
	var isPlaying = false;
	var currentNote; // What note is currently last scheduled?
	var lookahead = 25.0; // How frequently to call scheduling function (in
	// milliseconds)
	var scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)
	var nextNoteTime = 0.0; // when the next note is due.
	var noteLength = 0.04; // length of "beep" (in seconds)
	var canvas, // the canvas element
	canvasContext; // canvasContext is the canvas' context 2D
	var lastNoteDrawn = -1; // the last "box" we drew on the screen
	var notesInQueue = []; // the notes that have been put into the web audio,
	// and may or may not have played yet. {note, time}
	var timerWorker = null; // The Web Worker used to fire timer messages
	var canvasSize = 200; // the size of the area where the circle is draw.
	var radius = 70; // define the size of the circle
	var drawDelay = 0;
	var s1, s2, p1, p2;

	// set the requestAnimationFrame API
	window.requestAnimFrame = (function() {
		return window.requestAnimationFrame
				|| window.webkitRequestAnimationFrame
				|| window.mozRequestAnimationFrame
				|| window.oRequestAnimationFrame
				|| window.msRequestAnimationFrame || function(callback) {
					window.setTimeout(callback, 40);
				};
	})();

	function nextNote() {
		nextNoteTime += 1; // Add beat length to last beat time
		currentNote++; // Advance the beat number, wrap to zero, just to
		// control the loop
		if (currentNote == 2) {
			currentNote = 0;
		}
	}

	function scheduleNote(beatNumber, time) {
		// push the note on the queue, even if we're not playing.
		if (isPlaying) {
			notesInQueue.push({
				note : beatNumber,
				time : time
			});
			// create an oscillator
			var osc = audioContext.createOscillator();
			osc.connect(audioContext.destination);
			osc.frequency.value = 1000.0;
			async(function() {draw()}, null);
			osc.start(time);			
			s1 = Date.now();
			console.log("START SOUND: " + s1);
			osc.stop(time + noteLength);
		}
	}

	function scheduler() {
		// while there are notes that will need to play before the next
		// interval,
		// schedule them and advance the pointer.
		if (isPlaying) {
			while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
				scheduleNote(currentNote, nextNoteTime);
				nextNote();
			}
		}
	}

	function resetCanvas(e) {
		// resize the canvas - but remember - this clears the canvas too.
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		// make sure we scroll to the top left.
		window.scrollTo(0, 0);
	}
	function clearCanvas(context, canvas) {
		context.clearRect(0, 0, canvas.width, canvas.height);
		var w = canvas.width;
		canvas.width = 1;
		canvas.width = w;
	}

	function drawCircle() {
		var centerX = 100;
		var centerY = 100;
		canvasContext.beginPath();
		canvasContext.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
		canvasContext.fillStyle = 'red';
		canvasContext.fill();
		canvasContext.lineWidth = 5;
		canvasContext.strokeStyle = 'red';
		canvasContext.stroke();
		s2 = Date.now();
		console.log("DRAW CIRCLE: "+s2);
		console.log("DIFF: "+(s2-s1));
	}

	function cleanCircle() {
		canvasContext.clearRect(0, 0, canvas.width, canvas.height);
		p1 = Date.now();
		console.log("CLEAN: "+(p1-s2));
	}

	function draw() {
		drawCircle();
		setTimeout(cleanCircle, (noteLength * 1000));
	}

	function init() {
		var container = document.getElementById('panel');
		canvas = document.createElement('canvas');
		canvasContext = canvas.getContext('2d');
		canvas.width = canvasSize;
		canvas.height = canvasSize;
		container.appendChild(canvas);
		canvasContext.strokeStyle = "#ffffff";
		canvasContext.lineWidth = 2;
		audioContext = new AudioContext();
		window.onorientationchange = resetCanvas;
		window.onresize = resetCanvas;
		timerWorker = new Worker("js/metronomeworker.js");
		timerWorker.onmessage = function(e) {
			if (e.data == "tick") {
				scheduler();
			} else
				console.log("message: " + e.data);
		};
		timerWorker.postMessage({
			"interval" : lookahead
		});
		$("#mainButton").text("play");
	}
	function trigger() { 
		if (isPlaying) { // start playing
			document.getElementById("mainButton").className = "";
			document.getElementById("mainButton").className = "stop";
			$("#mainButton").text("stop");
			currentNote = 0;
			nextNoteTime = audioContext.currentTime;
			timerWorker.postMessage("start");
		} else {
			document.getElementById("mainButton").className = "";
			document.getElementById("mainButton").className = "play";
			$("#mainButton").text("play");
			timerWorker.postMessage("stop");
		}
		}

	function publish() {
	      var args = (1 <= arguments.length) ? Array.prototype.slice.call(arguments, 0) : [];
	      console.group('publish ' + args[0]);
	      $.observer.publish.apply($.observer, args);
	      console.groupEnd();
	    }

    function async(your_function, callback) {
        setTimeout(function() {
            your_function();
            if (callback) {callback();}
        }, drawDelay);
    }
    
	$("#mainButton").click(function() {
		isPlaying = !isPlaying;
		trigger();		
	});
	init();
});
