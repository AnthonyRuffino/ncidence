/* global CommonMath */
/* global Controls */





class ScaledControl{
	constructor(driver, id,doClick,x,y,width,height,image,doHighlight,highlightColor,angle,isXyReal){
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
		this.isXyReal = isXyReal;
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
		this.showMobile = false;
		this.showTips = false;
		this.showStats = true;
		this.gameNumber = -1;

		//socketio overrides
		const chatFormat = (name, text) => `${name}: ${text}`;
		this.socket = socket;
		chat = (msg) => { socket.emit('message', msg); return chatFormat('me', msg) };
		emit = (key, data) => socket.emit(key, data);
		this.emit = emit;
		this.chat = chat;


		this.socket.hooks.whoami = (me) => {
			this.me = me;
			console.log("Client: saying 'hi'");
			emit('hi');
		};
		
		this.messages = [
			{name:':)', text: '...'},
			{name:':)', text: '...'},
			{name:':)', text: '...'},
			{name:':)', text: '...'},
			{name:'admin', text: 'Have fun hacking'},
			{name:'admin', text: 'not all of the data is controlled on the server'},
			{name:'admin', text: 'this client is very hackable btw'},
			{name:'admin', text: 'you can chat by pressing enter'},
			{name:'admin', text:'hi, this is the admin'},
		];
		this.socket.hooks.message = (msg) => {
			if(msg) {
				console.log(chatFormat(msg.name, msg.text));
				this.messages.unshift(msg);
			}
		};
		

		this._gameEngine = null;


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
		
		var circleImage = image('/img/space/shoot.png');
		var arrowImage = image('/img/space/arrow.jpg');
		var minusImage = image('/img/space/minus.jpg');
		var plusImage = image('/img/space/plus.jpg');
		var earthImage = image('/img/space/earth.png');
		
		this._clickControls = [];
		this._mobileClickControls = [];
		
		
		
		const unclickAll = (code, cooldown) => {
			
			if(!canDoCooldown(code)) {
        		return;
        	} else if(cooldown !== undefined) {
        		this.clickCooldowns['' + code] = (new Date()).getTime() + (cooldown*1000);
        	}
			
			
			clickCircle(81, false);
			clickCircle(87, false);
			clickCircle(69, false);
			clickCircle(65, false);
			clickCircle(68, false);
			clickCircle(83, false);
		}
		
		
		this.triggerControl = new ScaledControl(this, 'triggerControl', ()=>clickCircle(32, true), .30, .90, (1 / 24), null, circleImage);
		this.warpControl = new ScaledControl(this, 'sideShotControl', ()=>clickCircle(50, true, 4), .35, .90, (1 / 24), .05, image('/img/space/icon-warp.png'), () => canDoCooldown(50));
		this.homeControl = new ScaledControl(this, 'homeControl', ()=>clickCircle(51, true, 10), .40, .90, (1 / 30), .05, image('/img/space/home.png'), () => canDoCooldown(51));
		
        this.thrusterControl = new ScaledControl(this, 'stopControl', () => unclickAll(-1,5), .45, .90, (1 / 24), .05, image('/img/space/stop.png'), () => canDoCooldown(-1));
        this.viewControl = new ScaledControl(this, 'view', ()=>clickCircle(53), .50, .90, (1 / 30), .05, image('/img/space/view.png'), () => this._player.firstPerson);
		
		this.chatOn = false;
		this.chatToggle = new ScaledControl(this, 'chatToggle', ()=>{this.chatOn=!this.chatOn}, .005, .005, (1 / 30), .05, image('/img/space/chatBubble.png'), () => !this.chatOn, 'yellow');
		this._clickControls.push(this.chatToggle);
		
        //CIRCLE CONTROLL
        this._clickControls.push(this.triggerControl);
        this._clickControls.push(this.thrusterControl);
        this._clickControls.push(this.warpControl);
        this._clickControls.push(this.homeControl);
        this._clickControls.push(this.viewControl);
        
        
        
        this.clickIsDownMemory = {};
        
        const doMemoryHighlight = (keyCode) => {
        	return 	this.clickIsDownMemory['' + keyCode];
        };
		
		
		
		//this._clickControls.push(new ScaledControl(this, 'statControl', ()=>this.showStats = !this.showStats, .08, .007, (1 / 64), null, plusImage, () => this.showStats, null, 45));
		this._clickControls.push(new ScaledControl(this, 'tipControl', ()=>this.showTips = !this.showTips, .70, .02, (1 / 64), null, plusImage, () => this.showTips, null, 45));
		this._clickControls.push(new ScaledControl(this, 'mobileControl', ()=>this.showMobile = !this.showMobile, .01, .98, (1 / 64), null, plusImage, () => this.showMobile, null, 45));
        
        
        this._mobileClickControls.push(...[
        	new ScaledControl(this, 'bigTrigger', ()=>clickCircle(32, true), .80, .80, (4 / 24), null, circleImage),
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

		this.socket.on('hi', ({playerData, gameStartTimeServer, renderer}) => {
			console.log("Server: 'hi'", playerData, renderer);
			this._player = new Player({...playerData, driver: this, tag: 'real' });
			this.scale = renderer.scale;
			this.startScale = renderer.startScale
			this.gameStartTimeServer = gameStartTimeServer;
		})
		
		
		function beep() {
		    var snd = new Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");  
		    snd.play();
		}
		
		this.others = [];
		this.othersMap = {};
		this.socket.on('joiner', (playerData) => {
			console.log('joiner!', playerData);
			beep();
			const other = new Player({...playerData, driver: this, tag: 'real' });
			this.others.push(other);
			this.othersMap[other.id] = other;
		})
		
		//enemies
		this.enemies = {};
		
		this.socket.on('enemies', (enemyData) => {
			console.log('enemyData', enemyData);
			
			if(!enemyData.isSync) {
				this.showWaveAlert = true;
				setTimeout(()=>this.showWaveAlert=false,2500);
			}
			
			this.gameNumber = enemyData.gameNumber;
			this.enemies = {};
			Object.entries(enemyData.enemies).forEach(enemy => {
				this.enemies[enemy[0]] = new Entity({... enemy[1], driver: this,});
			});
		})
		
		
		
		const ringInstance = (id, width, color, x, y, image) => {
			return {
				driver: this,
				type: 'ring',
				id: 'ring' + id,
				x: x || 0,
				y: y || 0,
				vx: 0,
				vy: 0,
				width: width,
				height: width,
				angle: 0,
				movementSpeed: 0,
				shape: 'circle',
				fillStyle: null,
				lineWidth: id * 2,
				strokeStyle: color,
				image: image
			};
		};
		
		this.rings1 = {};
		this.rings2 = {};
		this.rings3 = {};
		for(let ringNumber = 0; ringNumber < 40; ringNumber++) {
			this.rings1['ring-a-' + ringNumber] = new Entity(ringInstance(ringNumber+'-a', (ringNumber*ringNumber*ringNumber*ringNumber) + 1500, 'blue'));
		}
		for(let ringNumber = 0; ringNumber < 100; ringNumber++) {
			this.rings2['ring-b-' + ringNumber] = new Entity(ringInstance(ringNumber+'b', (ringNumber * ringNumber*ringNumber*ringNumber*ringNumber) + 10000, '#00008b'));
		}
		
		for(let ringNumber = 0; ringNumber < 100; ringNumber++) {
			this.rings3['ring-c-' + ringNumber] = new Entity(ringInstance(ringNumber+'b', (ringNumber * ringNumber*ringNumber*ringNumber*ringNumber*ringNumber) + 1000000000, '#00006f'));
		}
		
		this.suns = {};
		var sunImage = image('/img/space/sun2.png');
		let earthDrawn = false;
		for(let sunNumber = 2; sunNumber < 100; sunNumber++) {
			if(sunNumber % 3 === 0) {
				const flip2 = sunNumber%2 === 0 ? -1 : 1;
				const flip3 = sunNumber%3 === 0 ? -1 : 1;
				const sunXy = (sunNumber*sunNumber * 1000);
				const square = sunNumber*sunNumber;
				const cube = square*sunNumber;
				const width = (sunNumber-1)*(16*cube + 14*square * sunNumber*100);
				const xScale = (sunXy*sunNumber*sunNumber);
				const yScale = (sunXy*sunNumber*sunNumber*sunNumber);
				const shift = 2 * (flip2*xScale*flip3*(sunNumber%4));
				this.suns['sun-' + sunNumber + 1] = new Entity(ringInstance('sun-' + sunNumber + 1, width, 'orange', flip2*xScale - shift, yScale - shift, !earthDrawn ? earthImage : sunImage));
				earthDrawn = true;
			}
		}
		 
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
				if(entry[1].kill || ((entry[1].lifeSpan - entry[1].age) < 12)) {
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
		
		this.socket.on('score', (data) => {
			this._player.score = data.score;
			this._player.hp = data.hp;
			this._player.baseSpeed = data.baseSpeed;
		});
		
		this.socket.on('damage', (data) => {
			this._player.hp = data.hp;
			this._player.checkHp(data);
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
		return [...this._clickControls,...this._mobileClickControls];
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
		
		if(this._renderer.scale >= .01) {
			Object.values(this.rings1).forEach(ring => {
				ring.draw();
			});
		}
		
		if(this._renderer.scale <= .01 && this._renderer.scale >= .000001) {
			Object.values(this.rings2).forEach(ring => {
				ring.draw();
			});
		}
		
		
		if(this._renderer.scale <= .000001) {
			Object.values(this.rings3).forEach(ring => {
				ring.draw();
			});
		}
		
		Object.values(this.suns).forEach(sun => {
			sun.draw();
		});
		
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
		
		
		let lineNumer = 0;
		let chatLineLimit = 8;
		if(this.chatOn && this.messages.length > 0) {
			this._renderer.ctx.fillStyle = 'yellow';
			for(lineNumer = 0; lineNumer < this.messages.length; lineNumer++) {
				let chatMessage = `${this.messages[chatLineLimit-lineNumer].name}: ${this.messages[chatLineLimit-lineNumer].text}`;
				chatMessage = chatMessage && chatMessage.substr(0,50);
				this._renderer.ctx.fillText(chatMessage, 50, (textSize * (lineNumer + 1)) * this._renderer.viewPortScaler);
				if(lineNumer === chatLineLimit) {
					break;
				}
			}
			
		} else if(!this.chatOn) {
			this._renderer.ctx.fillStyle = 'yellow';
			this._renderer.ctx.fillText('  Press [Enter] to chat.', 50, (textSize * (lineNumer + 1)) * this._renderer.viewPortScaler);
		}
		lineNumer = chatLineLimit + 10;
		
		
		
		this._renderer.ctx.fillStyle = 'orange';
		this._renderer.ctx.font = (textSize*2 * this._renderer.viewPortScaler) + 'pt Calibri';
		
		this._renderer.ctx.font = (textSize * this._renderer.viewPortScaler) + 'pt Calibri';
		
		
		this._renderer.ctx.fillStyle = 'white';
		this._renderer.ctx.fillText('Life', 0, (textSize * ++lineNumer) * this._renderer.viewPortScaler);
		this._renderer.ctx.fillStyle = 'red';
		this._renderer.ctx.fillText(this._player.hp, 100 * this._renderer.viewPortScaler, (textSize * lineNumer) * this._renderer.viewPortScaler);
		this._renderer.ctx.font = (textSize * this._renderer.viewPortScaler) + 'pt Calibri';
		
		this._renderer.ctx.fillStyle = 'white';
		this._renderer.ctx.fillText('Score', 0, (textSize * ++lineNumer) * this._renderer.viewPortScaler);
		this._renderer.ctx.fillStyle = 'green';
		this._renderer.ctx.fillText(this._player.score, 100 * this._renderer.viewPortScaler, (textSize * lineNumer) * this._renderer.viewPortScaler);
		
		this._renderer.ctx.font = (textSize *.75 * this._renderer.viewPortScaler) + 'pt Calibri';
		this._renderer.ctx.fillStyle = 'white';
		this._renderer.ctx.fillText('x', 0, (textSize * ++lineNumer) * this._renderer.viewPortScaler);
		this._renderer.ctx.fillText(CommonMath.round(this._player.x), 100 * this._renderer.viewPortScaler, (textSize * lineNumer) * this._renderer.viewPortScaler);
		
		this._renderer.ctx.fillText('y', 0, (textSize * ++lineNumer) * this._renderer.viewPortScaler);
		this._renderer.ctx.fillText(CommonMath.round(this._player.y), 100 * this._renderer.viewPortScaler, (textSize * lineNumer) * this._renderer.viewPortScaler);
		
		this._renderer.ctx.fillText('angle', 0, (textSize * ++lineNumer) * this._renderer.viewPortScaler);
		this._renderer.ctx.fillText(`${CommonMath.round(this._player.angle)}°`, 100 * this._renderer.viewPortScaler, (textSize * lineNumer) * this._renderer.viewPortScaler);
		
		this._renderer.ctx.fillText('Speed', 0, (textSize * ++lineNumer) * this._renderer.viewPortScaler);
		this._renderer.ctx.fillText(CommonMath.round(this._player.baseSpeed), 100 * this._renderer.viewPortScaler, (textSize * lineNumer++) * this._renderer.viewPortScaler);
		
		this._renderer.ctx.fillText('Scale', 0, (textSize * ++lineNumer) * this._renderer.viewPortScaler);
		this._renderer.ctx.fillText(this._renderer.scale, 100 * this._renderer.viewPortScaler, (textSize * lineNumer) * this._renderer.viewPortScaler);
		
		this._renderer.ctx.fillText('Clock', 0, (textSize * ++lineNumer) * this._renderer.viewPortScaler);
		this._renderer.ctx.fillText(CommonMath.round((Date.now() - this.gameStartTimeServer) / 1000, 2) + ' sec', 100 * this._renderer.viewPortScaler, (textSize * lineNumer) * this._renderer.viewPortScaler);
		
		
//[${CommonMath.round(this._player.angle)}°]
		this._renderer.ctx.fillStyle = 'red';
		if(this.showWaveAlert) {
			this._renderer.ctx.fillText('Enemies arrived', (this._renderer.width/2)-50, (this._renderer.height/2)+30);
		}
		this._renderer.ctx.fillStyle = 'white';
		
		
		//this._renderer.ctx.fillText('elapsedTime: ' + CommonMath.round((Date.now() - this.gameStartTime) / 1000, 2) + ' sec', 0, (textSize * 10) * this._renderer.viewPortScaler);
		
		const rightAlignment = 1450 * this._renderer.viewPortScaler;
		
		this._renderer.ctx.fillText('Game:' + this.gameNumber, this._renderer.width - ((textSize * 4) * this._renderer.viewPortScaler) - 5, this._renderer.height - 5);
		
		if(this.showTips) {
			this._renderer.ctx.fillStyle = 'white';
			this._renderer.ctx.font = ((textSize/1.5) * this._renderer.viewPortScaler) + 'pt Calibri';
			this._renderer.ctx.fillText('Red and Blue Guys Hurt. Green guys heal.', rightAlignment, (textSize * 1) * this._renderer.viewPortScaler);
			this._renderer.ctx.fillText('Blue guys can slow you.', rightAlignment, (textSize * 2) * this._renderer.viewPortScaler);
			this._renderer.ctx.fillText('Waves respawn.', rightAlignment, (textSize * 3) * this._renderer.viewPortScaler);
			this._renderer.ctx.fillText('The farther out you scroll,', rightAlignment, (textSize * 4) * this._renderer.viewPortScaler);
			this._renderer.ctx.fillText('the faster you go.', rightAlignment, (textSize * 5) * this._renderer.viewPortScaler);
			this._renderer.ctx.fillText('The farther out you go,', rightAlignment, (textSize * 6) * this._renderer.viewPortScaler);
			this._renderer.ctx.fillText('the longer the lazers.', rightAlignment, (textSize * 7) * this._renderer.viewPortScaler);
			
			this._renderer.ctx.fillText('Online Multi-player', rightAlignment, (textSize * 8) * this._renderer.viewPortScaler);
			this._renderer.ctx.fillText('Press Enter to chat', rightAlignment, (textSize * 9) * this._renderer.viewPortScaler);
			this._renderer.ctx.fillText('WASD ↑ ← ↓ →', rightAlignment, (textSize * 10) * this._renderer.viewPortScaler);
			
		} else {
			this._renderer.ctx.fillStyle = 'white';
			this._renderer.ctx.font = ((textSize/1.5) * this._renderer.viewPortScaler) + 'pt Calibri';
			this._renderer.ctx.fillText('Tips.', rightAlignment, (textSize * 1) * this._renderer.viewPortScaler);
			
			this._renderer.ctx.fillStyle = 'orange';
			this._renderer.ctx.fillText('Ludum Dare 44: Evention', rightAlignment + (50*this._renderer.viewPortScaler), (textSize * 1) * this._renderer.viewPortScaler);
		}
		
        
        for (var i = 0; i < this._clickControls.length; i++) {
            this._clickControls[i].draw();
        }
	        
	        
        if(this.showMobile) {
        	
        	for (var i = 0; i < this._mobileClickControls.length; i++) {
	            this._mobileClickControls[i].draw();
	        }
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
		
		Object.values(this.suns).forEach(sun => {
			sun.updatePosition();
			sun.doDraw = true;
		});
		
		if(this._renderer.scale >= .01) {
			Object.values(this.rings1).forEach(ring => {
				ring.updatePosition();
				ring.doDraw = true;
			});
		}
		
		if(this._renderer.scale <= .01 && this._renderer.scale > .000001) {
			Object.values(this.rings2).forEach(ring => {
				ring.updatePosition();
				ring.doDraw = true;
			});
		}
		
		
		if(this._renderer.scale <= .000001) {
			Object.values(this.rings3).forEach(ring => {
				ring.updatePosition();
				ring.doDraw = true;
			});
		}
		
		
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
