GameBoyCore.prototype.initLCD = function () {
	this.recomputeDimension();
	if (this.offscreenRGBCount != 92160) {
		//Only create the resizer handle if we need it:
		this.compileResizeFrameBufferFunction();
	}
	else {
		//Resizer not needed:
		this.resizer = null;
	}
	try {
		this.canvasOffscreen = document.createElement("canvas");
		this.canvasOffscreen.width = this.offscreenWidth;
		this.canvasOffscreen.height = this.offscreenHeight;
		this.drawContextOffscreen = this.canvasOffscreen.getContext("2d");
		this.drawContextOnscreen = this.canvas.getContext("2d");
		this.canvas.setAttribute("style", (this.canvas.getAttribute("style") || "") + "; image-rendering: " + ((settings[13]) ? "auto" : "-webkit-optimize-contrast") + ";" +
		"image-rendering: " + ((settings[13]) ? "optimizeQuality" : "-o-crisp-edges") + ";" +
		"image-rendering: " + ((settings[13]) ? "optimizeQuality" : "-moz-crisp-edges") + ";" +
		"-ms-interpolation-mode: " + ((settings[13]) ? "bicubic" : "nearest-neighbor") + ";");
		this.drawContextOffscreen.webkitImageSmoothingEnabled  = settings[13];
		this.drawContextOffscreen.mozImageSmoothingEnabled = settings[13];
		this.drawContextOnscreen.webkitImageSmoothingEnabled  = settings[13];
		this.drawContextOnscreen.mozImageSmoothingEnabled = settings[13];
		//Get a CanvasPixelArray buffer:
		try {
			this.canvasBuffer = this.drawContextOffscreen.createImageData(this.offscreenWidth, this.offscreenHeight);
		}
		catch (error) {
			cout("Falling back to the getImageData initialization (Error \"" + error.message + "\").", 1);
			this.canvasBuffer = this.drawContextOffscreen.getImageData(0, 0, this.offscreenWidth, this.offscreenHeight);
		}
		var index = this.offscreenRGBCount;
		while (index > 0) {
			this.canvasBuffer.data[index -= 4] = 0xF8;
			this.canvasBuffer.data[index + 1] = 0xF8;
			this.canvasBuffer.data[index + 2] = 0xF8;
			this.canvasBuffer.data[index + 3] = 0xFF;
		}
		this.graphicsBlit();
		this.canvas.style.visibility = "visible";
		if (this.swizzledFrame == null) {
			this.swizzledFrame = this.getTypedArray(69120, 0xFF, "uint8");
		}
		//Test the draw system and browser vblank latching:
		this.drewFrame = true;										//Copy the latest graphics to buffer.
		this.requestDraw();
	}
	catch (error) {
		throw(new Error("HTML5 Canvas support required: " + error.message + "file: " + error.fileName + ", line: " + error.lineNumber));
	}
}
GameBoyCore.prototype.graphicsBlit = function () {
	if (this.offscreenWidth == this.onscreenWidth && this.offscreenHeight == this.onscreenHeight) {
		this.drawContextOnscreen.putImageData(this.canvasBuffer, 0, 0);
	}
	else {
		this.drawContextOffscreen.putImageData(this.canvasBuffer, 0, 0);
		this.drawContextOnscreen.drawImage(this.canvasOffscreen, 0, 0, this.onscreenWidth, this.onscreenHeight);
	}
}


GameBoyCore.prototype.scanLineMode2 = function () {	//OAM Search Period
	if (this.STATTracker != 1) {
		if (this.mode2TriggerSTAT) {
			this.interruptsRequested |= 0x2;
			this.checkIRQMatching();
		}
		this.STATTracker = 1;
		this.modeSTAT = 2;
	}
}
GameBoyCore.prototype.scanLineMode3 = function () {	//Scan Line Drawing Period
	if (this.modeSTAT != 3) {
		if (this.STATTracker == 0 && this.mode2TriggerSTAT) {
			this.interruptsRequested |= 0x2;
			this.checkIRQMatching();
		}
		this.STATTracker = 1;
		this.modeSTAT = 3;
	}
}
GameBoyCore.prototype.scanLineMode0 = function () {	//Horizontal Blanking Period
	if (this.modeSTAT != 0) {
		if (this.STATTracker != 2) {
			if (this.STATTracker == 0) {
				if (this.mode2TriggerSTAT) {
					this.interruptsRequested |= 0x2;
					this.checkIRQMatching();
				}
				this.modeSTAT = 3;
			}
			this.incrementScanLineQueue();
			this.updateSpriteCount(this.actualScanLine);
			this.STATTracker = 2;
		}
		if (this.LCDTicks >= this.spriteCount) {
			if (this.hdmaRunning) {
				this.executeHDMA();
			}
			if (this.mode0TriggerSTAT) {
				this.interruptsRequested |= 0x2;
				this.checkIRQMatching();
			}
			this.STATTracker = 3;
			this.modeSTAT = 0;
		}
	}
}
GameBoyCore.prototype.clocksUntilLYCMatch = function () {
	if (this.memory[0xFF45] != 0) {
		if (this.memory[0xFF45] > this.actualScanLine) {
			return 456 * (this.memory[0xFF45] - this.actualScanLine);
		}
		return 456 * (154 - this.actualScanLine + this.memory[0xFF45]);
	}
	return (456 * ((this.actualScanLine == 153 && this.memory[0xFF44] == 0) ? 154 : (153 - this.actualScanLine))) + 8;
}
GameBoyCore.prototype.clocksUntilMode0 = function () {
	switch (this.modeSTAT) {
		case 0:
			if (this.actualScanLine == 143) {
				this.updateSpriteCount(0);
				return this.spriteCount + 5016;
			}
			this.updateSpriteCount(this.actualScanLine + 1);
			return this.spriteCount + 456;
		case 2:
		case 3:
			this.updateSpriteCount(this.actualScanLine);
			return this.spriteCount;
		case 1:
			this.updateSpriteCount(0);
			return this.spriteCount + (456 * (154 - this.actualScanLine));
	}
}
GameBoyCore.prototype.updateSpriteCount = function (line) {
	this.spriteCount = 252;
	if (this.cGBC && this.gfxSpriteShow) {										//Is the window enabled and are we in CGB mode?
		var lineAdjusted = line + 0x10;
		var yoffset = 0;
		var yCap = (this.gfxSpriteNormalHeight) ? 0x8 : 0x10;
		for (var OAMAddress = 0xFE00; OAMAddress < 0xFEA0 && this.spriteCount < 312; OAMAddress += 4) {
			yoffset = lineAdjusted - this.memory[OAMAddress];
			if (yoffset > -1 && yoffset < yCap) {
				this.spriteCount += 6;
			}
		}
	}
}
GameBoyCore.prototype.matchLYC = function () {	//LYC Register Compare
	if (this.memory[0xFF44] == this.memory[0xFF45]) {
		this.memory[0xFF41] |= 0x04;
		if (this.LYCMatchTriggerSTAT) {
			this.interruptsRequested |= 0x2;
			this.checkIRQMatching();
		}
	}
	else {
		this.memory[0xFF41] &= 0x7B;
	}
}

GameBoyCore.prototype.initializeLCDController = function () {
	//Display on hanlding:
	var line = 0;
	while (line < 154) {
		if (line < 143) {
			//We're on a normal scan line:
			this.LINECONTROL[line] = function (parentObj) {
				if (parentObj.LCDTicks < 80) {
					parentObj.scanLineMode2();
				}
				else if (parentObj.LCDTicks < 252) {
					parentObj.scanLineMode3();
				}
				else if (parentObj.LCDTicks < 456) {
					parentObj.scanLineMode0();
				}
				else {
					//We're on a new scan line:
					parentObj.LCDTicks -= 456;
					if (parentObj.STATTracker != 3) {
						//Make sure the mode 0 handler was run at least once per scan line:
						if (parentObj.STATTracker != 2) {
							if (parentObj.STATTracker == 0 && parentObj.mode2TriggerSTAT) {
								parentObj.interruptsRequested |= 0x2;
							}
							parentObj.incrementScanLineQueue();
						}
						if (parentObj.hdmaRunning) {
							parentObj.executeHDMA();
						}
						if (parentObj.mode0TriggerSTAT) {
							parentObj.interruptsRequested |= 0x2;
						}
					}
					//Update the scanline registers and assert the LYC counter:
					parentObj.actualScanLine = ++parentObj.memory[0xFF44];
					//Perform a LYC counter assert:
					if (parentObj.actualScanLine == parentObj.memory[0xFF45]) {
						parentObj.memory[0xFF41] |= 0x04;
						if (parentObj.LYCMatchTriggerSTAT) {
							parentObj.interruptsRequested |= 0x2;
						}
					}
					else {
						parentObj.memory[0xFF41] &= 0x7B;
					}
					parentObj.checkIRQMatching();
					//Reset our mode contingency variables:
					parentObj.STATTracker = 0;
					parentObj.modeSTAT = 2;
					parentObj.LINECONTROL[parentObj.actualScanLine](parentObj);	//Scan Line and STAT Mode Control.
				}
			}
		}
		else if (line == 143) {
			//We're on the last visible scan line of the LCD screen:
			this.LINECONTROL[143] = function (parentObj) {
				if (parentObj.LCDTicks < 80) {
					parentObj.scanLineMode2();
				}
				else if (parentObj.LCDTicks < 252) {
					parentObj.scanLineMode3();
				}
				else if (parentObj.LCDTicks < 456) {
					parentObj.scanLineMode0();
				}
				else {
					//Starting V-Blank:
					//Just finished the last visible scan line:
					parentObj.LCDTicks -= 456;
					if (parentObj.STATTracker != 3) {
						//Make sure the mode 0 handler was run at least once per scan line:
						if (parentObj.STATTracker != 2) {
							if (parentObj.STATTracker == 0 && parentObj.mode2TriggerSTAT) {
								parentObj.interruptsRequested |= 0x2;
							}
							parentObj.incrementScanLineQueue();
						}
						if (parentObj.hdmaRunning) {
							parentObj.executeHDMA();
						}
						if (parentObj.mode0TriggerSTAT) {
							parentObj.interruptsRequested |= 0x2;
						}
					}
					//Update the scanline registers and assert the LYC counter:
					parentObj.actualScanLine = parentObj.memory[0xFF44] = 144;
					//Perform a LYC counter assert:
					if (parentObj.memory[0xFF45] == 144) {
						parentObj.memory[0xFF41] |= 0x04;
						if (parentObj.LYCMatchTriggerSTAT) {
							parentObj.interruptsRequested |= 0x2;
						}
					}
					else {
						parentObj.memory[0xFF41] &= 0x7B;
					}
					//Reset our mode contingency variables:
					parentObj.STATTracker = 0;
					//Update our state for v-blank:
					parentObj.modeSTAT = 1;
					parentObj.interruptsRequested |= (parentObj.mode1TriggerSTAT) ? 0x3 : 0x1;
					parentObj.checkIRQMatching();
					//Attempt to blit out to our canvas:
					if (parentObj.drewBlank == 0) {
						//Ensure JIT framing alignment:
						if (parentObj.totalLinesPassed < 144 || (parentObj.totalLinesPassed == 144 && parentObj.midScanlineOffset > -1)) {
							//Make sure our gfx are up-to-date:
							parentObj.graphicsJITVBlank();
							//Draw the frame:
							parentObj.prepareFrame();
						}
					}
					else {
						//LCD off takes at least 2 frames:
						--parentObj.drewBlank;
					}
					parentObj.LINECONTROL[144](parentObj);	//Scan Line and STAT Mode Control.
				}
			}
		}
		else if (line < 153) {
			//In VBlank
			this.LINECONTROL[line] = function (parentObj) {
				if (parentObj.LCDTicks >= 456) {
					//We're on a new scan line:
					parentObj.LCDTicks -= 456;
					parentObj.actualScanLine = ++parentObj.memory[0xFF44];
					//Perform a LYC counter assert:
					if (parentObj.actualScanLine == parentObj.memory[0xFF45]) {
						parentObj.memory[0xFF41] |= 0x04;
						if (parentObj.LYCMatchTriggerSTAT) {
							parentObj.interruptsRequested |= 0x2;
							parentObj.checkIRQMatching();
						}
					}
					else {
						parentObj.memory[0xFF41] &= 0x7B;
					}
					parentObj.LINECONTROL[parentObj.actualScanLine](parentObj);	//Scan Line and STAT Mode Control.
				}
			}
		}
		else {
			//VBlank Ending (We're on the last actual scan line)
			this.LINECONTROL[153] = function (parentObj) {
				if (parentObj.LCDTicks >= 8) {
					if (parentObj.STATTracker != 4 && parentObj.memory[0xFF44] == 153) {
						parentObj.memory[0xFF44] = 0;	//LY register resets to 0 early.
						//Perform a LYC counter assert:
						if (parentObj.memory[0xFF45] == 0) {
							parentObj.memory[0xFF41] |= 0x04;
							if (parentObj.LYCMatchTriggerSTAT) {
								parentObj.interruptsRequested |= 0x2;
								parentObj.checkIRQMatching();
							}
						}
						else {
							parentObj.memory[0xFF41] &= 0x7B;
						}
						parentObj.STATTracker = 4;
					}
					if (parentObj.LCDTicks >= 456) {
						//We reset back to the beginning:
						parentObj.LCDTicks -= 456;
						parentObj.STATTracker = parentObj.actualScanLine = 0;
						parentObj.LINECONTROL[0](parentObj);	//Scan Line and STAT Mode Control.
					}
				}
			}
		}
		++line;
	}
}
GameBoyCore.prototype.DisplayShowOff = function () {
	if (this.drewBlank == 0) {
		//Output a blank screen to the output framebuffer:
		this.clearFrameBuffer();
		this.drewFrame = true;
	}
	this.drewBlank = 2;
}
GameBoyCore.prototype.executeHDMA = function () {
	this.DMAWrite(1);
	if (this.halt) {
		if ((this.LCDTicks - this.spriteCount) < ((4 >> this.doubleSpeedShifter) | 0x20)) {
			//HALT clocking correction:
			this.CPUTicks = 4 + ((0x20 + this.spriteCount) << this.doubleSpeedShifter);
			this.LCDTicks = this.spriteCount + ((4 >> this.doubleSpeedShifter) | 0x20);
		}
	}
	else {
		this.LCDTicks += (4 >> this.doubleSpeedShifter) | 0x20;			//LCD Timing Update For HDMA.
	}
	if (this.memory[0xFF55] == 0) {
		this.hdmaRunning = false;
		this.memory[0xFF55] = 0xFF;	//Transfer completed ("Hidden last step," since some ROMs don't imply this, but most do).
	}
	else {
		--this.memory[0xFF55];
	}
}


GameBoyCore.prototype.prepareFrame = function () {
	//Copy the internal frame buffer to the output buffer:
	this.swizzleFrameBuffer();
	this.drewFrame = true;
}
GameBoyCore.prototype.requestDraw = function () {
	if (this.drewFrame) {
		this.dispatchDraw();
	}
}
GameBoyCore.prototype.dispatchDraw = function () {
	if (this.offscreenRGBCount > 0) {
		//We actually updated the graphics internally, so copy out:
		if (this.offscreenRGBCount == 92160) {
			this.processDraw(this.swizzledFrame);
		}
		else {
			this.resizeFrameBuffer();
		}
	}
}
GameBoyCore.prototype.processDraw = function (frameBuffer) {
	var canvasRGBALength = this.offscreenRGBCount;
	var canvasData = this.canvasBuffer.data;
	var bufferIndex = 0;
	for (var canvasIndex = 0; canvasIndex < canvasRGBALength; ++canvasIndex) {
		canvasData[canvasIndex++] = frameBuffer[bufferIndex++];
		canvasData[canvasIndex++] = frameBuffer[bufferIndex++];
		canvasData[canvasIndex++] = frameBuffer[bufferIndex++];
	}
	this.graphicsBlit();
	this.drewFrame = false;
}
GameBoyCore.prototype.swizzleFrameBuffer = function () {
	//Convert our dirty 24-bit (24-bit, with internal render flags above it) framebuffer to an 8-bit buffer with separate indices for the RGB channels:
	var frameBuffer = this.frameBuffer;
	var swizzledFrame = this.swizzledFrame;
	var bufferIndex = 0;
	for (var canvasIndex = 0; canvasIndex < 69120;) {
		swizzledFrame[canvasIndex++] = (frameBuffer[bufferIndex] >> 16) & 0xFF;		//Red
		swizzledFrame[canvasIndex++] = (frameBuffer[bufferIndex] >> 8) & 0xFF;		//Green
		swizzledFrame[canvasIndex++] = frameBuffer[bufferIndex++] & 0xFF;			//Blue
	}
}
GameBoyCore.prototype.clearFrameBuffer = function () {
	var bufferIndex = 0;
	var frameBuffer = this.swizzledFrame;
	if (this.cGBC || this.colorizedGBPalettes) {
		while (bufferIndex < 69120) {
			frameBuffer[bufferIndex++] = 248;
		}
	}
	else {
		while (bufferIndex < 69120) {
			frameBuffer[bufferIndex++] = 239;
			frameBuffer[bufferIndex++] = 255;
			frameBuffer[bufferIndex++] = 222;
		}
	}
}
GameBoyCore.prototype.resizeFrameBuffer = function () {
	//Resize in javascript with resize.js:
	if (this.resizePathClear) {
		this.resizePathClear = false;
		this.resizer.resize(this.swizzledFrame);
	}
}
GameBoyCore.prototype.compileResizeFrameBufferFunction = function () {
	if (this.offscreenRGBCount > 0) {
		var parentObj = this;
		this.resizer = new Resize(160, 144, this.offscreenWidth, this.offscreenHeight, false, settings[13], false, function (buffer) {
			if ((buffer.length / 3 * 4) == parentObj.offscreenRGBCount) {
				parentObj.processDraw(buffer);
			}
			parentObj.resizePathClear = true;
		});
	}
}
GameBoyCore.prototype.renderScanLine = function (scanlineToRender) {
	this.pixelStart = scanlineToRender * 160;
	if (this.bgEnabled) {
		this.pixelEnd = 160;
		this.BGLayerRender(scanlineToRender);
		this.WindowLayerRender(scanlineToRender);
	}
	else {
		var pixelLine = (scanlineToRender + 1) * 160;
		var defaultColor = (this.cGBC || this.colorizedGBPalettes) ? 0xF8F8F8 : 0xEFFFDE;
		for (var pixelPosition = (scanlineToRender * 160) + this.currentX; pixelPosition < pixelLine; pixelPosition++) {
			this.frameBuffer[pixelPosition] = defaultColor;
		}
	}
	this.SpriteLayerRender(scanlineToRender);
	this.currentX = 0;
	this.midScanlineOffset = -1;
}
GameBoyCore.prototype.renderMidScanLine = function () {
	if (this.actualScanLine < 144 && this.modeSTAT == 3) {
		//TODO: Get this accurate:
		if (this.midScanlineOffset == -1) {
			this.midScanlineOffset = this.backgroundX & 0x7;
		}
		if (this.LCDTicks >= 82) {
			this.pixelEnd = this.LCDTicks - 74;
			this.pixelEnd = Math.min(this.pixelEnd - this.midScanlineOffset - (this.pixelEnd % 0x8), 160);
			if (this.bgEnabled) {
				this.pixelStart = this.lastUnrenderedLine * 160;
				this.BGLayerRender(this.lastUnrenderedLine);
				this.WindowLayerRender(this.lastUnrenderedLine);
				//TODO: Do midscanline JIT for sprites...
			}
			else {
				var pixelLine = (this.lastUnrenderedLine * 160) + this.pixelEnd;
				var defaultColor = (this.cGBC || this.colorizedGBPalettes) ? 0xF8F8F8 : 0xEFFFDE;
				for (var pixelPosition = (this.lastUnrenderedLine * 160) + this.currentX; pixelPosition < pixelLine; pixelPosition++) {
					this.frameBuffer[pixelPosition] = defaultColor;
				}
			}
			this.currentX = this.pixelEnd;
		}
	}
}
GameBoyCore.prototype.initializeModeSpecificArrays = function () {
	this.LCDCONTROL = (this.LCDisOn) ? this.LINECONTROL : this.DISPLAYOFFCONTROL;
	if (this.cGBC) {
		this.gbcOBJRawPalette = this.getTypedArray(0x40, 0, "uint8");
		this.gbcBGRawPalette = this.getTypedArray(0x40, 0, "uint8");
		this.gbcOBJPalette = this.getTypedArray(0x20, 0x1000000, "int32");
		this.gbcBGPalette = this.getTypedArray(0x40, 0, "int32");
		this.BGCHRBank2 = this.getTypedArray(0x800, 0, "uint8");
		this.BGCHRCurrentBank = (this.currVRAMBank > 0) ? this.BGCHRBank2 : this.BGCHRBank1;
		this.tileCache = this.generateCacheArray(0xF80);
	}
	else {
		this.gbOBJPalette = this.getTypedArray(8, 0, "int32");
		this.gbBGPalette = this.getTypedArray(4, 0, "int32");
		this.BGPalette = this.gbBGPalette;
		this.OBJPalette = this.gbOBJPalette;
		this.tileCache = this.generateCacheArray(0x700);
		this.sortBuffer = this.getTypedArray(0x100, 0, "uint8");
		this.OAMAddressCache = this.getTypedArray(10, 0, "int32");
	}
	this.renderPathBuild();
}
GameBoyCore.prototype.GBCtoGBModeAdjust = function () {
	cout("Stepping down from GBC mode.", 0);
	this.VRAM = this.GBCMemory = this.BGCHRCurrentBank = this.BGCHRBank2 = null;
	this.tileCache.length = 0x700;
	if (settings[4]) {
		this.gbBGColorizedPalette = this.getTypedArray(4, 0, "int32");
		this.gbOBJColorizedPalette = this.getTypedArray(8, 0, "int32");
		this.cachedBGPaletteConversion = this.getTypedArray(4, 0, "int32");
		this.cachedOBJPaletteConversion = this.getTypedArray(8, 0, "int32");
		this.BGPalette = this.gbBGColorizedPalette;
		this.OBJPalette = this.gbOBJColorizedPalette;
		this.gbOBJPalette = this.gbBGPalette = null;
		this.getGBCColor();
	}
	else {
		this.gbOBJPalette = this.getTypedArray(8, 0, "int32");
		this.gbBGPalette = this.getTypedArray(4, 0, "int32");
		this.BGPalette = this.gbBGPalette;
		this.OBJPalette = this.gbOBJPalette;
	}
	this.sortBuffer = this.getTypedArray(0x100, 0, "uint8");
	this.OAMAddressCache = this.getTypedArray(10, 0, "int32");
	this.renderPathBuild();
	this.memoryReadJumpCompile();
	this.memoryWriteJumpCompile();
}
GameBoyCore.prototype.renderPathBuild = function () {
	if (!this.cGBC) {
		this.BGLayerRender = this.BGGBLayerRender;
		this.WindowLayerRender = this.WindowGBLayerRender;
		this.SpriteLayerRender = this.SpriteGBLayerRender;
	}
	else {
		this.priorityFlaggingPathRebuild();
		this.SpriteLayerRender = this.SpriteGBCLayerRender;
	}
}
GameBoyCore.prototype.priorityFlaggingPathRebuild = function () {
	if (this.BGPriorityEnabled) {
		this.BGLayerRender = this.BGGBCLayerRender;
		this.WindowLayerRender = this.WindowGBCLayerRender;
	}
	else {
		this.BGLayerRender = this.BGGBCLayerRenderNoPriorityFlagging;
		this.WindowLayerRender = this.WindowGBCLayerRenderNoPriorityFlagging;
	}
}
GameBoyCore.prototype.initializeReferencesFromSaveState = function () {
	this.LCDCONTROL = (this.LCDisOn) ? this.LINECONTROL : this.DISPLAYOFFCONTROL;
	var tileIndex = 0;
	if (!this.cGBC) {
		if (this.colorizedGBPalettes) {
			this.BGPalette = this.gbBGColorizedPalette;
			this.OBJPalette = this.gbOBJColorizedPalette;
			this.updateGBBGPalette = this.updateGBColorizedBGPalette;
			this.updateGBOBJPalette = this.updateGBColorizedOBJPalette;

		}
		else {
			this.BGPalette = this.gbBGPalette;
			this.OBJPalette = this.gbOBJPalette;
		}
		this.tileCache = this.generateCacheArray(0x700);
		for (tileIndex = 0x8000; tileIndex < 0x9000; tileIndex += 2) {
			this.generateGBOAMTileLine(tileIndex);
		}
		for (tileIndex = 0x9000; tileIndex < 0x9800; tileIndex += 2) {
			this.generateGBTileLine(tileIndex);
		}
		this.sortBuffer = this.getTypedArray(0x100, 0, "uint8");
		this.OAMAddressCache = this.getTypedArray(10, 0, "int32");
	}
	else {
		this.BGCHRCurrentBank = (this.currVRAMBank > 0) ? this.BGCHRBank2 : this.BGCHRBank1;
		this.tileCache = this.generateCacheArray(0xF80);
		for (; tileIndex < 0x1800; tileIndex += 0x10) {
			this.generateGBCTileBank1(tileIndex);
			this.generateGBCTileBank2(tileIndex);
		}
	}
	this.renderPathBuild();
}



GameBoyCore.prototype.RGBTint = function (value) {
	//Adjustment for the GBC's tinting (According to Gambatte):
	var r = value & 0x1F;
	var g = (value >> 5) & 0x1F;
	var b = (value >> 10) & 0x1F;
	return ((r * 13 + g * 2 + b) >> 1) << 16 | (g * 3 + b) << 9 | (r * 3 + g * 2 + b * 11) >> 1;
}
GameBoyCore.prototype.getGBCColor = function () {
	//GBC Colorization of DMG ROMs:
	//BG
	for (var counter = 0; counter < 4; counter++) {
		var adjustedIndex = counter << 1;
		//BG
		this.cachedBGPaletteConversion[counter] = this.RGBTint((this.gbcBGRawPalette[adjustedIndex | 1] << 8) | this.gbcBGRawPalette[adjustedIndex]);
		//OBJ 1
		this.cachedOBJPaletteConversion[counter] = this.RGBTint((this.gbcOBJRawPalette[adjustedIndex | 1] << 8) | this.gbcOBJRawPalette[adjustedIndex]);
	}
	//OBJ 2
	for (counter = 4; counter < 8; counter++) {
		adjustedIndex = counter << 1;
		this.cachedOBJPaletteConversion[counter] = this.RGBTint((this.gbcOBJRawPalette[adjustedIndex | 1] << 8) | this.gbcOBJRawPalette[adjustedIndex]);
	}
	//Update the palette entries:
	this.updateGBBGPalette = this.updateGBColorizedBGPalette;
	this.updateGBOBJPalette = this.updateGBColorizedOBJPalette;
	this.updateGBBGPalette(this.memory[0xFF47]);
	this.updateGBOBJPalette(0, this.memory[0xFF48]);
	this.updateGBOBJPalette(1, this.memory[0xFF49]);
	this.colorizedGBPalettes = true;
}
GameBoyCore.prototype.updateGBRegularBGPalette = function (data) {
	this.gbBGPalette[0] = this.colors[data & 0x03] | 0x2000000;
	this.gbBGPalette[1] = this.colors[(data >> 2) & 0x03];
	this.gbBGPalette[2] = this.colors[(data >> 4) & 0x03];
	this.gbBGPalette[3] = this.colors[data >> 6];
}
GameBoyCore.prototype.updateGBColorizedBGPalette = function (data) {
	//GB colorization:
	this.gbBGColorizedPalette[0] = this.cachedBGPaletteConversion[data & 0x03] | 0x2000000;
	this.gbBGColorizedPalette[1] = this.cachedBGPaletteConversion[(data >> 2) & 0x03];
	this.gbBGColorizedPalette[2] = this.cachedBGPaletteConversion[(data >> 4) & 0x03];
	this.gbBGColorizedPalette[3] = this.cachedBGPaletteConversion[data >> 6];
}
GameBoyCore.prototype.updateGBRegularOBJPalette = function (index, data) {
	this.gbOBJPalette[index | 1] = this.colors[(data >> 2) & 0x03];
	this.gbOBJPalette[index | 2] = this.colors[(data >> 4) & 0x03];
	this.gbOBJPalette[index | 3] = this.colors[data >> 6];
}
GameBoyCore.prototype.updateGBColorizedOBJPalette = function (index, data) {
	//GB colorization:
	this.gbOBJColorizedPalette[index | 1] = this.cachedOBJPaletteConversion[index | ((data >> 2) & 0x03)];
	this.gbOBJColorizedPalette[index | 2] = this.cachedOBJPaletteConversion[index | ((data >> 4) & 0x03)];
	this.gbOBJColorizedPalette[index | 3] = this.cachedOBJPaletteConversion[index | (data >> 6)];
}
GameBoyCore.prototype.updateGBCBGPalette = function (index, data) {
	if (this.gbcBGRawPalette[index] != data) {
		this.midScanLineJIT();
		//Update the color palette for BG tiles since it changed:
		this.gbcBGRawPalette[index] = data;
		if ((index & 0x06) == 0) {
			//Palette 0 (Special tile Priority stuff)
			data = 0x2000000 | this.RGBTint((this.gbcBGRawPalette[index | 1] << 8) | this.gbcBGRawPalette[index & 0x3E]);
			index >>= 1;
			this.gbcBGPalette[index] = data;
			this.gbcBGPalette[0x20 | index] = 0x1000000 | data;
		}
		else {
			//Regular Palettes (No special crap)
			data = this.RGBTint((this.gbcBGRawPalette[index | 1] << 8) | this.gbcBGRawPalette[index & 0x3E]);
			index >>= 1;
			this.gbcBGPalette[index] = data;
			this.gbcBGPalette[0x20 | index] = 0x1000000 | data;
		}
	}
}
GameBoyCore.prototype.updateGBCOBJPalette = function (index, data) {
	if (this.gbcOBJRawPalette[index] != data) {
		//Update the color palette for OBJ tiles since it changed:
		this.gbcOBJRawPalette[index] = data;
		if ((index & 0x06) > 0) {
			//Regular Palettes (No special crap)
			this.midScanLineJIT();
			this.gbcOBJPalette[index >> 1] = 0x1000000 | this.RGBTint((this.gbcOBJRawPalette[index | 1] << 8) | this.gbcOBJRawPalette[index & 0x3E]);
		}
	}
}
GameBoyCore.prototype.BGGBLayerRender = function (scanlineToRender) {
	var scrollYAdjusted = (this.backgroundY + scanlineToRender) & 0xFF;						//The line of the BG we're at.
	var tileYLine = (scrollYAdjusted & 7) << 3;
	var tileYDown = this.gfxBackgroundCHRBankPosition | ((scrollYAdjusted & 0xF8) << 2);	//The row of cached tiles we're fetching from.
	var scrollXAdjusted = (this.backgroundX + this.currentX) & 0xFF;						//The scroll amount of the BG.
	var pixelPosition = this.pixelStart + this.currentX;									//Current pixel we're working on.
	var pixelPositionEnd = this.pixelStart + ((this.gfxWindowDisplay && (scanlineToRender - this.windowY) >= 0) ? Math.min(Math.max(this.windowX, 0) + this.currentX, this.pixelEnd) : this.pixelEnd);	//Make sure we do at most 160 pixels a scanline.
	var tileNumber = tileYDown + (scrollXAdjusted >> 3);
	var chrCode = this.BGCHRBank1[tileNumber];
	if (chrCode < this.gfxBackgroundBankOffset) {
		chrCode |= 0x100;
	}
	var tile = this.tileCache[chrCode];
	for (var texel = (scrollXAdjusted & 0x7); texel < 8 && pixelPosition < pixelPositionEnd && scrollXAdjusted < 0x100; ++scrollXAdjusted) {
		this.frameBuffer[pixelPosition++] = this.BGPalette[tile[tileYLine | texel++]];
	}
	var scrollXAdjustedAligned = Math.min(pixelPositionEnd - pixelPosition, 0x100 - scrollXAdjusted) >> 3;
	scrollXAdjusted += scrollXAdjustedAligned << 3;
	scrollXAdjustedAligned += tileNumber;
	while (tileNumber < scrollXAdjustedAligned) {
		chrCode = this.BGCHRBank1[++tileNumber];
		if (chrCode < this.gfxBackgroundBankOffset) {
			chrCode |= 0x100;
		}
		tile = this.tileCache[chrCode];
		texel = tileYLine;
		this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel++]];
		this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel++]];
		this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel++]];
		this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel++]];
		this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel++]];
		this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel++]];
		this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel++]];
		this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel]];
	}
	if (pixelPosition < pixelPositionEnd) {
		if (scrollXAdjusted < 0x100) {
			chrCode = this.BGCHRBank1[++tileNumber];
			if (chrCode < this.gfxBackgroundBankOffset) {
				chrCode |= 0x100;
			}
			tile = this.tileCache[chrCode];
			for (texel = tileYLine - 1; pixelPosition < pixelPositionEnd && scrollXAdjusted < 0x100; ++scrollXAdjusted) {
				this.frameBuffer[pixelPosition++] = this.BGPalette[tile[++texel]];
			}
		}
		scrollXAdjustedAligned = ((pixelPositionEnd - pixelPosition) >> 3) + tileYDown;
		while (tileYDown < scrollXAdjustedAligned) {
			chrCode = this.BGCHRBank1[tileYDown++];
			if (chrCode < this.gfxBackgroundBankOffset) {
				chrCode |= 0x100;
			}
			tile = this.tileCache[chrCode];
			texel = tileYLine;
			this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel++]];
			this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel++]];
			this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel++]];
			this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel++]];
			this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel++]];
			this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel++]];
			this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel++]];
			this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel]];
		}
		if (pixelPosition < pixelPositionEnd) {
			chrCode = this.BGCHRBank1[tileYDown];
			if (chrCode < this.gfxBackgroundBankOffset) {
				chrCode |= 0x100;
			}
			tile = this.tileCache[chrCode];
			switch (pixelPositionEnd - pixelPosition) {
				case 7:
					this.frameBuffer[pixelPosition + 6] = this.BGPalette[tile[tileYLine | 6]];
				case 6:
					this.frameBuffer[pixelPosition + 5] = this.BGPalette[tile[tileYLine | 5]];
				case 5:
					this.frameBuffer[pixelPosition + 4] = this.BGPalette[tile[tileYLine | 4]];
				case 4:
					this.frameBuffer[pixelPosition + 3] = this.BGPalette[tile[tileYLine | 3]];
				case 3:
					this.frameBuffer[pixelPosition + 2] = this.BGPalette[tile[tileYLine | 2]];
				case 2:
					this.frameBuffer[pixelPosition + 1] = this.BGPalette[tile[tileYLine | 1]];
				case 1:
					this.frameBuffer[pixelPosition] = this.BGPalette[tile[tileYLine]];
			}
		}
	}
}
GameBoyCore.prototype.BGGBCLayerRender = function (scanlineToRender) {
	var scrollYAdjusted = (this.backgroundY + scanlineToRender) & 0xFF;						//The line of the BG we're at.
	var tileYLine = (scrollYAdjusted & 7) << 3;
	var tileYDown = this.gfxBackgroundCHRBankPosition | ((scrollYAdjusted & 0xF8) << 2);	//The row of cached tiles we're fetching from.
	var scrollXAdjusted = (this.backgroundX + this.currentX) & 0xFF;						//The scroll amount of the BG.
	var pixelPosition = this.pixelStart + this.currentX;									//Current pixel we're working on.
	var pixelPositionEnd = this.pixelStart + ((this.gfxWindowDisplay && (scanlineToRender - this.windowY) >= 0) ? Math.min(Math.max(this.windowX, 0) + this.currentX, this.pixelEnd) : this.pixelEnd);	//Make sure we do at most 160 pixels a scanline.
	var tileNumber = tileYDown + (scrollXAdjusted >> 3);
	var chrCode = this.BGCHRBank1[tileNumber];
	if (chrCode < this.gfxBackgroundBankOffset) {
		chrCode |= 0x100;
	}
	var attrCode = this.BGCHRBank2[tileNumber];
	var tile = this.tileCache[((attrCode & 0x08) << 8) | ((attrCode & 0x60) << 4) | chrCode];
	var palette = ((attrCode & 0x7) << 2) | ((attrCode & 0x80) >> 2);
	for (var texel = (scrollXAdjusted & 0x7); texel < 8 && pixelPosition < pixelPositionEnd && scrollXAdjusted < 0x100; ++scrollXAdjusted) {
		this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[tileYLine | texel++]];
	}
	var scrollXAdjustedAligned = Math.min(pixelPositionEnd - pixelPosition, 0x100 - scrollXAdjusted) >> 3;
	scrollXAdjusted += scrollXAdjustedAligned << 3;
	scrollXAdjustedAligned += tileNumber;
	while (tileNumber < scrollXAdjustedAligned) {
		chrCode = this.BGCHRBank1[++tileNumber];
		if (chrCode < this.gfxBackgroundBankOffset) {
			chrCode |= 0x100;
		}
		attrCode = this.BGCHRBank2[tileNumber];
		tile = this.tileCache[((attrCode & 0x08) << 8) | ((attrCode & 0x60) << 4) | chrCode];
		palette = ((attrCode & 0x7) << 2) | ((attrCode & 0x80) >> 2);
		texel = tileYLine;
		this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
		this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
		this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
		this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
		this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
		this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
		this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
		this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel]];
	}
	if (pixelPosition < pixelPositionEnd) {
		if (scrollXAdjusted < 0x100) {
			chrCode = this.BGCHRBank1[++tileNumber];
			if (chrCode < this.gfxBackgroundBankOffset) {
				chrCode |= 0x100;
			}
			attrCode = this.BGCHRBank2[tileNumber];
			tile = this.tileCache[((attrCode & 0x08) << 8) | ((attrCode & 0x60) << 4) | chrCode];
			palette = ((attrCode & 0x7) << 2) | ((attrCode & 0x80) >> 2);
			for (texel = tileYLine - 1; pixelPosition < pixelPositionEnd && scrollXAdjusted < 0x100; ++scrollXAdjusted) {
				this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[++texel]];
			}
		}
		scrollXAdjustedAligned = ((pixelPositionEnd - pixelPosition) >> 3) + tileYDown;
		while (tileYDown < scrollXAdjustedAligned) {
			chrCode = this.BGCHRBank1[tileYDown];
			if (chrCode < this.gfxBackgroundBankOffset) {
				chrCode |= 0x100;
			}
			attrCode = this.BGCHRBank2[tileYDown++];
			tile = this.tileCache[((attrCode & 0x08) << 8) | ((attrCode & 0x60) << 4) | chrCode];
			palette = ((attrCode & 0x7) << 2) | ((attrCode & 0x80) >> 2);
			texel = tileYLine;
			this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
			this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
			this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
			this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
			this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
			this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
			this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
			this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel]];
		}
		if (pixelPosition < pixelPositionEnd) {
			chrCode = this.BGCHRBank1[tileYDown];
			if (chrCode < this.gfxBackgroundBankOffset) {
				chrCode |= 0x100;
			}
			attrCode = this.BGCHRBank2[tileYDown];
			tile = this.tileCache[((attrCode & 0x08) << 8) | ((attrCode & 0x60) << 4) | chrCode];
			palette = ((attrCode & 0x7) << 2) | ((attrCode & 0x80) >> 2);
			switch (pixelPositionEnd - pixelPosition) {
				case 7:
					this.frameBuffer[pixelPosition + 6] = this.gbcBGPalette[palette | tile[tileYLine | 6]];
				case 6:
					this.frameBuffer[pixelPosition + 5] = this.gbcBGPalette[palette | tile[tileYLine | 5]];
				case 5:
					this.frameBuffer[pixelPosition + 4] = this.gbcBGPalette[palette | tile[tileYLine | 4]];
				case 4:
					this.frameBuffer[pixelPosition + 3] = this.gbcBGPalette[palette | tile[tileYLine | 3]];
				case 3:
					this.frameBuffer[pixelPosition + 2] = this.gbcBGPalette[palette | tile[tileYLine | 2]];
				case 2:
					this.frameBuffer[pixelPosition + 1] = this.gbcBGPalette[palette | tile[tileYLine | 1]];
				case 1:
					this.frameBuffer[pixelPosition] = this.gbcBGPalette[palette | tile[tileYLine]];
			}
		}
	}
}
GameBoyCore.prototype.BGGBCLayerRenderNoPriorityFlagging = function (scanlineToRender) {
	var scrollYAdjusted = (this.backgroundY + scanlineToRender) & 0xFF;						//The line of the BG we're at.
	var tileYLine = (scrollYAdjusted & 7) << 3;
	var tileYDown = this.gfxBackgroundCHRBankPosition | ((scrollYAdjusted & 0xF8) << 2);	//The row of cached tiles we're fetching from.
	var scrollXAdjusted = (this.backgroundX + this.currentX) & 0xFF;						//The scroll amount of the BG.
	var pixelPosition = this.pixelStart + this.currentX;									//Current pixel we're working on.
	var pixelPositionEnd = this.pixelStart + ((this.gfxWindowDisplay && (scanlineToRender - this.windowY) >= 0) ? Math.min(Math.max(this.windowX, 0) + this.currentX, this.pixelEnd) : this.pixelEnd);	//Make sure we do at most 160 pixels a scanline.
	var tileNumber = tileYDown + (scrollXAdjusted >> 3);
	var chrCode = this.BGCHRBank1[tileNumber];
	if (chrCode < this.gfxBackgroundBankOffset) {
		chrCode |= 0x100;
	}
	var attrCode = this.BGCHRBank2[tileNumber];
	var tile = this.tileCache[((attrCode & 0x08) << 8) | ((attrCode & 0x60) << 4) | chrCode];
	var palette = (attrCode & 0x7) << 2;
	for (var texel = (scrollXAdjusted & 0x7); texel < 8 && pixelPosition < pixelPositionEnd && scrollXAdjusted < 0x100; ++scrollXAdjusted) {
		this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[tileYLine | texel++]];
	}
	var scrollXAdjustedAligned = Math.min(pixelPositionEnd - pixelPosition, 0x100 - scrollXAdjusted) >> 3;
	scrollXAdjusted += scrollXAdjustedAligned << 3;
	scrollXAdjustedAligned += tileNumber;
	while (tileNumber < scrollXAdjustedAligned) {
		chrCode = this.BGCHRBank1[++tileNumber];
		if (chrCode < this.gfxBackgroundBankOffset) {
			chrCode |= 0x100;
		}
		attrCode = this.BGCHRBank2[tileNumber];
		tile = this.tileCache[((attrCode & 0x08) << 8) | ((attrCode & 0x60) << 4) | chrCode];
		palette = (attrCode & 0x7) << 2;
		texel = tileYLine;
		this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
		this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
		this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
		this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
		this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
		this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
		this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
		this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel]];
	}
	if (pixelPosition < pixelPositionEnd) {
		if (scrollXAdjusted < 0x100) {
			chrCode = this.BGCHRBank1[++tileNumber];
			if (chrCode < this.gfxBackgroundBankOffset) {
				chrCode |= 0x100;
			}
			attrCode = this.BGCHRBank2[tileNumber];
			tile = this.tileCache[((attrCode & 0x08) << 8) | ((attrCode & 0x60) << 4) | chrCode];
			palette = (attrCode & 0x7) << 2;
			for (texel = tileYLine - 1; pixelPosition < pixelPositionEnd && scrollXAdjusted < 0x100; ++scrollXAdjusted) {
				this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[++texel]];
			}
		}
		scrollXAdjustedAligned = ((pixelPositionEnd - pixelPosition) >> 3) + tileYDown;
		while (tileYDown < scrollXAdjustedAligned) {
			chrCode = this.BGCHRBank1[tileYDown];
			if (chrCode < this.gfxBackgroundBankOffset) {
				chrCode |= 0x100;
			}
			attrCode = this.BGCHRBank2[tileYDown++];
			tile = this.tileCache[((attrCode & 0x08) << 8) | ((attrCode & 0x60) << 4) | chrCode];
			palette = (attrCode & 0x7) << 2;
			texel = tileYLine;
			this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
			this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
			this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
			this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
			this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
			this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
			this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
			this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel]];
		}
		if (pixelPosition < pixelPositionEnd) {
			chrCode = this.BGCHRBank1[tileYDown];
			if (chrCode < this.gfxBackgroundBankOffset) {
				chrCode |= 0x100;
			}
			attrCode = this.BGCHRBank2[tileYDown];
			tile = this.tileCache[((attrCode & 0x08) << 8) | ((attrCode & 0x60) << 4) | chrCode];
			palette = (attrCode & 0x7) << 2;
			switch (pixelPositionEnd - pixelPosition) {
				case 7:
					this.frameBuffer[pixelPosition + 6] = this.gbcBGPalette[palette | tile[tileYLine | 6]];
				case 6:
					this.frameBuffer[pixelPosition + 5] = this.gbcBGPalette[palette | tile[tileYLine | 5]];
				case 5:
					this.frameBuffer[pixelPosition + 4] = this.gbcBGPalette[palette | tile[tileYLine | 4]];
				case 4:
					this.frameBuffer[pixelPosition + 3] = this.gbcBGPalette[palette | tile[tileYLine | 3]];
				case 3:
					this.frameBuffer[pixelPosition + 2] = this.gbcBGPalette[palette | tile[tileYLine | 2]];
				case 2:
					this.frameBuffer[pixelPosition + 1] = this.gbcBGPalette[palette | tile[tileYLine | 1]];
				case 1:
					this.frameBuffer[pixelPosition] = this.gbcBGPalette[palette | tile[tileYLine]];
			}
		}
	}
}
GameBoyCore.prototype.WindowGBLayerRender = function (scanlineToRender) {
	if (this.gfxWindowDisplay) {									//Is the window enabled?
		var scrollYAdjusted = scanlineToRender - this.windowY;		//The line of the BG we're at.
		if (scrollYAdjusted >= 0) {
			var scrollXRangeAdjusted = (this.windowX > 0) ? (this.windowX + this.currentX) : this.currentX;
			var pixelPosition = this.pixelStart + scrollXRangeAdjusted;
			var pixelPositionEnd = this.pixelStart + this.pixelEnd;
			if (pixelPosition < pixelPositionEnd) {
				var tileYLine = (scrollYAdjusted & 0x7) << 3;
				var tileNumber = (this.gfxWindowCHRBankPosition | ((scrollYAdjusted & 0xF8) << 2)) + (this.currentX >> 3);
				var chrCode = this.BGCHRBank1[tileNumber];
				if (chrCode < this.gfxBackgroundBankOffset) {
					chrCode |= 0x100;
				}
				var tile = this.tileCache[chrCode];
				var texel = (scrollXRangeAdjusted - this.windowX) & 0x7;
				scrollXRangeAdjusted = Math.min(8, texel + pixelPositionEnd - pixelPosition);
				while (texel < scrollXRangeAdjusted) {
					this.frameBuffer[pixelPosition++] = this.BGPalette[tile[tileYLine | texel++]];
				}
				scrollXRangeAdjusted = tileNumber + ((pixelPositionEnd - pixelPosition) >> 3);
				while (tileNumber < scrollXRangeAdjusted) {
					chrCode = this.BGCHRBank1[++tileNumber];
					if (chrCode < this.gfxBackgroundBankOffset) {
						chrCode |= 0x100;
					}
					tile = this.tileCache[chrCode];
					texel = tileYLine;
					this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel++]];
					this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel++]];
					this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel++]];
					this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel++]];
					this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel++]];
					this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel++]];
					this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel++]];
					this.frameBuffer[pixelPosition++] = this.BGPalette[tile[texel]];
				}
				if (pixelPosition < pixelPositionEnd) {
					chrCode = this.BGCHRBank1[++tileNumber];
					if (chrCode < this.gfxBackgroundBankOffset) {
						chrCode |= 0x100;
					}
					tile = this.tileCache[chrCode];
					switch (pixelPositionEnd - pixelPosition) {
						case 7:
							this.frameBuffer[pixelPosition + 6] = this.BGPalette[tile[tileYLine | 6]];
						case 6:
							this.frameBuffer[pixelPosition + 5] = this.BGPalette[tile[tileYLine | 5]];
						case 5:
							this.frameBuffer[pixelPosition + 4] = this.BGPalette[tile[tileYLine | 4]];
						case 4:
							this.frameBuffer[pixelPosition + 3] = this.BGPalette[tile[tileYLine | 3]];
						case 3:
							this.frameBuffer[pixelPosition + 2] = this.BGPalette[tile[tileYLine | 2]];
						case 2:
							this.frameBuffer[pixelPosition + 1] = this.BGPalette[tile[tileYLine | 1]];
						case 1:
							this.frameBuffer[pixelPosition] = this.BGPalette[tile[tileYLine]];
					}
				}
			}
		}
	}
}
GameBoyCore.prototype.WindowGBCLayerRender = function (scanlineToRender) {
	if (this.gfxWindowDisplay) {									//Is the window enabled?
		var scrollYAdjusted = scanlineToRender - this.windowY;		//The line of the BG we're at.
		if (scrollYAdjusted >= 0) {
			var scrollXRangeAdjusted = (this.windowX > 0) ? (this.windowX + this.currentX) : this.currentX;
			var pixelPosition = this.pixelStart + scrollXRangeAdjusted;
			var pixelPositionEnd = this.pixelStart + this.pixelEnd;
			if (pixelPosition < pixelPositionEnd) {
				var tileYLine = (scrollYAdjusted & 0x7) << 3;
				var tileNumber = (this.gfxWindowCHRBankPosition | ((scrollYAdjusted & 0xF8) << 2)) + (this.currentX >> 3);
				var chrCode = this.BGCHRBank1[tileNumber];
				if (chrCode < this.gfxBackgroundBankOffset) {
					chrCode |= 0x100;
				}
				var attrCode = this.BGCHRBank2[tileNumber];
				var tile = this.tileCache[((attrCode & 0x08) << 8) | ((attrCode & 0x60) << 4) | chrCode];
				var palette = ((attrCode & 0x7) << 2) | ((attrCode & 0x80) >> 2);
				var texel = (scrollXRangeAdjusted - this.windowX) & 0x7;
				scrollXRangeAdjusted = Math.min(8, texel + pixelPositionEnd - pixelPosition);
				while (texel < scrollXRangeAdjusted) {
					this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[tileYLine | texel++]];
				}
				scrollXRangeAdjusted = tileNumber + ((pixelPositionEnd - pixelPosition) >> 3);
				while (tileNumber < scrollXRangeAdjusted) {
					chrCode = this.BGCHRBank1[++tileNumber];
					if (chrCode < this.gfxBackgroundBankOffset) {
						chrCode |= 0x100;
					}
					attrCode = this.BGCHRBank2[tileNumber];
					tile = this.tileCache[((attrCode & 0x08) << 8) | ((attrCode & 0x60) << 4) | chrCode];
					palette = ((attrCode & 0x7) << 2) | ((attrCode & 0x80) >> 2);
					texel = tileYLine;
					this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
					this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
					this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
					this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
					this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
					this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
					this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
					this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel]];
				}
				if (pixelPosition < pixelPositionEnd) {
					chrCode = this.BGCHRBank1[++tileNumber];
					if (chrCode < this.gfxBackgroundBankOffset) {
						chrCode |= 0x100;
					}
					attrCode = this.BGCHRBank2[tileNumber];
					tile = this.tileCache[((attrCode & 0x08) << 8) | ((attrCode & 0x60) << 4) | chrCode];
					palette = ((attrCode & 0x7) << 2) | ((attrCode & 0x80) >> 2);
					switch (pixelPositionEnd - pixelPosition) {
						case 7:
							this.frameBuffer[pixelPosition + 6] = this.gbcBGPalette[palette | tile[tileYLine | 6]];
						case 6:
							this.frameBuffer[pixelPosition + 5] = this.gbcBGPalette[palette | tile[tileYLine | 5]];
						case 5:
							this.frameBuffer[pixelPosition + 4] = this.gbcBGPalette[palette | tile[tileYLine | 4]];
						case 4:
							this.frameBuffer[pixelPosition + 3] = this.gbcBGPalette[palette | tile[tileYLine | 3]];
						case 3:
							this.frameBuffer[pixelPosition + 2] = this.gbcBGPalette[palette | tile[tileYLine | 2]];
						case 2:
							this.frameBuffer[pixelPosition + 1] = this.gbcBGPalette[palette | tile[tileYLine | 1]];
						case 1:
							this.frameBuffer[pixelPosition] = this.gbcBGPalette[palette | tile[tileYLine]];
					}
				}
			}
		}
	}
}
GameBoyCore.prototype.WindowGBCLayerRenderNoPriorityFlagging = function (scanlineToRender) {
	if (this.gfxWindowDisplay) {									//Is the window enabled?
		var scrollYAdjusted = scanlineToRender - this.windowY;		//The line of the BG we're at.
		if (scrollYAdjusted >= 0) {
			var scrollXRangeAdjusted = (this.windowX > 0) ? (this.windowX + this.currentX) : this.currentX;
			var pixelPosition = this.pixelStart + scrollXRangeAdjusted;
			var pixelPositionEnd = this.pixelStart + this.pixelEnd;
			if (pixelPosition < pixelPositionEnd) {
				var tileYLine = (scrollYAdjusted & 0x7) << 3;
				var tileNumber = (this.gfxWindowCHRBankPosition | ((scrollYAdjusted & 0xF8) << 2)) + (this.currentX >> 3);
				var chrCode = this.BGCHRBank1[tileNumber];
				if (chrCode < this.gfxBackgroundBankOffset) {
					chrCode |= 0x100;
				}
				var attrCode = this.BGCHRBank2[tileNumber];
				var tile = this.tileCache[((attrCode & 0x08) << 8) | ((attrCode & 0x60) << 4) | chrCode];
				var palette = (attrCode & 0x7) << 2;
				var texel = (scrollXRangeAdjusted - this.windowX) & 0x7;
				scrollXRangeAdjusted = Math.min(8, texel + pixelPositionEnd - pixelPosition);
				while (texel < scrollXRangeAdjusted) {
					this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[tileYLine | texel++]];
				}
				scrollXRangeAdjusted = tileNumber + ((pixelPositionEnd - pixelPosition) >> 3);
				while (tileNumber < scrollXRangeAdjusted) {
					chrCode = this.BGCHRBank1[++tileNumber];
					if (chrCode < this.gfxBackgroundBankOffset) {
						chrCode |= 0x100;
					}
					attrCode = this.BGCHRBank2[tileNumber];
					tile = this.tileCache[((attrCode & 0x08) << 8) | ((attrCode & 0x60) << 4) | chrCode];
					palette = (attrCode & 0x7) << 2;
					texel = tileYLine;
					this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
					this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
					this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
					this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
					this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
					this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
					this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel++]];
					this.frameBuffer[pixelPosition++] = this.gbcBGPalette[palette | tile[texel]];
				}
				if (pixelPosition < pixelPositionEnd) {
					chrCode = this.BGCHRBank1[++tileNumber];
					if (chrCode < this.gfxBackgroundBankOffset) {
						chrCode |= 0x100;
					}
					attrCode = this.BGCHRBank2[tileNumber];
					tile = this.tileCache[((attrCode & 0x08) << 8) | ((attrCode & 0x60) << 4) | chrCode];
					palette = (attrCode & 0x7) << 2;
					switch (pixelPositionEnd - pixelPosition) {
						case 7:
							this.frameBuffer[pixelPosition + 6] = this.gbcBGPalette[palette | tile[tileYLine | 6]];
						case 6:
							this.frameBuffer[pixelPosition + 5] = this.gbcBGPalette[palette | tile[tileYLine | 5]];
						case 5:
							this.frameBuffer[pixelPosition + 4] = this.gbcBGPalette[palette | tile[tileYLine | 4]];
						case 4:
							this.frameBuffer[pixelPosition + 3] = this.gbcBGPalette[palette | tile[tileYLine | 3]];
						case 3:
							this.frameBuffer[pixelPosition + 2] = this.gbcBGPalette[palette | tile[tileYLine | 2]];
						case 2:
							this.frameBuffer[pixelPosition + 1] = this.gbcBGPalette[palette | tile[tileYLine | 1]];
						case 1:
							this.frameBuffer[pixelPosition] = this.gbcBGPalette[palette | tile[tileYLine]];
					}
				}
			}
		}
	}
}
GameBoyCore.prototype.SpriteGBLayerRender = function (scanlineToRender) {
	if (this.gfxSpriteShow) {										//Are sprites enabled?
		var lineAdjusted = scanlineToRender + 0x10;
		var OAMAddress = 0xFE00;
		var yoffset = 0;
		var xcoord = 1;
		var xCoordStart = 0;
		var xCoordEnd = 0;
		var attrCode = 0;
		var palette = 0;
		var tile = null;
		var data = 0;
		var spriteCount = 0;
		var length = 0;
		var currentPixel = 0;
		var linePixel = 0;
		//Clear our x-coord sort buffer:
		while (xcoord < 168) {
			this.sortBuffer[xcoord++] = 0xFF;
		}
		if (this.gfxSpriteNormalHeight) {
			//Draw the visible sprites:
			for (var length = this.findLowestSpriteDrawable(lineAdjusted, 0x7); spriteCount < length; ++spriteCount) {
				OAMAddress = this.OAMAddressCache[spriteCount];
				yoffset = (lineAdjusted - this.memory[OAMAddress]) << 3;
				attrCode = this.memory[OAMAddress | 3];
				palette = (attrCode & 0x10) >> 2;
				tile = this.tileCache[((attrCode & 0x60) << 4) | this.memory[OAMAddress | 0x2]];
				linePixel = xCoordStart = this.memory[OAMAddress | 1];
				xCoordEnd = Math.min(168 - linePixel, 8);
				xcoord = (linePixel > 7) ? 0 : (8 - linePixel);
				for (currentPixel = this.pixelStart + ((linePixel > 8) ? (linePixel - 8) : 0); xcoord < xCoordEnd; ++xcoord, ++currentPixel, ++linePixel) {
					if (this.sortBuffer[linePixel] > xCoordStart) {
						if (this.frameBuffer[currentPixel] >= 0x2000000) {
							data = tile[yoffset | xcoord];
							if (data > 0) {
								this.frameBuffer[currentPixel] = this.OBJPalette[palette | data];
								this.sortBuffer[linePixel] = xCoordStart;
							}
						}
						else if (this.frameBuffer[currentPixel] < 0x1000000) {
							data = tile[yoffset | xcoord];
							if (data > 0 && attrCode < 0x80) {
								this.frameBuffer[currentPixel] = this.OBJPalette[palette | data];
								this.sortBuffer[linePixel] = xCoordStart;
							}
						}
					}
				}
			}
		}
		else {
			//Draw the visible sprites:
			for (var length = this.findLowestSpriteDrawable(lineAdjusted, 0xF); spriteCount < length; ++spriteCount) {
				OAMAddress = this.OAMAddressCache[spriteCount];
				yoffset = (lineAdjusted - this.memory[OAMAddress]) << 3;
				attrCode = this.memory[OAMAddress | 3];
				palette = (attrCode & 0x10) >> 2;
				if ((attrCode & 0x40) == (0x40 & yoffset)) {
					tile = this.tileCache[((attrCode & 0x60) << 4) | (this.memory[OAMAddress | 0x2] & 0xFE)];
				}
				else {
					tile = this.tileCache[((attrCode & 0x60) << 4) | this.memory[OAMAddress | 0x2] | 1];
				}
				yoffset &= 0x3F;
				linePixel = xCoordStart = this.memory[OAMAddress | 1];
				xCoordEnd = Math.min(168 - linePixel, 8);
				xcoord = (linePixel > 7) ? 0 : (8 - linePixel);
				for (currentPixel = this.pixelStart + ((linePixel > 8) ? (linePixel - 8) : 0); xcoord < xCoordEnd; ++xcoord, ++currentPixel, ++linePixel) {
					if (this.sortBuffer[linePixel] > xCoordStart) {
						if (this.frameBuffer[currentPixel] >= 0x2000000) {
							data = tile[yoffset | xcoord];
							if (data > 0) {
								this.frameBuffer[currentPixel] = this.OBJPalette[palette | data];
								this.sortBuffer[linePixel] = xCoordStart;
							}
						}
						else if (this.frameBuffer[currentPixel] < 0x1000000) {
							data = tile[yoffset | xcoord];
							if (data > 0 && attrCode < 0x80) {
								this.frameBuffer[currentPixel] = this.OBJPalette[palette | data];
								this.sortBuffer[linePixel] = xCoordStart;
							}
						}
					}
				}
			}
		}
	}
}
GameBoyCore.prototype.findLowestSpriteDrawable = function (scanlineToRender, drawableRange) {
	var address = 0xFE00;
	var spriteCount = 0;
	var diff = 0;
	while (address < 0xFEA0 && spriteCount < 10) {
		diff = scanlineToRender - this.memory[address];
		if ((diff & drawableRange) == diff) {
			this.OAMAddressCache[spriteCount++] = address;
		}
		address += 4;
	}
	return spriteCount;
}
GameBoyCore.prototype.SpriteGBCLayerRender = function (scanlineToRender) {
	if (this.gfxSpriteShow) {										//Are sprites enabled?
		var OAMAddress = 0xFE00;
		var lineAdjusted = scanlineToRender + 0x10;
		var yoffset = 0;
		var xcoord = 0;
		var endX = 0;
		var xCounter = 0;
		var attrCode = 0;
		var palette = 0;
		var tile = null;
		var data = 0;
		var currentPixel = 0;
		var spriteCount = 0;
		if (this.gfxSpriteNormalHeight) {
			for (; OAMAddress < 0xFEA0 && spriteCount < 10; OAMAddress += 4) {
				yoffset = lineAdjusted - this.memory[OAMAddress];
				if ((yoffset & 0x7) == yoffset) {
					xcoord = this.memory[OAMAddress | 1] - 8;
					endX = Math.min(160, xcoord + 8);
					attrCode = this.memory[OAMAddress | 3];
					palette = (attrCode & 7) << 2;
					tile = this.tileCache[((attrCode & 0x08) << 8) | ((attrCode & 0x60) << 4) | this.memory[OAMAddress | 2]];
					xCounter = (xcoord > 0) ? xcoord : 0;
					xcoord -= yoffset << 3;
					for (currentPixel = this.pixelStart + xCounter; xCounter < endX; ++xCounter, ++currentPixel) {
						if (this.frameBuffer[currentPixel] >= 0x2000000) {
							data = tile[xCounter - xcoord];
							if (data > 0) {
								this.frameBuffer[currentPixel] = this.gbcOBJPalette[palette | data];
							}
						}
						else if (this.frameBuffer[currentPixel] < 0x1000000) {
							data = tile[xCounter - xcoord];
							if (data > 0 && attrCode < 0x80) {		//Don't optimize for attrCode, as LICM-capable JITs should optimize its checks.
								this.frameBuffer[currentPixel] = this.gbcOBJPalette[palette | data];
							}
						}
					}
					++spriteCount;
				}
			}
		}
		else {
			for (; OAMAddress < 0xFEA0 && spriteCount < 10; OAMAddress += 4) {
				yoffset = lineAdjusted - this.memory[OAMAddress];
				if ((yoffset & 0xF) == yoffset) {
					xcoord = this.memory[OAMAddress | 1] - 8;
					endX = Math.min(160, xcoord + 8);
					attrCode = this.memory[OAMAddress | 3];
					palette = (attrCode & 7) << 2;
					if ((attrCode & 0x40) == (0x40 & (yoffset << 3))) {
						tile = this.tileCache[((attrCode & 0x08) << 8) | ((attrCode & 0x60) << 4) | (this.memory[OAMAddress | 0x2] & 0xFE)];
					}
					else {
						tile = this.tileCache[((attrCode & 0x08) << 8) | ((attrCode & 0x60) << 4) | this.memory[OAMAddress | 0x2] | 1];
					}
					xCounter = (xcoord > 0) ? xcoord : 0;
					xcoord -= (yoffset & 0x7) << 3;
					for (currentPixel = this.pixelStart + xCounter; xCounter < endX; ++xCounter, ++currentPixel) {
						if (this.frameBuffer[currentPixel] >= 0x2000000) {
							data = tile[xCounter - xcoord];
							if (data > 0) {
								this.frameBuffer[currentPixel] = this.gbcOBJPalette[palette | data];
							}
						}
						else if (this.frameBuffer[currentPixel] < 0x1000000) {
							data = tile[xCounter - xcoord];
							if (data > 0 && attrCode < 0x80) {		//Don't optimize for attrCode, as LICM-capable JITs should optimize its checks.
								this.frameBuffer[currentPixel] = this.gbcOBJPalette[palette | data];
							}
						}
					}
					++spriteCount;
				}
			}
		}
	}
}
//Generate only a single tile line for the GB tile cache mode:
GameBoyCore.prototype.generateGBTileLine = function (address) {
	var lineCopy = (this.memory[0x1 | address] << 8) | this.memory[0x9FFE & address];
	var tileBlock = this.tileCache[(address & 0x1FF0) >> 4];
	address = (address & 0xE) << 2;
	tileBlock[address | 7] = ((lineCopy & 0x100) >> 7) | (lineCopy & 0x1);
	tileBlock[address | 6] = ((lineCopy & 0x200) >> 8) | ((lineCopy & 0x2) >> 1);
	tileBlock[address | 5] = ((lineCopy & 0x400) >> 9) | ((lineCopy & 0x4) >> 2);
	tileBlock[address | 4] = ((lineCopy & 0x800) >> 10) | ((lineCopy & 0x8) >> 3);
	tileBlock[address | 3] = ((lineCopy & 0x1000) >> 11) | ((lineCopy & 0x10) >> 4);
	tileBlock[address | 2] = ((lineCopy & 0x2000) >> 12) | ((lineCopy & 0x20) >> 5);
	tileBlock[address | 1] = ((lineCopy & 0x4000) >> 13) | ((lineCopy & 0x40) >> 6);
	tileBlock[address] = ((lineCopy & 0x8000) >> 14) | ((lineCopy & 0x80) >> 7);
}
//Generate only a single tile line for the GBC tile cache mode (Bank 1):
GameBoyCore.prototype.generateGBCTileLineBank1 = function (address) {
	var lineCopy = (this.memory[0x1 | address] << 8) | this.memory[0x9FFE & address];
	address &= 0x1FFE;
	var tileBlock1 = this.tileCache[address >> 4];
	var tileBlock2 = this.tileCache[0x200 | (address >> 4)];
	var tileBlock3 = this.tileCache[0x400 | (address >> 4)];
	var tileBlock4 = this.tileCache[0x600 | (address >> 4)];
	address = (address & 0xE) << 2;
	var addressFlipped = 0x38 - address;
	tileBlock4[addressFlipped] = tileBlock2[address] = tileBlock3[addressFlipped | 7] = tileBlock1[address | 7] = ((lineCopy & 0x100) >> 7) | (lineCopy & 0x1);
	tileBlock4[addressFlipped | 1] = tileBlock2[address | 1] = tileBlock3[addressFlipped | 6] = tileBlock1[address | 6] = ((lineCopy & 0x200) >> 8) | ((lineCopy & 0x2) >> 1);
	tileBlock4[addressFlipped | 2] = tileBlock2[address | 2] = tileBlock3[addressFlipped | 5] = tileBlock1[address | 5] = ((lineCopy & 0x400) >> 9) | ((lineCopy & 0x4) >> 2);
	tileBlock4[addressFlipped | 3] = tileBlock2[address | 3] = tileBlock3[addressFlipped | 4] = tileBlock1[address | 4] = ((lineCopy & 0x800) >> 10) | ((lineCopy & 0x8) >> 3);
	tileBlock4[addressFlipped | 4] = tileBlock2[address | 4] = tileBlock3[addressFlipped | 3] = tileBlock1[address | 3] = ((lineCopy & 0x1000) >> 11) | ((lineCopy & 0x10) >> 4);
	tileBlock4[addressFlipped | 5] = tileBlock2[address | 5] = tileBlock3[addressFlipped | 2] = tileBlock1[address | 2] = ((lineCopy & 0x2000) >> 12) | ((lineCopy & 0x20) >> 5);
	tileBlock4[addressFlipped | 6] = tileBlock2[address | 6] = tileBlock3[addressFlipped | 1] = tileBlock1[address | 1] = ((lineCopy & 0x4000) >> 13) | ((lineCopy & 0x40) >> 6);
	tileBlock4[addressFlipped | 7] = tileBlock2[address | 7] = tileBlock3[addressFlipped] = tileBlock1[address] = ((lineCopy & 0x8000) >> 14) | ((lineCopy & 0x80) >> 7);
}
//Generate all the flip combinations for a full GBC VRAM bank 1 tile:
GameBoyCore.prototype.generateGBCTileBank1 = function (vramAddress) {
	var address = vramAddress >> 4;
	var tileBlock1 = this.tileCache[address];
	var tileBlock2 = this.tileCache[0x200 | address];
	var tileBlock3 = this.tileCache[0x400 | address];
	var tileBlock4 = this.tileCache[0x600 | address];
	var lineCopy = 0;
	vramAddress |= 0x8000;
	address = 0;
	var addressFlipped = 56;
	do {
		lineCopy = (this.memory[0x1 | vramAddress] << 8) | this.memory[vramAddress];
		tileBlock4[addressFlipped] = tileBlock2[address] = tileBlock3[addressFlipped | 7] = tileBlock1[address | 7] = ((lineCopy & 0x100) >> 7) | (lineCopy & 0x1);
		tileBlock4[addressFlipped | 1] = tileBlock2[address | 1] = tileBlock3[addressFlipped | 6] = tileBlock1[address | 6] = ((lineCopy & 0x200) >> 8) | ((lineCopy & 0x2) >> 1);
		tileBlock4[addressFlipped | 2] = tileBlock2[address | 2] = tileBlock3[addressFlipped | 5] = tileBlock1[address | 5] = ((lineCopy & 0x400) >> 9) | ((lineCopy & 0x4) >> 2);
		tileBlock4[addressFlipped | 3] = tileBlock2[address | 3] = tileBlock3[addressFlipped | 4] = tileBlock1[address | 4] = ((lineCopy & 0x800) >> 10) | ((lineCopy & 0x8) >> 3);
		tileBlock4[addressFlipped | 4] = tileBlock2[address | 4] = tileBlock3[addressFlipped | 3] = tileBlock1[address | 3] = ((lineCopy & 0x1000) >> 11) | ((lineCopy & 0x10) >> 4);
		tileBlock4[addressFlipped | 5] = tileBlock2[address | 5] = tileBlock3[addressFlipped | 2] = tileBlock1[address | 2] = ((lineCopy & 0x2000) >> 12) | ((lineCopy & 0x20) >> 5);
		tileBlock4[addressFlipped | 6] = tileBlock2[address | 6] = tileBlock3[addressFlipped | 1] = tileBlock1[address | 1] = ((lineCopy & 0x4000) >> 13) | ((lineCopy & 0x40) >> 6);
		tileBlock4[addressFlipped | 7] = tileBlock2[address | 7] = tileBlock3[addressFlipped] = tileBlock1[address] = ((lineCopy & 0x8000) >> 14) | ((lineCopy & 0x80) >> 7);
		address += 8;
		addressFlipped -= 8;
		vramAddress += 2;
	} while (addressFlipped > -1);
}
//Generate only a single tile line for the GBC tile cache mode (Bank 2):
GameBoyCore.prototype.generateGBCTileLineBank2 = function (address) {
	var lineCopy = (this.VRAM[0x1 | address] << 8) | this.VRAM[0x1FFE & address];
	var tileBlock1 = this.tileCache[0x800 | (address >> 4)];
	var tileBlock2 = this.tileCache[0xA00 | (address >> 4)];
	var tileBlock3 = this.tileCache[0xC00 | (address >> 4)];
	var tileBlock4 = this.tileCache[0xE00 | (address >> 4)];
	address = (address & 0xE) << 2;
	var addressFlipped = 0x38 - address;
	tileBlock4[addressFlipped] = tileBlock2[address] = tileBlock3[addressFlipped | 7] = tileBlock1[address | 7] = ((lineCopy & 0x100) >> 7) | (lineCopy & 0x1);
	tileBlock4[addressFlipped | 1] = tileBlock2[address | 1] = tileBlock3[addressFlipped | 6] = tileBlock1[address | 6] = ((lineCopy & 0x200) >> 8) | ((lineCopy & 0x2) >> 1);
	tileBlock4[addressFlipped | 2] = tileBlock2[address | 2] = tileBlock3[addressFlipped | 5] = tileBlock1[address | 5] = ((lineCopy & 0x400) >> 9) | ((lineCopy & 0x4) >> 2);
	tileBlock4[addressFlipped | 3] = tileBlock2[address | 3] = tileBlock3[addressFlipped | 4] = tileBlock1[address | 4] = ((lineCopy & 0x800) >> 10) | ((lineCopy & 0x8) >> 3);
	tileBlock4[addressFlipped | 4] = tileBlock2[address | 4] = tileBlock3[addressFlipped | 3] = tileBlock1[address | 3] = ((lineCopy & 0x1000) >> 11) | ((lineCopy & 0x10) >> 4);
	tileBlock4[addressFlipped | 5] = tileBlock2[address | 5] = tileBlock3[addressFlipped | 2] = tileBlock1[address | 2] = ((lineCopy & 0x2000) >> 12) | ((lineCopy & 0x20) >> 5);
	tileBlock4[addressFlipped | 6] = tileBlock2[address | 6] = tileBlock3[addressFlipped | 1] = tileBlock1[address | 1] = ((lineCopy & 0x4000) >> 13) | ((lineCopy & 0x40) >> 6);
	tileBlock4[addressFlipped | 7] = tileBlock2[address | 7] = tileBlock3[addressFlipped] = tileBlock1[address] = ((lineCopy & 0x8000) >> 14) | ((lineCopy & 0x80) >> 7);
}
//Generate all the flip combinations for a full GBC VRAM bank 2 tile:
GameBoyCore.prototype.generateGBCTileBank2 = function (vramAddress) {
	var address = vramAddress >> 4;
	var tileBlock1 = this.tileCache[0x800 | address];
	var tileBlock2 = this.tileCache[0xA00 | address];
	var tileBlock3 = this.tileCache[0xC00 | address];
	var tileBlock4 = this.tileCache[0xE00 | address];
	var lineCopy = 0;
	address = 0;
	var addressFlipped = 56;
	do {
		lineCopy = (this.VRAM[0x1 | vramAddress] << 8) | this.VRAM[vramAddress];
		tileBlock4[addressFlipped] = tileBlock2[address] = tileBlock3[addressFlipped | 7] = tileBlock1[address | 7] = ((lineCopy & 0x100) >> 7) | (lineCopy & 0x1);
		tileBlock4[addressFlipped | 1] = tileBlock2[address | 1] = tileBlock3[addressFlipped | 6] = tileBlock1[address | 6] = ((lineCopy & 0x200) >> 8) | ((lineCopy & 0x2) >> 1);
		tileBlock4[addressFlipped | 2] = tileBlock2[address | 2] = tileBlock3[addressFlipped | 5] = tileBlock1[address | 5] = ((lineCopy & 0x400) >> 9) | ((lineCopy & 0x4) >> 2);
		tileBlock4[addressFlipped | 3] = tileBlock2[address | 3] = tileBlock3[addressFlipped | 4] = tileBlock1[address | 4] = ((lineCopy & 0x800) >> 10) | ((lineCopy & 0x8) >> 3);
		tileBlock4[addressFlipped | 4] = tileBlock2[address | 4] = tileBlock3[addressFlipped | 3] = tileBlock1[address | 3] = ((lineCopy & 0x1000) >> 11) | ((lineCopy & 0x10) >> 4);
		tileBlock4[addressFlipped | 5] = tileBlock2[address | 5] = tileBlock3[addressFlipped | 2] = tileBlock1[address | 2] = ((lineCopy & 0x2000) >> 12) | ((lineCopy & 0x20) >> 5);
		tileBlock4[addressFlipped | 6] = tileBlock2[address | 6] = tileBlock3[addressFlipped | 1] = tileBlock1[address | 1] = ((lineCopy & 0x4000) >> 13) | ((lineCopy & 0x40) >> 6);
		tileBlock4[addressFlipped | 7] = tileBlock2[address | 7] = tileBlock3[addressFlipped] = tileBlock1[address] = ((lineCopy & 0x8000) >> 14) | ((lineCopy & 0x80) >> 7);
		address += 8;
		addressFlipped -= 8;
		vramAddress += 2;
	} while (addressFlipped > -1);
}
//Generate only a single tile line for the GB tile cache mode (OAM accessible range):
GameBoyCore.prototype.generateGBOAMTileLine = function (address) {
	var lineCopy = (this.memory[0x1 | address] << 8) | this.memory[0x9FFE & address];
	address &= 0x1FFE;
	var tileBlock1 = this.tileCache[address >> 4];
	var tileBlock2 = this.tileCache[0x200 | (address >> 4)];
	var tileBlock3 = this.tileCache[0x400 | (address >> 4)];
	var tileBlock4 = this.tileCache[0x600 | (address >> 4)];
	address = (address & 0xE) << 2;
	var addressFlipped = 0x38 - address;
	tileBlock4[addressFlipped] = tileBlock2[address] = tileBlock3[addressFlipped | 7] = tileBlock1[address | 7] = ((lineCopy & 0x100) >> 7) | (lineCopy & 0x1);
	tileBlock4[addressFlipped | 1] = tileBlock2[address | 1] = tileBlock3[addressFlipped | 6] = tileBlock1[address | 6] = ((lineCopy & 0x200) >> 8) | ((lineCopy & 0x2) >> 1);
	tileBlock4[addressFlipped | 2] = tileBlock2[address | 2] = tileBlock3[addressFlipped | 5] = tileBlock1[address | 5] = ((lineCopy & 0x400) >> 9) | ((lineCopy & 0x4) >> 2);
	tileBlock4[addressFlipped | 3] = tileBlock2[address | 3] = tileBlock3[addressFlipped | 4] = tileBlock1[address | 4] = ((lineCopy & 0x800) >> 10) | ((lineCopy & 0x8) >> 3);
	tileBlock4[addressFlipped | 4] = tileBlock2[address | 4] = tileBlock3[addressFlipped | 3] = tileBlock1[address | 3] = ((lineCopy & 0x1000) >> 11) | ((lineCopy & 0x10) >> 4);
	tileBlock4[addressFlipped | 5] = tileBlock2[address | 5] = tileBlock3[addressFlipped | 2] = tileBlock1[address | 2] = ((lineCopy & 0x2000) >> 12) | ((lineCopy & 0x20) >> 5);
	tileBlock4[addressFlipped | 6] = tileBlock2[address | 6] = tileBlock3[addressFlipped | 1] = tileBlock1[address | 1] = ((lineCopy & 0x4000) >> 13) | ((lineCopy & 0x40) >> 6);
	tileBlock4[addressFlipped | 7] = tileBlock2[address | 7] = tileBlock3[addressFlipped] = tileBlock1[address] = ((lineCopy & 0x8000) >> 14) | ((lineCopy & 0x80) >> 7);
}
GameBoyCore.prototype.graphicsJIT = function () {
	if (this.LCDisOn) {
		this.totalLinesPassed = 0;			//Mark frame for ensuring a JIT pass for the next framebuffer output.
		this.graphicsJITScanlineGroup();
	}
}
GameBoyCore.prototype.graphicsJITVBlank = function () {
	//JIT the graphics to v-blank framing:
	this.totalLinesPassed += this.queuedScanLines;
	this.graphicsJITScanlineGroup();
}
GameBoyCore.prototype.graphicsJITScanlineGroup = function () {
	//Normal rendering JIT, where we try to do groups of scanlines at once:
	while (this.queuedScanLines > 0) {
		this.renderScanLine(this.lastUnrenderedLine);
		if (this.lastUnrenderedLine < 143) {
			++this.lastUnrenderedLine;
		}
		else {
			this.lastUnrenderedLine = 0;
		}
		--this.queuedScanLines;
	}
}
GameBoyCore.prototype.incrementScanLineQueue = function () {
	if (this.queuedScanLines < 144) {
		++this.queuedScanLines;
	}
	else {
		this.currentX = 0;
		this.midScanlineOffset = -1;
		if (this.lastUnrenderedLine < 143) {
			++this.lastUnrenderedLine;
		}
		else {
			this.lastUnrenderedLine = 0;
		}
	}
}
GameBoyCore.prototype.midScanLineJIT = function () {
	this.graphicsJIT();
	this.renderMidScanLine();
}