"use strict";

class Rectangle {
  constructor(x, y, height, width, lineWidth, fillStyle, strokeStyle) {
	  this.x = x;
	  this.y = y;
	  this.height = height;
	  this.width = width;
	  this.lineWidth = lineWidth;
	  this.fillStyle = fillStyle;
	  this.strokeStyle = strokeStyle;
    
	  //base dimentions (i.e. the dimentions when the object was first constructed)
	  this.baseHeight = height;
	  this.baseWidth = width;
	  this.baseLineWidth = lineWidth;
  }
  
  updatePosition(viewPortScaler){
	  this.lineWidth = this.baseLineWidth*viewPortScaler;
	  this.width = this.baseWidth*viewPortScaler;
	  this.height = this.baseHeight*viewPortScaler;
  }
  
  draw(renderer){
	  renderer.drawCenteredRectangle(true,
			  this.x,
			  this.y,
			  this.width,
			  this.height,
			  this.fillStyle,
			  this.lineWidth,
			  this.strokeStyle);
  }
  
  clicked(mounseX,mouseY, renderer){
	  var canvasCoords = renderer.getCanvasCoords(this.x,this.y);
	  var leftBound = canvasCoords.x;
	  var rightBound = canvasCoords.x+this.width;
	  var topBound = canvasCoords.y;
	  var bottomBound = canvasCoords.y+this.height;
	  return mounseX>=leftBound && mounseX<=rightBound && mouseY>=topBound && mouseY<=bottomBound;
  }
}



class Square extends Rectangle {
	constructor(x, y, sideLength, lineWidth, fillStyle, strokeStyle) {
		super(x, y, sideLength, sideLength, lineWidth, fillStyle, strokeStyle);
	}
}


class GameTile extends Square {
	constructor(gameX, gameY, tileNumber, sideLength, lineWidth, fillStyle, strokeStyle, textColor, textSize) {
		super(gameX*sideLength, gameY*sideLength, sideLength, lineWidth, fillStyle, strokeStyle);
		this.tileNumber = tileNumber;
		this.gameX = gameX;
		this.gameY = gameY;
		this.textColor = textColor;
		this.sideLength = sideLength;
		this.textSize = textSize;
	}
	
	setTextSize(newTextSize){
		this.textSize = new newTxtSize;
	}
	
	getSideLength(newSideLength){
		return this.sideLength;
	}
	setSideLength(newSideLength){
		this.sideLength = newSideLength;
		this.width = newSideLength;
		this.baseWidth = this.width;
		this.height = newSideLength;
		this.baseHeight = this.height;
		this.x = this.gameX*newSideLength;
		this.y = this.gameY*newSideLength;
	}
	
	getTileNumber(){
		return this.tileNumber;
	}
	
	getGameX(){
		return this.gameX;
	}
	
	getGameY(){
		return this.gameY;
	}
	
	setTextSize(textSize){
		this.textSize = textSize;
	}
	
	updateGameX(newGameX) {
		this.gameX = newGameX;
		this.x = newGameX*this.sideLength;
	}
	
	updateGameY(newGameY) {
		this.gameY = newGameY;
		this.y = newGameY*this.sideLength;
	}
	
	draw(){
	  super.draw(renderer);
	  
	  renderer.drawCenteredText(true,
			  this.x,
			  this.y,
			  this.tileNumber,
			  this.textSize,
			  this.textColor);
			  
	}
}

