const inBrowser = typeof window !== 'undefined';
class CommonMath {
	
	static round(num, sigDigits) {
		if (sigDigits === undefined || sigDigits === null) {
			sigDigits = 2;
		}

		var powerOfTen = Math.pow(10, sigDigits);
		var inversePowerOfTen = sigDigits === 0 ? 0 : Math.pow(10, (-100 * sigDigits));

		return Math.round((num + inversePowerOfTen) * powerOfTen) / powerOfTen;
	}

	//UTILITIES
    static degreesToRadians(angle){
		return angle * Math.PI / 180;
	}

	static radiansToDegrees(angle){
		return angle / (Math.PI / 180);
	}
	
	static getRandomColor() {
		var letters = '0123456789ABCDEF'.split('');
		var color = '#';
		for (var i = 0; i < 6; i++) {
			color += letters[Math.floor(Math.random() * 16)];
		}
		return color;
	}
}


class Entity {
	constructor({driver, type, id, x, y, width, height, angle, movementSpeed, shape, fillStyle, lineWidth, strokeStyle, image}) {
		this.driver = driver;
		this.type = type;
		this.id = id;
		this._x = x;
		this._y = y;
		this.width = width;
		this.height = height;
		this._angle = angle;
		this.movementSpeed = movementSpeed;
		this.shape = shape;
		this.fillStyle = fillStyle;
		this.strokeStyle = strokeStyle;
		this.lineWidth = lineWidth;
		this.image = image;
		this.baseLineWidth = lineWidth;
		this.baseWidth = width;
		this.baseHeight = height;
		this.baseSpeed = movementSpeed;
		this.motionDetected = false;



		if (this.driver.renderer && (this.image === undefined || this.image === null)) {
			var shapeImage = {};

			var shape_canvas = this.driver.renderer.document.createElement('canvas');

			var canvasWidth = (this.shape === 'circle' ? this.width * 2 : this.width) + this.lineWidth;
			var canvasHeight = (this.shape === 'circle' ? this.height * 2 : this.height) + this.lineWidth;

			shape_canvas.width = canvasWidth + 1;
			shape_canvas.height = canvasHeight + 1;
			var shape_context = shape_canvas.getContext('2d');

			if (this.shape === 'circle') {
				//drawCircleFromContext(context, beginPath, x, y,radius,rotationAngle,fillStyle,lineWidth,strokeStyle,startAngle,endAngle, fillGap);
				this.driver.renderer.drawCircleFromContext(shape_context, true, canvasWidth / 2, canvasWidth / 2, this.width, null, this.fillStyle, this.lineWidth, this.strokeStyle);


			}
			else if (this.shape === 'rectangle') {
				this.driver.renderer.drawRectangleFromContext(shape_context, true, this.lineWidth / 2, this.lineWidth / 2, this.width, this.height, null, this.fillStyle, this.lineWidth, this.strokeStyle);

				this.imageHeight = canvasHeight;
				this.imageWidth = canvasWidth;
			}

			this.baseImageHeight = this.imageHeight = canvasHeight;
			this.baseImageWidth = this.imageWidth = canvasWidth;

			shapeImage.img = shape_canvas;
			this.image = shapeImage;
		}

	}


	get angle() {
		return this._angle;
	}
	
	set angle(angle) {
		this._angle = angle;
	}

	get x() {
		return this._x;
	}

	set x(x) {
		this._x = x;
	}

	get y() {
		return this._y;
	}

	set y(y) {
		this._y = y;
	}
	
	
	baseInfo() {
		return {
			driver: this.driver, 
			type: this.type, 
			id: this.id, 
			x: this._x, 
			y: this._y, 
			width: this.baseWidth, 
			height: this.baseHeight, 
			angle: this._angle, 
			movementSpeed: this.movementSpeed, 
			shape: this.shape, 
			fillStyle: this.fillStyle, 
			lineWidth: this.lineWidth, 
			strokeStyle: this.strokeStyle, 
			image: this.image
		}
	}


	updatePosition() {

		this.motionDetected = false;
		var minimumScale = .00000001;
		if (this.driver.renderer.scale < minimumScale) {
			this.driver.renderer.scale = minimumScale;
		}

		var scaler = this.driver.renderer.scale * this.driver.renderer.viewPortScaler;

		this.lineWidth = this.baseLineWidth * scaler;
		this.width = this.baseWidth * scaler;
		this.height = this.baseHeight * scaler;

		if (this.imageHeight !== undefined) {
			this.imageHeight = this.baseImageHeight * scaler;
		}
		if (this.imageWidth !== undefined) {
			this.imageWidth = this.baseImageWidth * scaler;
		}
	}

	draw() {

		var renderer = this.driver.renderer;

		var doDraw = this.doDraw === undefined || this.doDraw === null || this.doDraw === true;

		if (doDraw) {
			var x = this._x - this.driver.player.x;
			var y = this._y - this.driver.player.y;
			var angle = this._angle;

			if (this.driver.player.firstPerson) {
				var firstPersonOrientation = this.calculateFirstPersonOrientation();
				x = firstPersonOrientation.x;
				y = firstPersonOrientation.y;
				angle = firstPersonOrientation.angle;
			}

			var fill = this.fillStyle !== undefined && this.fillStyle !== null;

			if ((this.driver.preRender || this.baseImageHeight === undefined) && (this.image !== undefined && this.image !== null)) {
				var imageHeight = this.imageHeight !== undefined ? this.imageHeight : this.height;
				var imageWidth = this.imageWidth !== undefined ? this.imageWidth : this.width;
				this.driver.renderer.drawRealImage(true, this.image, x, y, imageWidth, imageHeight, angle, true);
			}
			else if (this.shape === 'circle') {
				this.driver.renderer.drawRealCircle(true, x, y, this.width, null, this.fillStyle, this.lineWidth, this.strokeStyle);
			}
			else if (this.shape === 'rectangle') {
				this.driver.renderer.drawRealRectangle(true, x, y, this.width, this.height, angle, this.fillStyle, this.lineWidth, this.strokeStyle, true);
			}
		}

	}


	//UTILS

	calculateFirstPersonOrientation() {

		var x1 = null;
		var y1 = null;
		var angle1 = null; // Entity view angle from the player's view Y-Axis

		var dx = this._x - this.driver.player.x;
		var dy = this._y - this.driver.player.y;

		var d = Math.sqrt(dx * dx + dy * dy);

		var realAngleToEntity = Math.atan2(dx, dy);
		var viewAngleToEntity = realAngleToEntity - CommonMath.degreesToRadians(this.driver.player.angle - 90);
		var entityToPlayerXaxisAngle = CommonMath.degreesToRadians(90) - viewAngleToEntity;

		x1 = Math.cos(entityToPlayerXaxisAngle) * d;
		y1 = Math.sin(entityToPlayerXaxisAngle) * d;

		if (this._angle !== undefined && this._angle !== null) {
			angle1 = this._angle - (this.driver.player.angle - 90);
		}

		return { x: x1, y: y1, angle: angle1 };
	}

	calculateMovementData(angle, speed, reverse) {
		var angleInRadians = CommonMath.degreesToRadians(angle);
		var sinOfAngle = Math.sin(angleInRadians);
		var cosOfAngle = Math.cos(angleInRadians);

		if (this._spaceMovement) {
			var vxTemp = this.vx;
			var vyTemp = this.vy;

			if (reverse) {
				this.vy -= speed * sinOfAngle;
				this.vx += speed * cosOfAngle;
			}
			else {
				this.vy += speed * sinOfAngle;
				this.vx -= speed * cosOfAngle;
			}

			this.vectorSpeed = Math.sqrt(Math.pow(this.vx, 2) + Math.pow(this.vy, 2));

		}
		else {
			speed = speed * this.driver.gameEngine.frimScaler;

			if (reverse) {
				this._y -= speed * sinOfAngle;
				this._x += speed * cosOfAngle;
			}
			else {
				this._y += speed * sinOfAngle;
				this._x -= speed * cosOfAngle;
			}
		}
	}

	getDistance(entity) { // return distance (number)
		var dx = this._x - entity.x;
		var dy = this._y - entity.y;
		return Math.sqrt(dx * dx + dy * dy);
	}

}

class Player extends Entity {
	constructor({driver, id, x, y, width, height, angle, startAngle, movementSpeed, img}) {
		var playerImage = {};

		if (img === undefined || img === null) {
			playerImage.orientation = 180;
			playerImage.img = new Image();
			playerImage.img.src = '/img/space/blueships1.png';
		}
		else {
			playerImage = img;
		}

		super({
			driver,
			type: 'player',
			id,
			x,
			y,
			width,
			height,
			angle,
			movementSpeed,
			shape: 'rectangle',
			fillStyle: 'red',
			lineWidth: 'green',
			strokeStyle: null,
			image:playerImage
		})
		
		this.startAngle = startAngle;
		this.lastRightTurnTime = null;
		this.lastLeftTurnTime = null;
		this._spaceMovement = false;
		this.vectorSpeed = 0;
		this.angleChangeSpeed = 6;

		this.heightToWidthRatio = height / width;

		if (this.vx === undefined || this.vx === null) {
			this.vx = 0;
		}

		if (this.vy === undefined || this.vy === null) {
			this.vy = 0;
		}

		this.firstPerson = true;
		this.pressingLeftClick = false;
		this.pressingLeftClickPlusShift = false;
		this.pressingRightClick = false;
		this.pressingDown = false;
		this.pressingUp = false;
		this.pressingLeft = false;
		this.pressingRight = false;
		this.strafingLeft = false;
		this.strafingRight = false;
		this.timeWhenLeftMouseWasPressed = null;
		this.paued = false;
		this.mouseX = null;
		this.mouseY = null;
	}

	get spaceMovement() {
		return this._spaceMovement;
	}

	set spaceMovement(spaceMovement) {
		this._spaceMovement = spaceMovement;
	}
	
	baseInfo() {
		return {
			id: this.id,
			x: this._x,
			y: this._y,
			width: this.baseWidth,
			height: this.baseHeight,
			angle: this._angle,
			startAngle: this.startAngle,
			movementSpeed: this.movementSpeed
		}
	}

	draw(superOnly) {
		
		if(superOnly) {
			super.draw();
			return;
		}

		var playerAngle = this._angle;
		if (this.firstPerson) {
			playerAngle = this.startAngle;
		}

		var widthToDraw = this.width;
		var heightToDraw = this.height;

		if (widthToDraw < 30 * this.driver.renderer.viewPortScaler) {
			widthToDraw = 30 * this.driver.renderer.viewPortScaler;
			heightToDraw = widthToDraw * this.heightToWidthRatio;
		}

		this.driver.renderer.drawRealImage(true, this.image, 0, 0, widthToDraw, heightToDraw, playerAngle);
		this.driver.renderer.drawRealCircle(true, 0, 0, 1, null, 'red');
	}



	updatePosition(superOnly) {
		super.updatePosition();
		
		if(superOnly) {
			return;
		}
		
		var originalAngle = this._angle;

		// this.movementSpeed = this.baseSpeed*(scale/3);
		// this.movementSpeed = CommonMath.round(this.movementSpeed*(1/scale),1);
		// this.movementSpeed = CommonMath.round((this.baseSpeed*(scale/3))*(1/scale),1);

		var speed = 0;

		if (false && !this.driver.player.spaceMovement) {
			this.movementSpeed = this.baseSpeed / (this.driver.renderer.scale * 10);
			this.movementSpeed = this.movementSpeed > 0 ? this.movementSpeed : .01;
		}
		else {
			this.movementSpeed = this.baseSpeed / 10;
		}

		var strafing = false;
		var movingForwardOrBackWard = false;

		if ((this.pressingDown && this.pressingUp !== true) || (this.pressingUp && this.pressingDown !== true)) {
			movingForwardOrBackWard = true;
		}
		
		let angleOfMotion = 0;
		if (this.pressingRightClick && (this.pressingRight || this.pressingLeft)) {
			strafing = true;
			if (this.pressingRight && this.pressingLeft !== true) {
				angleOfMotion -= 90;
			}
			else if (this.pressingLeft && this.pressingRight !== true) {
				angleOfMotion += 90;
			}
			if (angleOfMotion !== 0) {
				speed = this.movementSpeed;
				if (this.pressingDown) {
					speed = speed / 2;
				}
				if (movingForwardOrBackWard) {
					speed = Math.sqrt(Math.pow(speed, 2) / 2);
				}
				this.calculateMovementData(this._angle - angleOfMotion, speed, false);
			}
		}
		else if (this.pressingRightClick) {
			var difMidAccordingToMouseX = (this.driver.renderer.width / 2) - this.mouseX;
			var difMidAccordingToMouseY = (this.driver.renderer.height / 2) - this.mouseY;
			if (this.mouseX >= (this.driver.renderer.width / 2) && this.mouseY < (this.driver.renderer.height / 2)) {
				this._angle = 90 - CommonMath.radiansToDegrees(Math.atan(difMidAccordingToMouseX / difMidAccordingToMouseY));
			}
			else if (this.mouseX >= (this.driver.renderer.width / 2) && this.mouseY > (this.driver.renderer.height / 2)) {
				this._angle = 270 - CommonMath.radiansToDegrees(Math.atan(difMidAccordingToMouseX / difMidAccordingToMouseY));
			}
			else if (this.mouseY >= (this.driver.renderer.height / 2) && this.mouseX < (this.driver.renderer.width / 2)) {
				this._angle = 270 - CommonMath.radiansToDegrees(Math.atan(difMidAccordingToMouseX / difMidAccordingToMouseY));
			}
			else if (this.mouseY <= (this.driver.renderer.height / 2) && this.mouseX < (this.driver.renderer.width / 2)) {
				this._angle = 90 - CommonMath.radiansToDegrees(Math.atan(difMidAccordingToMouseX / difMidAccordingToMouseY));
			}

		}
		else {
			if (this.pressingRight && this.pressingLeft !== true) {
				if (this.lastRightTurnTime == null) {
					this.lastRightTurnTime = Date.now();
				}
				if (true || Date.now() - this.lastRightTurnTime > 50) {
					this._angle += (this.driver.player.angleChangeSpeed * this.driver.gameEngine.frimScaler);
					this.lastRightTurnTime = Date.now();
				}
			}
			else if (this.pressingLeft && this.pressingRight !== true) {
				if (this.lastLeftTurnTime == null) {
					this.lastLeftTurnTime = Date.now();
				}
				if (true || Date.now() - this.lastLeftTurnTime > 50) {
					this._angle -= (this.driver.player.angleChangeSpeed * this.driver.gameEngine.frimScaler);
					this.lastLeftTurnTime = Date.now();
				}
			}
		}

		if (strafing === false && (this.strafingLeft || this.strafingRight)) {
			angleOfMotion = 0;
			if (this.strafingRight && this.strafingLeft !== true) {
				angleOfMotion -= 90;
			}
			else if (this.strafingLeft && this.strafingRight !== true) {
				angleOfMotion += 90;
			}
			if (angleOfMotion !== 0) {
				strafing = true;
				speed = this.movementSpeed;
				if (this.pressingDown) {
					speed = speed / 2;
				}
				if (movingForwardOrBackWard) {
					speed = Math.sqrt(Math.pow(speed, 2) / 2);
				}
				this.calculateMovementData(this._angle - angleOfMotion, speed, false);
			}
		}


		if (this._angle >= 360) {
			this._angle = this._angle - 360;
		}
		else if (this._angle < 0) {
			this._angle = 360 + this._angle;
		}
		else {
			this._angle = CommonMath.round(this._angle, 0);
		}

		if (this.pressingDown && this.pressingUp !== true) {
			speed = this.movementSpeed / 2;
			if (strafing) {
				speed = Math.sqrt(Math.pow(speed, 2) / 2);
			}
			this.calculateMovementData(this._angle, speed, true);
		}
		else if (this.pressingUp && this.pressingDown !== true) {
			speed = this.movementSpeed;
			if (strafing) {
				speed = Math.sqrt(Math.pow(speed, 2) / 2);
			}
			this.calculateMovementData(this._angle, speed, false);
		}

		this._y += (this.vy * this.driver.gameEngine.frimScaler);
		this._x += (this.vx * this.driver.gameEngine.frimScaler);
		

		if (!this._spaceMovement) {
			this.vectorSpeed = speed > 0 ? CommonMath.round(this.driver.player.movementSpeed) : 0;
		}
		
		if(this._angle !== originalAngle || speed !== 0) {
			this.motionDetected = true;
		}
	}
}










class Controls {
	constructor(driver) {
		this.driver = driver;
	}

	onmousedown(mouse) {
		var mouseX = mouse.x - this.driver.renderer.horizontalOffset;
		var mouseY = mouse.y - this.driver.renderer.verticalOffset;
		if (mouse.which === 1) {
			this.driver.player.pressingLeftClick = true;
			this.driver.player.timeWhenLeftMouseWasPressed = Date.now();
			if (mouse.shiftKey) {
				this.driver.player.pressingLeftClickPlusShift = true;
			}
		}
		else if (mouse.which === 3) {
			this.driver.player.pressingRightClick = true;
		}
		this.setPlayerMouse(mouseX, mouseY);
	}

	onmouseup(mouse) {
		if (mouse.which === 1) {
			this.driver.player.pressingLeftClick = false;
			this.driver.player.pressingLeftClickPlusShift = false;
		}
		else if (mouse.which === 3) {
			this.driver.player.pressingRightClick = false;
		}
	}

	onclick(mouse) {
		var msHeld = (Date.now() - this.driver.player.timeWhenLeftMouseWasPressed);
		if (msHeld < 1000) {

			var mouseX = mouse.x - this.driver.renderer.horizontalOffset;
			var mouseY = mouse.y - this.driver.renderer.verticalOffset;

			var controlClicked = false;

			if (this.driver.clickControls !== undefined && this.driver.clickControls != null) {
				for (var i = 0; i < this.driver.clickControls.length; i++) {
					controlClicked = this.driver.clickControls[i].clicked(mouseX, mouseY);

					if (controlClicked) {
						this.driver.clickControls[i].doClick();
						break;
					}
				}
			}

			if (controlClicked === false) {
				this.setPlayerMouse(mouseX, mouseY);
				this.driver.log(CommonMath.round(this.driver.player.mouseX), CommonMath.round(this.driver.player.mouseY));
			}

		}
		this.driver.player.timeWhenLeftMouseWasPressed = null;
	}

	ondblclick(mouse) {

	}

	oncontextmenu(mouse) {
		mouse.preventDefault();
	}

	onmousemove(mouse) {
		this.driver.player.mouseX = mouse.x - this.driver.player.horizontalOffset;
		this.driver.player.mouseY = mouse.y - this.driver.player.verticalOffset;
	}

	onkeydown(event) {
		
		if (inBrowser) {
			console.log('Key: ' + event.keyCode);
		}
		
		if(this.driver.socket) {
			//this.driver.log(event.keyCode);
			this.driver.socket.emit('control', {
				name: 'onkeydown',
				value: {
					keyCode: event.keyCode
				}});
		}
		
		if (event.keyCode === 68) { //d
			this.driver.player.pressingRight = true;
		} else if (event.keyCode === 83) //s
			this.driver.player.pressingDown = true;
		else if (event.keyCode === 65) //a
			this.driver.player.pressingLeft = true;
		else if (event.keyCode === 87) { // w
			this.driver.player.pressingUp = true;
		} else if (event.keyCode === 81) // q
			this.driver.player.strafingLeft = true;
		else if (event.keyCode === 69) // e
			this.driver.player.strafingRight = true;
		else if (event.keyCode === 80) //p
			this.driver.player.paused = !this.driver.player.paused;
		else if (event.keyCode === 70) { //f
			this.driver.player.firstPerson = !this.driver.player.firstPerson;
		}
		else if (event.keyCode === 88) { //x
			if (this.driver.previousScale !== undefined && this.driver.previousScale !== null) {
				this.driver.renderer.scale = this.driver.previousScale;
				this.driver.previousScale = null;
			}
			else {
				this.driver.previousScale = this.driver.renderer.scale;
				this.driver.renderer.scale = this.driver.renderer.startScale;
			}

		}
		else if (event.keyCode === 74) { //j
			this.driver.player.x = 0;
			this.driver.player.y = 0;
		}
		else if (event.keyCode === 76) { //l
			if (this.driver.player.spaceMovement) {
				this.driver.player.vx = 0;
				this.driver.player.vy = 0;
				this.driver.player.spaceMovement = false;
			}
			else {
				this.driver.player.spaceMovement = true;
			}
		}
		else if (event.keyCode === 77) { //m
			this.driver.preRender = !this.driver.preRender;
		}
		else if (event.keyCode === 107) { //+
			var scaler = .1;
			var scale = this.driver.renderer.scale;
			if (scale < .0000001) {
				scaler = .00000001;
			}
			else if (scale < .000001) {
				scaler = .0000001;
			}
			else if (scale < .00001) {
				scaler = .000001;
			}
			else if (scale < .0001) {
				scaler = .00001;
			}
			else if (scale < .001) {
				scaler = .0001;
			}
			else if (scale < .01) {
				scaler = .001;
			}
			else if (scale < .1) {
				scaler = .01;
			}
			this.driver.renderer.scale = scale + scaler;

			var minimumScale = .00000001;
			if (this.driver.renderer.scale < minimumScale) {
				this.driver.renderer.scale = minimumScale;
			}
		}
		else if (event.keyCode === 109) { //-
			var scaler = .1;
			var scale = this.driver.renderer.scale;
			if (scale <= .0000001) {
				scaler = .00000001;
			}
			else if (scale <= .000001) {
				scaler = .0000001;
			}
			else if (scale <= .00001) {
				scaler = .000001;
			}
			else if (scale <= .0001) {
				scaler = .00001;
			}
			else if (scale <= .001) {
				scaler = .0001;
			}
			else if (scale <= .01) {
				scaler = .001;
			}
			else if (scale <= .1) {
				scaler = .01;
			}
			this.driver.renderer.scale = scale - scaler;

			var minimumScale = .00000001;
			if (this.driver.renderer.scale < minimumScale) {
				this.driver.renderer.scale = minimumScale;
			}
		}
	}

	onkeyup(event) {
		
		if(this.driver.socket) {
			//this.driver.log(event.keyCode);
			this.driver.socket.emit('control', {
				name: 'onkeyup',
				value: {
					keyCode: event.keyCode
				}});
		}
		
		if (event.keyCode === 68) //d
			this.driver.player.pressingRight = false;
		else if (event.keyCode === 83) //s
			this.driver.player.pressingDown = false;
		else if (event.keyCode === 65) //a
			this.driver.player.pressingLeft = false;
		else if (event.keyCode === 87) // w
			this.driver.player.pressingUp = false;
		else if (event.keyCode === 81) // q
			this.driver.player.strafingLeft = false;
		else if (event.keyCode === 69) // e
			this.driver.player.strafingRight = false;
	}

	onwheel(mouse) {
		//mouse.preventDefault();
		this.driver.previousScale = null;
		var zoomingIn = (mouse.shiftKey !== true && mouse.deltaY < 0) || (mouse.shiftKey && mouse.deltaX < 0);

		var sampleValue = mouse.shiftKey !== true ? this.driver.renderer.scale : this.driver.player.baseSpeed;
		var scaler = .1;

		if (zoomingIn) {
			if (sampleValue < .0000001) {
				scaler = .00000001;
			}
			else if (sampleValue < .000001) {
				scaler = .0000001;
			}
			else if (sampleValue < .00001) {
				scaler = .000001;
			}
			else if (sampleValue < .0001) {
				scaler = .00001;
			}
			else if (sampleValue < .001) {
				scaler = .0001;
			}
			else if (sampleValue < .01) {
				scaler = .001;
			}
			else if (sampleValue < .1) {
				scaler = .01;
			}
		}
		else {
			if (sampleValue <= .0000001) {
				scaler = .00000001;
			}
			else if (sampleValue <= .000001) {
				scaler = .0000001;
			}
			else if (sampleValue <= .00001) {
				scaler = .000001;
			}
			else if (sampleValue <= .0001) {
				scaler = .00001;
			}
			else if (sampleValue <= .001) {
				scaler = .0001;
			}
			else if (sampleValue <= .01) {
				scaler = .001;
			}
			else if (sampleValue <= .1) {
				scaler = .01;
			}
		}


		if (mouse.shiftKey) {
			scaler = scaler * 10 * this.driver.gameEngine.frimScaler;

			const speedScrollScaler = 20;

			if (mouse.deltaY < 0) {
				this.driver.player.baseSpeed += (scaler * speedScrollScaler);
				console.log('+++', scaler);
			}
			else if (mouse.deltaY > 0) {
				this.driver.player.baseSpeed -= (scaler * speedScrollScaler);
				console.log('---', scaler);
			}

			if (this.driver.player.baseSpeed < 1) {
				this.driver.player.baseSpeed = 1;
			}

			this.driver.player.baseSpeed = CommonMath.round(this.driver.player.baseSpeed, 1);


		}
		else {
			if (mouse.deltaY < 0) {
				this.driver.renderer.scale += scaler;
			}
			else if (mouse.deltaY > 0) {
				this.driver.renderer.scale -= scaler;
			}

			var minimumScale = .00000001;
			if (this.driver.renderer.scale < minimumScale) {
				this.driver.renderer.scale = minimumScale;
			}

			this.driver.renderer.scale = CommonMath.round(this.driver.renderer.scale, 8);
		}
	}


	//UTILITIES
	setPlayerMouse(mouseX, mouseY) {
		var fixedViewPlayerMouseX = ((mouseX - this.driver.renderer.centerX) / this.driver.renderer.scale / this.driver.renderer.viewPortScaler + this.driver.player.x);
		var fixedViewPlayerMouseY = ((-mouseY + this.driver.renderer.centerY) / this.driver.renderer.scale / this.driver.renderer.viewPortScaler + this.driver.player.y);

		if (this.driver.player.firstPerson) {

			var dx = fixedViewPlayerMouseX - this.driver.player.x;
			var dy = fixedViewPlayerMouseY - this.driver.player.y;
			var d = Math.sqrt(dx * dx + dy * dy);
			this.driver.log('distance', d);

			var viewAngleToEntity = Math.atan2(mouseX - this.driver.renderer.centerX, (-mouseY + this.driver.renderer.centerY));

			var fixedViewMouseAngle = ((Math.PI / 180) * (this.driver.player.angle - 90)) + viewAngleToEntity;


			this.driver.player.mouseX = (d * Math.sin(fixedViewMouseAngle) + (this.driver.player.x));
			this.driver.player.mouseY = (d * Math.cos(fixedViewMouseAngle) + (this.driver.player.y));


		}
		else {
			this.driver.player.mouseX = fixedViewPlayerMouseX;
			this.driver.player.mouseY = fixedViewPlayerMouseY;
		}
	}
}




class Hello{
	constructor(val){
		this.val = 'Hello ' + val;
		this.id = 999;
		
		if(val === 'fail') {
			throw 'Hello failure';
		}
	}
}




const common = {
    Hello: Hello,
    Entity: Entity,
    Player: Player,
    Controls: Controls,
    CommonMath: CommonMath
}

try{
	module.exports = common;
} catch(err) {
	if(!inBrowser) {
		console.error('error loading common exports', err);
	} else {
		console.log('in browser, no worries.');
	}
}
