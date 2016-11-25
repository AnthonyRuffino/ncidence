"use strict";

class Renderer {
  constructor(window, document, targetElementName, boardSizePercentage) {
	  this.window = window;
	  this.document = document;
	  this.documentElement = this.document.documentElement;
	  this.targetElementName = targetElementName;
	  this.targetElement = this.document.getElementsByTagName(this.targetElementName)[0];
	  this._boardSizePercentage = boardSizePercentage;
	  this.screenWidth = null;
	  this.screenHeight = null;
	  this.aspectRatio = null;
	  this._width = null;
	  this._height = null;
	  this._viewPortScaler = null;
	  this.centerX = null;
	  this.centerY = null;
	  this._horizontalOffset = null
	  this._verticalOffset = null
	  this._ctx = null;
  }
  
  
  //GETTERS AND SETTERS
  get boardSizePercentage(){
	  return this._boardSizePercentage;
  }
  
  set boardSizePercentage(boardSizePercentage){
	  this._boardSizePercentage = boardSizePercentage;
  }
  
  get width(){
	  return this._width;
  }
  
  get height(){
	  return this._height;
  }
  
  get viewPortScaler(){
	  return this._viewPortScaler;
  }
  
  get horizontalOffset(){
	  return this._horizontalOffset;
  }
  
  get verticalOffset(){
	  return this._verticalOffset;
  }
  
  get ctx(){
	  return this._ctx;
  }
  
  
  //PUBLIC UTILITIES
  
  init(){
		this.setDimentions();
		
		var myCanvas = this.document.createElement('canvas');
		myCanvas.id = 'gameCanvas';
		myCanvas.width = this._width;
		myCanvas.height = this._height;
		this.document.body.appendChild(myCanvas);
		
		this._horizontalOffset = document.getElementById('gameCanvas').getBoundingClientRect().left;
		this._verticalOffset = document.getElementById('gameCanvas').getBoundingClientRect().top;
		
		this._ctx = this.document.getElementById("gameCanvas").getContext("2d");
		
		var _this = this;
        
        var onResize = function(){
        	_this.setDimentions();
        	_this.document.getElementById("gameCanvas").width = _this._width;
        	_this.document.getElementById("gameCanvas").height = _this._height;
        }
        
        Renderer.addEvent(this.window, "resize", onResize);
  }
  
  setDimentions(){
		this.screenWidth = window.innerWidth || documentElement.clientWidth || targetElement.clientWidth;
		this.screenHeight = window.innerHeight|| documentElement.clientHeight|| targetElement.clientHeight;
		this.aspectRatio = this.screenHeight/this.screenWidth;//9/16;
		this._width = this.screenWidth - (this.screenWidth*.05);
		this._height = (this._width * this.aspectRatio);
		this._viewPortScaler = this._width/2000;
		this.centerX = this._width/2;
		this.centerY = this._height/2;
  }
  
  getCanvasCoords(x,y){
		var canvasX = ((x)*this._viewPortScaler) + this.centerX - ((this._boardSizePercentage*this._width*this._viewPortScaler)/2);
		var canvasY = ((y)*this._viewPortScaler) + this.centerY - ((this._boardSizePercentage*this._height*this._viewPortScaler)/2);
		return {x:canvasX,y:canvasY};
  }
  
  
  //RECTANGLE
  drawCenteredRectangle(beginPath, x, y, width, height, fillStyle, lineWidth, strokeStyle){
	  var canvasCoords = this.getCanvasCoords(x, y);
  	  this.drawRectangle(beginPath, canvasCoords.x, canvasCoords.y, width ,height ,fillStyle ,lineWidth, strokeStyle);
  }
  
  drawRectangle(beginPath, x, y, width, height, fillStyle, lineWidth, strokeStyle){
	  this._ctx.save();
	  	
  	  if(beginPath){
  		this._ctx.beginPath();
  	  }

  	  if(fillStyle !== undefined && fillStyle !== null){
  		this._ctx.fillStyle = fillStyle;
  	  }
  	
  	  if(lineWidth !== undefined && lineWidth !== null){
  		this._ctx.lineWidth = lineWidth;
  	  }
  	
  	  if(strokeStyle !== undefined && strokeStyle !== null){
  		this._ctx.strokeStyle = strokeStyle;
  	  }
  	
  	  this._ctx.rect(x,y,width,height,20);
  	
  	  if(lineWidth !== undefined){
  		  if(fillStyle !== undefined && fillStyle != null){
  			this._ctx.fill();
  		  }
  		this._ctx.stroke();
  	  }else{
  		this._ctx.fill();
  	  }
  	
  	this._ctx.restore();
  }


  
  //TEXT
  drawCenteredText(beginPath, x, y, text, textSize, fillStyle){
	  var canvasCoords = this.getCanvasCoords(x, y);
	  this.drawText(beginPath, canvasCoords.x, canvasCoords.y, text, textSize, fillStyle);
  }
  
  drawText(beginPath, x, y, text, textSize, fillStyle){
	  this._ctx.save();
	  	
	  if(beginPath){
		  this._ctx.beginPath();
  	  }
		
	  this._ctx.font =  (textSize*this._viewPortScaler) + 'pt Calibri';
		
	  if(fillStyle !== undefined && fillStyle !== null){
		  this._ctx.fillStyle = fillStyle;
	  }
	
	  this._ctx.fillText(text,x,y+(textSize)*this._viewPortScaler);
	
	  this._ctx.restore();
  }
  
  
  
  //BINDER
  static addEvent(object, type, callback) {
		if (object == null || typeof(object) == 'undefined') return;
		if (object.addEventListener) {
			object.addEventListener(type, callback, false);
		} else if (object.attachEvent) {
			object.attachEvent("on" + type, callback);
		} else {
			object["on"+type] = callback;
		}
  }
  
}




