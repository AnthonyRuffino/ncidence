"use strict";

class GameEngine {
	constructor(driver, window) {
		this.driver = driver;
		this.renderer = driver.getRenderer();
		
		this.window = window;
		this.window.requestAnimationFrame = window.requestAnimationFrame || function(update) { window.setTimeout(this.update, 16) };
		this.frameCount = 0;
		this.frimScaler = null;
		this.fps = null;
		this.speedSnapshot = 0;
		this.gameStartTime = Date.now();
		this.targetTickDelta = 50;
		this.lastTickTime = null;
		this.tickDelta = null;
		this.lastX = this.getPlayerX();
		this.lastY = this.getPlayerY();
		this.lastDistanceTimeSnapshot = this.gameStartTime;
		this.driver.gameEngine = this;
	}
	
	getPlayerX() {
		this.driver.player && this.driver.player.x ? this.driver.player.x : 0;
	}
	
	getPlayerY() {
		this.driver.player && this.driver.player.x ? this.driver.player.x : 0;
	}

	start() {
		this.frame();
	}

	render() {
		this.driver.render();
	}

	update() {
		this.driver.update();
	}

	frame() {
		this.renderer.ctx.clearRect(0, 0, this.renderer.width, this.renderer.height);
		this.renderer.drawRectangle(true, 0, 0, this.renderer.width, this.renderer.height, "black");
		this.update();
		this.render();
		this.window.requestAnimationFrame(() => { this.frame(); });
	}

	update() {
		var now = Date.now();
		this.tickDelta = (now - (this.lastTickTime == null ? now : this.lastTickTime)); // ms since last frame
		this.frimScaler = this.tickDelta / this.targetTickDelta;
		
		//console.log(this.tickDelta, 'tickDelta');

		if (this.tickDelta != 0 && (this.fps === null || this.frameCount % 12 === 0)) {
			this.fps = 1000 / this.tickDelta;
			var distanceTravelled = Math.sqrt(Math.pow(this.lastX - this.getPlayerX(), 2) + Math.pow(this.lastY - this.getPlayerY(), 2));
			this.speedSnapshot = (now - this.lastDistanceTimeSnapshot) > 0 ? (1000 * distanceTravelled) / (now - this.lastDistanceTimeSnapshot) : 0;
			this.lastX = this.getPlayerX();
			this.lastY = this.getPlayerX();
			this.lastDistanceTimeSnapshot = now;
		}
		this.lastTickTime = now;
		this.driver.update();
	}

	frame() {
		this.renderer.ctx.clearRect(0, 0, this.renderer.width, this.renderer.height);
		this.renderer.drawRectangle(true, 0, 0, this.renderer.width, this.renderer.height, "black");
		this.update();
		this.render();
		this.frameCount++;
		this.window.requestAnimationFrame(() => { this.frame(); });
	}

}