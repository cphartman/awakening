
GameBoyCore.prototype.initSound = function () {
	this.audioResamplerFirstPassFactor = Math.max(Math.min(Math.floor(this.clocksPerSecond / 44100), Math.floor(0xFFFF / 0x1E0)), 1);
	this.downSampleInputDivider = 1 / (this.audioResamplerFirstPassFactor * 0xF0);
	if (settings[0]) {
		this.audioHandle = new XAudioServer(2, this.clocksPerSecond / this.audioResamplerFirstPassFactor, 0, Math.max(this.baseCPUCyclesPerIteration * settings[8] / this.audioResamplerFirstPassFactor, 8192) << 1, null, settings[3], function () {
			settings[0] = false;
		});
		this.initAudioBuffer();
	}
	else if (this.audioHandle) {
		//Mute the audio output, as it has an immediate silencing effect:
		this.audioHandle.changeVolume(0);
	}
}
GameBoyCore.prototype.changeVolume = function () {
	if (settings[0] && this.audioHandle) {
		this.audioHandle.changeVolume(settings[3]);
	}
}
GameBoyCore.prototype.initAudioBuffer = function () {
	this.audioIndex = 0;
	this.audioDestinationPosition = 0;
	this.downsampleInput = 0;
	this.bufferContainAmount = Math.max(this.baseCPUCyclesPerIteration * settings[7] / this.audioResamplerFirstPassFactor, 4096) << 1;
	this.numSamplesTotal = (this.baseCPUCyclesPerIteration / this.audioResamplerFirstPassFactor) << 1;
	this.audioBuffer = this.getTypedArray(this.numSamplesTotal, 0, "float32");
}
GameBoyCore.prototype.intializeWhiteNoise = function () {
	//Noise Sample Tables:
	var randomFactor = 1;
	//15-bit LSFR Cache Generation:
	this.LSFR15Table = this.getTypedArray(0x80000, 0, "int8");
	var LSFR = 0x7FFF;	//Seed value has all its bits set.
	var LSFRShifted = 0x3FFF;
	for (var index = 0; index < 0x8000; ++index) {
		//Normalize the last LSFR value for usage:
		randomFactor = 1 - (LSFR & 1);	//Docs say it's the inverse.
		//Cache the different volume level results:
		this.LSFR15Table[0x08000 | index] = randomFactor;
		this.LSFR15Table[0x10000 | index] = randomFactor * 0x2;
		this.LSFR15Table[0x18000 | index] = randomFactor * 0x3;
		this.LSFR15Table[0x20000 | index] = randomFactor * 0x4;
		this.LSFR15Table[0x28000 | index] = randomFactor * 0x5;
		this.LSFR15Table[0x30000 | index] = randomFactor * 0x6;
		this.LSFR15Table[0x38000 | index] = randomFactor * 0x7;
		this.LSFR15Table[0x40000 | index] = randomFactor * 0x8;
		this.LSFR15Table[0x48000 | index] = randomFactor * 0x9;
		this.LSFR15Table[0x50000 | index] = randomFactor * 0xA;
		this.LSFR15Table[0x58000 | index] = randomFactor * 0xB;
		this.LSFR15Table[0x60000 | index] = randomFactor * 0xC;
		this.LSFR15Table[0x68000 | index] = randomFactor * 0xD;
		this.LSFR15Table[0x70000 | index] = randomFactor * 0xE;
		this.LSFR15Table[0x78000 | index] = randomFactor * 0xF;
		//Recompute the LSFR algorithm:
		LSFRShifted = LSFR >> 1;
		LSFR = LSFRShifted | (((LSFRShifted ^ LSFR) & 0x1) << 14);
	}
	//7-bit LSFR Cache Generation:
	this.LSFR7Table = this.getTypedArray(0x800, 0, "int8");
	LSFR = 0x7F;	//Seed value has all its bits set.
	for (index = 0; index < 0x80; ++index) {
		//Normalize the last LSFR value for usage:
		randomFactor = 1 - (LSFR & 1);	//Docs say it's the inverse.
		//Cache the different volume level results:
		this.LSFR7Table[0x080 | index] = randomFactor;
		this.LSFR7Table[0x100 | index] = randomFactor * 0x2;
		this.LSFR7Table[0x180 | index] = randomFactor * 0x3;
		this.LSFR7Table[0x200 | index] = randomFactor * 0x4;
		this.LSFR7Table[0x280 | index] = randomFactor * 0x5;
		this.LSFR7Table[0x300 | index] = randomFactor * 0x6;
		this.LSFR7Table[0x380 | index] = randomFactor * 0x7;
		this.LSFR7Table[0x400 | index] = randomFactor * 0x8;
		this.LSFR7Table[0x480 | index] = randomFactor * 0x9;
		this.LSFR7Table[0x500 | index] = randomFactor * 0xA;
		this.LSFR7Table[0x580 | index] = randomFactor * 0xB;
		this.LSFR7Table[0x600 | index] = randomFactor * 0xC;
		this.LSFR7Table[0x680 | index] = randomFactor * 0xD;
		this.LSFR7Table[0x700 | index] = randomFactor * 0xE;
		this.LSFR7Table[0x780 | index] = randomFactor * 0xF;
		//Recompute the LSFR algorithm:
		LSFRShifted = LSFR >> 1;
		LSFR = LSFRShifted | (((LSFRShifted ^ LSFR) & 0x1) << 6);
	}
	//Set the default noise table:
	this.noiseSampleTable = this.LSFR15Table;
}
GameBoyCore.prototype.audioUnderrunAdjustment = function () {
	if (settings[0]) {
		var underrunAmount = this.audioHandle.remainingBuffer();
		if (typeof underrunAmount == "number") {
			underrunAmount = this.bufferContainAmount - Math.max(underrunAmount, 0);
			if (underrunAmount > 0) {
				this.recalculateIterationClockLimitForAudio((underrunAmount >> 1) * this.audioResamplerFirstPassFactor);
			}
		}
	}
}
GameBoyCore.prototype.initializeAudioStartState = function () {
	this.channel1FrequencyTracker = 0x2000;
	this.channel1DutyTracker = 0;
	this.channel1CachedDuty = this.dutyLookup[2];
	this.channel1totalLength = 0;
	this.channel1envelopeVolume = 0;
	this.channel1envelopeType = false;
	this.channel1envelopeSweeps = 0;
	this.channel1envelopeSweepsLast = 0;
	this.channel1consecutive = true;
	this.channel1frequency = 0;
	this.channel1SweepFault = false;
	this.channel1ShadowFrequency = 0;
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
	this.channel3Counter = 0x800;
	this.channel4FrequencyPeriod = 8;
	this.channel4totalLength = 0;
	this.channel4envelopeVolume = 0;
	this.channel4currentVolume = 0;
	this.channel4envelopeType = false;
	this.channel4envelopeSweeps = 0;
	this.channel4envelopeSweepsLast = 0;
	this.channel4consecutive = true;
	this.channel4BitRange = 0x7FFF;
	this.noiseSampleTable = this.LSFR15Table;
	this.channel4VolumeShifter = 15;
	this.channel1FrequencyCounter = 0x2000;
	this.channel2FrequencyCounter = 0x2000;
	this.channel3Counter = 0x800;
	this.channel3FrequencyPeriod = 0x800;
	this.channel3lastSampleLookup = 0;
	this.channel4lastSampleLookup = 0;
	this.VinLeftChannelMasterVolume = 8;
	this.VinRightChannelMasterVolume = 8;
	this.mixerOutputCache = 0;
	this.sequencerClocks = 0x2000;
	this.sequencePosition = 0;
	this.channel4FrequencyPeriod = 8;
	this.channel4Counter = 8;
	this.cachedChannel3Sample = 0;
	this.cachedChannel4Sample = 0;
	this.channel1Enabled = false;
	this.channel2Enabled = false;
	this.channel3Enabled = false;
	this.channel4Enabled = false;
	this.channel1canPlay = false;
	this.channel2canPlay = false;
	this.channel4canPlay = false;
	this.audioClocksUntilNextEvent = 1;
	this.audioClocksUntilNextEventCounter = 1;
	this.channel1OutputLevelCache();
	this.channel2OutputLevelCache();
	this.channel3OutputLevelCache();
	this.channel4OutputLevelCache();
	this.noiseSampleTable = this.LSFR15Table;
}
GameBoyCore.prototype.outputAudio = function () {
	this.audioBuffer[this.audioDestinationPosition++] = (this.downsampleInput >>> 16) * this.downSampleInputDivider - 1;
	this.audioBuffer[this.audioDestinationPosition++] = (this.downsampleInput & 0xFFFF) * this.downSampleInputDivider - 1;
	if (this.audioDestinationPosition == this.numSamplesTotal) {
		this.audioHandle.writeAudioNoCallback(this.audioBuffer);
		this.audioDestinationPosition = 0;
	}
	this.downsampleInput = 0;
}
//Below are the audio generation functions timed against the CPU:
GameBoyCore.prototype.generateAudio = function (numSamples) {
	var multiplier = 0;
	if (this.soundMasterEnabled && !this.CPUStopped) {
		for (var clockUpTo = 0; numSamples > 0;) {
			clockUpTo = Math.min(this.audioClocksUntilNextEventCounter, this.sequencerClocks, numSamples);
			this.audioClocksUntilNextEventCounter -= clockUpTo;
			this.sequencerClocks -= clockUpTo;
			numSamples -= clockUpTo;
			while (clockUpTo > 0) {
				multiplier = Math.min(clockUpTo, this.audioResamplerFirstPassFactor - this.audioIndex);
				clockUpTo -= multiplier;
				this.audioIndex += multiplier;
				this.downsampleInput += this.mixerOutputCache * multiplier;
				if (this.audioIndex == this.audioResamplerFirstPassFactor) {
					this.audioIndex = 0;
					this.outputAudio();
				}
			}
			if (this.sequencerClocks == 0) {
				this.audioComputeSequencer();
				this.sequencerClocks = 0x2000;
			}
			if (this.audioClocksUntilNextEventCounter == 0) {
				this.computeAudioChannels();
			}
		}
	}
	else {
		//SILENT OUTPUT:
		while (numSamples > 0) {
			multiplier = Math.min(numSamples, this.audioResamplerFirstPassFactor - this.audioIndex);
			numSamples -= multiplier;
			this.audioIndex += multiplier;
			if (this.audioIndex == this.audioResamplerFirstPassFactor) {
				this.audioIndex = 0;
				this.outputAudio();
			}
		}
	}
}
//Generate audio, but don't actually output it (Used for when sound is disabled by user/browser):
GameBoyCore.prototype.generateAudioFake = function (numSamples) {
	if (this.soundMasterEnabled && !this.CPUStopped) {
		for (var clockUpTo = 0; numSamples > 0;) {
			clockUpTo = Math.min(this.audioClocksUntilNextEventCounter, this.sequencerClocks, numSamples);
			this.audioClocksUntilNextEventCounter -= clockUpTo;
			this.sequencerClocks -= clockUpTo;
			numSamples -= clockUpTo;
			if (this.sequencerClocks == 0) {
				this.audioComputeSequencer();
				this.sequencerClocks = 0x2000;
			}
			if (this.audioClocksUntilNextEventCounter == 0) {
				this.computeAudioChannels();
			}
		}
	}
}
GameBoyCore.prototype.audioJIT = function () {
	//Audio Sample Generation Timing:
	if (settings[0]) {
		this.generateAudio(this.audioTicks);
	}
	else {
		this.generateAudioFake(this.audioTicks);
	}
	this.audioTicks = 0;
}
GameBoyCore.prototype.audioComputeSequencer = function () {
	switch (this.sequencePosition++) {
		case 0:
			this.clockAudioLength();
			break;
		case 2:
			this.clockAudioLength();
			this.clockAudioSweep();
			break;
		case 4:
			this.clockAudioLength();
			break;
		case 6:
			this.clockAudioLength();
			this.clockAudioSweep();
			break;
		case 7:
			this.clockAudioEnvelope();
			this.sequencePosition = 0;
	}
}
GameBoyCore.prototype.clockAudioLength = function () {
	//Channel 1:
	if (this.channel1totalLength > 1) {
		--this.channel1totalLength;
	}
	else if (this.channel1totalLength == 1) {
		this.channel1totalLength = 0;
		this.channel1EnableCheck();
		this.memory[0xFF26] &= 0xFE;	//Channel #1 On Flag Off
	}
	//Channel 2:
	if (this.channel2totalLength > 1) {
		--this.channel2totalLength;
	}
	else if (this.channel2totalLength == 1) {
		this.channel2totalLength = 0;
		this.channel2EnableCheck();
		this.memory[0xFF26] &= 0xFD;	//Channel #2 On Flag Off
	}
	//Channel 3:
	if (this.channel3totalLength > 1) {
		--this.channel3totalLength;
	}
	else if (this.channel3totalLength == 1) {
		this.channel3totalLength = 0;
		this.channel3EnableCheck();
		this.memory[0xFF26] &= 0xFB;	//Channel #3 On Flag Off
	}
	//Channel 4:
	if (this.channel4totalLength > 1) {
		--this.channel4totalLength;
	}
	else if (this.channel4totalLength == 1) {
		this.channel4totalLength = 0;
		this.channel4EnableCheck();
		this.memory[0xFF26] &= 0xF7;	//Channel #4 On Flag Off
	}
}
GameBoyCore.prototype.clockAudioSweep = function () {
	//Channel 1:
	if (!this.channel1SweepFault && this.channel1timeSweep > 0) {
		if (--this.channel1timeSweep == 0) {
			this.runAudioSweep();
		}
	}
}
GameBoyCore.prototype.runAudioSweep = function () {
	//Channel 1:
	if (this.channel1lastTimeSweep > 0) {
		if (this.channel1frequencySweepDivider > 0) {
			this.channel1Swept = true;
			if (this.channel1decreaseSweep) {
				this.channel1ShadowFrequency -= this.channel1ShadowFrequency >> this.channel1frequencySweepDivider;
				this.channel1frequency = this.channel1ShadowFrequency & 0x7FF;
				this.channel1FrequencyTracker = (0x800 - this.channel1frequency) << 2;
			}
			else {
				this.channel1ShadowFrequency += this.channel1ShadowFrequency >> this.channel1frequencySweepDivider;
				this.channel1frequency = this.channel1ShadowFrequency;
				if (this.channel1ShadowFrequency <= 0x7FF) {
					this.channel1FrequencyTracker = (0x800 - this.channel1frequency) << 2;
					//Run overflow check twice:
					if ((this.channel1ShadowFrequency + (this.channel1ShadowFrequency >> this.channel1frequencySweepDivider)) > 0x7FF) {
						this.channel1SweepFault = true;
						this.channel1EnableCheck();
						this.memory[0xFF26] &= 0xFE;	//Channel #1 On Flag Off
					}
				}
				else {
					this.channel1frequency &= 0x7FF;
					this.channel1SweepFault = true;
					this.channel1EnableCheck();
					this.memory[0xFF26] &= 0xFE;	//Channel #1 On Flag Off
				}
			}
			this.channel1timeSweep = this.channel1lastTimeSweep;
		}
		else {
			//Channel has sweep disabled and timer becomes a length counter:
			this.channel1SweepFault = true;
			this.channel1EnableCheck();
		}
	}
}
GameBoyCore.prototype.channel1AudioSweepPerformDummy = function () {
	//Channel 1:
	if (this.channel1frequencySweepDivider > 0) {
		if (!this.channel1decreaseSweep) {
			var channel1ShadowFrequency = this.channel1ShadowFrequency + (this.channel1ShadowFrequency >> this.channel1frequencySweepDivider);
			if (channel1ShadowFrequency <= 0x7FF) {
				//Run overflow check twice:
				if ((channel1ShadowFrequency + (channel1ShadowFrequency >> this.channel1frequencySweepDivider)) > 0x7FF) {
					this.channel1SweepFault = true;
					this.channel1EnableCheck();
					this.memory[0xFF26] &= 0xFE;	//Channel #1 On Flag Off
				}
			}
			else {
				this.channel1SweepFault = true;
				this.channel1EnableCheck();
				this.memory[0xFF26] &= 0xFE;	//Channel #1 On Flag Off
			}
		}
	}
}
GameBoyCore.prototype.clockAudioEnvelope = function () {
	//Channel 1:
	if (this.channel1envelopeSweepsLast > -1) {
		if (this.channel1envelopeSweeps > 0) {
			--this.channel1envelopeSweeps;
		}
		else {
			if (!this.channel1envelopeType) {
				if (this.channel1envelopeVolume > 0) {
					--this.channel1envelopeVolume;
					this.channel1envelopeSweeps = this.channel1envelopeSweepsLast;
					this.channel1OutputLevelCache();
				}
				else {
					this.channel1envelopeSweepsLast = -1;
				}
			}
			else if (this.channel1envelopeVolume < 0xF) {
				++this.channel1envelopeVolume;
				this.channel1envelopeSweeps = this.channel1envelopeSweepsLast;
				this.channel1OutputLevelCache();
			}
			else {
				this.channel1envelopeSweepsLast = -1;
			}
		}
	}
	//Channel 2:
	if (this.channel2envelopeSweepsLast > -1) {
		if (this.channel2envelopeSweeps > 0) {
			--this.channel2envelopeSweeps;
		}
		else {
			if (!this.channel2envelopeType) {
				if (this.channel2envelopeVolume > 0) {
					--this.channel2envelopeVolume;
					this.channel2envelopeSweeps = this.channel2envelopeSweepsLast;
					this.channel2OutputLevelCache();
				}
				else {
					this.channel2envelopeSweepsLast = -1;
				}
			}
			else if (this.channel2envelopeVolume < 0xF) {
				++this.channel2envelopeVolume;
				this.channel2envelopeSweeps = this.channel2envelopeSweepsLast;
				this.channel2OutputLevelCache();
			}
			else {
				this.channel2envelopeSweepsLast = -1;
			}
		}
	}
	//Channel 4:
	if (this.channel4envelopeSweepsLast > -1) {
		if (this.channel4envelopeSweeps > 0) {
			--this.channel4envelopeSweeps;
		}
		else {
			if (!this.channel4envelopeType) {
				if (this.channel4envelopeVolume > 0) {
					this.channel4currentVolume = --this.channel4envelopeVolume << this.channel4VolumeShifter;
					this.channel4envelopeSweeps = this.channel4envelopeSweepsLast;
					this.channel4UpdateCache();
				}
				else {
					this.channel4envelopeSweepsLast = -1;
				}
			}
			else if (this.channel4envelopeVolume < 0xF) {
				this.channel4currentVolume = ++this.channel4envelopeVolume << this.channel4VolumeShifter;
				this.channel4envelopeSweeps = this.channel4envelopeSweepsLast;
				this.channel4UpdateCache();
			}
			else {
				this.channel4envelopeSweepsLast = -1;
			}
		}
	}
}
GameBoyCore.prototype.computeAudioChannels = function () {
	//Clock down the four audio channels to the next closest audio event:
	this.channel1FrequencyCounter -= this.audioClocksUntilNextEvent;
	this.channel2FrequencyCounter -= this.audioClocksUntilNextEvent;
	this.channel3Counter -= this.audioClocksUntilNextEvent;
	this.channel4Counter -= this.audioClocksUntilNextEvent;
	//Channel 1 counter:
	if (this.channel1FrequencyCounter == 0) {
		this.channel1FrequencyCounter = this.channel1FrequencyTracker;
		this.channel1DutyTracker = (this.channel1DutyTracker + 1) & 0x7;
		this.channel1OutputLevelTrimaryCache();
	}
	//Channel 2 counter:
	if (this.channel2FrequencyCounter == 0) {
		this.channel2FrequencyCounter = this.channel2FrequencyTracker;
		this.channel2DutyTracker = (this.channel2DutyTracker + 1) & 0x7;
		this.channel2OutputLevelTrimaryCache();
	}
	//Channel 3 counter:
	if (this.channel3Counter == 0) {
		if (this.channel3canPlay) {
			this.channel3lastSampleLookup = (this.channel3lastSampleLookup + 1) & 0x1F;
		}
		this.channel3Counter = this.channel3FrequencyPeriod;
		this.channel3UpdateCache();
	}
	//Channel 4 counter:
	if (this.channel4Counter == 0) {
		this.channel4lastSampleLookup = (this.channel4lastSampleLookup + 1) & this.channel4BitRange;
		this.channel4Counter = this.channel4FrequencyPeriod;
		this.channel4UpdateCache();
	}
	//Find the number of clocks to next closest counter event:
	this.audioClocksUntilNextEventCounter = this.audioClocksUntilNextEvent = Math.min(this.channel1FrequencyCounter, this.channel2FrequencyCounter, this.channel3Counter, this.channel4Counter);
}
GameBoyCore.prototype.channel1EnableCheck = function () {
	this.channel1Enabled = ((this.channel1consecutive || this.channel1totalLength > 0) && !this.channel1SweepFault && this.channel1canPlay);
	this.channel1OutputLevelSecondaryCache();
}
GameBoyCore.prototype.channel1VolumeEnableCheck = function () {
	this.channel1canPlay = (this.memory[0xFF12] > 7);
	this.channel1EnableCheck();
	this.channel1OutputLevelSecondaryCache();
}
GameBoyCore.prototype.channel1OutputLevelCache = function () {
	this.channel1currentSampleLeft = (this.leftChannel1) ? this.channel1envelopeVolume : 0;
	this.channel1currentSampleRight = (this.rightChannel1) ? this.channel1envelopeVolume : 0;
	this.channel1OutputLevelSecondaryCache();
}
GameBoyCore.prototype.channel1OutputLevelSecondaryCache = function () {
	if (this.channel1Enabled) {
		this.channel1currentSampleLeftSecondary = this.channel1currentSampleLeft;
		this.channel1currentSampleRightSecondary = this.channel1currentSampleRight;
	}
	else {
		this.channel1currentSampleLeftSecondary = 0;
		this.channel1currentSampleRightSecondary = 0;
	}
	this.channel1OutputLevelTrimaryCache();
}
GameBoyCore.prototype.channel1OutputLevelTrimaryCache = function () {
	if (this.channel1CachedDuty[this.channel1DutyTracker] && settings[14][0]) {
		this.channel1currentSampleLeftTrimary = this.channel1currentSampleLeftSecondary;
		this.channel1currentSampleRightTrimary = this.channel1currentSampleRightSecondary;
	}
	else {
		this.channel1currentSampleLeftTrimary = 0;
		this.channel1currentSampleRightTrimary = 0;
	}
	this.mixerOutputLevelCache();
}
GameBoyCore.prototype.channel2EnableCheck = function () {
	this.channel2Enabled = ((this.channel2consecutive || this.channel2totalLength > 0) && this.channel2canPlay);
	this.channel2OutputLevelSecondaryCache();
}
GameBoyCore.prototype.channel2VolumeEnableCheck = function () {
	this.channel2canPlay = (this.memory[0xFF17] > 7);
	this.channel2EnableCheck();
	this.channel2OutputLevelSecondaryCache();
}
GameBoyCore.prototype.channel2OutputLevelCache = function () {
	this.channel2currentSampleLeft = (this.leftChannel2) ? this.channel2envelopeVolume : 0;
	this.channel2currentSampleRight = (this.rightChannel2) ? this.channel2envelopeVolume : 0;
	this.channel2OutputLevelSecondaryCache();
}
GameBoyCore.prototype.channel2OutputLevelSecondaryCache = function () {
	if (this.channel2Enabled) {
		this.channel2currentSampleLeftSecondary = this.channel2currentSampleLeft;
		this.channel2currentSampleRightSecondary = this.channel2currentSampleRight;
	}
	else {
		this.channel2currentSampleLeftSecondary = 0;
		this.channel2currentSampleRightSecondary = 0;
	}
	this.channel2OutputLevelTrimaryCache();
}
GameBoyCore.prototype.channel2OutputLevelTrimaryCache = function () {
	if (this.channel2CachedDuty[this.channel2DutyTracker] && settings[14][1]) {
		this.channel2currentSampleLeftTrimary = this.channel2currentSampleLeftSecondary;
		this.channel2currentSampleRightTrimary = this.channel2currentSampleRightSecondary;
	}
	else {
		this.channel2currentSampleLeftTrimary = 0;
		this.channel2currentSampleRightTrimary = 0;
	}
	this.mixerOutputLevelCache();
}
GameBoyCore.prototype.channel3EnableCheck = function () {
	this.channel3Enabled = (/*this.channel3canPlay && */(this.channel3consecutive || this.channel3totalLength > 0));
	this.channel3OutputLevelSecondaryCache();
}
GameBoyCore.prototype.channel3OutputLevelCache = function () {
	this.channel3currentSampleLeft = (this.leftChannel3) ? this.cachedChannel3Sample : 0;
	this.channel3currentSampleRight = (this.rightChannel3) ? this.cachedChannel3Sample : 0;
	this.channel3OutputLevelSecondaryCache();
}
GameBoyCore.prototype.channel3OutputLevelSecondaryCache = function () {
	if (this.channel3Enabled && settings[14][2]) {
		this.channel3currentSampleLeftSecondary = this.channel3currentSampleLeft;
		this.channel3currentSampleRightSecondary = this.channel3currentSampleRight;
	}
	else {
		this.channel3currentSampleLeftSecondary = 0;
		this.channel3currentSampleRightSecondary = 0;
	}
	this.mixerOutputLevelCache();
}
GameBoyCore.prototype.channel4EnableCheck = function () {
	this.channel4Enabled = ((this.channel4consecutive || this.channel4totalLength > 0) && this.channel4canPlay);
	this.channel4OutputLevelSecondaryCache();
}
GameBoyCore.prototype.channel4VolumeEnableCheck = function () {
	this.channel4canPlay = (this.memory[0xFF21] > 7);
	this.channel4EnableCheck();
	this.channel4OutputLevelSecondaryCache();
}
GameBoyCore.prototype.channel4OutputLevelCache = function () {
	this.channel4currentSampleLeft = (this.leftChannel4) ? this.cachedChannel4Sample : 0;
	this.channel4currentSampleRight = (this.rightChannel4) ? this.cachedChannel4Sample : 0;
	this.channel4OutputLevelSecondaryCache();
}
GameBoyCore.prototype.channel4OutputLevelSecondaryCache = function () {
	if (this.channel4Enabled && settings[14][3]) {
		this.channel4currentSampleLeftSecondary = this.channel4currentSampleLeft;
		this.channel4currentSampleRightSecondary = this.channel4currentSampleRight;
	}
	else {
		this.channel4currentSampleLeftSecondary = 0;
		this.channel4currentSampleRightSecondary = 0;
	}
	this.mixerOutputLevelCache();
}
GameBoyCore.prototype.mixerOutputLevelCache = function () {
	this.mixerOutputCache = ((((this.channel1currentSampleLeftTrimary + this.channel2currentSampleLeftTrimary + this.channel3currentSampleLeftSecondary + this.channel4currentSampleLeftSecondary) * this.VinLeftChannelMasterVolume) << 16) |
	((this.channel1currentSampleRightTrimary + this.channel2currentSampleRightTrimary + this.channel3currentSampleRightSecondary + this.channel4currentSampleRightSecondary) * this.VinRightChannelMasterVolume));
}
GameBoyCore.prototype.channel3UpdateCache = function () {
	this.cachedChannel3Sample = this.channel3PCM[this.channel3lastSampleLookup] >> this.channel3patternType;
	this.channel3OutputLevelCache();
}
GameBoyCore.prototype.channel3WriteRAM = function (address, data) {
	if (this.channel3canPlay) {
		this.audioJIT();
		//address = this.channel3lastSampleLookup >> 1;
	}
	this.memory[0xFF30 | address] = data;
	address <<= 1;
	this.channel3PCM[address] = data >> 4;
	this.channel3PCM[address | 1] = data & 0xF;
}
GameBoyCore.prototype.channel4UpdateCache = function () {
	this.cachedChannel4Sample = this.noiseSampleTable[this.channel4currentVolume | this.channel4lastSampleLookup];
	this.channel4OutputLevelCache();
}