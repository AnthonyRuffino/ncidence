"use strict";
/*global CommonMath */

class Renderer {
    constructor(window, document, targetElementName, scale) {
        this._window = window;
        this._document = document;
        this._documentElement = this._document.documentElement;
        this.targetElementName = targetElementName;
        this.targetElement = this._document.getElementsByTagName(this.targetElementName)[0];
        this.screenWidth = null;
        this.screenHeight = null;
        this.aspectRatio = null;
        this._width = null;
        this._height = null;
        this._viewPortScaler = null;
        this._centerX = null;
        this._centerY = null;
        this._horizontalOffset = null;
        this._verticalOffset = null;
        this._ctx = null;
        this._scale = scale;
        this._startScale = scale;
    }


    // GETTERS AND SETTERS
    get centerX(){
    	return this._centerX
    }
    
    get centerY(){
    	return this._centerY;
    }
    
    get window(){
    	return this._window;
    }
    
    get document(){
    	return this._document;
    }
    
    get startScale() {
        return this._startScale;
    }
    
    get boardSizePercentage() {
        return this._boardSizePercentage;
    }

    set boardSizePercentage(boardSizePercentage) {
        this._boardSizePercentage = boardSizePercentage;
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }

    get viewPortScaler() {
        return this._viewPortScaler;
    }

    get horizontalOffset() {
        return this._horizontalOffset;
    }

    get verticalOffset() {
        return this._verticalOffset;
    }

    get ctx() {
        return this._ctx;
    }
    
    get scale() {
        return this._scale;
    }
    
    set scale(scale) {
        this._scale = scale;
    }


    // PUBLIC UTILITIES

    init() {
        this.setDimentions();

        var myCanvas = this._document.createElement("canvas");
        myCanvas.id = "gameCanvas";
        myCanvas.width = this._width;
        myCanvas.height = this._height;
        this._document.body.appendChild(myCanvas);

        this._horizontalOffset = document.getElementById("gameCanvas").getBoundingClientRect().left;
        this._verticalOffset = document.getElementById("gameCanvas").getBoundingClientRect().top;

        this._ctx = this._document.getElementById("gameCanvas").getContext("2d");

        var _this = this;

        var onResize = function() {
            _this.setDimentions();
            _this._document.getElementById("gameCanvas").width = _this._width;
            _this._document.getElementById("gameCanvas").height = _this._height;
        };

        Renderer.addEvent(this._window, "resize", onResize);
    }

    setDimentions() {
        this.screenWidth = window.innerWidth || this._documentElement.clientWidth || this.targetElement.clientWidth;
        this.screenHeight = window.innerHeight || this._documentElement.clientHeight || this.targetElement.clientHeight;
        this.aspectRatio = this.screenHeight / this.screenWidth; // 9/16;
        this._width = this.screenWidth - (this.screenWidth * .05);
        this._height = (this._width * this.aspectRatio);
        this._viewPortScaler = this._width / 2000;
        this._centerX = this._width / 2;
        this._centerY = this._height / 2;
    }

    getCanvasCoords(x, y) {
        var canvasX = ((x * this._scale) * this._viewPortScaler) + this._centerX;
        var canvasY = ((-y * this._scale) * this._viewPortScaler) + this._centerY;
        return {
            x: canvasX,
            y: canvasY
        };
    }


    // RECTANGLE
    drawRealRectangle(beginPath, x, y, width, height, rotationAngle, fillStyle, lineWidth, strokeStyle, doShift) {
        var canvasCoords = this.getCanvasCoords(x, y);
        var biggestDimention = width > height ? width : height;

        var doDraw = true;
        if (canvasCoords.x > this._width + biggestDimention || canvasCoords.x < -biggestDimention) {
            doDraw = false;
        } else if (canvasCoords.y > this._height + biggestDimention || canvasCoords.y < -biggestDimention) {
            doDraw = false;
        }
        if (doDraw) {
            this.drawRectangle(beginPath, canvasCoords.x, canvasCoords.y, width, height, rotationAngle, fillStyle, lineWidth, strokeStyle, doShift);
        }
    }

    drawRectangle(beginPath, x, y, width, height, rotationAngle, fillStyle, lineWidth, strokeStyle, doShift) {
    	this.drawRectangleFromContext(this.ctx, beginPath, x, y, width, height, rotationAngle, fillStyle, lineWidth, strokeStyle, doShift);
    }
    
    drawRectangleFromContext(context, beginPath, x, y, width, height, rotationAngle, fillStyle, lineWidth, strokeStyle, doShift) {
    	context.save();

        if (beginPath) {
        	context.beginPath();
        }
        
        if(rotationAngle !== undefined && rotationAngle !== null){
        	context.translate(x, y);
        	context.rotate(CommonMath.degreesToRadians(rotationAngle));
        	context.translate(-x, -y);
    	}

        if (fillStyle !== undefined && fillStyle !== null) {
        	context.fillStyle = fillStyle;
        }

        if (lineWidth !== undefined && lineWidth !== null) {
        	context.lineWidth = lineWidth;
        }

        if (strokeStyle !== undefined && strokeStyle !== null) {
        	context.strokeStyle = strokeStyle;
        }
        
        const shiftCoords = this.getShift(x, y, width, height, doShift)

        context.rect(shiftCoords.x, shiftCoords.y, width, height, 20);

        if (lineWidth !== undefined) {
            if (fillStyle !== undefined && fillStyle != null) {
            	context.fill();
            }
            context.stroke();
        } else {
        	context.fill();
        }

        context.restore();
    }


    //CIRCLE

    drawRealCircle(beginPath, x, y, radius, rotationAngle, fillStyle, lineWidth, strokeStyle, startAngle, endAngle, fillGap) {
        var canvasCoords = this.getCanvasCoords(x, y);
        var doDraw = true;
        if (canvasCoords.x > this._width + radius || canvasCoords.x < -radius) {
            doDraw = false;
        } else if (canvasCoords.y > this._height + radius || canvasCoords.y < -radius) {
            doDraw = false;
        }
        if (doDraw) {
            this.drawCircle(beginPath, canvasCoords.x, canvasCoords.y, radius, rotationAngle, fillStyle, lineWidth, strokeStyle, startAngle, endAngle, fillGap);
        }

    }

    drawCircle(beginPath, x, y, radius, rotationAngle, fillStyle, lineWidth, strokeStyle, startAngle, endAngle, fillGap) {
    	this.drawCircleFromContext(this._ctx, beginPath, x, y, radius, rotationAngle, fillStyle, lineWidth, strokeStyle, startAngle, endAngle, fillGap);
    }
    
    drawCircleFromContext(context, beginPath, x, y, radius, rotationAngle, fillStyle, lineWidth, strokeStyle, startAngle, endAngle, fillGap) {
    	context.save();

        if (beginPath) {
        	context.beginPath();
        }

        if (rotationAngle !== undefined && rotationAngle !== null) {
        	context.translate(x, y);
        	context.rotate(CommonMath.degreesToRadians(rotationAngle));
        	context.translate(-x, -y);
        }

        if (fillStyle !== undefined && fillStyle !== null) {
        	context.fillStyle = fillStyle;
        }

        if (lineWidth !== undefined && lineWidth !== null) {
        	context.lineWidth = lineWidth;
        }

        if (strokeStyle !== undefined && strokeStyle !== null) {
        	context.strokeStyle = strokeStyle;
        }

        if (startAngle === undefined || startAngle === null) {
            startAngle = 0;
        }

        if (endAngle === undefined || endAngle === null) {
            endAngle = 360;
        }

        if (fillGap && endAngle - startAngle < 360) {
        	context.arc(x, y, radius, CommonMath.degreesToRadians(endAngle), CommonMath.degreesToRadians(endAngle - startAngle));
        }


        context.arc(x, y, radius, CommonMath.degreesToRadians(startAngle), CommonMath.degreesToRadians(endAngle));

        if (lineWidth !== undefined) {
            if (fillStyle !== undefined && fillStyle != null) {
            	context.fill();
            }
            context.stroke();
        } else {
        	context.fill();
        }

        context.restore();
    }



    // IMAGE
    drawRealImage(beginPath, image, x, y, width, height, angle, doShift) {
        var canvasCoords = this.getCanvasCoords(x, y);

        var biggestDimention = width > height ? width : height;

        var doDraw = true;
        if (canvasCoords.x > this._width + biggestDimention || canvasCoords.x < -biggestDimention) {
            doDraw = false;
        } else if (canvasCoords.y > this._height + biggestDimention || canvasCoords.y < -biggestDimention) {
            doDraw = false;
        }

        if (doDraw) {
            this.drawImage(beginPath, image, canvasCoords.x, canvasCoords.y, width, height, angle, doShift);
        }
    }

    drawImage(beginPath, image, x, y, width, height, angle, doShift) {
        this._ctx.save();
        if (beginPath) {
            this._ctx.beginPath();
        }

        if (angle !== undefined && angle !== null) {
            this._ctx.translate(x, y);
            this._ctx.rotate(angle * Math.PI / 180);
            this._ctx.translate(-x, -y);
        }

        if (image.orientation !== undefined && image.orientation !== null) {
            this._ctx.translate(x, y);
            this._ctx.rotate((360 - image.orientation) * Math.PI / 180);
            this._ctx.translate(-x, -y);
        }

        if (doShift === undefined || doShift === null) {
            doShift = true;
        }

        var xShift = 0;
        var yShift = 0;

        const shiftCoords = this.getShift(x, y, width, height, doShift);
        
        this._ctx.drawImage(image.img, 0, 0, image.img.width, image.img.height, shiftCoords.x, shiftCoords.y, width, height);

        this._ctx.restore();
    }
    
    getShift(x, y, width, height, doShift) {
        let xShift = 0;
        let yShift = 0;
        if (doShift) {
            if (width > 1) {
                xShift = width / 2;
            }

            if (height > 1) {
                yShift = height / 2;
            }
        }
        return {x: x - xShift, y: y - yShift};
    }


    // BINDER
    static addEvent(object, type, callback) {
        if (object == null || typeof(object) == "undefined") return;
        if (object.addEventListener) {
            object.addEventListener(type, callback, false);
        } else if (object.attachEvent) {
            object.attachEvent("on" + type, callback);
        } else {
            object["on" + type] = callback;
        }
    }

}