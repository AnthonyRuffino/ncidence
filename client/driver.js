/* global CommonMath */
/* global Controls */

class ControlsBinder {

	static bind(driver, target) {
		target.onmousedown = function(mouse) {
			driver.controls.onmousedown(mouse);
		};

		target.onmouseup = function(mouse) {
			driver.controls.onmouseup(mouse);
		};

		target.onclick = function(mouse) {
			driver.controls.onclick(mouse);
		};

		target.ondblclick = function(mouse) {
			driver.controls.ondblclick(mouse);
		};

		target.oncontextmenu = function(mouse) {
			driver.controls.oncontextmenu(mouse);
		};

		target.onmousemove = function(mouse) {
			driver.controls.onmousemove(mouse);
		};

		target.onkeydown = function(event) {
			driver.controls.onkeydown(event);
		};

		target.onkeyup = function(event) {
			driver.controls.onkeyup(event);
		};

		target.onwheel = function(mouse) {
			driver.controls.onwheel(mouse);
		};
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
			console.log("Client: saying 'hi'");
			emit('hi');
		};

		this.socket.hooks.message = (msg) => {
			if (msg.name === 'Anonymous' || msg.name !== this.me) {
				console.log(chatFormat(msg.name, msg.text));
			}

		};
		

		this._gameEngine = null;

		this.speedOfLight = 4479900;


		//constructor(driver,id,x,y,width,height,angle,movementSpeed,img)
		this._player = new Player({driver: this});

		//CLICK CONTROLS
		this._clickControls = [];
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



		this.controls = new Controls(this);
		ControlsBinder.bind(this, document);

		this.socket.on('beep', (msg) => {
			console.log('beep', msg, this.me);
			//alert('Beep! ' + this.me);
		});

		this.socket.on('hi', (playerData) => {
			console.log("Server: 'hi'", playerData);
			this._player = new Player({...playerData, driver: this });
		})
		
		this.others = [];
		this.othersMap = {};
		this.socket.on('joiner', (playerData) => {
			console.log('joiner!', playerData);
			const other = new Player({...playerData, driver: this });
			this.others.push(other);
			this.othersMap[other.id] = other;
		})
		
		this.socket.on('other-motion', (motion) => {
			//console.log('other-motion: ', motion);
			const other = this.othersMap[motion.id];
			other.x = motion.x;
			other.y = motion.y;
			other.angle = motion.angle;
		});
		
		this.socket.on('my-motion', (motion) => {
			//console.log('my-motion: ', motion);
			this.player.x = motion.x;
			this.player.y = motion.y;
			this.player.angle = motion.angle;
		});
		
		
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
		this._player.draw();

		for (var i = 1; i <= this.numberOfEnemies; i++) {
			this.enemies['enemy' + i].draw();
		}
		
		this.others.forEach((other) => {
			other.draw(true);
		});


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
		this._player.updatePosition(true);
		
		this.others.forEach((other) => {
			other.updatePosition(true);
		});

		for (var i = 1; i <= this.numberOfEnemies; i++) {
			//this.enemies['enemy' + i].x += 1;
			this.enemies['enemy' + i].updatePosition();
			this.enemies['enemy' + i].doDraw = true;
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
