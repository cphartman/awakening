"use strict";
 /*
  JavaScript GameBoy Color Emulator
  Copyright (C) 2010-2016 Grant Galitz

  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
function GameBoyCore(canvas, ROMImage) {
	this.Init(canvas, ROMImage);
}
GameBoyCore.prototype.start = function () {
	this.initMemory();	//Write the startup memory.
	this.ROMLoad();		//Load the ROM into memory and get cartridge information from it.
	this.initLCD();		//Initialize the graphics.
	this.initSound();	//Sound object initialization.
	this.run();			//Start the emulation.
}

GameBoyCore.prototype.JoyPadEvent = function (key, down) {
	if (down) {
		this.JoyPad &= 0xFF ^ (1 << key);
		if (!this.cGBC && (!this.usedBootROM || !this.usedGBCBootROM)) {
			this.interruptsRequested |= 0x10;	//A real GBC doesn't set this!
			this.remainingClocks = 0;
			this.checkIRQMatching();
		}
	}
	else {
		this.JoyPad |= (1 << key);
	}
	this.memory[0xFF00] = (this.memory[0xFF00] & 0x30) + ((((this.memory[0xFF00] & 0x20) == 0) ? (this.JoyPad >> 4) : 0xF) & (((this.memory[0xFF00] & 0x10) == 0) ? (this.JoyPad & 0xF) : 0xF));
	this.CPUStopped = false;
}
GameBoyCore.prototype.GyroEvent = function (x, y) {
	x *= -100;
	x += 2047;
	this.highX = x >> 8;
	this.lowX = x & 0xFF;
	y *= -100;
	y += 2047;
	this.highY = y >> 8;
	this.lowY = y & 0xFF;
}

GameBoyCore.prototype.run = function () {
	//The preprocessing before the actual iteration loop:
	if ((this.stopEmulator & 2) == 0) {
		if ((this.stopEmulator & 1) == 1) {
			if (!this.CPUStopped) {
				this.stopEmulator = 0;
				this.audioUnderrunAdjustment();
				this.clockUpdate();			//RTC clocking.
				if (!this.halt) {
					this.executeIteration();
				}
				else {						//Finish the HALT rundown execution.
					this.CPUTicks = 0;
					this.calculateHALTPeriod();
					if (this.halt) {
						this.updateCore();
						this.iterationEndRoutine();
					}
					else {
						this.executeIteration();
					}
				}
				//Request the graphics target to be updated:
				this.requestDraw();
			}
			else {
				this.audioUnderrunAdjustment();
				this.audioTicks += this.CPUCyclesTotal;
				this.audioJIT();
				this.stopEmulator |= 1;			//End current loop.
			}
		}
		else {		//We can only get here if there was an internal error, but the loop was restarted.
			cout("Iterator restarted a faulted core.", 2);
			pause();
		}
	}
}

GameBoyCore.prototype.executeIteration = function () {
	//Iterate the interpreter loop:
	var opcodeToExecute = 0;
	var timedTicks = 0;
	while (this.stopEmulator == 0) {

		if( !this.execution_breakpoint_halt ) {
			// Check for execution breakpoint halt
			if( this.debug_breakpoints.x[this.programCounter] ) {
				if( this.programCounter < 0x4000 || this.programCounter >= 0x8000 || this.debug_breakpoints.x[this.programCounter].bank*0x4000 == this.currentROMBank ) {
					this.execution_breakpoint_halt = true;
					this.iterationEndRoutine();
					pause();
					PubSub.publish('Debugger.JumpToCurrent');
					return;
				}
			}
			
		} else {
			// Execution breakpoint interrupt last frame
			this.execution_breakpoint_halt = false;
		}

		if( !this.memory_breakpoint_halt ) {

			// Check for memory breakpoint halt
			this.SpeculativeExecute();

			if( this.memory_breakpoint_halt ) {
				this.iterationEndRoutine();
				pause();
				PubSub.publish('Debugger.JumpToCurrent');
				return;
			}

			this.DebugTrace();
			
		} else {
			// Memory breakpoint interrupt last frame
			this.memory_breakpoint_halt = false;
		}



		//Interrupt Arming:
		switch (this.IRQEnableDelay) {
			case 1:
				this.IME = true;
				this.checkIRQMatching();
			case 2:
				--this.IRQEnableDelay;
		}
		//Is an IRQ set to fire?:
		if (this.IRQLineMatched > 0) {
			//IME is true and and interrupt was matched:
			this.launchIRQ();
		}

		//Fetch the current opcode:
		opcodeToExecute = this.memoryReader[this.programCounter](this, this.programCounter);

		//Increment the program counter to the next instruction:
		this.programCounter = (this.programCounter + 1) & 0xFFFF;
		//Check for the program counter quirk:
		if (this.skipPCIncrement) {
			this.programCounter = (this.programCounter - 1) & 0xFFFF;
			this.skipPCIncrement = false;
		}
		//Get how many CPU cycles the current instruction counts for:
		this.CPUTicks = this.TICKTable[opcodeToExecute];
		//Execute the current instruction:
		this.OPCODE[opcodeToExecute](this);



		//Update the state (Inlined updateCoreFull manually here):
		//Update the clocking for the LCD emulation:
		this.LCDTicks += this.CPUTicks >> this.doubleSpeedShifter;	//LCD Timing
		this.LCDCONTROL[this.actualScanLine](this);					//Scan Line and STAT Mode Control
		//Single-speed relative timing for A/V emulation:
		timedTicks = this.CPUTicks >> this.doubleSpeedShifter;		//CPU clocking can be updated from the LCD handling.
		this.audioTicks += timedTicks;								//Audio Timing
		this.emulatorTicks += timedTicks;							//Emulator Timing
		//CPU Timers:
		this.DIVTicks += this.CPUTicks;								//DIV Timing
		if (this.TIMAEnabled) {										//TIMA Timing
			this.timerTicks += this.CPUTicks;
			while (this.timerTicks >= this.TACClocker) {
				this.timerTicks -= this.TACClocker;
				if (++this.memory[0xFF05] == 0x100) {
					this.memory[0xFF05] = this.memory[0xFF06];
					this.interruptsRequested |= 0x4;
					this.checkIRQMatching();
				}
			}
		}
		if (this.serialTimer > 0) {										//Serial Timing
			//IRQ Counter:
			this.serialTimer -= this.CPUTicks;
			if (this.serialTimer <= 0) {
				this.interruptsRequested |= 0x8;
				this.checkIRQMatching();
			}
			//Bit Shit Counter:
			this.serialShiftTimer -= this.CPUTicks;
			if (this.serialShiftTimer <= 0) {
				this.serialShiftTimer = this.serialShiftTimerAllocated;
				this.memory[0xFF01] = ((this.memory[0xFF01] << 1) & 0xFE) | 0x01;	//We could shift in actual link data here if we were to implement such!!!
			}
		}
		//End of iteration routine:
		if (this.emulatorTicks >= this.CPUCyclesTotal || this.debug_step ) {
			this.iterationEndRoutine();
			this.debug_step = 0;
		}
	}
}
GameBoyCore.prototype.iterationEndRoutine = function () {
	if ((this.stopEmulator & 0x1) == 0) {
		this.audioJIT();	//Make sure we at least output once per iteration.
		//Update DIV Alignment (Integer overflow safety):
		this.memory[0xFF04] = (this.memory[0xFF04] + (this.DIVTicks >> 8)) & 0xFF;
		this.DIVTicks &= 0xFF;
		//Update emulator flags:
		this.stopEmulator |= 1;			//End current loop.
		this.emulatorTicks -= this.CPUCyclesTotal;
		this.CPUCyclesTotalCurrent += this.CPUCyclesTotalRoundoff;
		this.recalculateIterationClockLimit();
	}
}
GameBoyCore.prototype.handleSTOP = function () {
	this.CPUStopped = true;						//Stop CPU until joypad input changes.
	this.iterationEndRoutine();
	if (this.emulatorTicks < 0) {
		this.audioTicks -= this.emulatorTicks;
		this.audioJIT();
	}
}
GameBoyCore.prototype.recalculateIterationClockLimit = function () {
	var endModulus = this.CPUCyclesTotalCurrent % 4;
	this.CPUCyclesTotal = this.CPUCyclesTotalBase + this.CPUCyclesTotalCurrent - endModulus;
	this.CPUCyclesTotalCurrent = endModulus;
}
GameBoyCore.prototype.recalculateIterationClockLimitForAudio = function (audioClocking) {
	this.CPUCyclesTotal += Math.min((audioClocking >> 2) << 2, this.CPUCyclesTotalBase << 1);
}
GameBoyCore.prototype.updateCore = function () {
	//Update the clocking for the LCD emulation:
	this.LCDTicks += this.CPUTicks >> this.doubleSpeedShifter;	//LCD Timing
	this.LCDCONTROL[this.actualScanLine](this);					//Scan Line and STAT Mode Control
	//Single-speed relative timing for A/V emulation:
	var timedTicks = this.CPUTicks >> this.doubleSpeedShifter;	//CPU clocking can be updated from the LCD handling.
	this.audioTicks += timedTicks;								//Audio Timing
	this.emulatorTicks += timedTicks;							//Emulator Timing
	//CPU Timers:
	this.DIVTicks += this.CPUTicks;								//DIV Timing
	if (this.TIMAEnabled) {										//TIMA Timing
		this.timerTicks += this.CPUTicks;
		while (this.timerTicks >= this.TACClocker) {
			this.timerTicks -= this.TACClocker;
			if (++this.memory[0xFF05] == 0x100) {
				this.memory[0xFF05] = this.memory[0xFF06];
				this.interruptsRequested |= 0x4;
				this.checkIRQMatching();
			}
		}
	}
	if (this.serialTimer > 0) {										//Serial Timing
		//IRQ Counter:
		this.serialTimer -= this.CPUTicks;
		if (this.serialTimer <= 0) {
			this.interruptsRequested |= 0x8;
			this.checkIRQMatching();
		}
		//Bit Shit Counter:
		this.serialShiftTimer -= this.CPUTicks;
		if (this.serialShiftTimer <= 0) {
			this.serialShiftTimer = this.serialShiftTimerAllocated;
			this.memory[0xFF01] = ((this.memory[0xFF01] << 1) & 0xFE) | 0x01;	//We could shift in actual link data here if we were to implement such!!!
		}
	}
}
GameBoyCore.prototype.updateCoreFull = function () {
	//Update the state machine:
	this.updateCore();
	//End of iteration routine:
	if (this.emulatorTicks >= this.CPUCyclesTotal) {
		this.iterationEndRoutine();
	}
}

GameBoyCore.prototype.clockUpdate = function () {
	if (this.cTIMER) {
		var dateObj = new Date();
		var newTime = dateObj.getTime();
		var timeElapsed = newTime - this.lastIteration;	//Get the numnber of milliseconds since this last executed.
		this.lastIteration = newTime;
		if (this.cTIMER && !this.RTCHALT) {
			//Update the MBC3 RTC:
			this.RTCSeconds += timeElapsed / 1000;
			while (this.RTCSeconds >= 60) {	//System can stutter, so the seconds difference can get large, thus the "while".
				this.RTCSeconds -= 60;
				++this.RTCMinutes;
				if (this.RTCMinutes >= 60) {
					this.RTCMinutes -= 60;
					++this.RTCHours;
					if (this.RTCHours >= 24) {
						this.RTCHours -= 24
						++this.RTCDays;
						if (this.RTCDays >= 512) {
							this.RTCDays -= 512;
							this.RTCDayOverFlow = true;
						}
					}
				}
			}
		}
	}
}
//Check for the highest priority IRQ to fire:
GameBoyCore.prototype.launchIRQ = function () {
	var bitShift = 0;
	var testbit = 1;
	do {
		//Check to see if an interrupt is enabled AND requested.
		if ((testbit & this.IRQLineMatched) == testbit) {
			this.IME = false;						//Reset the interrupt enabling.
			this.interruptsRequested -= testbit;	//Reset the interrupt request.
			this.IRQLineMatched = 0;				//Reset the IRQ assertion.
			//Interrupts have a certain clock cycle length:
			this.CPUTicks = 20;
			//Set the stack pointer to the current program counter value:
			this.stackPointer = (this.stackPointer - 1) & 0xFFFF;
			this.memoryWriter[this.stackPointer](this, this.stackPointer, this.programCounter >> 8);
			this.stackPointer = (this.stackPointer - 1) & 0xFFFF;
			this.memoryWriter[this.stackPointer](this, this.stackPointer, this.programCounter & 0xFF);
			//Set the program counter to the interrupt's address:
			this.programCounterOld = this.programCounter;
			this.programCounter = 0x40 | (bitShift << 3);

			if( this.debug_trace.enabled ) {
				var bank_low = 16384; // 0x4000
				var bank_high = 32768; // 0x8000
				var address = this.programCounter;
				this.debug_trace.current.push({
					interrupt: (bitShift << 3),
					addressTo: address,
					addressFrom: this.programCounterOld,
					type: "IRQ",
					bank: ( address >= bank_low && address < bank_high ? this.currentROMBank/bank_low : false ),
				});
				this.debug_trace.current = this.debug_trace.current.slice(this.debug_trace.limit*-1);
			}

			//Clock the core for mid-instruction updates:
			this.updateCore();
			return;									//We only want the highest priority interrupt.
		}
		testbit = 1 << ++bitShift;
	} while (bitShift < 5);
}
/*
	Check for IRQs to be fired while not in HALT:
*/
GameBoyCore.prototype.checkIRQMatching = function () {
	if (this.IME) {
		this.IRQLineMatched = this.interruptsEnabled & this.interruptsRequested & 0x1F;
	}
}
/*
	Handle the HALT opcode by predicting all IRQ cases correctly,
	then selecting the next closest IRQ firing from the prediction to
	clock up to. This prevents hacky looping that doesn't predict, but
	instead just clocks through the core update procedure by one which
	is very slow. Not many emulators do this because they have to cover
	all the IRQ prediction cases and they usually get them wrong.
*/
GameBoyCore.prototype.calculateHALTPeriod = function () {
	if( this.speculative_execute ) {
		return;
	}

	//Initialize our variables and start our prediction:
	if (!this.halt) {
		this.halt = true;
		var currentClocks = -1;
		var temp_var = 0;
		if (this.LCDisOn) {
			//If the LCD is enabled, then predict the LCD IRQs enabled:
			if ((this.interruptsEnabled & 0x1) == 0x1) {
				currentClocks = ((456 * (((this.modeSTAT == 1) ? 298 : 144) - this.actualScanLine)) - this.LCDTicks) << this.doubleSpeedShifter;
			}
			if ((this.interruptsEnabled & 0x2) == 0x2) {
				if (this.mode0TriggerSTAT) {
					temp_var = (this.clocksUntilMode0() - this.LCDTicks) << this.doubleSpeedShifter;
					if (temp_var <= currentClocks || currentClocks == -1) {
						currentClocks = temp_var;
					}
				}
				if (this.mode1TriggerSTAT && (this.interruptsEnabled & 0x1) == 0) {
					temp_var = ((456 * (((this.modeSTAT == 1) ? 298 : 144) - this.actualScanLine)) - this.LCDTicks) << this.doubleSpeedShifter;
					if (temp_var <= currentClocks || currentClocks == -1) {
						currentClocks = temp_var;
					}
				}
				if (this.mode2TriggerSTAT) {
					temp_var = (((this.actualScanLine >= 143) ? (456 * (154 - this.actualScanLine)) : 456) - this.LCDTicks) << this.doubleSpeedShifter;
					if (temp_var <= currentClocks || currentClocks == -1) {
						currentClocks = temp_var;
					}
				}
				if (this.LYCMatchTriggerSTAT && this.memory[0xFF45] <= 153) {
					temp_var = (this.clocksUntilLYCMatch() - this.LCDTicks) << this.doubleSpeedShifter;
					if (temp_var <= currentClocks || currentClocks == -1) {
						currentClocks = temp_var;
					}
				}
			}
		}
		if (this.TIMAEnabled && (this.interruptsEnabled & 0x4) == 0x4) {
			//CPU timer IRQ prediction:
			temp_var = ((0x100 - this.memory[0xFF05]) * this.TACClocker) - this.timerTicks;
			if (temp_var <= currentClocks || currentClocks == -1) {
				currentClocks = temp_var;
			}
		}
		if (this.serialTimer > 0 && (this.interruptsEnabled & 0x8) == 0x8) {
			//Serial IRQ prediction:
			if (this.serialTimer <= currentClocks || currentClocks == -1) {
				currentClocks = this.serialTimer;
			}
		}
	}
	else {
		var currentClocks = this.remainingClocks;
	}
	var maxClocks = (this.CPUCyclesTotal - this.emulatorTicks) << this.doubleSpeedShifter;
	if (currentClocks >= 0) {
		if (currentClocks <= maxClocks) {
			//Exit out of HALT normally:
			this.CPUTicks = Math.max(currentClocks, this.CPUTicks);
			this.updateCoreFull();
			this.halt = false;
			this.CPUTicks = 0;
		}
		else {
			//Still in HALT, clock only up to the clocks specified per iteration:
			this.CPUTicks = Math.max(maxClocks, this.CPUTicks);
			this.remainingClocks = currentClocks - this.CPUTicks;
		}
	}
	else {
		//Still in HALT, clock only up to the clocks specified per iteration:
		//Will stay in HALT forever (Stuck in HALT forever), but the APU and LCD are still clocked, so don't pause:
		this.CPUTicks += maxClocks;
	}
}
//Helper Functions
GameBoyCore.prototype.toTypedArray = function (baseArray, memtype) {
	try {
		if (settings[5]) {
			return baseArray;
		}
		if (!baseArray || !baseArray.length) {
			return [];
		}
		var length = baseArray.length;
		switch (memtype) {
			case "uint8":
				var typedArrayTemp = new Uint8Array(length);
				break;
			case "int8":
				var typedArrayTemp = new Int8Array(length);
				break;
			case "int32":
				var typedArrayTemp = new Int32Array(length);
				break;
			case "float32":
				var typedArrayTemp = new Float32Array(length);
		}
		for (var index = 0; index < length; index++) {
			typedArrayTemp[index] = baseArray[index];
		}
		return typedArrayTemp;
	}
	catch (error) {
		cout("Could not convert an array to a typed array: " + error.message, 1);
		return baseArray;
	}
}
GameBoyCore.prototype.fromTypedArray = function (baseArray) {
	try {
		if (!baseArray || !baseArray.length) {
			return [];
		}
		var arrayTemp = [];
		for (var index = 0; index < baseArray.length; ++index) {
			arrayTemp[index] = baseArray[index];
		}
		return arrayTemp;
	}
	catch (error) {
		cout("Conversion from a typed array failed: " + error.message, 1);
		return baseArray;
	}
}
GameBoyCore.prototype.getTypedArray = function (length, defaultValue, numberType) {
	try {
		if (settings[5]) {
			throw(new Error("Settings forced typed arrays to be disabled."));
		}
		switch (numberType) {
			case "int8":
				var arrayHandle = new Int8Array(length);
				break;
			case "uint8":
				var arrayHandle = new Uint8Array(length);
				break;
			case "int32":
				var arrayHandle = new Int32Array(length);
				break;
			case "float32":
				var arrayHandle = new Float32Array(length);
		}
		if (defaultValue != 0) {
			var index = 0;
			while (index < length) {
				arrayHandle[index++] = defaultValue;
			}
		}
	}
	catch (error) {
		cout("Could not convert an array to a typed array: " + error.message, 1);
		var arrayHandle = [];
		var index = 0;
		while (index < length) {
			arrayHandle[index++] = defaultValue;
		}
	}
	return arrayHandle;
};

var cout = function(){};