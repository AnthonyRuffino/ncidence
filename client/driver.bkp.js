round = function(num, sigDigits){	
	if(sigDigits === undefined || sigDigits === null){
		sigDigits = 2;
	}
	
	var powerOfTen = Math.pow(10,sigDigits);
	var inversePowerOfTen = sigDigits === 0 ? 0 : Math.pow(10,(-100*sigDigits));

	return Math.round((num + inversePowerOfTen) * powerOfTen) / powerOfTen;
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


degreesToRadians = function(angle){
	return angle * Math.PI / 180;
}

radiansToDegrees = function(angle){
	return angle / (Math.PI / 180);
}

calculateMovementData = function(entity, angle, speed, reverse){
	var angleInRadians = degreesToRadians(angle);
	var sinOfAngle = Math.sin(angleInRadians);
	var cosOfAngle = Math.cos(angleInRadians);
	
	if(entity.spaceMovement){
		var vxTemp = entity.vx;
		var vyTemp = entity.vy;
		
		if(reverse){
			entity.vy -= speed * sinOfAngle;
			entity.vx += speed * cosOfAngle;
		}else{
			entity.vy += speed * sinOfAngle;
			entity.vx -= speed * cosOfAngle;
		}
		
		entity.vectorSpeed = Math.sqrt(Math.pow(entity.vx,2) + Math.pow(entity.vy,2));
		
		if(entity.vectorSpeed >= SPEED_OF_LIGHT){
			entity.vx = vxTemp;
			entity.vy = vyTemp;
			calculateMovementData(entity,angle,speed/8,reverse);
		}
		
	}else{
		speed = speed * gameEngine.frimScaler;
		
		if(reverse){
			entity.y -= speed * sinOfAngle;
			entity.x += speed * cosOfAngle;
		}else{
			entity.y += speed * sinOfAngle;
			entity.x -= speed * cosOfAngle;
		}
	}
}


calculateFirstPersonOrientation = function(entity){
	
	var x1 = null;
	var y1 = null;
	var angle1 = null;//Entity view angle from the player's view Y-Axis

	var dx = entity.x - player.x;
	var dy = entity.y - player.y;

	var d = Math.sqrt(dx*dx+dy*dy);
	
	var realAngleToEntity = Math.atan2(dx,dy);
	var viewAngleToEntity = realAngleToEntity - degreesToRadians(player.angle - 90);
	var entityToPlayerXaxisAngle = degreesToRadians(90) - viewAngleToEntity;
	
	x1 = Math.cos(entityToPlayerXaxisAngle)*d;
	y1 = Math.sin(entityToPlayerXaxisAngle)*d;
	
	if(entity.angle !== undefined && entity.angle !== null){
		angle1 = entity.angle - (player.angle - 90);
	}
	
	return {x:x1,y:y1,angle:angle1};
}


function getRandomColor() {
	var letters = '0123456789ABCDEF'.split('');
	var color = '#';
	for (var i = 0; i < 6; i++ ) {
		color += letters[Math.floor(Math.random() * 16)];
	}
	return color;
}

function isTouchDevice() {
  return 'ontouchstart' in window        // works on most browsers 
      || navigator.maxTouchPoints;       // works on IE10/11 and Surface
};

function getDistance(entity1,entity2){	//return distance (number)
	var dx = entity1.x - entity2.x;
	var dy = entity1.y - entity2.y;
	return Math.sqrt(dx*dx+dy*dy);
}



////////////////////////////////////////////////////////////////////////////////////
//DRAW
////////////////////////////////////////////////////////////////////////////////////
var SCREEN_WIDTH = null;
var SCREEN_HEIGHT = null;
var ASPECT_RATIO = null;
var WIDTH = null;
var HEIGHT = null;
var VIEW_PORT_SCALER = null;
var centerX = null;
var centerY = null;
var START_SCALE = 1;
var scale = START_SCALE;
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

setDimentions();

var myCanvas = document.createElement('canvas');

myCanvas.id = 'gameCanvas';
myCanvas.width = WIDTH;
myCanvas.height = HEIGHT;
//myCanvas.style = 'width: ' + WIDTH + 'px; height: ' + HEIGHT + 'px; border:1px; solid black';
document.body.appendChild(myCanvas);

var HORIZONTAL_OFFSET = document.getElementById('gameCanvas').getBoundingClientRect().left;
var VERTICAL_OFFSET = document.getElementById('gameCanvas').getBoundingClientRect().top;

var ctx = document.getElementById("gameCanvas").getContext("2d");

var onResize = function(){
	setDimentions();
	document.getElementById("gameCanvas").width = WIDTH;
	document.getElementById("gameCanvas").height = HEIGHT;
	//document.getElementById("gameCanvas").style = 'width: ' + WIDTH + 'px; height: ' + HEIGHT + 'px; border:1px; solid black';
}
addEvent(window, "resize", onResize);


getCanvasCoords = function(x,y){
	var canvasX = ((x*scale)*VIEW_PORT_SCALER) + centerX;
	var canvasY = ((-y*scale)*VIEW_PORT_SCALER) + centerY;
	return {x:canvasX,y:canvasY};
}
	
drawRealRectangle = function(beginPath, x, y,width,height,rotationAngle,fillStyle,lineWidth,strokeStyle){
	drawRealRectangleFromContext(ctx, beginPath, x, y,width,height,rotationAngle,fillStyle,lineWidth,strokeStyle);
}
drawRealRectangleFromContext = function(context, beginPath, x, y,width,height,rotationAngle,fillStyle,lineWidth,strokeStyle){
	var canvasCoords = getCanvasCoords(x, y);
	
	var biggestDimention = width > height ? width : height;
	
	var doDraw = true;
	if(canvasCoords.x > WIDTH + biggestDimention || canvasCoords.x < -biggestDimention){
		doDraw = false;
	}else if(canvasCoords.y > HEIGHT + biggestDimention || canvasCoords.y < -biggestDimention){
		doDraw = false;
	}
	if(doDraw){
		drawRectangleFromContext(context, beginPath, canvasCoords.x, canvasCoords.y,width,height,rotationAngle,fillStyle,lineWidth,strokeStyle);
	}
	
}
drawRectangle = function(beginPath, x, y,width,height,rotationAngle,fillStyle,lineWidth,strokeStyle){
	drawRectangleFromContext(ctx,beginPath, x, y,width,height,rotationAngle,fillStyle,lineWidth,strokeStyle);
}
drawRectangleFromContext = function(context,beginPath, x, y,width,height,rotationAngle,fillStyle,lineWidth,strokeStyle){
	context.save();
	
	if(beginPath){
		context.beginPath();
	}
	
	if(rotationAngle !== undefined && rotationAngle !== null){
		context.translate(x, y);
		context.rotate(degreesToRadians(rotationAngle));
		context.translate(-x, -y);
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

drawRealCircle = function(beginPath, x, y,radius,rotationAngle,fillStyle,lineWidth,strokeStyle,startAngle,endAngle, fillGap){
	drawRealCircleFromContext(ctx,beginPath, x, y,radius,rotationAngle,fillStyle,lineWidth,strokeStyle,startAngle,endAngle, fillGap);
}
drawRealCircleFromContext = function(context, beginPath, x, y,radius,rotationAngle,fillStyle,lineWidth,strokeStyle,startAngle,endAngle, fillGap){
	var canvasCoords = getCanvasCoords(x, y);
	var doDraw = true;
	if(canvasCoords.x > WIDTH + radius || canvasCoords.x < -radius){
		doDraw = false;
	}else if(canvasCoords.y > HEIGHT + radius || canvasCoords.y < -radius){
		doDraw = false;
	}
	if(doDraw){
		drawCircleFromContext(context, beginPath, canvasCoords.x, canvasCoords.y,radius,rotationAngle,fillStyle,lineWidth,strokeStyle,startAngle,endAngle, fillGap);
	}
	
}
drawCircle = function(beginPath, x, y,radius,rotationAngle,fillStyle,lineWidth,strokeStyle,startAngle,endAngle, fillGap){
	drawCircleFromContext(ctx, beginPath, x, y,radius,rotationAngle,fillStyle,lineWidth,strokeStyle,startAngle,endAngle, fillGap);
}
drawCircleFromContext = function(context, beginPath, x, y,radius,rotationAngle,fillStyle,lineWidth,strokeStyle,startAngle,endAngle, fillGap){
	context.save();
	
	if(beginPath){
		context.beginPath();
	}
	
	if(rotationAngle !== undefined && rotationAngle !== null){
		context.translate(x, y);
		context.rotate(degreesToRadians(rotationAngle));
		context.translate(-x, -y);
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
	
	if(startAngle === undefined || startAngle === null){
		startAngle = 0;
	}
	
	if(endAngle === undefined || endAngle === null){
		endAngle = 360;
	}
	
	if(fillGap && endAngle - startAngle < 360){
		context.arc(x,y,radius,degreesToRadians(endAngle),degreesToRadians(endAngle - startAngle));
	}
	
	
	context.arc(x,y,radius,degreesToRadians(startAngle),degreesToRadians(endAngle));
	
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

drawRealImage = function(beginPath,image,x,y,width,height,angle,doShift){
	drawRealImageFromContext(ctx,beginPath,image,x,y,width,height,angle,doShift);
}
drawRealImageFromContext = function(context, beginPath,image,x,y,width,height,angle,doShift){
	var canvasCoords = getCanvasCoords(x, y);
	
	var biggestDimention = width > height ? width : height;
	
	var doDraw = true;
	if(canvasCoords.x > WIDTH + biggestDimention || canvasCoords.x < -biggestDimention){
		doDraw = false;
	}else if(canvasCoords.y > HEIGHT + biggestDimention || canvasCoords.y < -biggestDimention){
		doDraw = false;
	}
	
	if(doDraw){
		drawImageFromContext(context, beginPath,image,canvasCoords.x,canvasCoords.y,width,height,angle,doShift);
	}
}
drawImage = function(beginPath,image,x,y,width,height,angle,doShift){
	drawImageFromContext(ctx, beginPath,image,x,y,width,height,angle,doShift);
}
drawImageFromContext = function(context, beginPath,image,x,y,width,height,angle,doShift){
	context.save();
	if(beginPath){
		context.beginPath();
	}
	
	if(angle !== undefined && angle !== null){
		context.translate(x, y);
		context.rotate(angle * Math.PI / 180);
		context.translate(-x, -y);
	}
	
	if(image.orientation !== undefined && image.orientation !== null){
		context.translate(x, y);
		context.rotate((360-image.orientation) * Math.PI / 180);
		context.translate(-x, -y);
	}
	
	if(doShift === undefined || doShift === null){
		doShift = true;
	}
	
	var xShift = 0;
	var yShift = 0;
		
	if(doShift){
		if(width > 1){
			xShift = width/2;
		}
		
		if(height > 1){
			yShift = height/2;
		}
	}
	
	context.drawImage(image.img,0,0,image.img.width,image.img.height,x-xShift,y-yShift,width,height);
	
	context.restore();
}


drawRealLine = function(beginPath,x1,y1,x2,y2,lineWidth,strokeStyle){
	var canvasCoords1 = getCanvasCoords(x1, y1);
	var canvasCoords2 = getCanvasCoords(x2, y2);
	drawLine(beginPath,canvasCoords1.x,canvasCoords1.y,canvasCoords2.x,canvasCoords2.y,lineWidth,strokeStyle);
}
drawLine = function(beginPath,x1,y1,x2,y2,lineWidth,strokeStyle){
	ctx.save();
	if(beginPath){
		ctx.beginPath();
	}
	
	if(lineWidth !== undefined && lineWidth !== null){
		ctx.lineWidth = lineWidth;
	}
	
	if(strokeStyle !== undefined && strokeStyle !== null){
		ctx.strokeStyle = strokeStyle;
	}
	
	ctx.moveTo(x1,y1);
	ctx.lineTo(x2,y2);
	ctx.stroke();
	
	ctx.restore();
}



///////////////////////////
//ENTITIES
///////////////////////////
var preRender = true;
var ANGLE_CHANGE_SPEED = 2;
Entity = function(type,id,x,y,width,height,angle,movementSpeed,shape,fillStyle,lineWidth,strokeStyle,image){
			
	var self = {
		type:type,
		id:id,
		x:x,
		y:y,
		width:width,
		height:height,
		angle:angle,
		movementSpeed:movementSpeed,
		shape:shape,
		fillStyle:fillStyle,
		strokeStyle:strokeStyle,
		lineWidth:lineWidth,
		image:image,
		baseLineWidth:lineWidth,
		baseWidth:width,
		baseHeight:height,
		baseSpeed:movementSpeed
	};
	
	if(self.image === undefined || self.image === null){
		var shapeImage = {};
		
		var shape_canvas = document.createElement('canvas');
		
		var canvasWidth  = (self.shape==='circle' ? self.width*2 : self.width ) + self.lineWidth;
		var canvasHeight = (self.shape==='circle' ? self.height*2 : self.height) + self.lineWidth;
		
		shape_canvas.width = canvasWidth+1;
		shape_canvas.height = canvasHeight+1;
		var shape_context = shape_canvas.getContext('2d');
		
		if(self.shape==='circle'){
			//drawCircleFromContext(context, beginPath, x, y,radius,rotationAngle,fillStyle,lineWidth,strokeStyle,startAngle,endAngle, fillGap);
			drawCircleFromContext(shape_context, true, canvasWidth/2, canvasWidth/2,self.width,null,self.fillStyle,self.lineWidth,self.strokeStyle);
			
			
		}else if(self.shape==='rectangle'){
			drawRectangleFromContext(shape_context,true, self.lineWidth/2, self.lineWidth/2,self.width,self.height,null,self.fillStyle,self.lineWidth,self.strokeStyle);
			
			self.imageHeight = canvasHeight;
			self.imageWidth = canvasWidth;
		}
		
		self.baseImageHeight = self.imageHeight = canvasHeight;
		self.baseImageWidth = self.imageWidth = canvasWidth;
			
		shapeImage.img = shape_canvas;
		self.image = shapeImage;
	}
	
	
	self.updatePosition = function(){
		self.lineWidth = self.baseLineWidth*scale*VIEW_PORT_SCALER;
		self.width = self.baseWidth*scale*VIEW_PORT_SCALER;
		self.height = self.baseHeight*scale*VIEW_PORT_SCALER;
		
		if(self.imageHeight !== undefined){
			self.imageHeight = self.baseImageHeight*scale*VIEW_PORT_SCALER;
		}
		if(self.imageWidth !== undefined){
			self.imageWidth = self.baseImageWidth*scale*VIEW_PORT_SCALER;
		}
		
		
		//self.movementSpeed = self.baseSpeed*(scale/3);

	}
	self.draw = function(){
	
		var doDraw = self.doDraw === undefined || self.doDraw === null || self.doDraw === true;
	
		if(doDraw){
			var x = self.x - player.x;
			var y = self.y - player.y;
			var angle = self.angle;
			
			if(player.firstPerson){
				var firstPersonOrientation = calculateFirstPersonOrientation(self);
				x = firstPersonOrientation.x;
				y = firstPersonOrientation.y;
				angle = firstPersonOrientation.angle;
			}
			
			var fill = self.fillStyle !== undefined && self.fillStyle !== null;
			
			if((preRender || self.baseImageHeight === undefined) && (self.image !== undefined && self.image !== null)){
				var imageHeight = self.imageHeight !== undefined ?  self.imageHeight : self.height;
				var imageWidth = self.imageWidth !== undefined ?  self.imageWidth : self.width;
				drawRealImage(true,self.image,x,y,imageWidth,imageHeight,angle,self.shape === 'circle');
			}else if(self.shape === 'circle'){
				drawRealCircle(true,x,y,self.width,null,self.fillStyle,self.lineWidth,self.strokeStyle);
			}else if(self.shape === 'rectangle'){
				drawRealRectangle(true,x,y,self.width,self.height,angle,self.fillStyle,self.lineWidth,self.strokeStyle);
			}
		}
		
	}
	
	self.getDistance = function(entity2){	//return distance (number)
		return getDistance(self,entity2);
	}
	
	return self;
}



Player = function(id,x,y,width,height,angle,movementSpeed,img){

	var playerImage = {};
	
	if(img === undefined || img === null){
		playerImage.orientation = 180;
		playerImage.img = new Image();
		playerImage.img.src = '/img/space/blueships1.png';
	}else{
		playerImage = img;
	}

	var self = Entity('player',id,x,y,width,height,angle,movementSpeed,'rectangle','red','green',null,playerImage);
	self.startAngle = angle;
	self.lastRightTurnTime = null;
	self.lastLeftTurnTime = null;
	self.spaceMovement = true;
	self.vectorSpeed = 0;
	
	self.heightToWidthRatio = height/width;
	
	if(self.vx === undefined || self.vx === null){
		self.vx = 0;
	}
	
	if(self.vy === undefined || self.vy === null){
		self.vy = 0;
	}
	
	var super_draw = self.draw;
	
	self.draw = function(){
	
		var playerAngle = self.angle;
		if(self.firstPerson){
			playerAngle = self.startAngle;
		}
		
		var widthToDraw = self.width;
		var heightToDraw = self.height;
		
		if(widthToDraw < 30*VIEW_PORT_SCALER){
			widthToDraw = 30*VIEW_PORT_SCALER;
			heightToDraw = widthToDraw*self.heightToWidthRatio;
		}
		
		drawRealImage(true,self.image,0,0,widthToDraw,heightToDraw,playerAngle);
		drawRealCircle(true,0,0,1,null,'red');
	}
	
	var super_updatePosition = self.updatePosition;
	self.updatePosition = function(){
		super_updatePosition();
		
		//self.movementSpeed = self.baseSpeed*(scale/3);
		//self.movementSpeed = round(self.movementSpeed*(1/scale),1);
		//self.movementSpeed = round((self.baseSpeed*(scale/3))*(1/scale),1);
		
		var speed = 0;
		
		if(!player.spaceMovement){
			self.movementSpeed = self.baseSpeed/(scale*10);
			self.movementSpeed = self.movementSpeed > 0 ? self.movementSpeed : .01;
		}else{
			self.movementSpeed = self.baseSpeed/10;
		}
		
		var strafing = false;
		var movingForwardOrBackWard = false;
		
		if((self.pressingDown && self.pressingUp !== true) || (self.pressingUp && self.pressingDown !== true)){
			movingForwardOrBackWard = true;
		}
		
	
		if(self.pressingRightClick && (self.pressingRight || self.pressingLeft)){
			strafing = true;
			var angleOfMotion = 0;
			if(self.pressingRight && self.pressingLeft !== true){
				angleOfMotion -= 90;
			}else if(self.pressingLeft && self.pressingRight !== true){
				angleOfMotion += 90;
			}
			if(angleOfMotion !== 0){
				speed = self.movementSpeed;
				if(self.pressingDown){
					speed = speed/2;
				}
				if(movingForwardOrBackWard){
					speed = Math.sqrt(Math.pow(speed,2)/2);
				}
				calculateMovementData(self, self.angle - angleOfMotion, speed, false);
			}
		}else if(self.pressingRightClick){
			var difMidAccordingToMouseX = (WIDTH/2) - mouseX;
			var difMidAccordingToMouseY = (HEIGHT/2) - mouseY;	
			if(mouseX >= (WIDTH/2) && mouseY < (HEIGHT/2)){
				self.angle = 90 - radiansToDegrees(Math.atan(difMidAccordingToMouseX/difMidAccordingToMouseY));
			}else if(mouseX >= (WIDTH/2) && mouseY > (HEIGHT/2)){
				self.angle = 270 - radiansToDegrees(Math.atan(difMidAccordingToMouseX/difMidAccordingToMouseY));
			}else if(mouseY >= (HEIGHT/2) && mouseX < (WIDTH/2)){
				self.angle = 270 - radiansToDegrees(Math.atan(difMidAccordingToMouseX/difMidAccordingToMouseY));
			}
			else if(mouseY <= (HEIGHT/2) && mouseX < (WIDTH/2)){
				self.angle = 90-radiansToDegrees(Math.atan(difMidAccordingToMouseX/difMidAccordingToMouseY));
			}
		
		}else {
			if(self.pressingRight && self.pressingLeft !== true){
				if(self.lastRightTurnTime == null){
					self.lastRightTurnTime = Date.now();
				}
				if(true || Date.now() - self.lastRightTurnTime > 50){
					self.angle += (ANGLE_CHANGE_SPEED*gameEngine.frimScaler);
					self.lastRightTurnTime = Date.now();
				}
			}else if(self.pressingLeft && self.pressingRight !== true){
				if(self.lastLeftTurnTime == null){
					self.lastLeftTurnTime = Date.now();
				}
				if(true || Date.now() - self.lastLeftTurnTime > 50){
					self.angle -= (ANGLE_CHANGE_SPEED*gameEngine.frimScaler);
					self.lastLeftTurnTime = Date.now();
				}
			}
		}
		
		
		if(strafing === false && (self.strafingLeft || self.strafingRight)){
			var angleOfMotion = 0;
			if(self.strafingRight && self.strafingLeft !== true){
				angleOfMotion -= 90;
			}else if(self.strafingLeft && self.strafingRight !== true){
				angleOfMotion += 90;
			}
			if(angleOfMotion !== 0){
				strafing = true;
				speed = self.movementSpeed;
				if(self.pressingDown){
					speed = speed/2;
				}
				if(movingForwardOrBackWard){
					speed = Math.sqrt(Math.pow(speed,2)/2);
				}
				calculateMovementData(self, self.angle - angleOfMotion, speed, false);
			}
		}
		
		
		if(self.angle >= 360){
			self.angle = self.angle - 360;
		}else if(self.angle < 0){
			self.angle = 360 + self.angle;
		}else{
			self.angle = round(self.angle,0)
		}

		if(self.pressingDown && self.pressingUp !== true){
			speed = self.movementSpeed/2;
			if(strafing){
				speed = Math.sqrt(Math.pow(speed,2)/2);
			}
			calculateMovementData(self, self.angle, speed, true);
		}else if(self.pressingUp && self.pressingDown !== true){
			speed = self.movementSpeed;
			if(strafing){
				speed = Math.sqrt(Math.pow(speed,2)/2);
			}
			calculateMovementData(self, self.angle, speed, false);
		}
		
		self.y += (self.vy*gameEngine.frimScaler);
		self.x += (self.vx*gameEngine.frimScaler);
			
		if(!self.spaceMovement){			
			self.vectorSpeed = speed > 0 ? round(player.movementSpeed) : 0;
		}
	}
	
	self.firstPerson = true;
	self.pressingLeftClick = false;
	self.pressingLeftClickPlusShift = false;
	self.pressingRightClick = false;
	self.pressingDown = false;
	self.pressingUp = false;
	self.pressingLeft = false;
	self.pressingRight = false;
	self.strafingLeft = false;
	self.strafingRight = false;
	self.timeWhenLeftMouseWasPressed = null;
	self.paued = false;
	self.mouseX = null;
	self.mouseY = null;
	return self;
	
}





///////////////////////////
//CONTROLS
///////////////////////////
var mouseX = null;
var mouseY = null;

initBindings = () => {
	document.onmousedown = function(mouse){
		gameEngine.driver.controls.onmousedown(mouse);
	}

	document.onmouseup = function(mouse){
	   gameEngine.driver.controls.onmouseup(mouse);
	}

	document.onclick = function(mouse){
		gameEngine.driver.controls.onclick(mouse);
	}

	document.ondblclick = function(mouse){
		gameEngine.driver.controls.ondblclick(mouse);
	}

	document.oncontextmenu = function(mouse){
		gameEngine.driver.controls.oncontextmenu(mouse);
	}

	document.onmousemove = function(mouse){
		gameEngine.driver.controls.onmousemove(mouse);
	}

	document.onkeydown = function(event){
		//window.console.log(event.keyCode);
		gameEngine.driver.controls.onkeydown(event);
	}

	document.onkeyup = function(event){
		gameEngine.driver.controls.onkeyup(event);
	}

	document.onwheel = function(mouse){
		gameEngine.driver.controls.onwheel(mouse);
	}
}




ScaledControl = function(id,doClick,x,y,width,height,image,doHighlight,highlightColor){
			
	var self = {
		id:id,
		doClick:doClick,
		x:x,
		y:y,
		width:width,
		height:height===undefined || height===null ? width : height,
		image:image,
		doHighlight:doHighlight,
		isCircle:height===undefined || height===null
	};

	self.draw = function(){
		if(self.isCircle){
			var bounds = self.getBounds();
			drawImage(true,image,bounds.centerX,bounds.centerY,bounds.smallerDimention*self.width,bounds.smallerDimention*self.width,null,true);
		}else{
			drawImage(true,image,WIDTH*self.x,HEIGHT*self.y,WIDTH*self.width,HEIGHT*self.height,null,false);
		}
		
		if(doHighlight !== undefined && doHighlight !== null && doHighlight() === true){
			highlightColor = highlightColor===undefined || highlightColor===null ? 'red' : highlightColor;
			
			if(self.isCircle){
				var bounds = self.getBounds();
				drawCircle(true,bounds.centerX,bounds.centerY,bounds.smallerDimention*(width/2),null,null,3*VIEW_PORT_SCALER, highlightColor);
			}else{
				drawRectangle(true,WIDTH*x,HEIGHT*y,WIDTH*width,HEIGHT*height,null,null,3*VIEW_PORT_SCALER, highlightColor);
			}
		}
	}
	
	self.clicked = function(mounseX,mouseY){
		var bounds = self.getBounds();
		if(self.isCircle){
			var distance = getDistance({x:bounds.centerX,y:bounds.centerY},{x:mounseX,y:mouseY});
			return distance <= bounds.smallerDimention*(self.width/2);
		}else{
			return mounseX>=bounds.leftBound && mounseX<=bounds.rightBound&&mouseY>=bounds.upperBound&&mouseY<=bounds.lowerBound;
		}
	}
	
	self.getBounds = function(){
		var bounds = {};
		bounds.smallerDimention = HEIGHT < WIDTH ? HEIGHT : WIDTH;
		bounds.leftBound = WIDTH*self.x;
		bounds.rightBound = bounds.leftBound+WIDTH*self.width;
		bounds.upperBound = HEIGHT*self.y;
		bounds.lowerBound = bounds.upperBound+HEIGHT*self.height;
		bounds.centerX=WIDTH*self.x+((WIDTH*self.width)/2);
		if(self.isCircle){
			bounds.centerY=HEIGHT*y+((bounds.smallerDimention*self.width)/2);
		}else{
			bounds.centerY=HEIGHT*y+((HEIGHT*self.height)/2);
		}
		
		return bounds;
	}
	return self;
}


///////////////////////////
//universeViewControls
///////////////////////////
var MINIMUM_SCALE=.00000001;
universeViewControls = {};

universeViewControls.onmousedown = function(mouse){
	if(mouse.which === 1){
		player.pressingLeftClick = true;
		player.timeWhenLeftMouseWasPressed = Date.now();
		if(mouse.shiftKey){
			player.pressingLeftClickPlusShift = true;
		}
   }else if(mouse.which === 3){
		player.pressingRightClick = true;
   }
}

universeViewControls.onmouseup = function(mouse){
   if(mouse.which === 1){
		player.pressingLeftClick = false;
		player.pressingLeftClickPlusShift = false;
   }else if(mouse.which === 3){
		player.pressingRightClick = false;
   }
}


universeViewControls.onclick = function(mouse){
	var msHeld = (Date.now() - player.timeWhenLeftMouseWasPressed);
	if(msHeld < 1000){
	
		mouseX = mouse.x - HORIZONTAL_OFFSET;
		mouseY = mouse.y - VERTICAL_OFFSET;
		
		var controlClicked = false;
		
		if(universeViewControls.clickControls !== undefined && universeViewControls.clickControls != null){
			for (var i = 0; i < clickControls.length; i++) {
				controlClicked = clickControls[i].clicked(mouseX,mouseY);
				
				if(controlClicked){
					clickControls[i].doClick();
					break;
				}
			}
		}
		
		if(controlClicked === false){
			var fixedViewPlayerMouseX = ((mouseX-centerX)/scale/VIEW_PORT_SCALER + player.x);
			var fixedViewPlayerMouseY = ((-mouseY+centerY)/scale/VIEW_PORT_SCALER + player.y);
			
			if(player.firstPerson){
				
				var dx = fixedViewPlayerMouseX - player.x;
				var dy = fixedViewPlayerMouseY - player.y;
				var d = Math.sqrt(dx*dx+dy*dy);
				window.console.log('distance', d);
				
				var viewAngleToEntity = Math.atan2(mouseX-centerX,(-mouseY+centerY));
				
				//window.console.log('viewAngleToEntity', radiansToDegrees(viewAngleToEntity), 'player.angle', player.angle);
				
				var fixedViewMouseAngle = degreesToRadians(player.angle-90) + viewAngleToEntity;
				
				
				player.mouseX = (d * Math.sin(fixedViewMouseAngle) + (player.x));
				player.mouseY = (d * Math.cos(fixedViewMouseAngle) + (player.y));
				
				
			}else{
				player.mouseX = fixedViewPlayerMouseX;
				player.mouseY = fixedViewPlayerMouseY;
			}

			
			window.console.log(round(player.mouseX), round(player.mouseY));
		}
		
	}else{
		window.console.log('click did not count', msHeld);
	}
	player.timeWhenLeftMouseWasPressed = null;
}

universeViewControls.ondblclick = function(mouse){

}


universeViewControls.oncontextmenu = function(mouse){
	mouse.preventDefault();
}

universeViewControls.onmousemove = function(mouse){
	mouseX = mouse.x - HORIZONTAL_OFFSET;
	mouseY = mouse.y - VERTICAL_OFFSET;
}

universeViewControls.onkeydown = function(event){
	window.console.log(event.keyCode);
	if(event.keyCode === 68)	//d
		player.pressingRight = true;
	else if(event.keyCode === 83)	//s
		player.pressingDown = true;
	else if(event.keyCode === 65) //a
		player.pressingLeft = true;
	else if(event.keyCode === 87) // w
		player.pressingUp = true;
	else if(event.keyCode === 81) // q
		player.strafingLeft = true;
	else if(event.keyCode === 69) // e
		player.strafingRight = true;
	else if(event.keyCode === 80) //p
		player.paused = !player.paused;
	else if(event.keyCode === 70){ //f
		player.firstPerson = !player.firstPerson;
	}else if(event.keyCode === 88){ //x
		if(previousScale !== null){
			scale=previousScale;
			previousScale = null;
		}else{
			previousScale=scale;
			scale=START_SCALE;
		}
		
	}else if(event.keyCode === 74){ //j
		player.x=0;
		player.y=0;
	}else if(event.keyCode === 76){ //l
		if(player.spaceMovement){
			universeViewControls.doWarpClick();
		}else{
			universeViewControls.doThrusterClick();
		}
	} else if(event.keyCode === 77){ //m
		preRender = !preRender;
	} else if(event.keyCode === 107){ //+
		var scaler = .1;
		if(scale < .0000001){
			scaler = .00000001;
		}else if(scale < .000001){
			scaler = .0000001;
		}else if(scale < .00001){
			scaler = .000001;
		}else if(scale < .0001){
			scaler = .00001;
		}else if(scale < .001){
			scaler = .0001;
		}else if(scale < .01){
			scaler = .001;
		}else if(scale < .1){
			scaler = .01;
		}
		scale = scale + scaler;
	} else if(event.keyCode === 109){ //-
		var scaler = .1;
		if(scale <= .0000001){
			scaler = .00000001;
		}else if(scale <= .000001){
			scaler = .0000001;
		}else if(scale <= .00001){
			scaler = .000001;
		}else if(scale <= .0001){
			scaler = .00001;
		}else if(scale <= .001){
			scaler = .0001;
		}else if(scale <= .01){
			scaler = .001;
		}else if(scale <= .1){
			scaler = .01;
		}
		scale = scale - scaler;
	}
}

universeViewControls.onkeyup = function(event){
	if(event.keyCode === 68)	//d
		player.pressingRight = false;
	else if(event.keyCode === 83)	//s
		player.pressingDown = false;
	else if(event.keyCode === 65) //a
		player.pressingLeft = false;
	else if(event.keyCode === 87) // w
		player.pressingUp = false;
	else if(event.keyCode === 81) // q
		player.strafingLeft = false;
	else if(event.keyCode === 69) // e
		player.strafingRight = false;
}


universeViewControls.onwheel = function(mouse){
		
	mouse.preventDefault();

	previousScale = null;
	var zoomingIn = (mouse.shiftKey !== true && mouse.deltaY<0) || (mouse.shiftKey && mouse.deltaX<0);
	
	var sampleValue = mouse.shiftKey !== true ? scale : player.baseSpeed;

	var scaler = .1;
	
	if(zoomingIn){
		if(sampleValue < .0000001){
			scaler = .00000001;
		}else if(sampleValue < .000001){
			scaler = .0000001;
		}else if(sampleValue < .00001){
			scaler = .000001;
		}else if(sampleValue < .0001){
			scaler = .00001;
		}else if(sampleValue < .001){
			scaler = .0001;
		}else if(sampleValue < .01){
			scaler = .001;
		}else if(sampleValue < .1){
			scaler = .01;
		}
	}else{
		if(sampleValue <= .0000001){
			scaler = .00000001;
		}else if(sampleValue <= .000001){
			scaler = .0000001;
		}else if(sampleValue <= .00001){
			scaler = .000001;
		}else if(sampleValue <= .0001){
			scaler = .00001;
		}else if(sampleValue <= .001){
			scaler = .0001;
		}else if(sampleValue <= .01){
			scaler = .001;
		}else if(sampleValue <= .1){
			scaler = .01;
		}
	}
	
	
	if(mouse.shiftKey){
		scaler = scaler*10*gameEngine.frimScaler;
		if(mouse.deltaX<0){
			player.baseSpeed += scaler;
		}else if(mouse.deltaX>0){
			player.baseSpeed -= scaler;
		}
		
		if(player.baseSpeed < 1){
			player.baseSpeed = 1;
		}
		
		player.baseSpeed = round(player.baseSpeed,1);
	}else{
		if(mouse.deltaY<0){
			scale += scaler;
		}else if(mouse.deltaY>0){
			scale -= scaler;
		}
		
		if(scale < MINIMUM_SCALE){
			scale = MINIMUM_SCALE;
		}
		
		scale = round(scale,8);
	}
}



///////////////////////////
//universeViewDriver
///////////////////////////


var SPEED_OF_LIGHT = 4479900;
var numberOfEnemies = 200;
var sunRadius = 200000;
		
var sunImage = {};
sunImage.img = new Image();
sunImage.img.src = '/img/space/sun2.png';

var bobImage = {};
bobImage.img = new Image();
bobImage.img.src = '/img/space/bob.png';

var earthImage = {};
earthImage.img = new Image();
earthImage.img.src = '/img/space/earth.png';

bob = Entity('person','bob',sunRadius*2,0,sunRadius/10,sunRadius/10,0,0,'circle',null,20,'red',bobImage);
sun = Entity('star','sun',0,0,sunRadius,sunRadius,0,0,'circle',null,20,'red',sunImage);
earth = Entity('planet','earth',0,9600000,sunRadius/10,sunRadius/10,0,0,'circle',null,20,'green',earthImage);
sunAtmosphere = Entity('star','sunAtmosphere',0,0,sunRadius/2,sunRadius/2,0,0,'circle','orange',2000,'orange',null);

//Player = function(id,x,y,width,height,angle,movementSpeed,img){
player = Player('player',0,0,160,80,90,30);


//CLICK CONTROLS
var isThrusterMotion = function(){
	return player.spaceMovement;
}
var doThrusterClick = function(){
	player.spaceMovement = true;
}
var thrusterImage = {};
thrusterImage.img = new Image();
thrusterImage.img.src = '/img/space/icon-thruster.png';
thrusterControl = ScaledControl('thrusterControl',doThrusterClick,.95,.80,(1/24),.05,thrusterImage,isThrusterMotion);

var isNotThrusterMotion = function(){
	return !player.spaceMovement;
}
var doWarpClick = function(){
	player.vx = 0;
	player.vy = 0;
	player.spaceMovement = false;
}
var warpImage = {};
warpImage.img = new Image();
warpImage.img.src = '/img/space/icon-warp.png';
warpControl = ScaledControl('warpControl',doWarpClick,.90,.80,(1/24),.05,warpImage,isNotThrusterMotion);


var isCircleHighlighted = function(){
	return !player.spaceMovement;
}
var doCircleClick = function(){
	player.vx = 0;
	player.vy = 0;
	player.spaceMovement = false;
}
var circleImage = {};
circleImage.img = new Image();
circleImage.img.src = '/img/space/circle.png';
circleControl = ScaledControl('circleControl',doCircleClick,.70,.80,(1/24),null,circleImage,isCircleHighlighted);



//CLICK CONTROLS
clickControls = [];
clickControls.push(thrusterControl);
clickControls.push(warpControl);
clickControls.push(circleControl);
//END CLICK CONTROLS


enemies = {};
for(var i = 1; i <= numberOfEnemies; i++){
	var enemyX = Math.random() * 1000 * (Math.random() > .5 ? -1 : 1);
	var enemyY = Math.random() * 1000 * (Math.random() > .5 ? -1 : 1);
	var enemyW = (Math.random() * 25) + 5;
	var enemyH = (Math.random() * 25) + 5;
	var enemyShape = Math.random() > .5 ? 'circle' : 'rectangle';
	var lineWidth = 3;
	enemies['enemy' + i] = Entity('enemy','enemy' + i,enemyX,enemyY,enemyW,enemyShape === 'circle' ? enemyW : enemyH,15,10,enemyShape, getRandomColor(), lineWidth, getRandomColor(), null);
}


universeViewDriver = {};

universeViewDriver.render = function(){
	bob.draw();
	sun.draw();
	earth.draw();
	sunAtmosphere.draw();
	player.draw();

	if(scale >= .01){
		for(var i = 1; i <= numberOfEnemies; i++){
			enemies['enemy' + i].draw();
		}
	}
	

	
	
	for (var i = 0; i < clickControls.length; i++) {
		clickControls[i].draw();
	}
	
	ctx.save();
	var textSize = 35;
	ctx.font =  (textSize*VIEW_PORT_SCALER) + 'pt Calibri';
	ctx.fillStyle = 'white';
	ctx.fillText('player(x,y): (' + round(player.x) + "," + round(player.y) +")",0,(textSize*1)*VIEW_PORT_SCALER);
	ctx.fillText('player angle: ' + round(player.angle),0,(textSize*2)*VIEW_PORT_SCALER);
	ctx.fillText('scale: ' + scale,0,(textSize*3)*VIEW_PORT_SCALER);
	ctx.fillText('base accelleration: ' + round(player.baseSpeed),0,(textSize*4)*VIEW_PORT_SCALER);
	ctx.fillText('current accelleration: ' + round(player.movementSpeed),0,(textSize*5)*VIEW_PORT_SCALER);
	ctx.fillText('current speed: ' + player.vectorSpeed/SPEED_OF_LIGHT + 'c',0,(textSize*6)*VIEW_PORT_SCALER);
	ctx.fillText('vx: ' + round((player.vx/SPEED_OF_LIGHT),4) + 'c - vy:' +  round((player.vy/SPEED_OF_LIGHT),4) + 'c',0,(textSize*7)*VIEW_PORT_SCALER);
	ctx.fillText('fps: ' + round(gameEngine.fps,0),0,(textSize*8)*VIEW_PORT_SCALER);
	ctx.fillText('speedSnapshot: ' + round(gameEngine.speedSnapshot,0) + ' units/sec',0,(textSize*9)*VIEW_PORT_SCALER);
	ctx.fillText('elapsedTime: ' + round((Date.now()-gameEngine.gameStartTime)/1000,2) + ' sec',0,(textSize*10)*VIEW_PORT_SCALER);
	
	ctx.restore();
}

universeViewDriver.update = function(){
	bob.updatePosition();
	sun.updatePosition();
	earth.updatePosition();
	sunAtmosphere.updatePosition();
	player.updatePosition();

	var doDraw = scale >= .01;
	for(var i = 1; i <= numberOfEnemies; i++){
		enemies['enemy' + i].updatePosition();
		enemies['enemy' + i].doDraw=doDraw;
	}
}

universeViewDriver.controls = universeViewControls;
universeViewControls.clickControls = clickControls;
universeViewControls.doWarpClick = doWarpClick;
universeViewControls.doThrusterClick = doThrusterClick;




class GameDriver {
	constructor(renderer) {
this.renderer = renderer;
		this.player = player;
		this.render = universeViewDriver.render;
		this.update = universeViewDriver.update;
		this.controls = universeViewDriver.controls;
		this.clickControls = universeViewControls.clickControls;
		this.doWarpClick = universeViewControls.doWarpClick;
		this.doThrusterClick  = universeViewControls.doThrusterClick;
                this.init = initBindings;
//this.onkeydown = universeViewDriver.controls.onkeydown;
//this.onmousemove = universeViewDriver.controls.onmousemove;

	}
}


