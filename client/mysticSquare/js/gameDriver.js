"use strict";

class GameDriver {
  constructor(renderer, controlsBinding, tilesPerSide, log, alert, isDebug) {
	  this.renderer = renderer;
	  this.tilesPerSide = tilesPerSide;
	  this.moves = 0;
	  this.numberOfSlots = null;
	  this.gameTiles = null;
	  this.columnOfMissingSlot = null;
	  this.rowOfMissingSlot = null;
	  this.log = log;
	  this.alert = alert;
	  this.textSize = null;
	  this.isDebug = isDebug;
	  
	  this.bindClick(controlsBinding);
	  this.bindKeys(controlsBinding);
	  this.textSizeBase = 35
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
		
		for(var i = 0; i < this.tilesPerSide; i++){
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
					var gameTile = new GameTile(j, i, tileNumber, width, null, 'red', 'black', 'yellow', this.textSize);
					this.gameTiles["#" + tileNumber] = gameTile;
				}else{
					this.columnOfMissingSlot = j;
					this.rowOfMissingSlot = i;

					this.debug('columnOfMissingSlot', this.columnOfMissingSlot);
					this.debug('rowOfMissingSlot', this.rowOfMissingSlot);
				}
			}
		}
	}
  	
  	checkForWin(popUpForLoss){
		
		var positionNumber = 0;
		var exit = false;
		var win = true;

		
		for(var i = 1; i <= this.numberOfSlots; i++){
			var tile = this.gameTiles["#" + i];
			if(tile !== undefined && tile !== null){
				var properNumber = ((this.tilesPerSide*tile.getGameY())+tile.getGameX())+1;
				if(properNumber !== tile.getTileNumber()){
					this.debug('order loss');
					win = false;
					break;
				}
			}else if(i !== this.numberOfSlots){
				win = false;
				this.debug('blank loss');
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

  		renderer.ctx.save();
  		var textSize = 35;
  		renderer.ctx.font =  (textSize*this.renderer.viewPortScaler) + 'pt Calibri';
  		renderer.ctx.fillStyle = 'white';
  		renderer.ctx.fillText('Mystic Square',0,(textSize*1)*this.renderer.viewPortScaler);
  		renderer.ctx.font =  (20*this.renderer.viewPortScaler) + 'pt Calibri';
  		renderer.ctx.fillText('(Press space to reset)',0,(textSize*2)*this.renderer.viewPortScaler);
  		renderer.ctx.fillText('(+ will increase Square count)',0,(textSize*3)*this.renderer.viewPortScaler);
  		renderer.ctx.fillText('(- will decrease Square count)',0,(textSize*4)*this.renderer.viewPortScaler);
  		renderer.ctx.fillText('(q will check for win)',0,(textSize*5)*this.renderer.viewPortScaler);
  		renderer.ctx.fillText('(w will set up a wining board)',0,(textSize*6)*this.renderer.viewPortScaler);
  		renderer.ctx.fillText('(< will decrease the size of the board)',0,(textSize*7)*this.renderer.viewPortScaler);
  		renderer.ctx.fillText('(> will increase the size of the board)',0,(textSize*8)*this.renderer.viewPortScaler);
  		renderer.ctx.fillText('Size: ' + this.round(this.renderer.boardSizePercentage * 100, 2) + "%",0,(textSize*9)*this.renderer.viewPortScaler);
  		
  		renderer.ctx.fillText('Moves: ' + this.moves,0,(textSize*11)*this.renderer.viewPortScaler);
  		
  		renderer.ctx.restore();
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
  	
  	
  	//BEGIN CONTROLS
  	bindClick(clickBinding){
  	  if(clickBinding !== undefined && clickBinding !== null){
  		  var _this = this;
  		  clickBinding.onmousedown = function(mouse){
  			  var mouseX = mouse.x - _this.renderer.horizontalOffset;
  			  var mouseY = mouse.y - _this.renderer.verticalOffset;
  			  _this.click(mouseX,mouseY);
  		  }
  	  }
    }
    
    bindKeys(keyBinding){
  	  if(keyBinding !== undefined && keyBinding !== null){
  		  var _this = this;
  		  keyBinding.onkeydown = function(event){
  			  _this.onkeydown(event);
  		  }
  	  }
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
  					this.debug('tile#' + i + " was clicked.");
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
