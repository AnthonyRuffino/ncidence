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
	
	draw(renderer){
	  super.draw(renderer);
	  
	  renderer.drawCenteredText(true,
			  this.x,
			  this.y,
			  this.tileNumber,
			  this.textSize,
			  this.textColor);
			  
	}
}




class GameDriver {
  constructor(renderer, log, alert) {
	  this.renderer = renderer;
	  this.tilesPerSide = 4;
	  this.moves = 0;
	  this.numberOfSlots = null;
	  this.gameTiles = null;
	  this.columnOfMissingSlot = null;
	  this.rowOfMissingSlot = null;
	  this.log = log;
	  this.alert = alert;
	  this.textSize = null;
	  this.isDebug = false;
	  this.textSizeBase = 35;
	  this.GameTileClass = GameTile;
  }
  
  
  init(setUpWinningBoad){
	  	this.moves = 0;
		this.numberOfSlots = Math.pow(this.tilesPerSide,2);
		this.gameTiles = {};
		this.columnOfMissingSlot = null;
		this.rowOfMissingSlot = null;
		this.calculateTextSize();
		
		var tileNumbers = [];
		for (var i = 1; i <= this.numberOfSlots; i++) {
			tileNumbers.push(i);
		}
		
		var tileNumberForWinningBoard = 0;
		
		for(i = 0; i < this.tilesPerSide; i++){
			for(var j = 0; j < this.tilesPerSide; j++){
				
				tileNumberForWinningBoard++;
				
				var randomArrayElement = Math.floor(Math.random() * tileNumbers.length);
				var tempArray = tileNumbers.splice(randomArrayElement, 1);
				var tileNumber = tempArray[0];
				
				if(setUpWinningBoad){
					tileNumber = tileNumberForWinningBoard;
				}
				
				var smallerDimention = this.renderer.width < this.renderer.height ? this.renderer.width : this.renderer.height;
				var width = (this.renderer.boardSizePercentage*smallerDimention)/this.tilesPerSide;
				
				if(tileNumber !== this.numberOfSlots){
					var gameTile = new this.GameTileClass(j, i, tileNumber, width, null, "red", "black", "yellow", this.textSize);
					this.gameTiles["#" + tileNumber] = gameTile;
				}else{
					this.columnOfMissingSlot = j;
					this.rowOfMissingSlot = i;

					this.debug("columnOfMissingSlot", this.columnOfMissingSlot);
					this.debug("rowOfMissingSlot", this.rowOfMissingSlot);
				}
			}
		}
	}
  	
  	checkForWin(popUpForLoss){
		
		var win = true;
		
		for(var i = 1; i <= this.numberOfSlots; i++){
			var tile = this.gameTiles["#" + i];
			if(tile !== undefined && tile !== null){
				var properNumber = ((this.tilesPerSide*tile.getGameY())+tile.getGameX())+1;
				if(properNumber !== tile.getTileNumber()){
					this.debug("order loss");
					win = false;
					break;
				}
			}else if(i !== this.numberOfSlots){
				win = false;
				this.debug("blank loss");
				break;
			}
		}
		
		if(win){
			this.alert("You win!");
		}else if(popUpForLoss){
			this.alert("You have not won yet.");
		}
	}
  	
  	render(){
  		for(var i = 1; i <= this.numberOfSlots; i++){
  			var tile = this.gameTiles["#" + i];
  			if(tile !== undefined && tile !== null){
  				tile.draw(this.renderer);
  			}
  		}

  		this.renderer.ctx.save();
  		var textSize = 35;
  		this.renderer.ctx.font =  (textSize*this.renderer.viewPortScaler) + "pt Calibri";
  		this.renderer.ctx.fillStyle = "white";
  		this.renderer.ctx.fillText("Mystic Square",0,(textSize*1)*this.renderer.viewPortScaler);
  		this.renderer.ctx.font =  (20*this.renderer.viewPortScaler) + "pt Calibri";
  		this.renderer.ctx.fillText("(Press space to reset)",0,(textSize*2)*this.renderer.viewPortScaler);
  		this.renderer.ctx.fillText("(+ will increase Square count)",0,(textSize*3)*this.renderer.viewPortScaler);
  		this.renderer.ctx.fillText("(- will decrease Square count)",0,(textSize*4)*this.renderer.viewPortScaler);
  		this.renderer.ctx.fillText("(q will check for win)",0,(textSize*5)*this.renderer.viewPortScaler);
  		this.renderer.ctx.fillText("(w will set up a wining board)",0,(textSize*6)*this.renderer.viewPortScaler);
  		this.renderer.ctx.fillText("(< will decrease the size of the board)",0,(textSize*7)*this.renderer.viewPortScaler);
  		this.renderer.ctx.fillText("(> will increase the size of the board)",0,(textSize*8)*this.renderer.viewPortScaler);
  		this.renderer.ctx.fillText("Size: " + this.round(this.renderer.boardSizePercentage * 100, 2) + "%",0,(textSize*9)*this.renderer.viewPortScaler);
  		
  		this.renderer.ctx.fillText("Moves: " + this.moves,0,(textSize*11)*this.renderer.viewPortScaler);
  		
  		this.renderer.ctx.restore();
  	}
  	
  	update(){
  		for(var i = 1; i <= this.numberOfSlots; i++){
  			var tile = this.gameTiles["#" + i];
  			if(tile !== undefined && tile !== null){
  				tile.updatePosition(this.renderer.viewPortScaler);
  			}
  		}
  	}
  	
  	updateTileSizes(){
  		var smallerDimention = this.renderer.width < this.renderer.height ? this.renderer.width : this.renderer.height;
		var width = (this.renderer.boardSizePercentage*smallerDimention)/this.tilesPerSide;
		this.calculateTextSize();
		for(var i = 1; i <= this.numberOfSlots; i++){
  			var tile = this.gameTiles["#" + i];
  			if(tile !== undefined && tile !== null){
  				tile.setSideLength(width);
  				tile.setTextSize(this.textSize);
  			}
		}
  	}
  	
  	updatePosition(){
  	  this.lineWidth = this.baseLineWidth*this.renderer.viewPortScaler;
  	  this.width = this.baseWidth*this.renderer.viewPortScaler;
  	  this.height = this.baseHeight*this.renderer.viewPortScaler;
    }
    
    calculateTextSize(){
  	  this.textSize = this.textSizeBase *(4/this.tilesPerSide);
    }
    
  	onkeydown(event){
  		this.log(event.keyCode);
  		if(event.keyCode === 32){	//space bar
  			this.init();
  		}else if(event.keyCode === 107 || event.keyCode === 187){	//+
  			this.tilesPerSide++;
  			this.init();
  		}else if(event.keyCode === 109 || event.keyCode === 189){	//-
  			if(this.tilesPerSide > 3){
  				this.tilesPerSide--;
  				this.init();
  			}
  		}else if(event.keyCode === 81){	//q
  			this.checkForWin(true);
  		}else if(event.keyCode === 87){	//w
  			this.init(true);
  		}else if(event.keyCode === 188){//<
  			if(this.renderer.boardSizePercentage > .02){
  				this.textSizeBase--;
  	  			this.renderer.boardSizePercentage -= .02;
  	  			this.updateTileSizes();
  			}
  		}else if(event.keyCode === 190){//>
  			this.textSizeBase++;
  			this.renderer.boardSizePercentage += .02;
  			this.updateTileSizes();
  		}
  	}
  	
  	click(mouseX,mounseY){
  		for(var i = 1; i <= this.numberOfSlots; i++){
  			var tile = this.gameTiles["#" + i];
  			if(tile !== undefined && tile !== null){
  				if(tile.clicked(mouseX,mounseY, this.renderer)){
  					this.debug("tile#" + i + " was clicked.");
  					this.debug(tile.getGameY(), tile.getGameX());
  					
  					var move = false;
  					if(tile.getGameX() == this.columnOfMissingSlot){
  						move = tile.getGameY() == this.rowOfMissingSlot + 1 || tile.getGameY() == this.rowOfMissingSlot - 1;
  					}else if(tile.getGameY() == this.rowOfMissingSlot){
  						move = tile.getGameX() == this.columnOfMissingSlot + 1 || tile.getGameX() == this.columnOfMissingSlot - 1;
  					}
  					
  					if(move){
  						this.moves++;
  						var tempColumnOfMissingSlot = tile.getGameX();
  						var tempRowOfMissingSlot = tile.getGameY();
  						
  						tile.updateGameX(this.columnOfMissingSlot);
  						tile.updateGameY(this.rowOfMissingSlot);
  						
  						this.columnOfMissingSlot = tempColumnOfMissingSlot;
  						this.rowOfMissingSlot = tempRowOfMissingSlot;
  						
  						var _this = this;
  				        setTimeout(function() { _this.checkForWin(false); }, 100);
  					}
  					
  				}
  			}
  		}
  	}
  	//END CONTROLS
  	
  	
  	//BEGIN LOGGING UTILS
  	debug(){
  		if(this.isDebug){
  			this.log(arguments);
  		}
  	}
  	
  	round(num, sigDigits){	
  		if(sigDigits === undefined || sigDigits === null){
  			sigDigits = 2;
  		}
  		
  		var powerOfTen = Math.pow(10,sigDigits);
  		var inversePowerOfTen = sigDigits === 0 ? 0 : Math.pow(10,(-100*sigDigits));

  		return Math.round((num + inversePowerOfTen) * powerOfTen) / powerOfTen;
  	}
  	//END LOGGING UTILS
  	
}
