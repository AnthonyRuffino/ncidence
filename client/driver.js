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
		this._player = new Player({driver: this, tag: 'dummy'});

		//CLICK CONTROLS
		this._clickControls = [];
		//END CLICK CONTROLS


		
		
		this.controls = new Controls(this);
		ControlsBinder.bind(this, document);

		this.socket.on('beep', (msg) => {
			console.log('beep', msg, this.me);
			//alert('Beep! ' + this.me);
		});

		this.socket.on('hi', ({playerData, gameStartTimeServer}) => {
			console.log("Server: 'hi'", playerData);
			this._player = new Player({...playerData, driver: this, tag: 'real' });
			this.gameStartTimeServer = gameStartTimeServer;
		})
		
		this.others = [];
		this.othersMap = {};
		this.socket.on('joiner', (playerData) => {
			console.log('joiner!', playerData);
			const other = new Player({...playerData, driver: this, tag: 'real' });
			this.others.push(other);
			this.othersMap[other.id] = other;
		})
		
		//enemies
		this.enemies = {};
		
		this.socket.on('enemies', (enemies) => {
			console.log('enemies!', enemies);
			Object.entries(enemies).forEach(enemy => {
				this.enemies[enemy[0]] = new Entity({... enemy[1], driver: this,});
			});
		})
		
		const mapMovingEntities = (movers, source) => {
			const killList = [];
			Object.entries(movers).forEach((entry) => {
				if(!source[entry[0]]) {
					const newEntity = new Entity({...entry[1], driver: this});
					source[entry[0]] = newEntity;
				}
				source[entry[0]].x = entry[1].x;
				source[entry[0]].y = entry[1].y;
				//FIXME: killing early because server wont send last ticks for some reason
				if((entry[1].lifeSpan - entry[1].age) < 8) {
					killList.push(entry[0]);
				}
			});
			killList.forEach(killId => {
				delete source[killId]
			})
		}
		
		this.socket.on('enemy-motion', (movedEnemies) => {
			mapMovingEntities(movedEnemies, this.enemies);
		});
		
		this.projectiles = {};
		this.socket.on('projectile-motion', (movedProjectiles) => {
			//console.log('projectile-motion', movedProjectiles);
			mapMovingEntities(movedProjectiles, this.projectiles);
		});
		
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
		
		Object.values(this.enemies).forEach(enemy => {
			enemy.draw();
		});
		
		
		Object.values(this.projectiles).forEach(projectile => {
			projectile.draw();
		});
		
		this.others.forEach((other) => {
			other.draw(true);
		});


		this._renderer.ctx.save();
		var textSize = 35;
		this._renderer.ctx.font = (textSize * this._renderer.viewPortScaler) + 'pt Calibri';
		this._renderer.ctx.fillStyle = 'white';
		this._renderer.ctx.fillText('player(x,y): (' + CommonMath.round(this._player.x) + "," + CommonMath.round(this._player.y) + ")", 0, (textSize * 1) * this._renderer.viewPortScaler);
		this._renderer.ctx.fillText('player angle: ' + CommonMath.round(this._player.angle), 0, (textSize * 2) * this._renderer.viewPortScaler);
		this._renderer.ctx.fillText('scale: ' + this._renderer.scale, 0, (textSize * 3) * this._renderer.viewPortScaler);
		this._renderer.ctx.fillText('base accelleration: ' + CommonMath.round(this._player.baseSpeed), 0, (textSize * 4) * this._renderer.viewPortScaler);
		this._renderer.ctx.fillText('current accelleration: ' + CommonMath.round(this._player.movementSpeed), 0, (textSize * 5) * this._renderer.viewPortScaler);
		this._renderer.ctx.fillText('current speed: ' + this._player.vectorSpeed / this.speedOfLight + 'c', 0, (textSize * 6) * this._renderer.viewPortScaler);
		this._renderer.ctx.fillText('vx: ' + CommonMath.round((this._player.vx / this.speedOfLight), 4) + 'c - vy:' + CommonMath.round((this._player.vy / this.speedOfLight), 4) + 'c', 0, (textSize * 7) * this._renderer.viewPortScaler);
		var fps = this._gameEngine !== null ? this._gameEngine.fps : 0;
		this._renderer.ctx.fillText('fps: ' + CommonMath.round(fps, 0), 0, (textSize * 8) * this._renderer.viewPortScaler);
		//var speedSnapshot = this._gameEngine !== null ? this._gameEngine.speedSnapshot : 0;
		//this._renderer.ctx.fillText('speedSnapshot: ' + CommonMath.round(speedSnapshot, 0) + ' units/sec', 0, (textSize * 9) * this._renderer.viewPortScaler);
		
		
		this._renderer.ctx.fillText('tag: ' + this._player.tag, 0, (textSize * 9) * this._renderer.viewPortScaler);
		
		
		this._renderer.ctx.fillText('elapsedTime: ' + CommonMath.round((Date.now() - this.gameStartTime) / 1000, 2) + ' sec', 0, (textSize * 10) * this._renderer.viewPortScaler);
		
		this._renderer.ctx.fillText('elapsedTimeServer: ' + CommonMath.round((Date.now() - this.gameStartTimeServer) / 1000, 2) + ' sec', 0, (textSize * 11) * this._renderer.viewPortScaler);
		this._renderer.ctx.restore();
		
		
	}

	update() {
		this._player.updatePosition(true);
		
		this.others.forEach((other) => {
			other.updatePosition(true);
		});
		
		Object.values(this.enemies).forEach(enemy => {
			enemy.updatePosition();
			enemy.doDraw = true;
		});
		
		Object.values(this.projectiles).forEach(projectile => {
			projectile.updatePosition();
			projectile.doDraw = true;
		});
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

}
