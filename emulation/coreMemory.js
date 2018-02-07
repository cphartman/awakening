
//Memory Reading:
GameBoyCore.prototype.memoryRead = function (address) {
	//Act as a wrapper for reading the returns from the compiled jumps to memory.
	return this.memoryReader[address](this, address);	//This seems to be faster than the usual if/else.
}
GameBoyCore.prototype.memoryHighRead = function (address) {
	//Act as a wrapper for reading the returns from the compiled jumps to memory.
	return this.memoryHighReader[address](this, address);	//This seems to be faster than the usual if/else.
}
GameBoyCore.prototype.memoryReadJumpCompile = function () {

	//Faster in some browsers, since we are doing less conditionals overall by implementing them in advance.
	for (var index = 0x0000; index <= 0xFFFF; index++) {
		if (index < 0x4000) {
			this.memoryReader[index] = this.memoryReadNormal;
		}
		else if (index < 0x8000) {
			this.memoryReader[index] = this.memoryReadROM;
		}
		else if (index < 0x9800) {
			this.memoryReader[index] = (this.cGBC) ? this.VRAMDATAReadCGBCPU : this.VRAMDATAReadDMGCPU;
		}
		else if (index < 0xA000) {
			this.memoryReader[index] = (this.cGBC) ? this.VRAMCHRReadCGBCPU : this.VRAMCHRReadDMGCPU;
		}
		else if (index >= 0xA000 && index < 0xC000) {
			if ((this.numRAMBanks == 1 / 16 && index < 0xA200) || this.numRAMBanks >= 1) {
				if (this.cMBC7) {
					this.memoryReader[index] = this.memoryReadMBC7;
				}
				else if (!this.cMBC3) {
					this.memoryReader[index] = this.memoryReadMBC;
				}
				else {
					//MBC3 RTC + RAM:
					this.memoryReader[index] = this.memoryReadMBC3;
				}
			}
			else {
				this.memoryReader[index] = this.memoryReadBAD;
			}
		}
		else if (index >= 0xC000 && index < 0xE000) {
			if (!this.cGBC || index < 0xD000) {
				this.memoryReader[index] = this.memoryReadNormal;
			}
			else {
				this.memoryReader[index] = this.memoryReadGBCMemory;
			}
		}
		else if (index >= 0xE000 && index < 0xFE00) {
			if (!this.cGBC || index < 0xF000) {
				this.memoryReader[index] = this.memoryReadECHONormal;
			}
			else {
				this.memoryReader[index] = this.memoryReadECHOGBCMemory;
			}
		}
		else if (index < 0xFEA0) {
			this.memoryReader[index] = this.memoryReadOAM;
		}
		else if (this.cGBC && index >= 0xFEA0 && index < 0xFF00) {
			this.memoryReader[index] = this.memoryReadNormal;
		}
		else if (index >= 0xFF00) {
			switch (index) {
				case 0xFF00:
					//JOYPAD:
					this.memoryHighReader[0] = this.memoryReader[0xFF00] = function (parentObj, address) {
						return 0xC0 | parentObj.memory[0xFF00];	//Top nibble returns as set.
					}
					break;
				case 0xFF01:
					//SB
					this.memoryHighReader[0x01] = this.memoryReader[0xFF01] = function (parentObj, address) {
						return (parentObj.memory[0xFF02] < 0x80) ? parentObj.memory[0xFF01] : 0xFF;
					}
					break;
				case 0xFF02:
					//SC
					if (this.cGBC) {
						this.memoryHighReader[0x02] = this.memoryReader[0xFF02] = function (parentObj, address) {
							return ((parentObj.serialTimer <= 0) ? 0x7C : 0xFC) | parentObj.memory[0xFF02];
						}
					}
					else {
						this.memoryHighReader[0x02] = this.memoryReader[0xFF02] = function (parentObj, address) {
							return ((parentObj.serialTimer <= 0) ? 0x7E : 0xFE) | parentObj.memory[0xFF02];
						}
					}
					break;
				case 0xFF03:
					this.memoryHighReader[0x03] = this.memoryReader[0xFF03] = this.memoryReadBAD;
					break;
				case 0xFF04:
					//DIV
					this.memoryHighReader[0x04] = this.memoryReader[0xFF04] = function (parentObj, address) {
						parentObj.memory[0xFF04] = (parentObj.memory[0xFF04] + (parentObj.DIVTicks >> 8)) & 0xFF;
						parentObj.DIVTicks &= 0xFF;
						return parentObj.memory[0xFF04];

					}
					break;
				case 0xFF05:
				case 0xFF06:
					this.memoryHighReader[index & 0xFF] = this.memoryHighReadNormal;
					this.memoryReader[index] = this.memoryReadNormal;
					break;
				case 0xFF07:
					this.memoryHighReader[0x07] = this.memoryReader[0xFF07] = function (parentObj, address) {
						return 0xF8 | parentObj.memory[0xFF07];
					}
					break;
				case 0xFF08:
				case 0xFF09:
				case 0xFF0A:
				case 0xFF0B:
				case 0xFF0C:
				case 0xFF0D:
				case 0xFF0E:
					this.memoryHighReader[index & 0xFF] = this.memoryReader[index] = this.memoryReadBAD;
					break;
				case 0xFF0F:
					//IF
					this.memoryHighReader[0x0F] = this.memoryReader[0xFF0F] = function (parentObj, address) {
						return 0xE0 | parentObj.interruptsRequested;
					}
					break;
				case 0xFF10:
					this.memoryHighReader[0x10] = this.memoryReader[0xFF10] = function (parentObj, address) {
						return 0x80 | parentObj.memory[0xFF10];
					}
					break;
				case 0xFF11:
					this.memoryHighReader[0x11] = this.memoryReader[0xFF11] = function (parentObj, address) {
						return 0x3F | parentObj.memory[0xFF11];
					}
					break;
				case 0xFF12:
					this.memoryHighReader[0x12] = this.memoryHighReadNormal;
					this.memoryReader[0xFF12] = this.memoryReadNormal;
					break;
				case 0xFF13:
					this.memoryHighReader[0x13] = this.memoryReader[0xFF13] = this.memoryReadBAD;
					break;
				case 0xFF14:
					this.memoryHighReader[0x14] = this.memoryReader[0xFF14] = function (parentObj, address) {
						return 0xBF | parentObj.memory[0xFF14];
					}
					break;
				case 0xFF15:
					this.memoryHighReader[0x15] = this.memoryReadBAD;
					this.memoryReader[0xFF15] = this.memoryReadBAD;
					break;
				case 0xFF16:
					this.memoryHighReader[0x16] = this.memoryReader[0xFF16] = function (parentObj, address) {
						return 0x3F | parentObj.memory[0xFF16];
					}
					break;
				case 0xFF17:
					this.memoryHighReader[0x17] = this.memoryHighReadNormal;
					this.memoryReader[0xFF17] = this.memoryReadNormal;
					break;
				case 0xFF18:
					this.memoryHighReader[0x18] = this.memoryReader[0xFF18] = this.memoryReadBAD;
					break;
				case 0xFF19:
					this.memoryHighReader[0x19] = this.memoryReader[0xFF19] = function (parentObj, address) {
						return 0xBF | parentObj.memory[0xFF19];
					}
					break;
				case 0xFF1A:
					this.memoryHighReader[0x1A] = this.memoryReader[0xFF1A] = function (parentObj, address) {
						return 0x7F | parentObj.memory[0xFF1A];
					}
					break;
				case 0xFF1B:
					this.memoryHighReader[0x1B] = this.memoryReader[0xFF1B] = this.memoryReadBAD;
					break;
				case 0xFF1C:
					this.memoryHighReader[0x1C] = this.memoryReader[0xFF1C] = function (parentObj, address) {
						return 0x9F | parentObj.memory[0xFF1C];
					}
					break;
				case 0xFF1D:
					this.memoryHighReader[0x1D] = this.memoryReader[0xFF1D] = this.memoryReadBAD;
					break;
				case 0xFF1E:
					this.memoryHighReader[0x1E] = this.memoryReader[0xFF1E] = function (parentObj, address) {
						return 0xBF | parentObj.memory[0xFF1E];
					}
					break;
				case 0xFF1F:
				case 0xFF20:
					this.memoryHighReader[index & 0xFF] = this.memoryReader[index] = this.memoryReadBAD;
					break;
				case 0xFF21:
				case 0xFF22:
					this.memoryHighReader[index & 0xFF] = this.memoryHighReadNormal;
					this.memoryReader[index] = this.memoryReadNormal;
					break;
				case 0xFF23:
					this.memoryHighReader[0x23] = this.memoryReader[0xFF23] = function (parentObj, address) {
						return 0xBF | parentObj.memory[0xFF23];
					}
					break;
				case 0xFF24:
				case 0xFF25:
					this.memoryHighReader[index & 0xFF] = this.memoryHighReadNormal;
					this.memoryReader[index] = this.memoryReadNormal;
					break;
				case 0xFF26:
					this.memoryHighReader[0x26] = this.memoryReader[0xFF26] = function (parentObj, address) {
						parentObj.audioJIT();
						return 0x70 | parentObj.memory[0xFF26];
					}
					break;
				case 0xFF27:
				case 0xFF28:
				case 0xFF29:
				case 0xFF2A:
				case 0xFF2B:
				case 0xFF2C:
				case 0xFF2D:
				case 0xFF2E:
				case 0xFF2F:
					this.memoryHighReader[index & 0xFF] = this.memoryReader[index] = this.memoryReadBAD;
					break;
				case 0xFF30:
				case 0xFF31:
				case 0xFF32:
				case 0xFF33:
				case 0xFF34:
				case 0xFF35:
				case 0xFF36:
				case 0xFF37:
				case 0xFF38:
				case 0xFF39:
				case 0xFF3A:
				case 0xFF3B:
				case 0xFF3C:
				case 0xFF3D:
				case 0xFF3E:
				case 0xFF3F:
					this.memoryReader[index] = function (parentObj, address) {
						return (parentObj.channel3canPlay) ? parentObj.memory[0xFF00 | (parentObj.channel3lastSampleLookup >> 1)] : parentObj.memory[address];
					}
					this.memoryHighReader[index & 0xFF] = function (parentObj, address) {
						return (parentObj.channel3canPlay) ? parentObj.memory[0xFF00 | (parentObj.channel3lastSampleLookup >> 1)] : parentObj.memory[0xFF00 | address];
					}
					break;
				case 0xFF40:
					this.memoryHighReader[0x40] = this.memoryHighReadNormal;
					this.memoryReader[0xFF40] = this.memoryReadNormal;
					break;
				case 0xFF41:
					this.memoryHighReader[0x41] = this.memoryReader[0xFF41] = function (parentObj, address) {
						return 0x80 | parentObj.memory[0xFF41] | parentObj.modeSTAT;
					}
					break;
				case 0xFF42:
					this.memoryHighReader[0x42] = this.memoryReader[0xFF42] = function (parentObj, address) {
						return parentObj.backgroundY;
					}
					break;
				case 0xFF43:
					this.memoryHighReader[0x43] = this.memoryReader[0xFF43] = function (parentObj, address) {
						return parentObj.backgroundX;
					}
					break;
				case 0xFF44:
					this.memoryHighReader[0x44] = this.memoryReader[0xFF44] = function (parentObj, address) {
						return ((parentObj.LCDisOn) ? parentObj.memory[0xFF44] : 0);
					}
					break;
				case 0xFF45:
				case 0xFF46:
				case 0xFF47:
				case 0xFF48:
				case 0xFF49:
					this.memoryHighReader[index & 0xFF] = this.memoryHighReadNormal;
					this.memoryReader[index] = this.memoryReadNormal;
					break;
				case 0xFF4A:
					//WY
					this.memoryHighReader[0x4A] = this.memoryReader[0xFF4A] = function (parentObj, address) {
						return parentObj.windowY;
					}
					break;
				case 0xFF4B:
					this.memoryHighReader[0x4B] = this.memoryHighReadNormal;
					this.memoryReader[0xFF4B] = this.memoryReadNormal;
					break;
				case 0xFF4C:
					this.memoryHighReader[0x4C] = this.memoryReader[0xFF4C] = this.memoryReadBAD;
					break;
				case 0xFF4D:
					this.memoryHighReader[0x4D] = this.memoryHighReadNormal;
					this.memoryReader[0xFF4D] = this.memoryReadNormal;
					break;
				case 0xFF4E:
					this.memoryHighReader[0x4E] = this.memoryReader[0xFF4E] = this.memoryReadBAD;
					break;
				case 0xFF4F:
					this.memoryHighReader[0x4F] = this.memoryReader[0xFF4F] = function (parentObj, address) {
						return parentObj.currVRAMBank;
					}
					break;
				case 0xFF50:
				case 0xFF51:
				case 0xFF52:
				case 0xFF53:
				case 0xFF54:
					this.memoryHighReader[index & 0xFF] = this.memoryHighReadNormal;
					this.memoryReader[index] = this.memoryReadNormal;
					break;
				case 0xFF55:
					if (this.cGBC) {
						this.memoryHighReader[0x55] = this.memoryReader[0xFF55] = function (parentObj, address) {
							if (!parentObj.LCDisOn && parentObj.hdmaRunning) {	//Undocumented behavior alert: HDMA becomes GDMA when LCD is off (Worms Armageddon Fix).
								//DMA
								parentObj.DMAWrite((parentObj.memory[0xFF55] & 0x7F) + 1);
								parentObj.memory[0xFF55] = 0xFF;	//Transfer completed.
								parentObj.hdmaRunning = false;
							}
							return parentObj.memory[0xFF55];
						}
					}
					else {
						this.memoryReader[0xFF55] = this.memoryReadNormal;
						this.memoryHighReader[0x55] = this.memoryHighReadNormal;
					}
					break;
				case 0xFF56:
					if (this.cGBC) {
						this.memoryHighReader[0x56] = this.memoryReader[0xFF56] = function (parentObj, address) {
							//Return IR "not connected" status:
							return 0x3C | ((parentObj.memory[0xFF56] >= 0xC0) ? (0x2 | (parentObj.memory[0xFF56] & 0xC1)) : (parentObj.memory[0xFF56] & 0xC3));
						}
					}
					else {
						this.memoryReader[0xFF56] = this.memoryReadNormal;
						this.memoryHighReader[0x56] = this.memoryHighReadNormal;
					}
					break;
				case 0xFF57:
				case 0xFF58:
				case 0xFF59:
				case 0xFF5A:
				case 0xFF5B:
				case 0xFF5C:
				case 0xFF5D:
				case 0xFF5E:
				case 0xFF5F:
				case 0xFF60:
				case 0xFF61:
				case 0xFF62:
				case 0xFF63:
				case 0xFF64:
				case 0xFF65:
				case 0xFF66:
				case 0xFF67:
					this.memoryHighReader[index & 0xFF] = this.memoryReader[index] = this.memoryReadBAD;
					break;
				case 0xFF68:
				case 0xFF69:
				case 0xFF6A:
				case 0xFF6B:
					this.memoryHighReader[index & 0xFF] = this.memoryHighReadNormal;
					this.memoryReader[index] = this.memoryReadNormal;
					break;
				case 0xFF6C:
					if (this.cGBC) {
						this.memoryHighReader[0x6C] = this.memoryReader[0xFF6C] = function (parentObj, address) {
							return 0xFE | parentObj.memory[0xFF6C];
						}
					}
					else {
						this.memoryHighReader[0x6C] = this.memoryReader[0xFF6C] = this.memoryReadBAD;
					}
					break;
				case 0xFF6D:
				case 0xFF6E:
				case 0xFF6F:
					this.memoryHighReader[index & 0xFF] = this.memoryReader[index] = this.memoryReadBAD;
					break;
				case 0xFF70:
					if (this.cGBC) {
						//SVBK
						this.memoryHighReader[0x70] = this.memoryReader[0xFF70] = function (parentObj, address) {
							return 0x40 | parentObj.memory[0xFF70];
						}
					}
					else {
						this.memoryHighReader[0x70] = this.memoryReader[0xFF70] = this.memoryReadBAD;
					}
					break;
				case 0xFF71:
					this.memoryHighReader[0x71] = this.memoryReader[0xFF71] = this.memoryReadBAD;
					break;
				case 0xFF72:
				case 0xFF73:
					this.memoryHighReader[index & 0xFF] = this.memoryReader[index] = this.memoryReadNormal;
					break;
				case 0xFF74:
					if (this.cGBC) {
						this.memoryHighReader[0x74] = this.memoryReader[0xFF74] = this.memoryReadNormal;
					}
					else {
						this.memoryHighReader[0x74] = this.memoryReader[0xFF74] = this.memoryReadBAD;
					}
					break;
				case 0xFF75:
					this.memoryHighReader[0x75] = this.memoryReader[0xFF75] = function (parentObj, address) {
						return 0x8F | parentObj.memory[0xFF75];
					}
					break;
                case 0xFF76:
                    //Undocumented realtime PCM amplitude readback:
                    this.memoryHighReader[0x76] = this.memoryReader[0xFF76] = function (parentObj, address) {
                        parentObj.audioJIT();
                        return (parentObj.channel2envelopeVolume << 4) | parentObj.channel1envelopeVolume;
                    }
                    break;
                case 0xFF77:
                    //Undocumented realtime PCM amplitude readback:
                    this.memoryHighReader[0x77] = this.memoryReader[0xFF77] = function (parentObj, address) {
                        parentObj.audioJIT();
                        return (parentObj.channel4envelopeVolume << 4) | parentObj.channel3envelopeVolume;
                    }
                    break;
				case 0xFF78:
				case 0xFF79:
				case 0xFF7A:
				case 0xFF7B:
				case 0xFF7C:
				case 0xFF7D:
				case 0xFF7E:
				case 0xFF7F:
					this.memoryHighReader[index & 0xFF] = this.memoryReader[index] = this.memoryReadBAD;
					break;
				case 0xFFFF:
					//IE
					this.memoryHighReader[0xFF] = this.memoryReader[0xFFFF] = function (parentObj, address) {
						return parentObj.interruptsEnabled;
					}
					break;
				default:
					this.memoryReader[index] = this.memoryReadNormal;
					this.memoryHighReader[index & 0xFF] = this.memoryHighReadNormal;
			}
		}
		else {
			this.memoryReader[index] = this.memoryReadBAD;
		}
	}
}
GameBoyCore.prototype.memoryReadNormal = function (parentObj, address) {
	return parentObj.memory[address];
}
GameBoyCore.prototype.memoryHighReadNormal = function (parentObj, address) {
	return parentObj.memory[0xFF00 | address];
}
GameBoyCore.prototype.memoryReadROM = function (parentObj, address) {
	return parentObj.ROM[parentObj.currentROMBank + address];
}
GameBoyCore.prototype.memoryReadMBC = function (parentObj, address) {
	//Switchable RAM
	if (parentObj.MBCRAMBanksEnabled || settings[10]) {
		return parentObj.MBCRam[address + parentObj.currMBCRAMBankPosition];
	}
	//cout("Reading from disabled RAM.", 1);
	return 0xFF;
}
GameBoyCore.prototype.memoryReadMBC7 = function (parentObj, address) {
	//Switchable RAM
	if (parentObj.MBCRAMBanksEnabled || settings[10]) {
		switch (address) {
			case 0xA000:
			case 0xA060:
			case 0xA070:
				return 0;
			case 0xA080:
				//TODO: Gyro Control Register
				return 0;
			case 0xA050:
				//Y High Byte
				return parentObj.highY;
			case 0xA040:
				//Y Low Byte
				return parentObj.lowY;
			case 0xA030:
				//X High Byte
				return parentObj.highX;
			case 0xA020:
				//X Low Byte:
				return parentObj.lowX;
			default:
				return parentObj.MBCRam[address + parentObj.currMBCRAMBankPosition];
		}
	}
	//cout("Reading from disabled RAM.", 1);
	return 0xFF;
}
GameBoyCore.prototype.memoryReadMBC3 = function (parentObj, address) {
	//Switchable RAM
	if (parentObj.MBCRAMBanksEnabled || settings[10]) {
		switch (parentObj.currMBCRAMBank) {
			case 0x00:
			case 0x01:
			case 0x02:
			case 0x03:
				return parentObj.MBCRam[address + parentObj.currMBCRAMBankPosition];
				break;
			case 0x08:
				return parentObj.latchedSeconds;
				break;
			case 0x09:
				return parentObj.latchedMinutes;
				break;
			case 0x0A:
				return parentObj.latchedHours;
				break;
			case 0x0B:
				return parentObj.latchedLDays;
				break;
			case 0x0C:
				return (((parentObj.RTCDayOverFlow) ? 0x80 : 0) + ((parentObj.RTCHALT) ? 0x40 : 0)) + parentObj.latchedHDays;
		}
	}
	//cout("Reading from invalid or disabled RAM.", 1);
	return 0xFF;
}
GameBoyCore.prototype.memoryReadGBCMemory = function (parentObj, address) {
	return parentObj.GBCMemory[address + parentObj.gbcRamBankPosition];
}
GameBoyCore.prototype.memoryReadOAM = function (parentObj, address) {
	return (parentObj.modeSTAT > 1) ?  0xFF : parentObj.memory[address];
}
GameBoyCore.prototype.memoryReadECHOGBCMemory = function (parentObj, address) {
	return parentObj.GBCMemory[address + parentObj.gbcRamBankPositionECHO];
}
GameBoyCore.prototype.memoryReadECHONormal = function (parentObj, address) {
	return parentObj.memory[address - 0x2000];
}
GameBoyCore.prototype.memoryReadBAD = function (parentObj, address) {
	return 0xFF;
}
GameBoyCore.prototype.VRAMDATAReadCGBCPU = function (parentObj, address) {
	//CPU Side Reading The VRAM (Optimized for GameBoy Color)
	return (parentObj.modeSTAT > 2) ? 0xFF : ((parentObj.currVRAMBank == 0) ? parentObj.memory[address] : parentObj.VRAM[address & 0x1FFF]);
}
GameBoyCore.prototype.VRAMDATAReadDMGCPU = function (parentObj, address) {
	//CPU Side Reading The VRAM (Optimized for classic GameBoy)
	return (parentObj.modeSTAT > 2) ? 0xFF : parentObj.memory[address];
}
GameBoyCore.prototype.VRAMCHRReadCGBCPU = function (parentObj, address) {
	//CPU Side Reading the Character Data Map:
	return (parentObj.modeSTAT > 2) ? 0xFF : parentObj.BGCHRCurrentBank[address & 0x7FF];
}
GameBoyCore.prototype.VRAMCHRReadDMGCPU = function (parentObj, address) {
	//CPU Side Reading the Character Data Map:
	return (parentObj.modeSTAT > 2) ? 0xFF : parentObj.BGCHRBank1[address & 0x7FF];
}
GameBoyCore.prototype.setCurrentMBC1ROMBank = function () {
	//Read the cartridge ROM data from RAM memory:
	switch (this.ROMBank1offs) {
		case 0x00:
		case 0x20:
		case 0x40:
		case 0x60:
			//Bank calls for 0x00, 0x20, 0x40, and 0x60 are really for 0x01, 0x21, 0x41, and 0x61.
			this.currentROMBank = (this.ROMBank1offs % this.ROMBankEdge) << 14;
			break;
		default:
			this.currentROMBank = ((this.ROMBank1offs % this.ROMBankEdge) - 1) << 14;
	}
}
GameBoyCore.prototype.setCurrentMBC2AND3ROMBank = function () {
	//Read the cartridge ROM data from RAM memory:
	//Only map bank 0 to bank 1 here (MBC2 is like MBC1, but can only do 16 banks, so only the bank 0 quirk appears for MBC2):
	this.currentROMBank = Math.max((this.ROMBank1offs % this.ROMBankEdge) - 1, 0) << 14;
}
GameBoyCore.prototype.setCurrentMBC5ROMBank = function () {
	//Read the cartridge ROM data from RAM memory:
	this.currentROMBank = ((this.ROMBank1offs % this.ROMBankEdge) - 1) << 14;
}
//Memory Writing:
GameBoyCore.prototype.memoryWrite = function (address, data) {
	//Act as a wrapper for writing by compiled jumps to specific memory writing functions.
	this.memoryWriter[address](this, address, data);
}
//0xFFXX fast path:
GameBoyCore.prototype.memoryHighWrite = function (address, data) {
	//Act as a wrapper for writing by compiled jumps to specific memory writing functions.
	this.memoryHighWriter[address](this, address, data);
}
GameBoyCore.prototype.memoryWriteJumpCompile = function () {
	//Faster in some browsers, since we are doing less conditionals overall by implementing them in advance.
	for (var index = 0x0000; index <= 0xFFFF; index++) {
		if (index < 0x8000) {
			if (this.cMBC1) {
				if (index < 0x2000) {
					this.memoryWriter[index] = this.MBCWriteEnable;
				}
				else if (index < 0x4000) {
					this.memoryWriter[index] = this.MBC1WriteROMBank;
				}
				else if (index < 0x6000) {
					this.memoryWriter[index] = this.MBC1WriteRAMBank;
				}
				else {
					this.memoryWriter[index] = this.MBC1WriteType;
				}
			}
			else if (this.cMBC2) {
				if (index < 0x1000) {
					this.memoryWriter[index] = this.MBCWriteEnable;
				}
				else if (index >= 0x2100 && index < 0x2200) {
					this.memoryWriter[index] = this.MBC2WriteROMBank;
				}
				else {
					this.memoryWriter[index] = this.cartIgnoreWrite;
				}
			}
			else if (this.cMBC3) {
				if (index < 0x2000) {
					this.memoryWriter[index] = this.MBCWriteEnable;
				}
				else if (index < 0x4000) {
					this.memoryWriter[index] = this.MBC3WriteROMBank;
				}
				else if (index < 0x6000) {
					this.memoryWriter[index] = this.MBC3WriteRAMBank;
				}
				else {
					this.memoryWriter[index] = this.MBC3WriteRTCLatch;
				}
			}
			else if (this.cMBC5 || this.cRUMBLE || this.cMBC7) {
				if (index < 0x2000) {
					this.memoryWriter[index] = this.MBCWriteEnable;
				}
				else if (index < 0x3000) {
					this.memoryWriter[index] = this.MBC5WriteROMBankLow;
				}
				else if (index < 0x4000) {
					this.memoryWriter[index] = this.MBC5WriteROMBankHigh;
				}
				else if (index < 0x6000) {
					this.memoryWriter[index] = (this.cRUMBLE) ? this.RUMBLEWriteRAMBank : this.MBC5WriteRAMBank;
				}
				else {
					this.memoryWriter[index] = this.cartIgnoreWrite;
				}
			}
			else if (this.cHuC3) {
				if (index < 0x2000) {
					this.memoryWriter[index] = this.MBCWriteEnable;
				}
				else if (index < 0x4000) {
					this.memoryWriter[index] = this.MBC3WriteROMBank;
				}
				else if (index < 0x6000) {
					this.memoryWriter[index] = this.HuC3WriteRAMBank;
				}
				else {
					this.memoryWriter[index] = this.cartIgnoreWrite;
				}
			}
			else {
				this.memoryWriter[index] = this.cartIgnoreWrite;
			}
		}
		else if (index < 0x9000) {
			this.memoryWriter[index] = (this.cGBC) ? this.VRAMGBCDATAWrite : this.VRAMGBDATAWrite;
		}
		else if (index < 0x9800) {
			this.memoryWriter[index] = (this.cGBC) ? this.VRAMGBCDATAWrite : this.VRAMGBDATAUpperWrite;
		}
		else if (index < 0xA000) {
			this.memoryWriter[index] = (this.cGBC) ? this.VRAMGBCCHRMAPWrite : this.VRAMGBCHRMAPWrite;
		}
		else if (index < 0xC000) {
			if ((this.numRAMBanks == 1 / 16 && index < 0xA200) || this.numRAMBanks >= 1) {
				if (!this.cMBC3) {
					this.memoryWriter[index] = this.memoryWriteMBCRAM;
				}
				else {
					//MBC3 RTC + RAM:
					this.memoryWriter[index] = this.memoryWriteMBC3RAM;
				}
			}
			else {
				this.memoryWriter[index] = this.cartIgnoreWrite;
			}
		}
		else if (index < 0xE000) {
			if (this.cGBC && index >= 0xD000) {
				this.memoryWriter[index] = this.memoryWriteGBCRAM;
			}
			else {
				this.memoryWriter[index] = this.memoryWriteNormal;
			}
		}
		else if (index < 0xFE00) {
			if (this.cGBC && index >= 0xF000) {
				this.memoryWriter[index] = this.memoryWriteECHOGBCRAM;
			}
			else {
				this.memoryWriter[index] = this.memoryWriteECHONormal;
			}
		}
		else if (index <= 0xFEA0) {
			this.memoryWriter[index] = this.memoryWriteOAMRAM;
		}
		else if (index < 0xFF00) {
			if (this.cGBC) {											//Only GBC has access to this RAM.
				this.memoryWriter[index] = this.memoryWriteNormal;
			}
			else {
				this.memoryWriter[index] = this.cartIgnoreWrite;
			}
		}
		else {
			//Start the I/O initialization by filling in the slots as normal memory:
			this.memoryWriter[index] = this.memoryWriteNormal;
			this.memoryHighWriter[index & 0xFF] = this.memoryHighWriteNormal;
		}
	}
	this.registerWriteJumpCompile();				//Compile the I/O write functions separately...
}
GameBoyCore.prototype.MBCWriteEnable = function (parentObj, address, data) {
	//MBC RAM Bank Enable/Disable:
	parentObj.MBCRAMBanksEnabled = ((data & 0x0F) == 0x0A);	//If lower nibble is 0x0A, then enable, otherwise disable.
}
GameBoyCore.prototype.MBC1WriteROMBank = function (parentObj, address, data) {
	//MBC1 ROM bank switching:
	parentObj.ROMBank1offs = (parentObj.ROMBank1offs & 0x60) | (data & 0x1F);
	parentObj.setCurrentMBC1ROMBank();
}
GameBoyCore.prototype.MBC1WriteRAMBank = function (parentObj, address, data) {
	//MBC1 RAM bank switching
	if (parentObj.MBC1Mode) {
		//4/32 Mode
		parentObj.currMBCRAMBank = data & 0x03;
		parentObj.currMBCRAMBankPosition = (parentObj.currMBCRAMBank << 13) - 0xA000;
	}
	else {
		//16/8 Mode
		parentObj.ROMBank1offs = ((data & 0x03) << 5) | (parentObj.ROMBank1offs & 0x1F);
		parentObj.setCurrentMBC1ROMBank();
	}
}
GameBoyCore.prototype.MBC1WriteType = function (parentObj, address, data) {
	//MBC1 mode setting:
	parentObj.MBC1Mode = ((data & 0x1) == 0x1);
	if (parentObj.MBC1Mode) {
		parentObj.ROMBank1offs &= 0x1F;
		parentObj.setCurrentMBC1ROMBank();
	}
	else {
		parentObj.currMBCRAMBank = 0;
		parentObj.currMBCRAMBankPosition = -0xA000;
	}
}
GameBoyCore.prototype.MBC2WriteROMBank = function (parentObj, address, data) {
	//MBC2 ROM bank switching:
	parentObj.ROMBank1offs = data & 0x0F;
	parentObj.setCurrentMBC2AND3ROMBank();
}
GameBoyCore.prototype.MBC3WriteROMBank = function (parentObj, address, data) {
	//MBC3 ROM bank switching:
	parentObj.ROMBank1offs = data & 0x7F;
	parentObj.setCurrentMBC2AND3ROMBank();
}
GameBoyCore.prototype.MBC3WriteRAMBank = function (parentObj, address, data) {
	parentObj.currMBCRAMBank = data;
	if (data < 4) {
		//MBC3 RAM bank switching
		parentObj.currMBCRAMBankPosition = (parentObj.currMBCRAMBank << 13) - 0xA000;
	}
}
GameBoyCore.prototype.MBC3WriteRTCLatch = function (parentObj, address, data) {
	if (data == 0) {
		parentObj.RTCisLatched = false;
	}
	else if (!parentObj.RTCisLatched) {
		//Copy over the current RTC time for reading.
		parentObj.RTCisLatched = true;
		parentObj.latchedSeconds = parentObj.RTCSeconds | 0;
		parentObj.latchedMinutes = parentObj.RTCMinutes;
		parentObj.latchedHours = parentObj.RTCHours;
		parentObj.latchedLDays = (parentObj.RTCDays & 0xFF);
		parentObj.latchedHDays = parentObj.RTCDays >> 8;
	}
}
GameBoyCore.prototype.MBC5WriteROMBankLow = function (parentObj, address, data) {
	//MBC5 ROM bank switching:
	parentObj.ROMBank1offs = (parentObj.ROMBank1offs & 0x100) | data;
	parentObj.setCurrentMBC5ROMBank();
}
GameBoyCore.prototype.MBC5WriteROMBankHigh = function (parentObj, address, data) {
	//MBC5 ROM bank switching (by least significant bit):
	parentObj.ROMBank1offs  = ((data & 0x01) << 8) | (parentObj.ROMBank1offs & 0xFF);
	parentObj.setCurrentMBC5ROMBank();
}
GameBoyCore.prototype.MBC5WriteRAMBank = function (parentObj, address, data) {
	//MBC5 RAM bank switching
	parentObj.currMBCRAMBank = data & 0xF;
	parentObj.currMBCRAMBankPosition = (parentObj.currMBCRAMBank << 13) - 0xA000;
}
GameBoyCore.prototype.RUMBLEWriteRAMBank = function (parentObj, address, data) {
	//MBC5 RAM bank switching
	//Like MBC5, but bit 3 of the lower nibble is used for rumbling and bit 2 is ignored.
	parentObj.currMBCRAMBank = data & 0x03;
	parentObj.currMBCRAMBankPosition = (parentObj.currMBCRAMBank << 13) - 0xA000;
}
GameBoyCore.prototype.HuC3WriteRAMBank = function (parentObj, address, data) {
	//HuC3 RAM bank switching
	parentObj.currMBCRAMBank = data & 0x03;
	parentObj.currMBCRAMBankPosition = (parentObj.currMBCRAMBank << 13) - 0xA000;
}
GameBoyCore.prototype.cartIgnoreWrite = function (parentObj, address, data) {
	//We might have encountered illegal RAM writing or such, so just do nothing...
}
GameBoyCore.prototype.memoryWriteNormal = function (parentObj, address, data) {
	parentObj.memory[address] = data;
}
GameBoyCore.prototype.memoryHighWriteNormal = function (parentObj, address, data) {
	parentObj.memory[0xFF00 | address] = data;
}
GameBoyCore.prototype.memoryWriteMBCRAM = function (parentObj, address, data) {
	if (parentObj.MBCRAMBanksEnabled || settings[10]) {
		parentObj.MBCRam[address + parentObj.currMBCRAMBankPosition] = data;
	}
}
GameBoyCore.prototype.memoryWriteMBC3RAM = function (parentObj, address, data) {
	if (parentObj.MBCRAMBanksEnabled || settings[10]) {
		switch (parentObj.currMBCRAMBank) {
			case 0x00:
			case 0x01:
			case 0x02:
			case 0x03:
				parentObj.MBCRam[address + parentObj.currMBCRAMBankPosition] = data;
				break;
			case 0x08:
				if (data < 60) {
					parentObj.RTCSeconds = data;
				}
				else {
					cout("(Bank #" + parentObj.currMBCRAMBank + ") RTC write out of range: " + data, 1);
				}
				break;
			case 0x09:
				if (data < 60) {
					parentObj.RTCMinutes = data;
				}
				else {
					cout("(Bank #" + parentObj.currMBCRAMBank + ") RTC write out of range: " + data, 1);
				}
				break;
			case 0x0A:
				if (data < 24) {
					parentObj.RTCHours = data;
				}
				else {
					cout("(Bank #" + parentObj.currMBCRAMBank + ") RTC write out of range: " + data, 1);
				}
				break;
			case 0x0B:
				parentObj.RTCDays = (data & 0xFF) | (parentObj.RTCDays & 0x100);
				break;
			case 0x0C:
				parentObj.RTCDayOverFlow = (data > 0x7F);
				parentObj.RTCHalt = (data & 0x40) == 0x40;
				parentObj.RTCDays = ((data & 0x1) << 8) | (parentObj.RTCDays & 0xFF);
				break;
			default:
				cout("Invalid MBC3 bank address selected: " + parentObj.currMBCRAMBank, 0);
		}
	}
}
GameBoyCore.prototype.memoryWriteGBCRAM = function (parentObj, address, data) {
	parentObj.GBCMemory[address + parentObj.gbcRamBankPosition] = data;
}
GameBoyCore.prototype.memoryWriteOAMRAM = function (parentObj, address, data) {
	if (parentObj.modeSTAT < 2) {		//OAM RAM cannot be written to in mode 2 & 3
		if (parentObj.memory[address] != data) {
			parentObj.graphicsJIT();
			parentObj.memory[address] = data;
		}
	}
}
GameBoyCore.prototype.memoryWriteECHOGBCRAM = function (parentObj, address, data) {
	parentObj.GBCMemory[address + parentObj.gbcRamBankPositionECHO] = data;
}
GameBoyCore.prototype.memoryWriteECHONormal = function (parentObj, address, data) {
	parentObj.memory[address - 0x2000] = data;
}
GameBoyCore.prototype.VRAMGBDATAWrite = function (parentObj, address, data) {
	if (parentObj.modeSTAT < 3) {	//VRAM cannot be written to during mode 3
		if (parentObj.memory[address] != data) {
			//JIT the graphics render queue:
			parentObj.graphicsJIT();
			parentObj.memory[address] = data;
			parentObj.generateGBOAMTileLine(address);
		}
	}
}
GameBoyCore.prototype.VRAMGBDATAUpperWrite = function (parentObj, address, data) {
	if (parentObj.modeSTAT < 3) {	//VRAM cannot be written to during mode 3
		if (parentObj.memory[address] != data) {
			//JIT the graphics render queue:
			parentObj.graphicsJIT();
			parentObj.memory[address] = data;
			parentObj.generateGBTileLine(address);
		}
	}
}
GameBoyCore.prototype.VRAMGBCDATAWrite = function (parentObj, address, data) {
	if (parentObj.modeSTAT < 3) {	//VRAM cannot be written to during mode 3
		if (parentObj.currVRAMBank == 0) {
			if (parentObj.memory[address] != data) {
				//JIT the graphics render queue:
				parentObj.graphicsJIT();
				parentObj.memory[address] = data;
				parentObj.generateGBCTileLineBank1(address);
			}
		}
		else {
			address &= 0x1FFF;
			if (parentObj.VRAM[address] != data) {
				//JIT the graphics render queue:
				parentObj.graphicsJIT();
				parentObj.VRAM[address] = data;
				parentObj.generateGBCTileLineBank2(address);
			}
		}
	}
}
GameBoyCore.prototype.VRAMGBCHRMAPWrite = function (parentObj, address, data) {
	if (parentObj.modeSTAT < 3) {	//VRAM cannot be written to during mode 3
		address &= 0x7FF;
		if (parentObj.BGCHRBank1[address] != data) {
			//JIT the graphics render queue:
			parentObj.graphicsJIT();
			parentObj.BGCHRBank1[address] = data;
		}
	}
}
GameBoyCore.prototype.VRAMGBCCHRMAPWrite = function (parentObj, address, data) {
	if (parentObj.modeSTAT < 3) {	//VRAM cannot be written to during mode 3
		address &= 0x7FF;
		if (parentObj.BGCHRCurrentBank[address] != data) {
			//JIT the graphics render queue:
			parentObj.graphicsJIT();
			parentObj.BGCHRCurrentBank[address] = data;
		}
	}
}
GameBoyCore.prototype.DMAWrite = function (tilesToTransfer) {
	if (!this.halt) {
		//Clock the CPU for the DMA transfer (CPU is halted during the transfer):
		this.CPUTicks += 4 | ((tilesToTransfer << 5) << this.doubleSpeedShifter);
	}
	//Source address of the transfer:
	var source = (this.memory[0xFF51] << 8) | this.memory[0xFF52];
	//Destination address in the VRAM memory range:
	var destination = (this.memory[0xFF53] << 8) | this.memory[0xFF54];
	//Creating some references:
	var memoryReader = this.memoryReader;
	//JIT the graphics render queue:
	this.graphicsJIT();
	var memory = this.memory;
	//Determining which bank we're working on so we can optimize:
	if (this.currVRAMBank == 0) {
		//DMA transfer for VRAM bank 0:
		do {
			if (destination < 0x1800) {
				memory[0x8000 | destination] = memoryReader[source](this, source++);
				memory[0x8001 | destination] = memoryReader[source](this, source++);
				memory[0x8002 | destination] = memoryReader[source](this, source++);
				memory[0x8003 | destination] = memoryReader[source](this, source++);
				memory[0x8004 | destination] = memoryReader[source](this, source++);
				memory[0x8005 | destination] = memoryReader[source](this, source++);
				memory[0x8006 | destination] = memoryReader[source](this, source++);
				memory[0x8007 | destination] = memoryReader[source](this, source++);
				memory[0x8008 | destination] = memoryReader[source](this, source++);
				memory[0x8009 | destination] = memoryReader[source](this, source++);
				memory[0x800A | destination] = memoryReader[source](this, source++);
				memory[0x800B | destination] = memoryReader[source](this, source++);
				memory[0x800C | destination] = memoryReader[source](this, source++);
				memory[0x800D | destination] = memoryReader[source](this, source++);
				memory[0x800E | destination] = memoryReader[source](this, source++);
				memory[0x800F | destination] = memoryReader[source](this, source++);
				this.generateGBCTileBank1(destination);
				destination += 0x10;
			}
			else {
				destination &= 0x7F0;
				this.BGCHRBank1[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank1[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank1[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank1[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank1[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank1[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank1[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank1[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank1[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank1[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank1[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank1[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank1[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank1[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank1[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank1[destination++] = memoryReader[source](this, source++);
				destination = (destination + 0x1800) & 0x1FF0;
			}
			source &= 0xFFF0;
			--tilesToTransfer;
		} while (tilesToTransfer > 0);
	}
	else {
		var VRAM = this.VRAM;
		//DMA transfer for VRAM bank 1:
		do {
			if (destination < 0x1800) {
				VRAM[destination] = memoryReader[source](this, source++);
				VRAM[destination | 0x1] = memoryReader[source](this, source++);
				VRAM[destination | 0x2] = memoryReader[source](this, source++);
				VRAM[destination | 0x3] = memoryReader[source](this, source++);
				VRAM[destination | 0x4] = memoryReader[source](this, source++);
				VRAM[destination | 0x5] = memoryReader[source](this, source++);
				VRAM[destination | 0x6] = memoryReader[source](this, source++);
				VRAM[destination | 0x7] = memoryReader[source](this, source++);
				VRAM[destination | 0x8] = memoryReader[source](this, source++);
				VRAM[destination | 0x9] = memoryReader[source](this, source++);
				VRAM[destination | 0xA] = memoryReader[source](this, source++);
				VRAM[destination | 0xB] = memoryReader[source](this, source++);
				VRAM[destination | 0xC] = memoryReader[source](this, source++);
				VRAM[destination | 0xD] = memoryReader[source](this, source++);
				VRAM[destination | 0xE] = memoryReader[source](this, source++);
				VRAM[destination | 0xF] = memoryReader[source](this, source++);
				this.generateGBCTileBank2(destination);
				destination += 0x10;
			}
			else {
				destination &= 0x7F0;
				this.BGCHRBank2[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank2[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank2[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank2[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank2[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank2[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank2[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank2[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank2[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank2[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank2[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank2[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank2[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank2[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank2[destination++] = memoryReader[source](this, source++);
				this.BGCHRBank2[destination++] = memoryReader[source](this, source++);
				destination = (destination + 0x1800) & 0x1FF0;
			}
			source &= 0xFFF0;
			--tilesToTransfer;
		} while (tilesToTransfer > 0);
	}
	//Update the HDMA registers to their next addresses:
	memory[0xFF51] = source >> 8;
	memory[0xFF52] = source & 0xF0;
	memory[0xFF53] = destination >> 8;
	memory[0xFF54] = destination & 0xF0;
}
GameBoyCore.prototype.registerWriteJumpCompile = function () {
	//I/O Registers (GB + GBC):
	//JoyPad
	this.memoryHighWriter[0] = this.memoryWriter[0xFF00] = function (parentObj, address, data) {
		parentObj.memory[0xFF00] = (data & 0x30) | ((((data & 0x20) == 0) ? (parentObj.JoyPad >> 4) : 0xF) & (((data & 0x10) == 0) ? (parentObj.JoyPad & 0xF) : 0xF));
	}
	//SB (Serial Transfer Data)
	this.memoryHighWriter[0x1] = this.memoryWriter[0xFF01] = function (parentObj, address, data) {
		if (parentObj.memory[0xFF02] < 0x80) {	//Cannot write while a serial transfer is active.
			parentObj.memory[0xFF01] = data;
		}
	}
	//SC (Serial Transfer Control):
	this.memoryHighWriter[0x2] = this.memoryHighWriteNormal;
	this.memoryWriter[0xFF02] = this.memoryWriteNormal;
	//Unmapped I/O:
	this.memoryHighWriter[0x3] = this.memoryWriter[0xFF03] = this.cartIgnoreWrite;
	//DIV
	this.memoryHighWriter[0x4] = this.memoryWriter[0xFF04] = function (parentObj, address, data) {
		parentObj.DIVTicks &= 0xFF;	//Update DIV for realignment.
		parentObj.memory[0xFF04] = 0;
	}
	//TIMA
	this.memoryHighWriter[0x5] = this.memoryWriter[0xFF05] = function (parentObj, address, data) {
		parentObj.memory[0xFF05] = data;
	}
	//TMA
	this.memoryHighWriter[0x6] = this.memoryWriter[0xFF06] = function (parentObj, address, data) {
		parentObj.memory[0xFF06] = data;
	}
	//TAC
	this.memoryHighWriter[0x7] = this.memoryWriter[0xFF07] = function (parentObj, address, data) {
		parentObj.memory[0xFF07] = data & 0x07;
		parentObj.TIMAEnabled = (data & 0x04) == 0x04;
		parentObj.TACClocker = Math.pow(4, ((data & 0x3) != 0) ? (data & 0x3) : 4) << 2;	//TODO: Find a way to not make a conditional in here...
	}
	//Unmapped I/O:
	this.memoryHighWriter[0x8] = this.memoryWriter[0xFF08] = this.cartIgnoreWrite;
	this.memoryHighWriter[0x9] = this.memoryWriter[0xFF09] = this.cartIgnoreWrite;
	this.memoryHighWriter[0xA] = this.memoryWriter[0xFF0A] = this.cartIgnoreWrite;
	this.memoryHighWriter[0xB] = this.memoryWriter[0xFF0B] = this.cartIgnoreWrite;
	this.memoryHighWriter[0xC] = this.memoryWriter[0xFF0C] = this.cartIgnoreWrite;
	this.memoryHighWriter[0xD] = this.memoryWriter[0xFF0D] = this.cartIgnoreWrite;
	this.memoryHighWriter[0xE] = this.memoryWriter[0xFF0E] = this.cartIgnoreWrite;
	//IF (Interrupt Request)
	this.memoryHighWriter[0xF] = this.memoryWriter[0xFF0F] = function (parentObj, address, data) {
		parentObj.interruptsRequested = data;
		parentObj.checkIRQMatching();
	}
	//NR10:
	this.memoryHighWriter[0x10] = this.memoryWriter[0xFF10] = function (parentObj, address, data) {
		if (parentObj.soundMasterEnabled) {
			parentObj.audioJIT();
			if (parentObj.channel1decreaseSweep && (data & 0x08) == 0) {
				if (parentObj.channel1Swept) {
					parentObj.channel1SweepFault = true;
				}
			}
			parentObj.channel1lastTimeSweep = (data & 0x70) >> 4;
			parentObj.channel1frequencySweepDivider = data & 0x07;
			parentObj.channel1decreaseSweep = ((data & 0x08) == 0x08);
			parentObj.memory[0xFF10] = data;
			parentObj.channel1EnableCheck();
		}
	}
	//NR11:
	this.memoryHighWriter[0x11] = this.memoryWriter[0xFF11] = function (parentObj, address, data) {
		if (parentObj.soundMasterEnabled || !parentObj.cGBC) {
			if (parentObj.soundMasterEnabled) {
				parentObj.audioJIT();
			}
			else {
				data &= 0x3F;
			}
			parentObj.channel1CachedDuty = parentObj.dutyLookup[data >> 6];
			parentObj.channel1totalLength = 0x40 - (data & 0x3F);
			parentObj.memory[0xFF11] = data;
			parentObj.channel1EnableCheck();
		}
	}
	//NR12:
	this.memoryHighWriter[0x12] = this.memoryWriter[0xFF12] = function (parentObj, address, data) {
		if (parentObj.soundMasterEnabled) {
			parentObj.audioJIT();
			if (parentObj.channel1Enabled && parentObj.channel1envelopeSweeps == 0) {
				//Zombie Volume PAPU Bug:
				if (((parentObj.memory[0xFF12] ^ data) & 0x8) == 0x8) {
					if ((parentObj.memory[0xFF12] & 0x8) == 0) {
						if ((parentObj.memory[0xFF12] & 0x7) == 0x7) {
							parentObj.channel1envelopeVolume += 2;
						}
						else {
							++parentObj.channel1envelopeVolume;
						}
					}
					parentObj.channel1envelopeVolume = (16 - parentObj.channel1envelopeVolume) & 0xF;
				}
				else if ((parentObj.memory[0xFF12] & 0xF) == 0x8) {
					parentObj.channel1envelopeVolume = (1 + parentObj.channel1envelopeVolume) & 0xF;
				}
				parentObj.channel1OutputLevelCache();
			}
			parentObj.channel1envelopeType = ((data & 0x08) == 0x08);
			parentObj.memory[0xFF12] = data;
			parentObj.channel1VolumeEnableCheck();
		}
	}
	//NR13:
	this.memoryHighWriter[0x13] = this.memoryWriter[0xFF13] = function (parentObj, address, data) {
		if (parentObj.soundMasterEnabled) {
			parentObj.audioJIT();
			parentObj.channel1frequency = (parentObj.channel1frequency & 0x700) | data;
			parentObj.channel1FrequencyTracker = (0x800 - parentObj.channel1frequency) << 2;
		}
	}
	//NR14:
	this.memoryHighWriter[0x14] = this.memoryWriter[0xFF14] = function (parentObj, address, data) {
		if (parentObj.soundMasterEnabled) {
			parentObj.audioJIT();
			parentObj.channel1consecutive = ((data & 0x40) == 0x0);
			parentObj.channel1frequency = ((data & 0x7) << 8) | (parentObj.channel1frequency & 0xFF);
			parentObj.channel1FrequencyTracker = (0x800 - parentObj.channel1frequency) << 2;
			if (data > 0x7F) {
				//Reload 0xFF10:
				parentObj.channel1timeSweep = parentObj.channel1lastTimeSweep;
				parentObj.channel1Swept = false;
				//Reload 0xFF12:
				var nr12 = parentObj.memory[0xFF12];
				parentObj.channel1envelopeVolume = nr12 >> 4;
				parentObj.channel1OutputLevelCache();
				parentObj.channel1envelopeSweepsLast = (nr12 & 0x7) - 1;
				if (parentObj.channel1totalLength == 0) {
					parentObj.channel1totalLength = 0x40;
				}
				if (parentObj.channel1lastTimeSweep > 0 || parentObj.channel1frequencySweepDivider > 0) {
					parentObj.memory[0xFF26] |= 0x1;
				}
				else {
					parentObj.memory[0xFF26] &= 0xFE;
				}
				if ((data & 0x40) == 0x40) {
					parentObj.memory[0xFF26] |= 0x1;
				}
				parentObj.channel1ShadowFrequency = parentObj.channel1frequency;
				//Reset frequency overflow check + frequency sweep type check:
				parentObj.channel1SweepFault = false;
				//Supposed to run immediately:
				parentObj.channel1AudioSweepPerformDummy();
			}
			parentObj.channel1EnableCheck();
			parentObj.memory[0xFF14] = data;
		}
	}
	//NR20 (Unused I/O):
	this.memoryHighWriter[0x15] = this.memoryWriter[0xFF15] = this.cartIgnoreWrite;
	//NR21:
	this.memoryHighWriter[0x16] = this.memoryWriter[0xFF16] = function (parentObj, address, data) {
		if (parentObj.soundMasterEnabled || !parentObj.cGBC) {
			if (parentObj.soundMasterEnabled) {
				parentObj.audioJIT();
			}
			else {
				data &= 0x3F;
			}
			parentObj.channel2CachedDuty = parentObj.dutyLookup[data >> 6];
			parentObj.channel2totalLength = 0x40 - (data & 0x3F);
			parentObj.memory[0xFF16] = data;
			parentObj.channel2EnableCheck();
		}
	}
	//NR22:
	this.memoryHighWriter[0x17] = this.memoryWriter[0xFF17] = function (parentObj, address, data) {
		if (parentObj.soundMasterEnabled) {
			parentObj.audioJIT();
			if (parentObj.channel2Enabled && parentObj.channel2envelopeSweeps == 0) {
				//Zombie Volume PAPU Bug:
				if (((parentObj.memory[0xFF17] ^ data) & 0x8) == 0x8) {
					if ((parentObj.memory[0xFF17] & 0x8) == 0) {
						if ((parentObj.memory[0xFF17] & 0x7) == 0x7) {
							parentObj.channel2envelopeVolume += 2;
						}
						else {
							++parentObj.channel2envelopeVolume;
						}
					}
					parentObj.channel2envelopeVolume = (16 - parentObj.channel2envelopeVolume) & 0xF;
				}
				else if ((parentObj.memory[0xFF17] & 0xF) == 0x8) {
					parentObj.channel2envelopeVolume = (1 + parentObj.channel2envelopeVolume) & 0xF;
				}
				parentObj.channel2OutputLevelCache();
			}
			parentObj.channel2envelopeType = ((data & 0x08) == 0x08);
			parentObj.memory[0xFF17] = data;
			parentObj.channel2VolumeEnableCheck();
		}
	}
	//NR23:
	this.memoryHighWriter[0x18] = this.memoryWriter[0xFF18] = function (parentObj, address, data) {
		if (parentObj.soundMasterEnabled) {
			parentObj.audioJIT();
			parentObj.channel2frequency = (parentObj.channel2frequency & 0x700) | data;
			parentObj.channel2FrequencyTracker = (0x800 - parentObj.channel2frequency) << 2;
		}
	}
	//NR24:
	this.memoryHighWriter[0x19] = this.memoryWriter[0xFF19] = function (parentObj, address, data) {
		if (parentObj.soundMasterEnabled) {
			parentObj.audioJIT();
			if (data > 0x7F) {
				//Reload 0xFF17:
				var nr22 = parentObj.memory[0xFF17];
				parentObj.channel2envelopeVolume = nr22 >> 4;
				parentObj.channel2OutputLevelCache();
				parentObj.channel2envelopeSweepsLast = (nr22 & 0x7) - 1;
				if (parentObj.channel2totalLength == 0) {
					parentObj.channel2totalLength = 0x40;
				}
				if ((data & 0x40) == 0x40) {
					parentObj.memory[0xFF26] |= 0x2;
				}
			}
			parentObj.channel2consecutive = ((data & 0x40) == 0x0);
			parentObj.channel2frequency = ((data & 0x7) << 8) | (parentObj.channel2frequency & 0xFF);
			parentObj.channel2FrequencyTracker = (0x800 - parentObj.channel2frequency) << 2;
			parentObj.memory[0xFF19] = data;
			parentObj.channel2EnableCheck();
		}
	}
	//NR30:
	this.memoryHighWriter[0x1A] = this.memoryWriter[0xFF1A] = function (parentObj, address, data) {
		if (parentObj.soundMasterEnabled) {
			parentObj.audioJIT();
			if (!parentObj.channel3canPlay && data >= 0x80) {
				parentObj.channel3lastSampleLookup = 0;
				parentObj.channel3UpdateCache();
			}
			parentObj.channel3canPlay = (data > 0x7F);
			if (parentObj.channel3canPlay && parentObj.memory[0xFF1A] > 0x7F && !parentObj.channel3consecutive) {
				parentObj.memory[0xFF26] |= 0x4;
			}
			parentObj.memory[0xFF1A] = data;
			//parentObj.channel3EnableCheck();
		}
	}
	//NR31:
	this.memoryHighWriter[0x1B] = this.memoryWriter[0xFF1B] = function (parentObj, address, data) {
		if (parentObj.soundMasterEnabled || !parentObj.cGBC) {
			if (parentObj.soundMasterEnabled) {
				parentObj.audioJIT();
			}
			parentObj.channel3totalLength = 0x100 - data;
			parentObj.channel3EnableCheck();
		}
	}
	//NR32:
	this.memoryHighWriter[0x1C] = this.memoryWriter[0xFF1C] = function (parentObj, address, data) {
		if (parentObj.soundMasterEnabled) {
			parentObj.audioJIT();
			data &= 0x60;
			parentObj.memory[0xFF1C] = data;
			parentObj.channel3patternType = (data == 0) ? 4 : ((data >> 5) - 1);
		}
	}
	//NR33:
	this.memoryHighWriter[0x1D] = this.memoryWriter[0xFF1D] = function (parentObj, address, data) {
		if (parentObj.soundMasterEnabled) {
			parentObj.audioJIT();
			parentObj.channel3frequency = (parentObj.channel3frequency & 0x700) | data;
			parentObj.channel3FrequencyPeriod = (0x800 - parentObj.channel3frequency) << 1;
		}
	}
	//NR34:
	this.memoryHighWriter[0x1E] = this.memoryWriter[0xFF1E] = function (parentObj, address, data) {
		if (parentObj.soundMasterEnabled) {
			parentObj.audioJIT();
			if (data > 0x7F) {
				if (parentObj.channel3totalLength == 0) {
					parentObj.channel3totalLength = 0x100;
				}
				parentObj.channel3lastSampleLookup = 0;
				if ((data & 0x40) == 0x40) {
					parentObj.memory[0xFF26] |= 0x4;
				}
			}
			parentObj.channel3consecutive = ((data & 0x40) == 0x0);
			parentObj.channel3frequency = ((data & 0x7) << 8) | (parentObj.channel3frequency & 0xFF);
			parentObj.channel3FrequencyPeriod = (0x800 - parentObj.channel3frequency) << 1;
			parentObj.memory[0xFF1E] = data;
			parentObj.channel3EnableCheck();
		}
	}
	//NR40 (Unused I/O):
	this.memoryHighWriter[0x1F] = this.memoryWriter[0xFF1F] = this.cartIgnoreWrite;
	//NR41:
	this.memoryHighWriter[0x20] = this.memoryWriter[0xFF20] = function (parentObj, address, data) {
		if (parentObj.soundMasterEnabled || !parentObj.cGBC) {
			if (parentObj.soundMasterEnabled) {
				parentObj.audioJIT();
			}
			parentObj.channel4totalLength = 0x40 - (data & 0x3F);
			parentObj.channel4EnableCheck();
		}
	}
	//NR42:
	this.memoryHighWriter[0x21] = this.memoryWriter[0xFF21] = function (parentObj, address, data) {
		if (parentObj.soundMasterEnabled) {
			parentObj.audioJIT();
			if (parentObj.channel4Enabled && parentObj.channel4envelopeSweeps == 0) {
				//Zombie Volume PAPU Bug:
				if (((parentObj.memory[0xFF21] ^ data) & 0x8) == 0x8) {
					if ((parentObj.memory[0xFF21] & 0x8) == 0) {
						if ((parentObj.memory[0xFF21] & 0x7) == 0x7) {
							parentObj.channel4envelopeVolume += 2;
						}
						else {
							++parentObj.channel4envelopeVolume;
						}
					}
					parentObj.channel4envelopeVolume = (16 - parentObj.channel4envelopeVolume) & 0xF;
				}
				else if ((parentObj.memory[0xFF21] & 0xF) == 0x8) {
					parentObj.channel4envelopeVolume = (1 + parentObj.channel4envelopeVolume) & 0xF;
				}
				parentObj.channel4currentVolume = parentObj.channel4envelopeVolume << parentObj.channel4VolumeShifter;
			}
			parentObj.channel4envelopeType = ((data & 0x08) == 0x08);
			parentObj.memory[0xFF21] = data;
			parentObj.channel4UpdateCache();
			parentObj.channel4VolumeEnableCheck();
		}
	}
	//NR43:
	this.memoryHighWriter[0x22] = this.memoryWriter[0xFF22] = function (parentObj, address, data) {
		if (parentObj.soundMasterEnabled) {
			parentObj.audioJIT();
			parentObj.channel4FrequencyPeriod = Math.max((data & 0x7) << 4, 8) << (data >> 4);
			var bitWidth = (data & 0x8);
			if ((bitWidth == 0x8 && parentObj.channel4BitRange == 0x7FFF) || (bitWidth == 0 && parentObj.channel4BitRange == 0x7F)) {
				parentObj.channel4lastSampleLookup = 0;
				parentObj.channel4BitRange = (bitWidth == 0x8) ? 0x7F : 0x7FFF;
				parentObj.channel4VolumeShifter = (bitWidth == 0x8) ? 7 : 15;
				parentObj.channel4currentVolume = parentObj.channel4envelopeVolume << parentObj.channel4VolumeShifter;
				parentObj.noiseSampleTable = (bitWidth == 0x8) ? parentObj.LSFR7Table : parentObj.LSFR15Table;
			}
			parentObj.memory[0xFF22] = data;
			parentObj.channel4UpdateCache();
		}
	}
	//NR44:
	this.memoryHighWriter[0x23] = this.memoryWriter[0xFF23] = function (parentObj, address, data) {
		if (parentObj.soundMasterEnabled) {
			parentObj.audioJIT();
			parentObj.memory[0xFF23] = data;
			parentObj.channel4consecutive = ((data & 0x40) == 0x0);
			if (data > 0x7F) {
				var nr42 = parentObj.memory[0xFF21];
				parentObj.channel4envelopeVolume = nr42 >> 4;
				parentObj.channel4currentVolume = parentObj.channel4envelopeVolume << parentObj.channel4VolumeShifter;
				parentObj.channel4envelopeSweepsLast = (nr42 & 0x7) - 1;
				if (parentObj.channel4totalLength == 0) {
					parentObj.channel4totalLength = 0x40;
				}
				if ((data & 0x40) == 0x40) {
					parentObj.memory[0xFF26] |= 0x8;
				}
			}
			parentObj.channel4EnableCheck();
		}
	}
	//NR50:
	this.memoryHighWriter[0x24] = this.memoryWriter[0xFF24] = function (parentObj, address, data) {
		if (parentObj.soundMasterEnabled && parentObj.memory[0xFF24] != data) {
			parentObj.audioJIT();
			parentObj.memory[0xFF24] = data;
			parentObj.VinLeftChannelMasterVolume = ((data >> 4) & 0x07) + 1;
			parentObj.VinRightChannelMasterVolume = (data & 0x07) + 1;
			parentObj.mixerOutputLevelCache();
		}
	}
	//NR51:
	this.memoryHighWriter[0x25] = this.memoryWriter[0xFF25] = function (parentObj, address, data) {
		if (parentObj.soundMasterEnabled && parentObj.memory[0xFF25] != data) {
			parentObj.audioJIT();
			parentObj.memory[0xFF25] = data;
			parentObj.rightChannel1 = ((data & 0x01) == 0x01);
			parentObj.rightChannel2 = ((data & 0x02) == 0x02);
			parentObj.rightChannel3 = ((data & 0x04) == 0x04);
			parentObj.rightChannel4 = ((data & 0x08) == 0x08);
			parentObj.leftChannel1 = ((data & 0x10) == 0x10);
			parentObj.leftChannel2 = ((data & 0x20) == 0x20);
			parentObj.leftChannel3 = ((data & 0x40) == 0x40);
			parentObj.leftChannel4 = (data > 0x7F);
			parentObj.channel1OutputLevelCache();
			parentObj.channel2OutputLevelCache();
			parentObj.channel3OutputLevelCache();
			parentObj.channel4OutputLevelCache();
		}
	}
	//NR52:
	this.memoryHighWriter[0x26] = this.memoryWriter[0xFF26] = function (parentObj, address, data) {
		parentObj.audioJIT();
		if (!parentObj.soundMasterEnabled && data > 0x7F) {
			parentObj.memory[0xFF26] = 0x80;
			parentObj.soundMasterEnabled = true;
			parentObj.initializeAudioStartState();
		}
		else if (parentObj.soundMasterEnabled && data < 0x80) {
			parentObj.memory[0xFF26] = 0;
			parentObj.soundMasterEnabled = false;
			//GBDev wiki says the registers are written with zeros on power off:
			for (var index = 0xFF10; index < 0xFF26; index++) {
				parentObj.memoryWriter[index](parentObj, index, 0);
			}
		}
	}
	//0xFF27 to 0xFF2F don't do anything...
	this.memoryHighWriter[0x27] = this.memoryWriter[0xFF27] = this.cartIgnoreWrite;
	this.memoryHighWriter[0x28] = this.memoryWriter[0xFF28] = this.cartIgnoreWrite;
	this.memoryHighWriter[0x29] = this.memoryWriter[0xFF29] = this.cartIgnoreWrite;
	this.memoryHighWriter[0x2A] = this.memoryWriter[0xFF2A] = this.cartIgnoreWrite;
	this.memoryHighWriter[0x2B] = this.memoryWriter[0xFF2B] = this.cartIgnoreWrite;
	this.memoryHighWriter[0x2C] = this.memoryWriter[0xFF2C] = this.cartIgnoreWrite;
	this.memoryHighWriter[0x2D] = this.memoryWriter[0xFF2D] = this.cartIgnoreWrite;
	this.memoryHighWriter[0x2E] = this.memoryWriter[0xFF2E] = this.cartIgnoreWrite;
	this.memoryHighWriter[0x2F] = this.memoryWriter[0xFF2F] = this.cartIgnoreWrite;
	//WAVE PCM RAM:
	this.memoryHighWriter[0x30] = this.memoryWriter[0xFF30] = function (parentObj, address, data) {
		parentObj.channel3WriteRAM(0, data);
	}
	this.memoryHighWriter[0x31] = this.memoryWriter[0xFF31] = function (parentObj, address, data) {
		parentObj.channel3WriteRAM(0x1, data);
	}
	this.memoryHighWriter[0x32] = this.memoryWriter[0xFF32] = function (parentObj, address, data) {
		parentObj.channel3WriteRAM(0x2, data);
	}
	this.memoryHighWriter[0x33] = this.memoryWriter[0xFF33] = function (parentObj, address, data) {
		parentObj.channel3WriteRAM(0x3, data);
	}
	this.memoryHighWriter[0x34] = this.memoryWriter[0xFF34] = function (parentObj, address, data) {
		parentObj.channel3WriteRAM(0x4, data);
	}
	this.memoryHighWriter[0x35] = this.memoryWriter[0xFF35] = function (parentObj, address, data) {
		parentObj.channel3WriteRAM(0x5, data);
	}
	this.memoryHighWriter[0x36] = this.memoryWriter[0xFF36] = function (parentObj, address, data) {
		parentObj.channel3WriteRAM(0x6, data);
	}
	this.memoryHighWriter[0x37] = this.memoryWriter[0xFF37] = function (parentObj, address, data) {
		parentObj.channel3WriteRAM(0x7, data);
	}
	this.memoryHighWriter[0x38] = this.memoryWriter[0xFF38] = function (parentObj, address, data) {
		parentObj.channel3WriteRAM(0x8, data);
	}
	this.memoryHighWriter[0x39] = this.memoryWriter[0xFF39] = function (parentObj, address, data) {
		parentObj.channel3WriteRAM(0x9, data);
	}
	this.memoryHighWriter[0x3A] = this.memoryWriter[0xFF3A] = function (parentObj, address, data) {
		parentObj.channel3WriteRAM(0xA, data);
	}
	this.memoryHighWriter[0x3B] = this.memoryWriter[0xFF3B] = function (parentObj, address, data) {
		parentObj.channel3WriteRAM(0xB, data);
	}
	this.memoryHighWriter[0x3C] = this.memoryWriter[0xFF3C] = function (parentObj, address, data) {
		parentObj.channel3WriteRAM(0xC, data);
	}
	this.memoryHighWriter[0x3D] = this.memoryWriter[0xFF3D] = function (parentObj, address, data) {
		parentObj.channel3WriteRAM(0xD, data);
	}
	this.memoryHighWriter[0x3E] = this.memoryWriter[0xFF3E] = function (parentObj, address, data) {
		parentObj.channel3WriteRAM(0xE, data);
	}
	this.memoryHighWriter[0x3F] = this.memoryWriter[0xFF3F] = function (parentObj, address, data) {
		parentObj.channel3WriteRAM(0xF, data);
	}
	//SCY
	this.memoryHighWriter[0x42] = this.memoryWriter[0xFF42] = function (parentObj, address, data) {
		if (parentObj.backgroundY != data) {
			parentObj.midScanLineJIT();
			parentObj.backgroundY = data;
		}
	}
	//SCX
	this.memoryHighWriter[0x43] = this.memoryWriter[0xFF43] = function (parentObj, address, data) {
		if (parentObj.backgroundX != data) {
			parentObj.midScanLineJIT();
			parentObj.backgroundX = data;
		}
	}
	//LY
	this.memoryHighWriter[0x44] = this.memoryWriter[0xFF44] = function (parentObj, address, data) {
		//Read Only:
		if (parentObj.LCDisOn) {
			//Gambatte says to do this:
			parentObj.modeSTAT = 2;
			parentObj.midScanlineOffset = -1;
			parentObj.totalLinesPassed = parentObj.currentX = parentObj.queuedScanLines = parentObj.lastUnrenderedLine = parentObj.LCDTicks = parentObj.STATTracker = parentObj.actualScanLine = parentObj.memory[0xFF44] = 0;
		}
	}
	//LYC
	this.memoryHighWriter[0x45] = this.memoryWriter[0xFF45] = function (parentObj, address, data) {
		if (parentObj.memory[0xFF45] != data) {
			parentObj.memory[0xFF45] = data;
			if (parentObj.LCDisOn) {
				parentObj.matchLYC();	//Get the compare of the first scan line.
			}
		}
	}
	//WY
	this.memoryHighWriter[0x4A] = this.memoryWriter[0xFF4A] = function (parentObj, address, data) {
		if (parentObj.windowY != data) {
			parentObj.midScanLineJIT();
			parentObj.windowY = data;
		}
	}
	//WX
	this.memoryHighWriter[0x4B] = this.memoryWriter[0xFF4B] = function (parentObj, address, data) {
		if (parentObj.memory[0xFF4B] != data) {
			parentObj.midScanLineJIT();
			parentObj.memory[0xFF4B] = data;
			parentObj.windowX = data - 7;
		}
	}
	this.memoryHighWriter[0x72] = this.memoryWriter[0xFF72] = function (parentObj, address, data) {
		parentObj.memory[0xFF72] = data;
	}
	this.memoryHighWriter[0x73] = this.memoryWriter[0xFF73] = function (parentObj, address, data) {
		parentObj.memory[0xFF73] = data;
	}
	this.memoryHighWriter[0x75] = this.memoryWriter[0xFF75] = function (parentObj, address, data) {
		parentObj.memory[0xFF75] = data;
	}
	this.memoryHighWriter[0x76] = this.memoryWriter[0xFF76] = this.cartIgnoreWrite;
	this.memoryHighWriter[0x77] = this.memoryWriter[0xFF77] = this.cartIgnoreWrite;
	//IE (Interrupt Enable)
	this.memoryHighWriter[0xFF] = this.memoryWriter[0xFFFF] = function (parentObj, address, data) {
		parentObj.interruptsEnabled = data;
		parentObj.checkIRQMatching();
	}
	this.recompileModelSpecificIOWriteHandling();
	this.recompileBootIOWriteHandling();
}
GameBoyCore.prototype.recompileModelSpecificIOWriteHandling = function () {
	if (this.cGBC) {
		//GameBoy Color Specific I/O:
		//SC (Serial Transfer Control Register)
		this.memoryHighWriter[0x2] = this.memoryWriter[0xFF02] = function (parentObj, address, data) {
			if (((data & 0x1) == 0x1)) {
				//Internal clock:
				parentObj.memory[0xFF02] = (data & 0x7F);
				parentObj.serialTimer = ((data & 0x2) == 0) ? 4096 : 128;	//Set the Serial IRQ counter.
				parentObj.serialShiftTimer = parentObj.serialShiftTimerAllocated = ((data & 0x2) == 0) ? 512 : 16;	//Set the transfer data shift counter.
			}
			else {
				//External clock:
				parentObj.memory[0xFF02] = data;
				parentObj.serialShiftTimer = parentObj.serialShiftTimerAllocated = parentObj.serialTimer = 0;	//Zero the timers, since we're emulating as if nothing is connected.
			}
		}
		this.memoryHighWriter[0x40] = this.memoryWriter[0xFF40] = function (parentObj, address, data) {
			if (parentObj.memory[0xFF40] != data) {
				parentObj.midScanLineJIT();
				var temp_var = (data > 0x7F);
				if (temp_var != parentObj.LCDisOn) {
					//When the display mode changes...
					parentObj.LCDisOn = temp_var;
					parentObj.memory[0xFF41] &= 0x78;
					parentObj.midScanlineOffset = -1;
					parentObj.totalLinesPassed = parentObj.currentX = parentObj.queuedScanLines = parentObj.lastUnrenderedLine = parentObj.STATTracker = parentObj.LCDTicks = parentObj.actualScanLine = parentObj.memory[0xFF44] = 0;
					if (parentObj.LCDisOn) {
						parentObj.modeSTAT = 2;
						parentObj.matchLYC();	//Get the compare of the first scan line.
						parentObj.LCDCONTROL = parentObj.LINECONTROL;
					}
					else {
						parentObj.modeSTAT = 0;
						parentObj.LCDCONTROL = parentObj.DISPLAYOFFCONTROL;
						parentObj.DisplayShowOff();
					}
					parentObj.interruptsRequested &= 0xFD;
				}
				parentObj.gfxWindowCHRBankPosition = ((data & 0x40) == 0x40) ? 0x400 : 0;
				parentObj.gfxWindowDisplay = ((data & 0x20) == 0x20);
				parentObj.gfxBackgroundBankOffset = ((data & 0x10) == 0x10) ? 0 : 0x80;
				parentObj.gfxBackgroundCHRBankPosition = ((data & 0x08) == 0x08) ? 0x400 : 0;
				parentObj.gfxSpriteNormalHeight = ((data & 0x04) == 0);
				parentObj.gfxSpriteShow = ((data & 0x02) == 0x02);
				parentObj.BGPriorityEnabled = ((data & 0x01) == 0x01);
				parentObj.priorityFlaggingPathRebuild();	//Special case the priority flagging as an optimization.
				parentObj.memory[0xFF40] = data;
			}
		}
		this.memoryHighWriter[0x41] = this.memoryWriter[0xFF41] = function (parentObj, address, data) {
			parentObj.LYCMatchTriggerSTAT = ((data & 0x40) == 0x40);
			parentObj.mode2TriggerSTAT = ((data & 0x20) == 0x20);
			parentObj.mode1TriggerSTAT = ((data & 0x10) == 0x10);
			parentObj.mode0TriggerSTAT = ((data & 0x08) == 0x08);
			parentObj.memory[0xFF41] = data & 0x78;
		}
		this.memoryHighWriter[0x46] = this.memoryWriter[0xFF46] = function (parentObj, address, data) {
			parentObj.memory[0xFF46] = data;
			if (data < 0xE0) {
				data <<= 8;
				address = 0xFE00;
				var stat = parentObj.modeSTAT;
				parentObj.modeSTAT = 0;
				var newData = 0;
				do {
					newData = parentObj.memoryReader[data](parentObj, data++);
					if (newData != parentObj.memory[address]) {
						//JIT the graphics render queue:
						parentObj.modeSTAT = stat;
						parentObj.graphicsJIT();
						parentObj.modeSTAT = 0;
						parentObj.memory[address++] = newData;
						break;
					}
				} while (++address < 0xFEA0);
				if (address < 0xFEA0) {
					do {
						parentObj.memory[address++] = parentObj.memoryReader[data](parentObj, data++);
						parentObj.memory[address++] = parentObj.memoryReader[data](parentObj, data++);
						parentObj.memory[address++] = parentObj.memoryReader[data](parentObj, data++);
						parentObj.memory[address++] = parentObj.memoryReader[data](parentObj, data++);
					} while (address < 0xFEA0);
				}
				parentObj.modeSTAT = stat;
			}
		}
		//KEY1
		this.memoryHighWriter[0x4D] = this.memoryWriter[0xFF4D] = function (parentObj, address, data) {
			parentObj.memory[0xFF4D] = (data & 0x7F) | (parentObj.memory[0xFF4D] & 0x80);
		}
		this.memoryHighWriter[0x4F] = this.memoryWriter[0xFF4F] = function (parentObj, address, data) {
			parentObj.currVRAMBank = data & 0x01;
			if (parentObj.currVRAMBank > 0) {
				parentObj.BGCHRCurrentBank = parentObj.BGCHRBank2;
			}
			else {
				parentObj.BGCHRCurrentBank = parentObj.BGCHRBank1;
			}
			//Only writable by GBC.
		}
		this.memoryHighWriter[0x51] = this.memoryWriter[0xFF51] = function (parentObj, address, data) {
			if (!parentObj.hdmaRunning) {
				parentObj.memory[0xFF51] = data;
			}
		}
		this.memoryHighWriter[0x52] = this.memoryWriter[0xFF52] = function (parentObj, address, data) {
			if (!parentObj.hdmaRunning) {
				parentObj.memory[0xFF52] = data & 0xF0;
			}
		}
		this.memoryHighWriter[0x53] = this.memoryWriter[0xFF53] = function (parentObj, address, data) {
			if (!parentObj.hdmaRunning) {
				parentObj.memory[0xFF53] = data & 0x1F;
			}
		}
		this.memoryHighWriter[0x54] = this.memoryWriter[0xFF54] = function (parentObj, address, data) {
			if (!parentObj.hdmaRunning) {
				parentObj.memory[0xFF54] = data & 0xF0;
			}
		}
		this.memoryHighWriter[0x55] = this.memoryWriter[0xFF55] = function (parentObj, address, data) {
			if (!parentObj.hdmaRunning) {
				if ((data & 0x80) == 0) {
					//DMA
					parentObj.DMAWrite((data & 0x7F) + 1);
					parentObj.memory[0xFF55] = 0xFF;	//Transfer completed.
				}
				else {
					//H-Blank DMA
					parentObj.hdmaRunning = true;
					parentObj.memory[0xFF55] = data & 0x7F;
				}
			}
			else if ((data & 0x80) == 0) {
				//Stop H-Blank DMA
				parentObj.hdmaRunning = false;
				parentObj.memory[0xFF55] |= 0x80;
			}
			else {
				parentObj.memory[0xFF55] = data & 0x7F;
			}
		}
		this.memoryHighWriter[0x68] = this.memoryWriter[0xFF68] = function (parentObj, address, data) {
			parentObj.memory[0xFF69] = parentObj.gbcBGRawPalette[data & 0x3F];
			parentObj.memory[0xFF68] = data;
		}
		this.memoryHighWriter[0x69] = this.memoryWriter[0xFF69] = function (parentObj, address, data) {
			parentObj.updateGBCBGPalette(parentObj.memory[0xFF68] & 0x3F, data);
			if (parentObj.memory[0xFF68] > 0x7F) { // high bit = autoincrement
				var next = ((parentObj.memory[0xFF68] + 1) & 0x3F);
				parentObj.memory[0xFF68] = (next | 0x80);
				parentObj.memory[0xFF69] = parentObj.gbcBGRawPalette[next];
			}
			else {
				parentObj.memory[0xFF69] = data;
			}
		}
		this.memoryHighWriter[0x6A] = this.memoryWriter[0xFF6A] = function (parentObj, address, data) {
			parentObj.memory[0xFF6B] = parentObj.gbcOBJRawPalette[data & 0x3F];
			parentObj.memory[0xFF6A] = data;
		}
		this.memoryHighWriter[0x6B] = this.memoryWriter[0xFF6B] = function (parentObj, address, data) {
			parentObj.updateGBCOBJPalette(parentObj.memory[0xFF6A] & 0x3F, data);
			if (parentObj.memory[0xFF6A] > 0x7F) { // high bit = autoincrement
				var next = ((parentObj.memory[0xFF6A] + 1) & 0x3F);
				parentObj.memory[0xFF6A] = (next | 0x80);
				parentObj.memory[0xFF6B] = parentObj.gbcOBJRawPalette[next];
			}
			else {
				parentObj.memory[0xFF6B] = data;
			}
		}
		//SVBK
		this.memoryHighWriter[0x70] = this.memoryWriter[0xFF70] = function (parentObj, address, data) {
			var addressCheck = (parentObj.memory[0xFF51] << 8) | parentObj.memory[0xFF52];	//Cannot change the RAM bank while WRAM is the source of a running HDMA.
			if (!parentObj.hdmaRunning || addressCheck < 0xD000 || addressCheck >= 0xE000) {
				parentObj.gbcRamBank = Math.max(data & 0x07, 1);	//Bank range is from 1-7
				parentObj.gbcRamBankPosition = ((parentObj.gbcRamBank - 1) << 12) - 0xD000;
				parentObj.gbcRamBankPositionECHO = parentObj.gbcRamBankPosition - 0x2000;
			}
			parentObj.memory[0xFF70] = data;	//Bit 6 cannot be written to.
		}
		this.memoryHighWriter[0x74] = this.memoryWriter[0xFF74] = function (parentObj, address, data) {
			parentObj.memory[0xFF74] = data;
		}
	}
	else {
		//Fill in the GameBoy Color I/O registers as normal RAM for GameBoy compatibility:
		//SC (Serial Transfer Control Register)
		this.memoryHighWriter[0x2] = this.memoryWriter[0xFF02] = function (parentObj, address, data) {
			if (((data & 0x1) == 0x1)) {
				//Internal clock:
				parentObj.memory[0xFF02] = (data & 0x7F);
				parentObj.serialTimer = 4096;	//Set the Serial IRQ counter.
				parentObj.serialShiftTimer = parentObj.serialShiftTimerAllocated = 512;	//Set the transfer data shift counter.
			}
			else {
				//External clock:
				parentObj.memory[0xFF02] = data;
				parentObj.serialShiftTimer = parentObj.serialShiftTimerAllocated = parentObj.serialTimer = 0;	//Zero the timers, since we're emulating as if nothing is connected.
			}
		}
		this.memoryHighWriter[0x40] = this.memoryWriter[0xFF40] = function (parentObj, address, data) {
			if (parentObj.memory[0xFF40] != data) {
				parentObj.midScanLineJIT();
				var temp_var = (data > 0x7F);
				if (temp_var != parentObj.LCDisOn) {
					//When the display mode changes...
					parentObj.LCDisOn = temp_var;
					parentObj.memory[0xFF41] &= 0x78;
					parentObj.midScanlineOffset = -1;
					parentObj.totalLinesPassed = parentObj.currentX = parentObj.queuedScanLines = parentObj.lastUnrenderedLine = parentObj.STATTracker = parentObj.LCDTicks = parentObj.actualScanLine = parentObj.memory[0xFF44] = 0;
					if (parentObj.LCDisOn) {
						parentObj.modeSTAT = 2;
						parentObj.matchLYC();	//Get the compare of the first scan line.
						parentObj.LCDCONTROL = parentObj.LINECONTROL;
					}
					else {
						parentObj.modeSTAT = 0;
						parentObj.LCDCONTROL = parentObj.DISPLAYOFFCONTROL;
						parentObj.DisplayShowOff();
					}
					parentObj.interruptsRequested &= 0xFD;
				}
				parentObj.gfxWindowCHRBankPosition = ((data & 0x40) == 0x40) ? 0x400 : 0;
				parentObj.gfxWindowDisplay = (data & 0x20) == 0x20;
				parentObj.gfxBackgroundBankOffset = ((data & 0x10) == 0x10) ? 0 : 0x80;
				parentObj.gfxBackgroundCHRBankPosition = ((data & 0x08) == 0x08) ? 0x400 : 0;
				parentObj.gfxSpriteNormalHeight = ((data & 0x04) == 0);
				parentObj.gfxSpriteShow = (data & 0x02) == 0x02;
				parentObj.bgEnabled = ((data & 0x01) == 0x01);
				parentObj.memory[0xFF40] = data;
			}
		}
		this.memoryHighWriter[0x41] = this.memoryWriter[0xFF41] = function (parentObj, address, data) {
			parentObj.LYCMatchTriggerSTAT = ((data & 0x40) == 0x40);
			parentObj.mode2TriggerSTAT = ((data & 0x20) == 0x20);
			parentObj.mode1TriggerSTAT = ((data & 0x10) == 0x10);
			parentObj.mode0TriggerSTAT = ((data & 0x08) == 0x08);
			parentObj.memory[0xFF41] = data & 0x78;
			if ((!parentObj.usedBootROM || !parentObj.usedGBCBootROM) && parentObj.LCDisOn && parentObj.modeSTAT < 2) {
				parentObj.interruptsRequested |= 0x2;
				parentObj.checkIRQMatching();
			}
		}
		this.memoryHighWriter[0x46] = this.memoryWriter[0xFF46] = function (parentObj, address, data) {
			parentObj.memory[0xFF46] = data;
			if (data > 0x7F && data < 0xE0) {	//DMG cannot DMA from the ROM banks.
				data <<= 8;
				address = 0xFE00;
				var stat = parentObj.modeSTAT;
				parentObj.modeSTAT = 0;
				var newData = 0;
				do {
					newData = parentObj.memoryReader[data](parentObj, data++);
					if (newData != parentObj.memory[address]) {
						//JIT the graphics render queue:
						parentObj.modeSTAT = stat;
						parentObj.graphicsJIT();
						parentObj.modeSTAT = 0;
						parentObj.memory[address++] = newData;
						break;
					}
				} while (++address < 0xFEA0);
				if (address < 0xFEA0) {
					do {
						parentObj.memory[address++] = parentObj.memoryReader[data](parentObj, data++);
						parentObj.memory[address++] = parentObj.memoryReader[data](parentObj, data++);
						parentObj.memory[address++] = parentObj.memoryReader[data](parentObj, data++);
						parentObj.memory[address++] = parentObj.memoryReader[data](parentObj, data++);
					} while (address < 0xFEA0);
				}
				parentObj.modeSTAT = stat;
			}
		}
		this.memoryHighWriter[0x47] = this.memoryWriter[0xFF47] = function (parentObj, address, data) {
			if (parentObj.memory[0xFF47] != data) {
				parentObj.midScanLineJIT();
				parentObj.updateGBBGPalette(data);
				parentObj.memory[0xFF47] = data;
			}
		}
		this.memoryHighWriter[0x48] = this.memoryWriter[0xFF48] = function (parentObj, address, data) {
			if (parentObj.memory[0xFF48] != data) {
				parentObj.midScanLineJIT();
				parentObj.updateGBOBJPalette(0, data);
				parentObj.memory[0xFF48] = data;
			}
		}
		this.memoryHighWriter[0x49] = this.memoryWriter[0xFF49] = function (parentObj, address, data) {
			if (parentObj.memory[0xFF49] != data) {
				parentObj.midScanLineJIT();
				parentObj.updateGBOBJPalette(4, data);
				parentObj.memory[0xFF49] = data;
			}
		}
		this.memoryHighWriter[0x4D] = this.memoryWriter[0xFF4D] = function (parentObj, address, data) {
			parentObj.memory[0xFF4D] = data;
		}
		this.memoryHighWriter[0x4F] = this.memoryWriter[0xFF4F] = this.cartIgnoreWrite;	//Not writable in DMG mode.
		this.memoryHighWriter[0x55] = this.memoryWriter[0xFF55] = this.cartIgnoreWrite;
		this.memoryHighWriter[0x68] = this.memoryWriter[0xFF68] = this.cartIgnoreWrite;
		this.memoryHighWriter[0x69] = this.memoryWriter[0xFF69] = this.cartIgnoreWrite;
		this.memoryHighWriter[0x6A] = this.memoryWriter[0xFF6A] = this.cartIgnoreWrite;
		this.memoryHighWriter[0x6B] = this.memoryWriter[0xFF6B] = this.cartIgnoreWrite;
		this.memoryHighWriter[0x6C] = this.memoryWriter[0xFF6C] = this.cartIgnoreWrite;
		this.memoryHighWriter[0x70] = this.memoryWriter[0xFF70] = this.cartIgnoreWrite;
		this.memoryHighWriter[0x74] = this.memoryWriter[0xFF74] = this.cartIgnoreWrite;
	}
}
GameBoyCore.prototype.recompileBootIOWriteHandling = function () {
	//Boot I/O Registers:
	if (this.inBootstrap) {
		this.memoryHighWriter[0x50] = this.memoryWriter[0xFF50] = function (parentObj, address, data) {
			cout("Boot ROM reads blocked: Bootstrap process has ended.", 0);
			parentObj.inBootstrap = false;
			parentObj.disableBootROM();			//Fill in the boot ROM ranges with ROM  bank 0 ROM ranges
			parentObj.memory[0xFF50] = data;	//Bits are sustained in memory?
		}
		if (this.cGBC) {
			this.memoryHighWriter[0x6C] = this.memoryWriter[0xFF6C] = function (parentObj, address, data) {
				if (parentObj.inBootstrap) {
					parentObj.cGBC = ((data & 0x1) == 0);
					//Exception to the GBC identifying code:
					if (parentObj.name + parentObj.gameCode + parentObj.ROM[0x143] == "Game and Watch 50") {
						parentObj.cGBC = true;
						cout("Created a boot exception for Game and Watch Gallery 2 (GBC ID byte is wrong on the cartridge).", 1);
					}
					cout("Booted to GBC Mode: " + parentObj.cGBC, 0);
				}
				parentObj.memory[0xFF6C] = data;
			}
		}
	}
	else {
		//Lockout the ROMs from accessing the BOOT ROM control register:
		this.memoryHighWriter[0x50] = this.memoryWriter[0xFF50] = this.cartIgnoreWrite;
	}
}