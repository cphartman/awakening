
GameBoyCore.prototype.Init = function(canvas, ROMImage) {
	this.DebugInit();

	//Params, etc...
	this.canvas = canvas;						//Canvas DOM object for drawing out the graphics to.
	this.drawContext = null;					// LCD Context
	this.ROMImage = ROMImage;					//The game's ROM.
	//CPU Registers and Flags:
	this.registerA = 0x01; 						//Register A (Accumulator)
	this.FZero = true; 							//Register F  - Result was zero
	this.FSubtract = false;						//Register F  - Subtraction was executed
	this.FHalfCarry = true;						//Register F  - Half carry or half borrow
	this.FCarry = true;							//Register F  - Carry or borrow
	this.registerB = 0x00;						//Register B
	this.registerC = 0x13;						//Register C
	this.registerD = 0x00;						//Register D
	this.registerE = 0xD8;						//Register E
	this.registersHL = 0x014D;					//Registers H and L combined
	this.stackPointer = 0xFFFE;					//Stack Pointer
	this.programCounter = 0x0100;				//Program Counter
	//Some CPU Emulation State Variables:
	this.CPUCyclesTotal = 0;					//Relative CPU clocking to speed set, rounded appropriately.
	this.CPUCyclesTotalBase = 0;				//Relative CPU clocking to speed set base.
	this.CPUCyclesTotalCurrent = 0;				//Relative CPU clocking to speed set, the directly used value.
	this.CPUCyclesTotalRoundoff = 0;			//Clocking per iteration rounding catch.
	this.baseCPUCyclesPerIteration	= 0;		//CPU clocks per iteration at 1x speed.
	this.remainingClocks = 0;					//HALT clocking overrun carry over.
	this.inBootstrap = true;					//Whether we're in the GBC boot ROM.
	this.usedBootROM = false;					//Updated upon ROM loading...
	this.usedGBCBootROM = false;				//Did we boot to the GBC boot ROM?
	this.halt = false;							//Has the CPU been suspended until the next interrupt?
	this.skipPCIncrement = false;				//Did we trip the DMG Halt bug?
	this.stopEmulator = 3;						//Has the emulation been paused or a frame has ended?
	this.IME = true;							//Are interrupts enabled?
	this.IRQLineMatched = 0;					//CPU IRQ assertion.
	this.interruptsRequested = 0;				//IF Register
	this.interruptsEnabled = 0;					//IE Register
	this.hdmaRunning = false;					//HDMA Transfer Flag - GBC only
	this.CPUTicks = 0;							//The number of clock cycles emulated.
	this.doubleSpeedShifter = 0;				//GBC double speed clocking shifter.
	this.JoyPad = 0xFF;							//Joypad State (two four-bit states actually)
	this.CPUStopped = false;					//CPU STOP status.
	//Main RAM, MBC RAM, GBC Main RAM, VRAM, etc.
	this.memoryReader = [];						//Array of functions mapped to read back memory
	this.memoryWriter = [];						//Array of functions mapped to write to memory
	this.memoryHighReader = [];					//Array of functions mapped to read back 0xFFXX memory
	this.memoryHighWriter = [];					//Array of functions mapped to write to 0xFFXX memory
	this.ROM = [];								//The full ROM file dumped to an array.
	this.memory = [];							//Main Core Memory
	this.MBCRam = [];							//Switchable RAM (Used by games for more RAM) for the main memory range 0xA000 - 0xC000.
	this.VRAM = [];								//Extra VRAM bank for GBC.
	this.GBCMemory = [];						//GBC main RAM Banks
	this.MBC1Mode = false;						//MBC1 Type (4/32, 16/8)
	this.MBCRAMBanksEnabled = false;			//MBC RAM Access Control.
	this.currMBCRAMBank = 0;					//MBC Currently Indexed RAM Bank
	this.currMBCRAMBankPosition = -0xA000;		//MBC Position Adder;
	this.cGBC = false;							//GameBoy Color detection.
	this.gbcRamBank = 1;						//Currently Switched GameBoy Color ram bank
	this.gbcRamBankPosition = -0xD000;			//GBC RAM offset from address start.
	this.gbcRamBankPositionECHO = -0xF000;		//GBC RAM (ECHO mirroring) offset from address start.
	this.RAMBanks = [0, 1, 2, 4, 16];			//Used to map the RAM banks to maximum size the MBC used can do.
	this.ROMBank1offs = 0;						//Offset of the ROM bank switching.
	this.currentROMBank = 0;					//The parsed current ROM bank selection.
	this.cartridgeType = 0;						//Cartridge Type
	this.name = "";								//Name of the game
	this.gameCode = "";							//Game code (Suffix for older games)
	this.fromSaveState = false;					//A boolean to see if this was loaded in as a save state.
	this.savedStateFileName = "";				//When loaded in as a save state, this will not be empty.
	this.STATTracker = 0;						//Tracker for STAT triggering.
	this.modeSTAT = 0;							//The scan line mode (for lines 1-144 it's 2-3-0, for 145-154 it's 1)
	this.spriteCount = 252;						//Mode 3 extra clocking counter (Depends on how many sprites are on the current line.).
	this.LYCMatchTriggerSTAT = false;			//Should we trigger an interrupt if LY==LYC?
	this.mode2TriggerSTAT = false;				//Should we trigger an interrupt if in mode 2?
	this.mode1TriggerSTAT = false;				//Should we trigger an interrupt if in mode 1?
	this.mode0TriggerSTAT = false;				//Should we trigger an interrupt if in mode 0?
	this.LCDisOn = false;						//Is the emulated LCD controller on?
	this.LINECONTROL = [];						//Array of functions to handle each scan line we do (onscreen + offscreen)
	this.DISPLAYOFFCONTROL = [function (parentObj) {
		//Array of line 0 function to handle the LCD controller when it's off (Do nothing!).
	}];
	this.LCDCONTROL = null;						//Pointer to either LINECONTROL or DISPLAYOFFCONTROL.
	this.initializeLCDController();				//Compile the LCD controller functions.
	//RTC (Real Time Clock for MBC3):
	this.RTCisLatched = false;
	this.latchedSeconds = 0;					//RTC latched seconds.
	this.latchedMinutes = 0;					//RTC latched minutes.
	this.latchedHours = 0;						//RTC latched hours.
	this.latchedLDays = 0;						//RTC latched lower 8-bits of the day counter.
	this.latchedHDays = 0;						//RTC latched high-bit of the day counter.
	this.RTCSeconds = 0;						//RTC seconds counter.
	this.RTCMinutes = 0;						//RTC minutes counter.
	this.RTCHours = 0;							//RTC hours counter.
	this.RTCDays = 0;							//RTC days counter.
	this.RTCDayOverFlow = false;				//Did the RTC overflow and wrap the day counter?
	this.RTCHALT = false;						//Is the RTC allowed to clock up?
	//Gyro:
	this.highX = 127;
	this.lowX = 127;
	this.highY = 127;
	this.lowY = 127;
	//Sound variables:
	this.audioHandle = null;						//XAudioJS handle
	this.numSamplesTotal = 0;						//Length of the sound buffers.
	this.dutyLookup = [								//Map the duty values given to ones we can work with.
		[false, false, false, false, false, false, false, true],
		[true, false, false, false, false, false, false, true],
		[true, false, false, false, false, true, true, true],
		[false, true, true, true, true, true, true, false]
	];
	this.bufferContainAmount = 0;					//Buffer maintenance metric.
	this.LSFR15Table = null;
	this.LSFR7Table = null;
	this.noiseSampleTable = null;
	this.initializeAudioStartState();
	this.soundMasterEnabled = false;			//As its name implies
	this.channel3PCM = null;					//Channel 3 adjusted sample buffer.
	//Vin Shit:
	this.VinLeftChannelMasterVolume = 8;		//Computed post-mixing volume.
	this.VinRightChannelMasterVolume = 8;		//Computed post-mixing volume.
	//Channel paths enabled:
	this.leftChannel1 = false;
	this.leftChannel2 = false;
	this.leftChannel3 = false;
	this.leftChannel4 = false;
	this.rightChannel1 = false;
	this.rightChannel2 = false;
	this.rightChannel3 = false;
	this.rightChannel4 = false;
	this.audioClocksUntilNextEvent = 1;
	this.audioClocksUntilNextEventCounter = 1;
	//Channel output level caches:
	this.channel1currentSampleLeft = 0;
	this.channel1currentSampleRight = 0;
	this.channel2currentSampleLeft = 0;
	this.channel2currentSampleRight = 0;
	this.channel3currentSampleLeft = 0;
	this.channel3currentSampleRight = 0;
	this.channel4currentSampleLeft = 0;
	this.channel4currentSampleRight = 0;
	this.channel1currentSampleLeftSecondary = 0;
	this.channel1currentSampleRightSecondary = 0;
	this.channel2currentSampleLeftSecondary = 0;
	this.channel2currentSampleRightSecondary = 0;
	this.channel3currentSampleLeftSecondary = 0;
	this.channel3currentSampleRightSecondary = 0;
	this.channel4currentSampleLeftSecondary = 0;
	this.channel4currentSampleRightSecondary = 0;
	this.channel1currentSampleLeftTrimary = 0;
	this.channel1currentSampleRightTrimary = 0;
	this.channel2currentSampleLeftTrimary = 0;
	this.channel2currentSampleRightTrimary = 0;
	this.mixerOutputCache = 0;
	//Pre-multipliers to cache some calculations:
	this.emulatorSpeed = 1;
	this.initializeTiming();
	//Audio generation counters:
	this.audioTicks = 0;				//Used to sample the audio system every x CPU instructions.
	this.audioIndex = 0;				//Used to keep alignment on audio generation.
	this.downsampleInput = 0;
	this.audioDestinationPosition = 0;	//Used to keep alignment on audio generation.
	this.rollover = 0;					//Used to keep alignment on the number of samples to output (Realign from counter alias).
	//Timing Variables
	this.emulatorTicks = 0;				//Times for how many instructions to execute before ending the loop.
	this.DIVTicks = 56;					//DIV Ticks Counter (Invisible lower 8-bit)
	this.LCDTicks = 60;					//Counter for how many instructions have been executed on a scanline so far.
	this.timerTicks = 0;				//Counter for the TIMA timer.
	this.TIMAEnabled = false;			//Is TIMA enabled?
	this.TACClocker = 1024;				//Timer Max Ticks
	this.serialTimer = 0;				//Serial IRQ Timer
	this.serialShiftTimer = 0;			//Serial Transfer Shift Timer
	this.serialShiftTimerAllocated = 0;	//Serial Transfer Shift Timer Refill
	this.IRQEnableDelay = 0;			//Are the interrupts on queue to be enabled?
	var dateVar = new Date();
	this.lastIteration = dateVar.getTime();//The last time we iterated the main loop.
	dateVar = new Date();
	this.firstIteration = dateVar.getTime();
	this.iterations = 0;
	this.actualScanLine = 0;			//Actual scan line...
	this.lastUnrenderedLine = 0;		//Last rendered scan line...
	this.queuedScanLines = 0;
	this.totalLinesPassed = 0;
	this.haltPostClocks = 0;			//Post-Halt clocking.
	//ROM Cartridge Components:
	this.cMBC1 = false;					//Does the cartridge use MBC1?
	this.cMBC2 = false;					//Does the cartridge use MBC2?
	this.cMBC3 = false;					//Does the cartridge use MBC3?
	this.cMBC5 = false;					//Does the cartridge use MBC5?
	this.cMBC7 = false;					//Does the cartridge use MBC7?
	this.cSRAM = false;					//Does the cartridge use save RAM?
	this.cMMMO1 = false;				//...
	this.cRUMBLE = false;				//Does the cartridge use the RUMBLE addressing (modified MBC5)?
	this.cCamera = false;				//Is the cartridge actually a GameBoy Camera?
	this.cTAMA5 = false;				//Does the cartridge use TAMA5? (Tamagotchi Cartridge)
	this.cHuC3 = false;					//Does the cartridge use HuC3 (Hudson Soft / modified MBC3)?
	this.cHuC1 = false;					//Does the cartridge use HuC1 (Hudson Soft / modified MBC1)?
	this.cTIMER = false;				//Does the cartridge have an RTC?
	this.ROMBanks = [					// 1 Bank = 16 KBytes = 256 Kbits
		2, 4, 8, 16, 32, 64, 128, 256, 512
	];
	this.ROMBanks[0x52] = 72;
	this.ROMBanks[0x53] = 80;
	this.ROMBanks[0x54] = 96;
	this.numRAMBanks = 0;					//How many RAM banks were actually allocated?
	////Graphics Variables
	this.currVRAMBank = 0;					//Current VRAM bank for GBC.
	this.backgroundX = 0;					//Register SCX (X-Scroll)
	this.backgroundY = 0;					//Register SCY (Y-Scroll)
	this.gfxWindowDisplay = false;			//Is the windows enabled?
	this.gfxSpriteShow = false;				//Are sprites enabled?
	this.gfxSpriteNormalHeight = true;		//Are we doing 8x8 or 8x16 sprites?
	this.bgEnabled = true;					//Is the BG enabled?
	this.BGPriorityEnabled = true;			//Can we flag the BG for priority over sprites?
	this.gfxWindowCHRBankPosition = 0;		//The current bank of the character map the window uses.
	this.gfxBackgroundCHRBankPosition = 0;	//The current bank of the character map the BG uses.
	this.gfxBackgroundBankOffset = 0x80;	//Fast mapping of the tile numbering/
	this.windowY = 0;						//Current Y offset of the window.
	this.windowX = 0;						//Current X offset of the window.
	this.drewBlank = 0;						//To prevent the repeating of drawing a blank screen.
	this.drewFrame = false;					//Throttle how many draws we can do to once per iteration.
	this.midScanlineOffset = -1;			//mid-scanline rendering offset.
	this.pixelEnd = 0;						//track the x-coord limit for line rendering (mid-scanline usage).
	this.currentX = 0;						//The x-coord we left off at for mid-scanline rendering.
	//BG Tile Pointer Caches:
	this.BGCHRBank1 = null;
	this.BGCHRBank2 = null;
	this.BGCHRCurrentBank = null;
	//Tile Data Cache:
	this.tileCache = null;
	//Palettes:
	this.colors = [0xEFFFDE, 0xADD794, 0x529273, 0x183442];			//"Classic" GameBoy palette colors.
	this.OBJPalette = null;
	this.BGPalette = null;
	this.gbcOBJRawPalette = null;
	this.gbcBGRawPalette = null;
	this.gbOBJPalette = null;
	this.gbBGPalette = null;
	this.gbcOBJPalette = null;
	this.gbcBGPalette = null;
	this.gbBGColorizedPalette = null;
	this.gbOBJColorizedPalette = null;
	this.cachedBGPaletteConversion = null;
	this.cachedOBJPaletteConversion = null;
	this.updateGBBGPalette = this.updateGBRegularBGPalette;
	this.updateGBOBJPalette = this.updateGBRegularOBJPalette;
	this.colorizedGBPalettes = false;
	this.BGLayerRender = null;			//Reference to the BG rendering function.
	this.WindowLayerRender = null;		//Reference to the window rendering function.
	this.SpriteLayerRender = null;		//Reference to the OAM rendering function.
	this.frameBuffer = [];				//The internal frame-buffer.
	this.swizzledFrame = null;			//The secondary gfx buffer that holds the converted RGBA values.
	this.canvasBuffer = null;			//imageData handle
	this.pixelStart = 0;				//Temp variable for holding the current working framebuffer offset.
	//Variables used for scaling in JS:
	this.onscreenWidth = this.offscreenWidth = 160;
	this.onscreenHeight = this.offscreenHeight = 144;
	this.offscreenRGBCount = this.onscreenWidth * this.onscreenHeight * 4;
	this.resizePathClear = true;
	//Initialize the white noise cache tables ahead of time:
	this.intializeWhiteNoise();
}

GameBoyCore.prototype.initMemory = function () {
	//Initialize the RAM:
	this.memory = this.getTypedArray(0x10000, 0, "uint8");

	this.frameBuffer = this.getTypedArray(23040, 0xF8F8F8, "int32");
	this.BGCHRBank1 = this.getTypedArray(0x800, 0, "uint8");
	this.TICKTable = this.toTypedArray(this.TICKTable, "uint8");
	this.SecondaryTICKTable = this.toTypedArray(this.SecondaryTICKTable, "uint8");
	this.channel3PCM = this.getTypedArray(0x20, 0, "int8");

	this.initMemoryProxy();
}
GameBoyCore.prototype.generateCacheArray = function (tileAmount) {
	var tileArray = [];
	var tileNumber = 0;
	while (tileNumber < tileAmount) {
		tileArray[tileNumber++] = this.getTypedArray(64, 0, "uint8");
	}
	return tileArray;
}
GameBoyCore.prototype.initSkipBootstrap = function () {
	//Fill in the boot ROM set register values
	//Default values to the GB boot ROM values, then fill in the GBC boot ROM values after ROM loading
	var index = 0xFF;
	while (index >= 0) {
		if (index >= 0x30 && index < 0x40) {
			this.memoryWrite(0xFF00 | index, this.ffxxDump[index]);
		}
		else {
			switch (index) {
				case 0x00:
				case 0x01:
				case 0x02:
				case 0x05:
				case 0x07:
				case 0x0F:
				case 0xFF:
					this.memoryWrite(0xFF00 | index, this.ffxxDump[index]);
					break;
				default:
					this.memory[0xFF00 | index] = this.ffxxDump[index];
			}
		}
		--index;
	}
	if (this.cGBC) {
		this.memory[0xFF6C] = 0xFE;
		this.memory[0xFF74] = 0xFE;
	}
	else {
		this.memory[0xFF48] = 0xFF;
		this.memory[0xFF49] = 0xFF;
		this.memory[0xFF6C] = 0xFF;
		this.memory[0xFF74] = 0xFF;
	}
	//Start as an unset device:
	cout("Starting without the GBC boot ROM.", 0);
	this.registerA = (this.cGBC) ? 0x11 : 0x1;
	this.registerB = 0;
	this.registerC = 0x13;
	this.registerD = 0;
	this.registerE = 0xD8;
	this.FZero = true;
	this.FSubtract = false;
	this.FHalfCarry = true;
	this.FCarry = true;
	this.registersHL = 0x014D;
	this.LCDCONTROL = this.LINECONTROL;
	this.IME = false;
	this.IRQLineMatched = 0;
	this.interruptsRequested = 225;
	this.interruptsEnabled = 0;
	this.hdmaRunning = false;
	this.CPUTicks = 12;
	this.STATTracker = 0;
	this.modeSTAT = 1;
	this.spriteCount = 252;
	this.LYCMatchTriggerSTAT = false;
	this.mode2TriggerSTAT = false;
	this.mode1TriggerSTAT = false;
	this.mode0TriggerSTAT = false;
	this.LCDisOn = true;
	this.channel1FrequencyTracker = 0x2000;
	this.channel1DutyTracker = 0;
	this.channel1CachedDuty = this.dutyLookup[2];
	this.channel1totalLength = 0;
	this.channel1envelopeVolume = 0;
	this.channel1envelopeType = false;
	this.channel1envelopeSweeps = 0;
	this.channel1envelopeSweepsLast = 0;
	this.channel1consecutive = true;
	this.channel1frequency = 1985;
	this.channel1SweepFault = true;
	this.channel1ShadowFrequency = 1985;
	this.channel1timeSweep = 1;
	this.channel1lastTimeSweep = 0;
	this.channel1Swept = false;
	this.channel1frequencySweepDivider = 0;
	this.channel1decreaseSweep = false;
	this.channel2FrequencyTracker = 0x2000;
	this.channel2DutyTracker = 0;
	this.channel2CachedDuty = this.dutyLookup[2];
	this.channel2totalLength = 0;
	this.channel2envelopeVolume = 0;
	this.channel2envelopeType = false;
	this.channel2envelopeSweeps = 0;
	this.channel2envelopeSweepsLast = 0;
	this.channel2consecutive = true;
	this.channel2frequency = 0;
	this.channel3canPlay = false;
	this.channel3totalLength = 0;
	this.channel3patternType = 4;
	this.channel3frequency = 0;
	this.channel3consecutive = true;
	this.channel3Counter = 0x418;
	this.channel4FrequencyPeriod = 8;
	this.channel4totalLength = 0;
	this.channel4envelopeVolume = 0;
	this.channel4currentVolume = 0;
	this.channel4envelopeType = false;
	this.channel4envelopeSweeps = 0;
	this.channel4envelopeSweepsLast = 0;
	this.channel4consecutive = true;
	this.channel4BitRange = 0x7FFF;
	this.channel4VolumeShifter = 15;
	this.channel1FrequencyCounter = 0x200;
	this.channel2FrequencyCounter = 0x200;
	this.channel3Counter = 0x800;
	this.channel3FrequencyPeriod = 0x800;
	this.channel3lastSampleLookup = 0;
	this.channel4lastSampleLookup = 0;
	this.VinLeftChannelMasterVolume = 8;
	this.VinRightChannelMasterVolume = 8;
	this.soundMasterEnabled = true;
	this.leftChannel1 = true;
	this.leftChannel2 = true;
	this.leftChannel3 = true;
	this.leftChannel4 = true;
	this.rightChannel1 = true;
	this.rightChannel2 = true;
	this.rightChannel3 = false;
	this.rightChannel4 = false;
	this.DIVTicks = 27044;
	this.LCDTicks = 160;
	this.timerTicks = 0;
	this.TIMAEnabled = false;
	this.TACClocker = 1024;
	this.serialTimer = 0;
	this.serialShiftTimer = 0;
	this.serialShiftTimerAllocated = 0;
	this.IRQEnableDelay = 0;
	this.actualScanLine = 144;
	this.lastUnrenderedLine = 0;
	this.gfxWindowDisplay = false;
	this.gfxSpriteShow = false;
	this.gfxSpriteNormalHeight = true;
	this.bgEnabled = true;
	this.BGPriorityEnabled = true;
	this.gfxWindowCHRBankPosition = 0;
	this.gfxBackgroundCHRBankPosition = 0;
	this.gfxBackgroundBankOffset = 0;
	this.windowY = 0;
	this.windowX = 0;
	this.drewBlank = 0;
	this.midScanlineOffset = -1;
	this.currentX = 0;
}
GameBoyCore.prototype.initBootstrap = function () {
	//Start as an unset device:
	cout("Starting the selected boot ROM.", 0);
	this.programCounter = 0;
	this.stackPointer = 0;
	this.IME = false;
	this.LCDTicks = 0;
	this.DIVTicks = 0;
	this.registerA = 0;
	this.registerB = 0;
	this.registerC = 0;
	this.registerD = 0;
	this.registerE = 0;
	this.FZero = this.FSubtract = this.FHalfCarry = this.FCarry = false;
	this.registersHL = 0;
	this.leftChannel1 = false;
	this.leftChannel2 = false;
	this.leftChannel3 = false;
	this.leftChannel4 = false;
	this.rightChannel1 = false;
	this.rightChannel2 = false;
	this.rightChannel3 = false;
	this.rightChannel4 = false;
	this.channel2frequency = this.channel1frequency = 0;
	this.channel4consecutive = this.channel2consecutive = this.channel1consecutive = false;
	this.VinLeftChannelMasterVolume = 8;
	this.VinRightChannelMasterVolume = 8;
	this.memory[0xFF00] = 0xF;	//Set the joypad state.
}
GameBoyCore.prototype.ROMLoad = function () {
	//Load the first two ROM banks (0x0000 - 0x7FFF) into regular gameboy memory:
	this.ROM = [];
	this.usedBootROM = settings[1] && ((!settings[11] && this.GBCBOOTROM.length == 0x800) || (settings[11] && this.GBBOOTROM.length == 0x100));
	var maxLength = this.ROMImage.length;
	if (maxLength < 0x4000) {
		throw(new Error("ROM image size too small."));
	}
	this.ROM = this.getTypedArray(maxLength, 0, "uint8");
	var romIndex = 0;
	if (this.usedBootROM) {
		if (!settings[11]) {
			//Patch in the GBC boot ROM into the memory map:
			for (; romIndex < 0x100; ++romIndex) {
				this.memory[romIndex] = this.GBCBOOTROM[romIndex];											//Load in the GameBoy Color BOOT ROM.
				this.ROM[romIndex] = (this.ROMImage.charCodeAt(romIndex) & 0xFF);							//Decode the ROM binary for the switch out.
			}
			for (; romIndex < 0x200; ++romIndex) {
				this.memory[romIndex] = this.ROM[romIndex] = (this.ROMImage.charCodeAt(romIndex) & 0xFF);	//Load in the game ROM.
			}
			for (; romIndex < 0x900; ++romIndex) {
				this.memory[romIndex] = this.GBCBOOTROM[romIndex - 0x100];									//Load in the GameBoy Color BOOT ROM.
				this.ROM[romIndex] = (this.ROMImage.charCodeAt(romIndex) & 0xFF);							//Decode the ROM binary for the switch out.
			}
			this.usedGBCBootROM = true;
		}
		else {
			//Patch in the GBC boot ROM into the memory map:
			for (; romIndex < 0x100; ++romIndex) {
				this.memory[romIndex] = this.GBBOOTROM[romIndex];											//Load in the GameBoy Color BOOT ROM.
				this.ROM[romIndex] = (this.ROMImage.charCodeAt(romIndex) & 0xFF);							//Decode the ROM binary for the switch out.
			}
		}
		for (; romIndex < 0x4000; ++romIndex) {
			this.memory[romIndex] = this.ROM[romIndex] = (this.ROMImage.charCodeAt(romIndex) & 0xFF);	//Load in the game ROM.
		}
	}
	else {
		//Don't load in the boot ROM:
		for (; romIndex < 0x4000; ++romIndex) {
			this.memory[romIndex] = this.ROM[romIndex] = (this.ROMImage.charCodeAt(romIndex) & 0xFF);	//Load in the game ROM.
		}
	}
	//Finish the decoding of the ROM binary:
	for (; romIndex < maxLength; ++romIndex) {
		this.ROM[romIndex] = (this.ROMImage.charCodeAt(romIndex) & 0xFF);
	}
	this.ROMBankEdge = Math.floor(this.ROM.length / 0x4000);
	//Set up the emulator for the cartidge specifics:
	this.interpretCartridge();
	//Check for IRQ matching upon initialization:
	this.checkIRQMatching();
}
GameBoyCore.prototype.getROMImage = function () {
	//Return the binary version of the ROM image currently running:
	if (this.ROMImage.length > 0) {
		return this.ROMImage.length;
	}
	var length = this.ROM.length;
	for (var index = 0; index < length; index++) {
		this.ROMImage += String.fromCharCode(this.ROM[index]);
	}
	return this.ROMImage;
}
GameBoyCore.prototype.interpretCartridge = function () {
	// ROM name
	for (var index = 0x134; index < 0x13F; index++) {
		if (this.ROMImage.charCodeAt(index) > 0) {
			this.name += this.ROMImage[index];
		}
	}
	// ROM game code (for newer games)
	for (var index = 0x13F; index < 0x143; index++) {
		if (this.ROMImage.charCodeAt(index) > 0) {
			this.gameCode += this.ROMImage[index];
		}
	}
	cout("Game Title: " + this.name + "[" + this.gameCode + "][" + this.ROMImage[0x143] + "]", 0);
	cout("Game Code: " + this.gameCode, 0);
	// Cartridge type
	this.cartridgeType = this.ROM[0x147];
	cout("Cartridge type #" + this.cartridgeType, 0);
	//Map out ROM cartridge sub-types.
	var MBCType = "";
	switch (this.cartridgeType) {
		case 0x00:
			//ROM w/o bank switching
			if (!settings[9]) {
				MBCType = "ROM";
				break;
			}
		case 0x01:
			this.cMBC1 = true;
			MBCType = "MBC1";
			break;
		case 0x02:
			this.cMBC1 = true;
			this.cSRAM = true;
			MBCType = "MBC1 + SRAM";
			break;
		case 0x03:
			this.cMBC1 = true;
			this.cSRAM = true;
			this.cBATT = true;
			MBCType = "MBC1 + SRAM + BATT";
			break;
		case 0x05:
			this.cMBC2 = true;
			MBCType = "MBC2";
			break;
		case 0x06:
			this.cMBC2 = true;
			this.cBATT = true;
			MBCType = "MBC2 + BATT";
			break;
		case 0x08:
			this.cSRAM = true;
			MBCType = "ROM + SRAM";
			break;
		case 0x09:
			this.cSRAM = true;
			this.cBATT = true;
			MBCType = "ROM + SRAM + BATT";
			break;
		case 0x0B:
			this.cMMMO1 = true;
			MBCType = "MMMO1";
			break;
		case 0x0C:
			this.cMMMO1 = true;
			this.cSRAM = true;
			MBCType = "MMMO1 + SRAM";
			break;
		case 0x0D:
			this.cMMMO1 = true;
			this.cSRAM = true;
			this.cBATT = true;
			MBCType = "MMMO1 + SRAM + BATT";
			break;
		case 0x0F:
			this.cMBC3 = true;
			this.cTIMER = true;
			this.cBATT = true;
			MBCType = "MBC3 + TIMER + BATT";
			break;
		case 0x10:
			this.cMBC3 = true;
			this.cTIMER = true;
			this.cBATT = true;
			this.cSRAM = true;
			MBCType = "MBC3 + TIMER + BATT + SRAM";
			break;
		case 0x11:
			this.cMBC3 = true;
			MBCType = "MBC3";
			break;
		case 0x12:
			this.cMBC3 = true;
			this.cSRAM = true;
			MBCType = "MBC3 + SRAM";
			break;
		case 0x13:
			this.cMBC3 = true;
			this.cSRAM = true;
			this.cBATT = true;
			MBCType = "MBC3 + SRAM + BATT";
			break;
		case 0x19:
			this.cMBC5 = true;
			MBCType = "MBC5";
			break;
		case 0x1A:
			this.cMBC5 = true;
			this.cSRAM = true;
			MBCType = "MBC5 + SRAM";
			break;
		case 0x1B:
			this.cMBC5 = true;
			this.cSRAM = true;
			this.cBATT = true;
			MBCType = "MBC5 + SRAM + BATT";
			break;
		case 0x1C:
			this.cRUMBLE = true;
			MBCType = "RUMBLE";
			break;
		case 0x1D:
			this.cRUMBLE = true;
			this.cSRAM = true;
			MBCType = "RUMBLE + SRAM";
			break;
		case 0x1E:
			this.cRUMBLE = true;
			this.cSRAM = true;
			this.cBATT = true;
			MBCType = "RUMBLE + SRAM + BATT";
			break;
		case 0x1F:
			this.cCamera = true;
			MBCType = "GameBoy Camera";
			break;
		case 0x22:
			this.cMBC7 = true;
			this.cSRAM = true;
			this.cBATT = true;
			MBCType = "MBC7 + SRAM + BATT";
			break;
		case 0xFD:
			this.cTAMA5 = true;
			MBCType = "TAMA5";
			break;
		case 0xFE:
			this.cHuC3 = true;
			MBCType = "HuC3";
			break;
		case 0xFF:
			this.cHuC1 = true;
			MBCType = "HuC1";
			break;
		default:
			MBCType = "Unknown";
			cout("Cartridge type is unknown.", 2);
			pause();
	}
	cout("Cartridge Type: " + MBCType + ".", 0);
	// ROM and RAM banks
	this.numROMBanks = this.ROMBanks[this.ROM[0x148]];
	cout(this.numROMBanks + " ROM banks.", 0);
	switch (this.RAMBanks[this.ROM[0x149]]) {
		case 0:
			cout("No RAM banking requested for allocation or MBC is of type 2.", 0);
			break;
		case 2:
			cout("1 RAM bank requested for allocation.", 0);
			break;
		case 3:
			cout("4 RAM banks requested for allocation.", 0);
			break;
		case 4:
			cout("16 RAM banks requested for allocation.", 0);
			break;
		default:
			cout("RAM bank amount requested is unknown, will use maximum allowed by specified MBC type.", 0);
	}
	//Check the GB/GBC mode byte:
	if (!this.usedBootROM) {
		switch (this.ROM[0x143]) {
			case 0x00:	//Only GB mode
				this.cGBC = false;
				cout("Only GB mode detected.", 0);
				break;
			case 0x32:	//Exception to the GBC identifying code:
				if (!settings[2] && this.name + this.gameCode + this.ROM[0x143] == "Game and Watch 50") {
					this.cGBC = true;
					cout("Created a boot exception for Game and Watch Gallery 2 (GBC ID byte is wrong on the cartridge).", 1);
				}
				else {
					this.cGBC = false;
				}
				break;
			case 0x80:	//Both GB + GBC modes
				this.cGBC = !settings[2];
				cout("GB and GBC mode detected.", 0);
				break;
			case 0xC0:	//Only GBC mode
				this.cGBC = true;
				cout("Only GBC mode detected.", 0);
				break;
			default:
				this.cGBC = false;
				cout("Unknown GameBoy game type code #" + this.ROM[0x143] + ", defaulting to GB mode (Old games don't have a type code).", 1);
		}
		this.inBootstrap = false;
		this.setupRAM();	//CPU/(V)RAM initialization.
		this.initSkipBootstrap();
	}
	else {
		this.cGBC = this.usedGBCBootROM;	//Allow the GBC boot ROM to run in GBC mode...
		this.setupRAM();	//CPU/(V)RAM initialization.
		this.initBootstrap();
	}
	this.initializeModeSpecificArrays();
	//License Code Lookup:
	var cOldLicense = this.ROM[0x14B];
	var cNewLicense = (this.ROM[0x144] & 0xFF00) | (this.ROM[0x145] & 0xFF);
	if (cOldLicense != 0x33) {
		//Old Style License Header
		cout("Old style license code: " + cOldLicense, 0);
	}
	else {
		//New Style License Header
		cout("New style license code: " + cNewLicense, 0);
	}
	this.ROMImage = "";	//Memory consumption reduction.
}
GameBoyCore.prototype.disableBootROM = function () {
	//Remove any traces of the boot ROM from ROM memory.
	for (var index = 0; index < 0x100; ++index) {
		this.memory[index] = this.ROM[index];	//Replace the GameBoy or GameBoy Color boot ROM with the game ROM.
	}
	if (this.usedGBCBootROM) {
		//Remove any traces of the boot ROM from ROM memory.
		for (index = 0x200; index < 0x900; ++index) {
			this.memory[index] = this.ROM[index];	//Replace the GameBoy Color boot ROM with the game ROM.
		}
		if (!this.cGBC) {
			//Clean up the post-boot (GB mode only) state:
			this.GBCtoGBModeAdjust();
		}
		else {
			this.recompileBootIOWriteHandling();
		}
	}
	else {
		this.recompileBootIOWriteHandling();
	}
}
GameBoyCore.prototype.initializeTiming = function () {
	//Emulator Timing:
	this.clocksPerSecond = this.emulatorSpeed * 0x400000;
	this.baseCPUCyclesPerIteration = this.clocksPerSecond / 1000 * settings[6];
	this.CPUCyclesTotalRoundoff = this.baseCPUCyclesPerIteration % 4;
	this.CPUCyclesTotalBase = this.CPUCyclesTotal = (this.baseCPUCyclesPerIteration - this.CPUCyclesTotalRoundoff) | 0;
	this.CPUCyclesTotalCurrent = 0;
}
GameBoyCore.prototype.setSpeed = function (speed) {
	this.emulatorSpeed = speed;
	this.initializeTiming();
	if (this.audioHandle) {
		this.initSound();
	}
}
GameBoyCore.prototype.setupRAM = function () {
	//Setup the auxilliary/switchable RAM:
	if (this.cMBC2) {
		this.numRAMBanks = 1 / 16;
	}
	else if (this.cMBC1 || this.cRUMBLE || this.cMBC3 || this.cHuC3) {
		this.numRAMBanks = 4;
	}
	else if (this.cMBC5) {
		this.numRAMBanks = 16;
	}
	else if (this.cSRAM) {
		this.numRAMBanks = 1;
	}
	if (this.numRAMBanks > 0) {
		if (!this.MBCRAMUtilized()) {
			//For ROM and unknown MBC cartridges using the external RAM:
			this.MBCRAMBanksEnabled = true;
		}
		//Switched RAM Used
		var MBCRam = (typeof this.openMBC == "function") ? this.openMBC(this.name) : [];
		if (MBCRam.length > 0) {
			//Flash the SRAM into memory:
			this.MBCRam = this.toTypedArray(MBCRam, "uint8");
		}
		else {
			this.MBCRam = this.getTypedArray(this.numRAMBanks * 0x2000, 0, "uint8");
		}
	}
	cout("Actual bytes of MBC RAM allocated: " + (this.numRAMBanks * 0x2000), 0);
	this.returnFromRTCState();
	//Setup the RAM for GBC mode.
	if (this.cGBC) {
		this.VRAM = this.getTypedArray(0x2000, 0, "uint8");
		this.GBCMemory = this.getTypedArray(0x7000, 0, "uint8");
	}
	this.memoryReadJumpCompile();
	this.memoryWriteJumpCompile();
}
GameBoyCore.prototype.MBCRAMUtilized = function () {
	return this.cMBC1 || this.cMBC2 || this.cMBC3 || this.cMBC5 || this.cMBC7 || this.cRUMBLE;
}
GameBoyCore.prototype.recomputeDimension = function () {
	initNewCanvas();
	//Cache some dimension info:
	this.onscreenWidth = this.canvas.width;
	this.onscreenHeight = this.canvas.height;
	if (window && window.mozRequestAnimationFrame || (navigator.userAgent.toLowerCase().indexOf("gecko") != -1 && navigator.userAgent.toLowerCase().indexOf("like gecko") == -1)) {
		//Firefox slowness hack:
		this.canvas.width = this.onscreenWidth = (!settings[12]) ? 160 : this.canvas.width;
		this.canvas.height = this.onscreenHeight = (!settings[12]) ? 144 : this.canvas.height;
	}
	else {
		this.onscreenWidth = this.canvas.width;
		this.onscreenHeight = this.canvas.height;
	}
	this.offscreenWidth = (!settings[12]) ? 160 : this.canvas.width;
	this.offscreenHeight = (!settings[12]) ? 144 : this.canvas.height;
	this.offscreenRGBCount = this.offscreenWidth * this.offscreenHeight * 4;
}