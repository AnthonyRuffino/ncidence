"use strict";

class GameEngine {
  constructor(renderer, driver, window) {
	  this.renderer = renderer;
	  this.driver = driver;
	  this.window = window;
	  this.window.requestAnimationFrame = window.requestAnimationFrame || function(update){window.setTimeout(this.update,16)};
  }
  
  start(){
	  this.frame();
  }
  
  render(){
	  this.driver.render();
  }
  
  update (){
	  this.driver.update();
  }
  
  frame() {
	  this.renderer.ctx.clearRect(0,0,renderer.width,renderer.height);
	  this.renderer.drawRectangle(true, 0, 0, renderer.width, renderer.height, 'black');
	  this.update();
	  this.render();
	  
	  var _this = this;
	  this.window.requestAnimationFrame(function() { _this.frame(); });
  }

}