/* global CommonMath */
/* global Controls */





class ScaledControl{
	constructor(driver, id,doClick,x,y,width,height,image,doHighlight,highlightColor,angle){
		this.driver = driver;
		this.id=id;
		this.doClick=doClick;
		this.x=x;
		this.y=y;
		this.width=width;
		this.height=height===undefined || height===null ? width : height;
		this.image=image;
		this.doHighlight=doHighlight;
		this.isCircle=height===undefined || height===null;
		this.highlightColor = highlightColor;
		this.angle = angle;
	}
	
	draw(){
		if(this.isCircle){
			var bounds = this.getBounds();
			this.driver.renderer.drawImage(true,this.image,bounds.centerX,bounds.centerY,bounds.smallerDimention*this.width,bounds.smallerDimention*this.width,this.angle,true);
		}else{
			this.driver.renderer.drawImage(true,this.image,this.driver.renderer.width*this.x,this.driver.renderer.height*this.y,this.driver.renderer.width*this.width,this.driver.renderer.height*this.height,this.angle,false);
		}
		
		if(this.doHighlight !== undefined && this.doHighlight !== null && this.doHighlight() === true){
			this.highlightColor = this.highlightColor===undefined || this.highlightColor===null ? 'red' : this.highlightColor;
			
			if(this.isCircle){
				var bounds = this.getBounds();
				this.driver.renderer.drawCircle(true,bounds.centerX,bounds.centerY,bounds.smallerDimention*(this.width/2),null,null,3*this.driver.renderer.viewPortScaler, this.highlightColor);
			}else{
				this.driver.renderer.drawRectangle(true,this.driver.renderer.width*this.x,this.driver.renderer.height*this.y,this.driver.renderer.width*this.width,this.driver.renderer.height*this.height,null,null,3*this.driver.renderer.viewPortScaler, this.highlightColor);
			}
		}
	}
	
	clicked(mouseX,mouseY){
		var bounds = this.getBounds();
		var isClicked = false;
		if(this.isCircle){
			var dx = bounds.centerX - mouseX;
			var dy = bounds.centerY - mouseY;
			var distance =Math.sqrt(dx*dx+dy*dy);
			isClicked = distance <= bounds.smallerDimention*(this.width/2);
		}else{
			isClicked = mouseX>=bounds.leftBound && mouseX<=bounds.rightBound&&mouseY>=bounds.upperBound&&mouseY<=bounds.lowerBound;
		}
		
		return isClicked;
	}
	
	getBounds(){
		var bounds = {};
		bounds.smallerDimention = this.driver.renderer.height < this.driver.renderer.width ? this.driver.renderer.height : this.driver.renderer.width;
		bounds.leftBound = this.driver.renderer.width*this.x;
		bounds.rightBound = bounds.leftBound+this.driver.renderer.width*this.width;
		bounds.upperBound = this.driver.renderer.height*this.y;
		bounds.lowerBound = bounds.upperBound+this.driver.renderer.height*this.height;
		bounds.centerX=this.driver.renderer.width*this.x+((this.driver.renderer.width*this.width)/2);
		if(this.isCircle){
			bounds.centerY=this.driver.renderer.height*this.y+((bounds.smallerDimention*this.width)/2);
		}else{
			bounds.centerY=this.driver.renderer.height*this.y+((this.driver.renderer.height*this.height)/2);
		}
		
		return bounds;
	}
}



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
		this.showTips = true;
		this.showStats = true;

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
		
		
		
		
		this.controls = new Controls(this);
		ControlsBinder.bind(this, document);

		//CLICK CONTROLS
		//driver, id,doClick,x,y,width,height,image,doHighlight,highlightColor
		
		this.clickCooldowns = {};
        
        const canDoCooldown = (keyCode) => {
        	if(!this.clickCooldowns['' + keyCode]) {
        		return true;
        	}
        	return !this.clickCooldowns['' + keyCode] || (new Date()).getTime() >= this.clickCooldowns['' + keyCode];
        };
		
		const clickCircle = (keyCode, isDownOverride, cooldown) => {
        	let isDown;
        	if(isDownOverride === undefined) {
        		this.clickIsDownMemory['' + keyCode] = !this.clickIsDownMemory['' + keyCode];
        		isDown = this.clickIsDownMemory['' + keyCode];
        	} else {
        		this.clickIsDownMemory['' + keyCode] = isDownOverride;
        		isDown = isDownOverride;
        	}
        	
        	if(!canDoCooldown(keyCode)) {
        		return;
        	} else if(cooldown !== undefined) {
        		this.clickCooldowns['' + keyCode] = (new Date()).getTime() + (cooldown*1000);
        	}
        	
        	if(isDown) {
        		this.controls.onkeydown({
	        		keyCode
	        	});
        	} else {
        		this.controls.onkeyup({
	        		keyCode
	        	});
        	}
        };
        
		const image = (src) => {
			const img = {};
			img.img = new Image();
        	img.img.src = src;
        	return img;
		}
		
		this._clickControls = [];
		
		
		
		const unclickAll = () => {
			clickCircle(81, false);
			clickCircle(87, false);
			clickCircle(69, false);
			clickCircle(65, false);
			clickCircle(68, false);
			clickCircle(83, false);
		}
		
		this.warpControl = new ScaledControl(this, 'sideShotControl', ()=>clickCircle(50, true, 10), .30, .80, (1 / 24), .05, image('/img/space/icon-warp.png'), () => canDoCooldown(50));
        this.thrusterControl = new ScaledControl(this, 'thrusterControl', () => unclickAll(), .30, .90, (1 / 24), .05, image('/img/space/icon-thruster.png'));
        this.homeControl = new ScaledControl(this, 'homeControl', ()=>clickCircle(74, true, 10), .95, .05, (1 / 30), .05, image('/img/space/home.png'), () => canDoCooldown(74));


        //CIRCLE CONTROLL
        this._clickControls.push(this.thrusterControl);
        this._clickControls.push(this.warpControl);
        this.clickControls.push(this.homeControl);
        
        
        
        this.clickIsDownMemory = {};
        
        const doMemoryHighlight = (keyCode) => {
        	return 	this.clickIsDownMemory['' + keyCode];
        };
		
		var circleImage = image('/img/space/shoot.png');
		var arrowImage = image('/img/space/arrow.jpg');
		var minusImage = image('/img/space/minus.jpg');
		var plusImage = image('/img/space/plus.jpg');
		
		
		this._clickControls.push(new ScaledControl(this, 'statControl', ()=>this.showStats = !this.showStats, .01, .3, (1 / 64), null, plusImage, () => this.showStats, null, 45),);
		this._clickControls.push(new ScaledControl(this, 'tipControl', ()=>this.showTips = !this.showTips, .70, .02, (1 / 64), null, plusImage, () => this.showTips, null, 45),);
		this._clickControls.push(new ScaledControl(this, 'bigTrigger', ()=>clickCircle(32, true), .80, .80, (4 / 24), null, circleImage)),
        
        this._clickControls.push(...[
        	new ScaledControl(this, 'circleControl1', ()=>clickCircle(81), .02, .70, (2 / 24), null, arrowImage, () => doMemoryHighlight(81), null, -45),
        	new ScaledControl(this, 'circleControl2', ()=>clickCircle(87), .10, .70, (2 / 24), null, arrowImage, () => doMemoryHighlight(87)),
        	new ScaledControl(this, 'circleControl3', ()=>clickCircle(69), .18, .70, (2 / 24), null, arrowImage, () => doMemoryHighlight(69), null, 45),
        	
        	new ScaledControl(this, 'circleControl4', ()=>clickCircle(65), .02, .80, (2 / 24), null, arrowImage, () => doMemoryHighlight(65), null, -90),
        	new ScaledControl(this, 'circleControl5', ()=>clickCircle(32, true), .10, .80, (2 / 24), null, circleImage),
        	new ScaledControl(this, 'circleControl6', ()=>clickCircle(68), .18, .80, (2 / 24), null, arrowImage, () => doMemoryHighlight(68), null, 90),
        	
        	new ScaledControl(this, 'circleControl7', ()=>clickCircle(109, true), .02, .90, (2 / 24), null, minusImage),
        	new ScaledControl(this, 'circleControl8', ()=>clickCircle(83), .10, .90, (2 / 24), null, arrowImage, () => doMemoryHighlight(83), null, -180),
        	new ScaledControl(this, 'circleControl9', ()=>clickCircle(107, true), .18, .90, (2 / 24), null, plusImage)
        ]);
		//END CLICK CONTROLS


		
		
		

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
			this.enemies = {};
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
				if(entry[1].kill || ((entry[1].lifeSpan - entry[1].age) < 8)) {
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
		
		this.score = 0;
		this.socket.on('score', (data) => {
			this.score = data.score;
		});
		
		this.socket.on('damage', (data) => {
			this._player.hp = data.hp;
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
			this._player.x = motion.x;
			this._player.y = motion.y;
			this._player.angle = motion.angle;
			this._player.baseSpeed = motion.baseSpeed;
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
		var textSize = 25;
		
		this._renderer.ctx.fillStyle = 'orange';
		this._renderer.ctx.font = (textSize*2 * this._renderer.viewPortScaler) + 'pt Calibri';
		this._renderer.ctx.fillText('Ludum Dare 44: Shooter.io', 300, (textSize * 2) * this._renderer.viewPortScaler);
		
		this._renderer.ctx.font = (textSize * this._renderer.viewPortScaler) + 'pt Calibri';
		
		
		this._renderer.ctx.fillStyle = 'white';
		this._renderer.ctx.fillText('Life: ', 0, (textSize * 1) * this._renderer.viewPortScaler);
		this._renderer.ctx.fillStyle = 'red';
		this._renderer.ctx.fillText(this._player.hp, 100 * this._renderer.viewPortScaler, (textSize * 1) * this._renderer.viewPortScaler);
		this._renderer.ctx.font = (textSize * this._renderer.viewPortScaler) + 'pt Calibri';
		
		this._renderer.ctx.fillStyle = 'white';
		this._renderer.ctx.fillText('Score ', 0, (textSize * 2) * this._renderer.viewPortScaler);
		this._renderer.ctx.fillStyle = 'green';
		this._renderer.ctx.fillText(this.score, 100 * this._renderer.viewPortScaler, (textSize * 2) * this._renderer.viewPortScaler);

		this._renderer.ctx.fillStyle = 'white';
		if(this.showStats) {
			
			this._renderer.ctx.fillText(`  (${CommonMath.round(this._player.x)}, ${CommonMath.round(this._player.y)}) - [${CommonMath.round(this._player.angle)}°]`, 0, (textSize * 4) * this._renderer.viewPortScaler);
			this._renderer.ctx.fillText('  Speed: ' + CommonMath.round(this._player.baseSpeed), 0, (textSize * 5) * this._renderer.viewPortScaler);
			this._renderer.ctx.fillText('  Scale (scroll[+/-]): ' + this._renderer.scale, 0, (textSize * 7) * this._renderer.viewPortScaler);
			this._renderer.ctx.fillText('  Online Multi-player', 0, (textSize * 10) * this._renderer.viewPortScaler);
			
			this._renderer.ctx.fillText('  Elapsed Time: ' + CommonMath.round((Date.now() - this.gameStartTimeServer) / 1000, 2) + ' sec', 0, (textSize * 11) * this._renderer.viewPortScaler);
		
			this._renderer.ctx.fillText('  aruffino84@gmail.com', 0, (textSize * 12) * this._renderer.viewPortScaler);
			this._renderer.ctx.fillText('  WASD ↑ ← ↓ →', 0, (textSize * 20) * this._renderer.viewPortScaler);
		}
		
		
		//this._renderer.ctx.fillText('elapsedTime: ' + CommonMath.round((Date.now() - this.gameStartTime) / 1000, 2) + ' sec', 0, (textSize * 10) * this._renderer.viewPortScaler);
		
		
		
		
		if(this.showTips) {
			this._renderer.ctx.font = ((textSize/1.5) * this._renderer.viewPortScaler) + 'pt Calibri';
			this._renderer.ctx.fillText('Kill red guys or they will get you.  Blue guys will hurt you too.', 600, (textSize * 4) * this._renderer.viewPortScaler);
			this._renderer.ctx.fillText('Green will heal.  Watch out at respawn time.', 600, (textSize * 5) * this._renderer.viewPortScaler);
			this._renderer.ctx.fillText('Click home to go to the center.' + this._player.hp, 600, (textSize * 6) * this._renderer.viewPortScaler);
		}
		
		
		
		for (var i = 0; i < this._clickControls.length; i++) {
            this._clickControls[i].draw();
        }
		
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
