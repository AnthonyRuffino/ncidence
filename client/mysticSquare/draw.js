var SCREEN_WIDTH = null;
var SCREEN_HEIGHT = null;
var ASPECT_RATIO = null;
var WIDTH = null;
var HEIGHT = null;
var VIEW_PORT_SCALER = null;
var centerX = null;
var centerY = null;

var w = window,
	d = document,
	e = d.documentElement,
	g = d.getElementsByTagName('body')[0];
	

var setDimentions = function(){
	SCREEN_WIDTH = w.innerWidth || e.clientWidth || g.clientWidth;
	SCREEN_HEIGHT = w.innerHeight|| e.clientHeight|| g.clientHeight;
	ASPECT_RATIO = SCREEN_HEIGHT/SCREEN_WIDTH;//9/16;
	WIDTH = SCREEN_WIDTH - (SCREEN_WIDTH*.05);
	HEIGHT = (WIDTH * ASPECT_RATIO);
	VIEW_PORT_SCALER = WIDTH/2000;
	centerX = WIDTH/2;
	centerY = HEIGHT/2;
}

var addEvent = function(object, type, callback) {
	if (object == null || typeof(object) == 'undefined') return;
	if (object.addEventListener) {
		object.addEventListener(type, callback, false);
	} else if (object.attachEvent) {
		object.attachEvent("on" + type, callback);
	} else {
		object["on"+type] = callback;
	}
};

setDimentions();

var myCanvas = document.createElement('canvas');

myCanvas.id = 'gameCanvas';
myCanvas.width = WIDTH;
myCanvas.height = HEIGHT;
document.body.appendChild(myCanvas);

var HORIZONTAL_OFFSET = document.getElementById('gameCanvas').getBoundingClientRect().left;
var VERTICAL_OFFSET = document.getElementById('gameCanvas').getBoundingClientRect().top;

var ctx = document.getElementById("gameCanvas").getContext("2d");

var onResize = function(){
	setDimentions();
	document.getElementById("gameCanvas").width = WIDTH;
	document.getElementById("gameCanvas").height = HEIGHT;
}
addEvent(window, "resize", onResize);


getCanvasCoords = function(x,y){
	var canvasX = ((x)*VIEW_PORT_SCALER) + centerX - ((BOARD_SIZE_PERCENTAGE*WIDTH*VIEW_PORT_SCALER)/2);
	var canvasY = ((y)*VIEW_PORT_SCALER) + centerY - ((BOARD_SIZE_PERCENTAGE*HEIGHT*VIEW_PORT_SCALER)/2);
	return {x:canvasX,y:canvasY};
}


//RECTANGLE
drawCenteredRectangle = function(beginPath, x, y, width, height, fillStyle, lineWidth, strokeStyle){
	drawCenteredRectangleFromContext(ctx, beginPath, x, y, width, height, fillStyle, lineWidth,strokeStyle);
}
drawCenteredRectangleFromContext = function(context, beginPath, x, y, width, height, fillStyle, lineWidth, strokeStyle){
	var canvasCoords = getCanvasCoords(x, y);
	
	var biggestDimention = width > height ? width : height;
	
	var doDraw = true;
	if(canvasCoords.x > WIDTH + biggestDimention || canvasCoords.x < -biggestDimention){
		doDraw = false;
	}else if(canvasCoords.y > HEIGHT + biggestDimention || canvasCoords.y < -biggestDimention){
		doDraw = false;
	}
	if(doDraw){
		drawRectangleFromContext(context, beginPath, canvasCoords.x, canvasCoords.y ,width ,height ,fillStyle ,lineWidth ,strokeStyle);
	}
	
}
drawRectangle = function(beginPath, x, y, width, height, fillStyle, lineWidth, strokeStyle){
	drawRectangleFromContext(ctx,beginPath, x, y, width, height, fillStyle, lineWidth, strokeStyle);
}
drawRectangleFromContext = function(context,beginPath, x, y, width, height, fillStyle, lineWidth, strokeStyle){
	context.save();
	
	if(beginPath){
		context.beginPath();
	}

	if(fillStyle !== undefined && fillStyle !== null){
		context.fillStyle = fillStyle;
	}
	
	if(lineWidth !== undefined && lineWidth !== null){
		context.lineWidth = lineWidth;
	}
	
	if(strokeStyle !== undefined && strokeStyle !== null){
		context.strokeStyle = strokeStyle;
	}
	
	context.rect(x,y,width,height,20);
	
	if(lineWidth !== undefined){
		if(fillStyle !== undefined && fillStyle != null){
			context.fill();
		}
		context.stroke();
	}else{
		context.fill();
	}
	
	context.restore();
}

//TEXT
drawCenteredText = function(beginPath, x, y, text, textSize, fillStyle){
	drawCenteredTextFromContext(ctx, beginPath, x, y, text, textSize, fillStyle);
}
drawCenteredTextFromContext = function(context, beginPath, x, y, text, textSize, fillStyle){
	var canvasCoords = getCanvasCoords(x, y);
	
	drawTextFromContext(context, beginPath, canvasCoords.x, canvasCoords.y, text, textSize, fillStyle);
	
}
drawText = function(beginPath, x, y, text, textSize, fillStyle){
	drawTextFromContext(ctx,beginPath, x, y, text, textSize, fillStyle);
}
drawTextFromContext = function(context,beginPath, x, y, text, textSize, fillStyle){
	context.save();
	
	if(beginPath){
		context.beginPath();
	}
	
	ctx.font =  (textSize*VIEW_PORT_SCALER) + 'pt Calibri';
	
	if(fillStyle !== undefined && fillStyle !== null){
		ctx.fillStyle = fillStyle;
	}
	
	ctx.fillText(text,x,y+(textSize)*VIEW_PORT_SCALER);
	
	context.restore();
}




