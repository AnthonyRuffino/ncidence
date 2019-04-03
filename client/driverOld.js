/* global CommonMath */
class ControlsBinder {

	static bind(driver, document) {
		document.onmousedown = function(mouse) {
			driver.controls.onmousedown(mouse);
		};

		document.onmouseup = function(mouse) {
			driver.controls.onmouseup(mouse);
		};

		document.onclick = function(mouse) {
			driver.controls.onclick(mouse);
		};

		document.ondblclick = function(mouse) {
			driver.controls.ondblclick(mouse);
		};

		document.oncontextmenu = function(mouse) {
			driver.controls.oncontextmenu(mouse);
		};

		document.onmousemove = function(mouse) {
			driver.controls.onmousemove(mouse);
		};

		document.onkeydown = function(event) {
			driver.controls.onkeydown(event);
		};

		document.onkeyup = function(event) {
			driver.controls.onkeyup(event);
		};

		document.onwheel = function(mouse) {
			driver.controls.onwheel(mouse);
		};
	}
}



class ScaledControl {
	constructor(driver, id, doClick, x, y, width, height, image, doHighlight, highlightColor) {
		this.driver = driver;
		this.id = id;
		this.doClick = doClick;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height === undefined || height === null ? width : height;
		this.image = image;
		this.doHighlight = doHighlight;
		this.isCircle = height === undefined || height === null;
		this.highlightColor = highlightColor;
	}

	draw() {
		let bounds = this.getBounds();
		let doApplyHighlight = this.doHighlight !== undefined && this.doHighlight !== null && this.doHighlight() === true;
		
		this.highlightColor = doApplyHighlight && (this.highlightColor === undefined || this.highlightColor === null) ? 'red' : this.highlightColor;
		
		if (this.isCircle) {
			bounds = this.getBounds();
			this.driver.renderer.drawImage(true, this.image, bounds.centerX, bounds.centerY, bounds.smallerDimention * this.width, bounds.smallerDimention * this.width, null, true);
			if (doApplyHighlight) {
				this.driver.renderer.drawCircle(true, bounds.centerX, bounds.centerY, bounds.smallerDimention * (this.width / 2), null, null, 3 * this.driver.renderer.viewPortScaler, this.highlightColor);
			}
		}
		else {
			this.driver.renderer.drawImage(true, this.image, this.driver.renderer.width * this.x, this.driver.renderer.height * this.y, this.driver.renderer.width * this.width, this.driver.renderer.height * this.height, null, false);
			if(doApplyHighlight) {
				this.driver.renderer.drawRectangle(true, this.driver.renderer.width * this.x, this.driver.renderer.height * this.y, this.driver.renderer.width * this.width, this.driver.renderer.height * this.height, null, null, 3 * this.driver.renderer.viewPortScaler, this.highlightColor);
			}
		}
	}

	clicked(mouseX, mouseY) {
		var bounds = this.getBounds();
		var isClicked = false;
		if (this.isCircle) {
			var dx = bounds.centerX - mouseX;
			var dy = bounds.centerY - mouseY;
			var distance = Math.sqrt(dx * dx + dy * dy);
			isClicked = distance <= bounds.smallerDimention * (this.width / 2);
		}
		else {
			isClicked = mouseX >= bounds.leftBound && mouseX <= bounds.rightBound && mouseY >= bounds.upperBound && mouseY <= bounds.lowerBound;
		}

		return isClicked;
	}

	getBounds() {
		var bounds = {};
		bounds.smallerDimention = this.driver.renderer.height < this.driver.renderer.width ? this.driver.renderer.height : this.driver.renderer.width;
		bounds.leftBound = this.driver.renderer.width * this.x;
		bounds.rightBound = bounds.leftBound + this.driver.renderer.width * this.width;
		bounds.upperBound = this.driver.renderer.height * this.y;
		bounds.lowerBound = bounds.upperBound + this.driver.renderer.height * this.height;
		bounds.centerX = this.driver.renderer.width * this.x + ((this.driver.renderer.width * this.width) / 2);
		if (this.isCircle) {
			bounds.centerY = this.driver.renderer.height * this.y + ((bounds.smallerDimention * this.width) / 2);
		}
		else {
			bounds.centerY = this.driver.renderer.height * this.y + ((this.driver.renderer.height * this.height) / 2);
		}
		return bounds;
	}
}
























class UniverseViewControls {
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
		this.driver.log(event.keyCode);
		if (event.keyCode === 68) { //d
		console.log('right');
		    this.driver.socket.emit('control', 'right');
			this.driver.player.pressingRight = true;
		} else if (event.keyCode === 83) //s
			this.driver.player.pressingDown = true;
		else if (event.keyCode === 65) //a
			this.driver.player.pressingLeft = true;
		else if (event.keyCode === 87) // w
			this.driver.player.pressingUp = true;
		else if (event.keyCode === 81) // q
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
				this.driver.doWarpClick();
			}
			else {
				this.driver.doThrusterClick();
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

		mouse.preventDefault();

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






let chat = () => {

}

let emit = () => {

}

/* global Entity */
/* global Player */

class GameDriver {
	constructor(socket, renderer, body, log, alert) {
		this._gameStartTime = Date.now();

		this.numberOfEnemies = 1000;
		this._controls = null;
		this._renderer = renderer;
		this._angleChangeSpeed = 2;
		this.log = log;
		this.alert = alert;
		this.me = 'Anonymouz';

		//socketio overrides
		const chatFormat = (name, text) => `${name}: ${text}`;
		this.socket = socket;
		chat = (msg) => { socket.emit('message', msg); return chatFormat('me', msg) };
		emit = (key, data) => socket.emit(key, data);


		this.socket.hooks.whoami = (me) => {
			this.me = me;
		};

		this.socket.hooks.message = (msg) => {
			if (msg.name === 'Anonymous' || msg.name !== this.me) {
				console.log(chatFormat(msg.name, msg.text));
			}

		};
		
		this.ScaledControlClass = ScaledControl;

		this._gameEngine = null;

		this.speedOfLight = 4479900;



		//constructor(driver,id,x,y,width,height,angle,movementSpeed,img)
		this._player = new Player(this, 'player', 0, 0, 160, 80, 90, 30);

		//SUN
		var sunRadius = 200000;
		var sunImage = {};
		sunImage.img = new Image();
		sunImage.img.src = '/img/space/sun2.png';
		//constructor(driver,type,id,x,y,width,height,angle,movementSpeed,shape,fillStyle,lineWidth,strokeStyle,image)
		this.sun = new Entity(this, 'star', 'sun', 0, 0, sunRadius, sunRadius, 0, 0, 'circle', null, 20, 'red', sunImage);
		this.sunAtmosphere = new Entity(this, 'star', 'sunAtmosphere', 0, 0, sunRadius / 2, sunRadius / 2, 0, 0, 'circle', null, 2000, 'orange', null);


		//BOB
		var bobImage = {};
		bobImage.img = new Image();
		bobImage.img.src = '/img/space/morgan.png';
		this.bob = new Entity(this, 'person', 'bob', sunRadius * 2, 0, sunRadius / 10, sunRadius / 10, 0, 0, 'circle', null, 20, 'red', bobImage);


		//EARTH
		var earthImage = {};
		earthImage.img = new Image();
		earthImage.img.src = '/img/space/earth.png';
		this.earth = new Entity(this, 'planet', 'earth', 0, 9600000, sunRadius / 10, sunRadius / 10, 0, 0, 'circle', null, 20, 'green', earthImage);



		//CONTROLS
		var _this = this;
		var isPlayerSpaceMovement = function() {
			return _this._player.spaceMovement;
		}
		var isPlayerNotSpaceMovement = function() {
			return !_this._player.spaceMovement;
		}

		var doThrusterClick = function() {
			_this._player.spaceMovement = true;
		}

		var doWarpClick = function() {
			_this._player.vx = 0;
			_this._player.vy = 0;
			_this._player.spaceMovement = false;
		}

		//THRUSTER CONTROL
		var thrusterImage = {};
		thrusterImage.img = new Image();
		thrusterImage.img.src = '/img/space/icon-thruster.png';
		this.thrusterControl = new this.ScaledControlClass(this, 'thrusterControl', doThrusterClick, .95, .80, (1 / 24), .05, thrusterImage, isPlayerSpaceMovement);


		//WARP CONTROL
		var warpImage = {};
		warpImage.img = new Image();
		warpImage.img.src = '/img/space/icon-warp.png';
		this.warpControl = new this.ScaledControlClass(this, 'warpControl', doWarpClick, .90, .80, (1 / 24), .05, warpImage, isPlayerNotSpaceMovement);


		//CIRCLE CONTROLL
		var circleImage = {};
		circleImage.img = new Image();
		circleImage.img.src = '/img/space/circle.png';
		this.circleControl = new this.ScaledControlClass(this, 'circleControl', doThrusterClick, .70, .80, (1 / 24), null, circleImage, isPlayerSpaceMovement);





		//CLICK CONTROLS
		this._clickControls = [];
		this._clickControls.push(this.thrusterControl);
		this._clickControls.push(this.warpControl);
		this._clickControls.push(this.circleControl);
		//END CLICK CONTROLS


		//enemies
		this.enemies = {};
		for (var i = 1; i <= this.numberOfEnemies; i++) {
			var enemyX = Math.random() * 1000 * (Math.random() > .5 ? -1 : 1);
			var enemyY = Math.random() * 1000 * (Math.random() > .5 ? -1 : 1);
			var enemyW = (Math.random() * 25) + 5;
			var enemyH = (Math.random() * 25) + 5;
			var enemyShape = Math.random() > .5 ? 'circle' : 'rectangle';
			var lineWidth = 3;
			this.enemies['enemy' + i] = new Entity(this, 'enemy', 'enemy' + i, enemyX, enemyY, enemyW, enemyShape === 'circle' ? enemyW : enemyH, 15, 10, enemyShape, this.getRandomColor(), lineWidth, this.getRandomColor(), null);
		}



		var universeViewControls = new UniverseViewControls(this);
		this.controls = universeViewControls;
		ControlsBinder.bind(this, document);




		this.socket.on('load', (msg) => {
			console.log('load recieved from server', msg);
		});
		this.socket.emit('load');

		this.socket.on('beep', (msg) => {
			console.log('beep', msg, this.me);
			//alert('Beep! ' + this.me);
		});

		this.socket.on('hi', (msg) => {
			console.log('hi', msg, this.me);
			//alert('Bop! ' + this.me);
		})


	}

	//GETTERS AND SETTERS
	get clickControls() {
		return this._clickControls;
	}
	get angleChangeSpeed() {
		return this._angleChangeSpeed;
	}

	get gameStartTime() {
		return this._gameStartTime;
	}

	get gameEngine() {
		return this._gameEngine;
	}

	set gameEngine(gameEngine) {
		this._gameEngine = gameEngine;
	}

	get controls() {
		return this._controls;
	}

	set controls(controls) {
		this._controls = controls;
	}

	get player() {
		return this._player;
	}

	get renderer() {
		return this._renderer;
	}
	//END GETTERS AND SETTERS



	render() {
		this.bob.draw();
		this.sun.draw();
		this.earth.draw();
		this.sunAtmosphere.draw();
		this._player.draw();

		if (this._renderer.scale >= .01) {
			for (var i = 1; i <= this.numberOfEnemies; i++) {
				this.enemies['enemy' + i].draw(this._renderer);
			}
		}

		for (var i = 0; i < this._clickControls.length; i++) {
			this._clickControls[i].draw();
		}

		this._renderer.ctx.save();
		var textSize = 35;
		this._renderer.ctx.font = (textSize * this._renderer.viewPortScaler) + 'pt Calibri';
		this._renderer.ctx.fillStyle = 'white';
		this._renderer.ctx.fillText('player(x,y): (' + this.round(this._player.x) + "," + this.round(this._player.y) + ")", 0, (textSize * 1) * this._renderer.viewPortScaler);
		this._renderer.ctx.fillText('player angle: ' + this.round(this._player.angle), 0, (textSize * 2) * this._renderer.viewPortScaler);
		this._renderer.ctx.fillText('scale: ' + this._renderer.scale, 0, (textSize * 3) * this._renderer.viewPortScaler);
		this._renderer.ctx.fillText('base accelleration: ' + this.round(this._player.baseSpeed), 0, (textSize * 4) * this._renderer.viewPortScaler);
		this._renderer.ctx.fillText('current accelleration: ' + this.round(this._player.movementSpeed), 0, (textSize * 5) * this._renderer.viewPortScaler);
		this._renderer.ctx.fillText('current speed: ' + this._player.vectorSpeed / this.speedOfLight + 'c', 0, (textSize * 6) * this._renderer.viewPortScaler);
		this._renderer.ctx.fillText('vx: ' + this.round((this._player.vx / this.speedOfLight), 4) + 'c - vy:' + this.round((this._player.vy / this.speedOfLight), 4) + 'c', 0, (textSize * 7) * this._renderer.viewPortScaler);
		var fps = this._gameEngine !== null ? this._gameEngine.fps : 0;
		this._renderer.ctx.fillText('fps: ' + this.round(fps, 0), 0, (textSize * 8) * this._renderer.viewPortScaler);
		var speedSnapshot = this._gameEngine !== null ? this._gameEngine.speedSnapshot : 0;
		this._renderer.ctx.fillText('speedSnapshot: ' + this.round(speedSnapshot, 0) + ' units/sec', 0, (textSize * 9) * this._renderer.viewPortScaler);
		this._renderer.ctx.fillText('elapsedTime: ' + this.round((Date.now() - this.gameStartTime) / 1000, 2) + ' sec', 0, (textSize * 10) * this._renderer.viewPortScaler);

		this._renderer.ctx.restore();
	}

	update() {
		this.bob.updatePosition();
		this.sun.updatePosition();
		this.earth.updatePosition();
		this.sunAtmosphere.updatePosition();
		this._player.updatePosition();

		var doDraw = this._renderer.scale >= .01;
		for (var i = 1; i <= this.numberOfEnemies; i++) {
			this.enemies['enemy' + i].updatePosition();
			this.enemies['enemy' + i].doDraw = doDraw;
		}
	}



	//BEGIN CONTROLS
	doThrusterClick() {
		this._player.spaceMovement = true;
	}

	doWarpClick() {
		this._player.vx = 0;
		this._player.vy = 0;
		this._player.spaceMovement = false;
	}

	doCircleClick() {
		this._player.vx = 0;
		this._player.vy = 0;
		this._player.spaceMovement = false;
	}
	//END CONTROLS




	//UTILITY METHODS
	getRandomColor() {
		var letters = '0123456789ABCDEF'.split('');
		var color = '#';
		for (var i = 0; i < 6; i++) {
			color += letters[Math.floor(Math.random() * 16)];
		}
		return color;
	}

	round(num, sigDigits) {
		if (sigDigits === undefined || sigDigits === null) {
			sigDigits = 2;
		}

		var powerOfTen = Math.pow(10, sigDigits);
		var inversePowerOfTen = sigDigits === 0 ? 0 : Math.pow(10, (-100 * sigDigits));

		return Math.round((num + inversePowerOfTen) * powerOfTen) / powerOfTen;
	}

}
