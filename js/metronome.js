var audioContext = null;
var isPlaying = false;      // Are we currently playing?
var startTime;              // The start time of the entire sequence.
var currentNote;        // What note is currently last scheduled?
var lookahead = 25.0;       // How frequently to call scheduling function 
                            //(in milliseconds)
var scheduleAheadTime = 1.1;    // How far ahead to schedule audio (sec)
                            // This is calculated from lookahead, and overlaps 
                            // with next interval (in case the timer is late)
var nextNoteTime = 0.0;     // when the next note is due.
var noteResolution = 0;     // 0 == 16th, 1 == 8th, 2 == quarter note
var noteLength = 0.54;      // length of "beep" (in seconds)
var canvas,                 // the canvas element
    canvasContext;          // canvasContext is the canvas' context 2D
var lastNoteDrawn = -1; // the last "box" we drew on the screen
var notesInQueue = [];      // the notes that have been put into the web audio,
                            // and may or may not have played yet. {note, time}
var timerWorker = null;     // The Web Worker used to fire timer messages
var c1,c2;
var first = true;

// First, let's shim the requestAnimationFrame API, with a setTimeout fallback
window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function( callback ){
        window.setTimeout(callback,30);
    };
})();

function nextNote() {
    // Advance current note and time by a 16th note...
  //  var secondsPerBeat = 60.0 / tempo;    // Notice this picks up the CURRENT 
                                          // tempo value to calculate beat length.
    nextNoteTime += 1;    // Add beat length to last beat time
    currentNote++;    // Advance the beat number, wrap to zero, justo to control the loop
    if (currentNote == 16) {
        currentNote = 0;
    }
}

function scheduleNote( beatNumber, time ) {
	
    // push the note on the queue, even if we're not playing.
	if(isPlaying){
		notesInQueue.push( { note: beatNumber, time: time } );
    // create an oscillator
    	var osc = audioContext.createOscillator();
    	osc.connect( audioContext.destination );
    	osc.frequency.value = 880.0;
    	console.log("start sound");
    	osc.start( time );
    	osc.stop( time + noteLength );
    	console.log("stop sound");
	}
}

function scheduler() {
    // while there are notes that will need to play before the next interval, 
    // schedule them and advance the pointer.
	if(isPlaying){
	    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime ) {
	        scheduleNote( currentNote, nextNoteTime );
	        nextNote();
	    }
    }
}

function play() {
    isPlaying = !isPlaying;

    if (isPlaying) { // start playing
        currentNote = 0;
        nextNoteTime = audioContext.currentTime;
        timerWorker.postMessage("start");
        draw();
        return "stop";
    } else {
        timerWorker.postMessage("stop");
        return "play";
    }
}

function resetCanvas (e) {
    // resize the canvas - but remember - this clears the canvas too.
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    //make sure we scroll to the top left.
    window.scrollTo(0,0); 
}
function clearCanvas(context, canvas) {
	  context.clearRect(0, 0, canvas.width, canvas.height);
	  var w = canvas.width;
	  canvas.width = 1;
	  canvas.width = w;
	}


function drawCircle(){
   var centerX = 100;
   var centerY = 75;
   var radius = 70;
   canvasContext.beginPath();
   canvasContext.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
   canvasContext.fillStyle = 'red';
   canvasContext.fill();
   canvasContext.lineWidth = 5;
   canvasContext.strokeStyle = 'red';
   canvasContext.stroke();
}

function cleanCircle(){
	canvasContext.clearRect(0,0,canvas.width, canvas.height); 
}

function draw() {
//	canvasContext.clearRect(0,0,canvas.width, canvas.height);
//	while(c2-c1<=noteLength){
//		c2 = audioContext.currentTime;
//	}

//	canvasContext.clearRect(0,0,canvas.width, canvas.height); 
		if(isPlaying){
			var currentNote = lastNoteDrawn;
		    var currentTime = audioContext.currentTime;
		   // while (notesInQueue.length && currentTime-notesInQueue[0].time>noteLength) {
		    while (notesInQueue.length && notesInQueue[0].time<currentTime) {
		        currentNote = notesInQueue[0].note;
		        c1 = notesInQueue[0].time;
		        notesInQueue.splice(0,1);   // remove note from queue
		       
		    }
		    // We only need to draw if the note has moved.
		    if (lastNoteDrawn != currentNote) {
		    	c1 = audioContext.currentTime;
		    	drawCircle();
	            setTimeout(cleanCircle,noteLength*1000);
//		        var x = Math.floor( canvas.width / 18 );
//		        var centerX = 100;
//		        var centerY = 75;
//		        var radius = 70;
//		        canvasContext.beginPath();
//		        canvasContext.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
//		        canvasContext.fillStyle = 'red';
//		        canvasContext.fill();
//		        canvasContext.lineWidth = 5;
//		        canvasContext.strokeStyle = 'red';
//		        canvasContext.stroke();
		     
		        lastNoteDrawn = currentNote;
		        c2 = audioContext.currentTime;
		    }
		    
		    requestAnimFrame(draw);
		    
		    }
//	console.log("espero:  "+(c2-c1));
	
}

function init(){
    var container = document.createElement( 'div' );
    first = true;
    container.className = "container";
    canvas = document.createElement( 'canvas' );
    canvasContext = canvas.getContext( '2d' );
    canvas.width = 200; 
    canvas.height = 200; 
    document.body.appendChild( container );
    container.appendChild(canvas);    
    canvasContext.strokeStyle = "#ffffff";
    canvasContext.lineWidth = 2;
    audioContext = new AudioContext();
    window.onorientationchange = resetCanvas;
    window.onresize = resetCanvas;

  //  requestAnimFrame(draw);    // start the drawing loop.
    timerWorker = new Worker("js/metronomeworker.js");
    timerWorker.onmessage = function(e) {
        if (e.data == "tick") {
        	requestAnimFrame(draw);
            scheduler();
        }
        else
            console.log("message: " + e.data);
    };
    timerWorker.postMessage({"interval":lookahead});
}

window.addEventListener("load", init );


//
//var audioContext = null;
//var isPlaying = false;      // Are we currently playing?
//var startTime;              // The start time of the entire sequence.
//var current16thNote;        // What note is currently last scheduled?
//var tempo = 13.0;          // tempo (in beats per minute)
//var lookahead = 25.0;       // How frequently to call scheduling function 
//                            //(in milliseconds)
//var scheduleAheadTime = 0.1;    // How far ahead to schedule audio (sec)
//                            // This is calculated from lookahead, and overlaps 
//                            // with next interval (in case the timer is late)
//var nextNoteTime = 0.0;     // when the next note is due.
//var noteResolution = 0;     // 0 == 16th, 1 == 8th, 2 == quarter note
//var noteLength = 0.45;      // length of "beep" (in seconds)
//var canvas,                 // the canvas element
//    canvasContext;          // canvasContext is the canvas' context 2D
//var last16thNoteDrawn = -1; // the last "box" we drew on the screen
//var notesInQueue = [];      // the notes that have been put into the web audio,
//                            // and may or may not have played yet. {note, time}
//var timerWorker = null;     // The Web Worker used to fire timer messages
//
//
//// First, let's shim the requestAnimationFrame API, with a setTimeout fallback
//window.requestAnimFrame = (function(){
//    return  window.requestAnimationFrame ||
//    window.webkitRequestAnimationFrame ||
//    window.mozRequestAnimationFrame ||
//    window.oRequestAnimationFrame ||
//    window.msRequestAnimationFrame ||
//    function( callback ){
//        window.setTimeout(callback, 1000 / 60);
//    };
//})();
//
//function nextNote() {
//    // Advance current note and time by a 16th note...
//    var secondsPerBeat = 60.0 / tempo;    // Notice this picks up the CURRENT 
//                                          // tempo value to calculate beat length.
//    nextNoteTime += 0.25 * secondsPerBeat;    // Add beat length to last beat time
//
//    current16thNote++;    // Advance the beat number, wrap to zero
//    if (current16thNote == 16) {
//        current16thNote = 0;
//    }
//}
//
//function scheduleNote( beatNumber, time ) {
//    // push the note on the queue, even if we're not playing.
//    notesInQueue.push( { note: beatNumber, time: time } );
//
//    if ( (noteResolution==1) && (beatNumber%2))
//        return; // we're not playing non-8th 16th notes
//    if ( (noteResolution==2) && (beatNumber%4))
//        return; // we're not playing non-quarter 8th notes
//
//    // create an oscillator
//    var osc = audioContext.createOscillator();
//    osc.connect( audioContext.destination );
//    if (beatNumber % 16 === 0)    // beat 0 == high pitch
//        osc.frequency.value = 880.0;
//    else if (beatNumber % 4 === 0 )    // quarter notes = medium pitch
//        osc.frequency.value = 440.0;
//    else                        // other 16th notes = low pitch
//        osc.frequency.value = 220.0;
//
//    osc.start( time );
//    osc.stop( time + noteLength );
//}
//
//function scheduler() {
//    // while there are notes that will need to play before the next interval, 
//    // schedule them and advance the pointer.
//    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime ) {
//        scheduleNote( current16thNote, nextNoteTime );
//        nextNote();
//    }
//}
//
//function play() {
//    isPlaying = !isPlaying;
//
//    if (isPlaying) { // start playing
//        current16thNote = 0;
//        nextNoteTime = audioContext.currentTime;
//        timerWorker.postMessage("start");
//        return "stop";
//    } else {
//        timerWorker.postMessage("stop");
//        return "play";
//    }
//}
//
//function resetCanvas (e) {
//    // resize the canvas - but remember - this clears the canvas too.
//    canvas.width = window.innerWidth;
//    canvas.height = window.innerHeight;
//
//    //make sure we scroll to the top left.
//    window.scrollTo(0,0); 
//}
//function dormir(){
//	console.log("duermo");
//}
//function pintar(){
//	//canvasContext.clearRect(0,0,canvas.width, canvas.height); 
//	 var centerX = 100;
//   var centerY = 75;
//   var radius = 70;
//       canvasContext.beginPath();
//       canvasContext.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
//       canvasContext.fillStyle = 'red';
//       canvasContext.fill();
//       canvasContext.lineWidth = 5;
//       canvasContext.strokeStyle = 'red';
//       canvasContext.stroke();
//    //   setTimeout(dormir,450);
//}
//
//function borrar(){
//	canvasContext.clearRect(0,0,canvas.width, canvas.height); 
//}
//function draw() {
//	//canvasContext.clearRect(0,0,canvas.width, canvas.height);
//    var currentNote = last16thNoteDrawn;
//    var currentTime = audioContext.currentTime;
//   var c = audioContext.currentTime;
//    while (notesInQueue.length && notesInQueue[0].time < currentTime) {
//        currentNote = notesInQueue[0].note;
//        notesInQueue.splice(0,1);   // remove note from queue
//    }
//    var c1 = audioContext.currentTime;
//    console.log("espere: "+(c1-c));
//    // We only need to draw if the note has moved.
//    if (last16thNoteDrawn != currentNote) {
//        var x = Math.floor( canvas.width / 18 );
//        
//    //    for (var i=0; i<16; i++) {
//        	console.log("entro");
////            canvasContext.fillStyle = ( currentNote == i ) ? 
////                ((currentNote%4 === 0)?"red":"blue") : "black";
////            canvasContext.fillRect( x * (i+1), x, x/2, x/2 );
//        	pintar();
//            setTimeout(borrar,450);
//            
////        	 var centerX = 100;
////             var centerY = 75;
////             var radius = 70;
////                 canvasContext.beginPath();
////                 canvasContext.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
////                 canvasContext.fillStyle = 'red';
////                 canvasContext.fill();
////                 canvasContext.lineWidth = 5;
////                 canvasContext.strokeStyle = 'red';
////                 canvasContext.stroke();
//     //   }
//        last16thNoteDrawn = currentNote;
//        
//    }
//
//    // set up to draw again
//    
//    requestAnimFrame(draw);
//}
//
//function init(){
//    var container = document.createElement( 'div' );
//
//    container.className = "container";
//    canvas = document.createElement( 'canvas' );
//    canvasContext = canvas.getContext( '2d' );
//    canvas.width = window.innerWidth; 
//    canvas.height = window.innerHeight; 
//    document.body.appendChild( container );
//    container.appendChild(canvas);    
//    canvasContext.strokeStyle = "#ffffff";
//    canvasContext.lineWidth = 2;
//
//    // NOTE: THIS RELIES ON THE MONKEYPATCH LIBRARY BEING LOADED FROM
//    // Http://cwilso.github.io/AudioContext-MonkeyPatch/AudioContextMonkeyPatch.js
//    // TO WORK ON CURRENT CHROME!!  But this means our code can be properly
//    // spec-compliant, and work on Chrome, Safari and Firefox.
//
//    audioContext = new AudioContext();
//
//    // if we wanted to load audio files, etc., this is where we should do it.
//
//    window.onorientationchange = resetCanvas;
//    window.onresize = resetCanvas;
//
//    //requestAnimFrame(draw)    // start the drawing loop.
//
//    timerWorker = new Worker("js/metronomeworker.js");
//
//    timerWorker.onmessage = function(e) {
//        if (e.data == "tick") {
//        	
//            // console.log("tick!");
//        	requestAnimFrame(draw);
//            scheduler();
//          
//            
//        }
//        else
//            console.log("message: " + e.data);
//    };
//    timerWorker.postMessage({"interval":lookahead});
//}
//
//window.addEventListener("load", init );



