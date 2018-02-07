GameBoyCore.OpCode = ["NOP","LD BC, nn","LD (BC), A","INC BC","INC B","DEC B","LD B, n","RLCA","LD (nn), SP",
	"ADD HL, BC","LD A, (BC)","DEC BC","INC C","DEC C","LD C, n","RRCA","STOP","LD DE, nn","LD (DE), A","INC DE",
	"INC D","DEC D","LD D, n","RLA","JR n","ADD HL, DE","LD A, (DE)","DEC DE","INC E","DEC E","LD E, n","RRA",
	"JR NZ, n","LD HL, nn","LDI (HL), A","INC HL","INC H","DEC H","LD H, n","DAA","JR Z, n","ADD HL, HL","LDI A, (HL)",
	"DEC HL","INC L","DEC L","LD L, n","CPL","JR NC, n","LD SP, nn","LDD (HL), A","INC SP","INC (HL)","DEC (HL)",
	"LD (HL), n","SCF","JR C, n","ADD HL, SP","LDD A, (HL)","DEC SP","INC A","DEC A","LD A, n","CCF","LD B, B","LD B, C",
	"LD B, D","LD B, E","LD B, H","LD B, L","LD B, (HL)","LD B, A","LD C, B","LD C, C","LD C, D","LD C, E","LD C, H",
	"LD C, L","LD C, (HL)","LD C, A","LD D, B","LD D, C","LD D, D","LD D, E","LD D, H","LD D, L","LD D, (HL)","LD D, A",
	"LD E, B","LD E, C","LD E, D","LD E, E","LD E, H","LD E, L","LD E, (HL)","LD E, A","LD H, B","LD H, C","LD H, D",
	"LD H, E","LD H, H","LD H, L","LD H, (HL)","LD H, A","LD L, B","LD L, C","LD L, D","LD L, E","LD L, H","LD L, L",
	"LD L, (HL)","LD L, A","LD (HL), B","LD (HL), C","LD (HL), D","LD (HL), E","LD (HL), H","LD (HL), L","HALT",
	"LD (HL), A","LD A, B","LD A, C","LD A, D","LD A, E","LD A, H","LD A, L","LD, A, (HL)","LD A, A","ADD A, B",
	"ADD A, C","ADD A, D","ADD A, E","ADD A, H","ADD A, L","ADD A, (HL)","ADD A, A","ADC A, B","ADC A, C","ADC A, D",
	"ADC A, E","ADC A, H","ADC A, L","ADC A, (HL)","ADC A, A","SUB A, B","SUB A, C","SUB A, D","SUB A, E","SUB A, H",
	"SUB A, L","SUB A, (HL)","SUB A, A","SBC A, B","SBC A, C","SBC A, D","SBC A, E","SBC A, H","SBC A, L","SBC A, (HL)",
	"SBC A, A","AND B","AND C","AND D","AND E","AND H","AND L","AND (HL)","AND A","XOR B","XOR C","XOR D","XOR E","XOR H",
	"XOR L","XOR (HL)","XOR A","OR B","OR C","OR D","OR E","OR H","OR L","OR (HL)","OR A","CP B","CP C","CP D","CP E","CP H",
	"CP L","CP (HL)","CP A","RET !FZ","POP BC","JP !FZ, nn","JP nn","CALL !FZ, nn","PUSH BC","ADD, n","RST 0","RET FZ",
	"RET","JP FZ, nn","Secondary OP Code Set:","CALL FZ, nn","CALL nn","ADC A, n","RST 0x8","RET !FC","POP DE","JP !FC, nn",
	"0xD3 - Illegal","CALL !FC, nn","PUSH DE","SUB A, n","RST 0x10","RET FC","RETI","JP FC, nn","0xDB - Illegal",
	"CALL FC, nn","0xDD - Illegal","SBC A, n","RST 0x18","LDH (n), A","POP HL","LD (0xFF00 + C), A","0xE3 - Illegal",
	"0xE4 - Illegal","PUSH HL","AND n","RST 0x20","ADD SP, n","JP, (HL)","LD n, A","0xEB - Illegal","0xEC - Illegal",
	"0xED - Illegal","XOR n","RST 0x28","LDH A, (n)","POP AF","LD A, (0xFF00 + C)","DI","0xF4 - Illegal","PUSH AF","OR n",
	"RST 0x30","LDHL SP, n","LD SP, HL","LD A, (nn)","EI","0xFC - Illegal","0xFD - Illegal","CP n","RST 0x38","RLC B",
	"RLC C","RLC D","RLC E","RLC H","RLC L","RLC (HL)","RLC A","RRC B","RRC C","RRC D","RRC E","RRC H","RRC L","RRC (HL)",
	"RRC A","RL B","RL C","RL D","RL E","RL H","RL L","RL (HL)","RL A","RR B","RR C","RR D","RR E","RR H","RR L","RR (HL)",
	"RR A","SLA B","SLA C","SLA D","SLA E","SLA H","SLA L","SLA (HL)","SLA A","SRA B","SRA C","SRA D","SRA E","SRA H",
	"SRA L","SRA (HL)","SRA A","SWAP B","SWAP C","SWAP D","SWAP E","SWAP H","SWAP L","SWAP (HL)","SWAP A","SRL B","SRL C",
	"SRL D","SRL E","SRL H","SRL L","SRL (HL)","SRL A","BIT 0, B","BIT 0, C","BIT 0, D","BIT 0, E","BIT 0, H","BIT 0, L",
	"BIT 0, (HL)","BIT 0, A","BIT 1, B","BIT 1, C","BIT 1, D","BIT 1, E","BIT 1, H","BIT 1, L","BIT 1, (HL)","BIT 1, A",
	"BIT 2, B","BIT 2, C","BIT 2, D","BIT 2, E","BIT 2, H","BIT 2, L","BIT 2, (HL)","BIT 2, A","BIT 3, B","BIT 3, C",
	"BIT 3, D","BIT 3, E","BIT 3, H","BIT 3, L","BIT 3, (HL)","BIT 3, A","BIT 4, B","BIT 4, C","BIT 4, D","BIT 4, E",
	"BIT 4, H","BIT 4, L","BIT 4, (HL)","BIT 4, A","BIT 5, B","BIT 5, C","BIT 5, D","BIT 5, E","BIT 5, H","BIT 5, L",
	"BIT 5, (HL)","BIT 5, A","BIT 6, B","BIT 6, C","BIT 6, D","BIT 6, E","BIT 6, H","BIT 6, L","BIT 6, (HL)","BIT 6, A",
	"BIT 7, B","BIT 7, C","BIT 7, D","BIT 7, E","BIT 7, H","BIT 7, L","BIT 7, (HL)","BIT 7, A","RES 0, B","RES 0, C",
	"RES 0, D","RES 0, E","RES 0, H","RES 0, L","RES 0, (HL)","RES 0, A","RES 1, B","RES 1, C","RES 1, D","RES 1, E",
	"RES 1, H","RES 1, L","RES 1, (HL)","RES 1, A","RES 2, B","RES 2, C","RES 2, D","RES 2, E","RES 2, H","RES 2, L",
	"RES 2, (HL)","RES 2, A","RES 3, B","RES 3, C","RES 3, D","RES 3, E","RES 3, H","RES 3, L","RES 3, (HL)","RES 3, A",
	"RES 3, B","RES 4, C","RES 4, D","RES 4, E","RES 4, H","RES 4, L","RES 4, (HL)","RES 4, A","RES 5, B","RES 5, C",
	"RES 5, D","RES 5, E","RES 5, H","RES 5, L","RES 5, (HL)","RES 5, A","RES 6, B","RES 6, C","RES 6, D","RES 6, E",
	"RES 6, H","RES 6, L","RES 6, (HL)","RES 6, A","RES 7, B","RES 7, C","RES 7, D","RES 7, E","RES 7, H","RES 7, L",
	"RES 7, (HL)","RES 7, A","SET 0, B","SET 0, C","SET 0, D","SET 0, E","SET 0, H","SET 0, L","SET 0, (HL)","SET 0, A",
	"SET 1, B","SET 1, C","SET 1, D","SET 1, E","SET 1, H","SET 1, L","SET 1, (HL)","SET 1, A","SET 2, B","SET 2, C",
	"SET 2, D","SET 2, E","SET 2, H","SET 2, L","SET 2, (HL)","SET 2, A","SET 3, B","SET 3, C","SET 3, D","SET 3, E",
	"SET 3, H","SET 3, L","SET 3, (HL)","SET 3, A","SET 4, B","SET 4, C","SET 4, D","SET 4, E","SET 4, H","SET 4, L",
	"SET 4, (HL)","SET 4, A","SET 5, B","SET 5, C","SET 5, D","SET 5, E","SET 5, H","SET 5, L","SET 5, (HL)","SET 5, A",
	"SET 6, B","SET 6, C","SET 6, D","SET 6, E","SET 6, H","SET 6, L","SET 6, (HL)","SET 6, A","SET 7, B","SET 7, C",
	"SET 7, D","SET 7, E","SET 7, H","SET 7, L","SET 7, (HL)","SET 7, A"];

GameBoyCore.OpCodeParameters = {
		0x06: 1,
		0x0e: 1,
		0x16: 1,
		0x1e: 1,
		0x26: 1,
		0x2e: 1,

		// LD A, (nn)
		0xfa: 2,
		// LD A, #
		0x3e: 1,

		// ld (NN), A
		0xea: 2,

		0xe0: 1,

		0xf0: 1,

		0x01: 2,
		0x11: 2,
		0x21: 2,
		0x31: 2,

		0xf8: 1,

		0x08: 2,

		0xe8: 1,

		0xc3: 2,

		0xc2: 2,
		0xca: 2,
		0xd2: 2,
		0xda: 2,

		0x18: 1,

		0x20: 1,
		0x28: 1,
		0x30: 1,
		0x38: 1,

		0xcd: 2,

		0xc4: 2,
		0xcc: 2,
		0xd4: 2,
		0xdc: 2,

		0xfe: 1
};

GameBoyCore.GetMemoryRegion = function(address) {
	if( address >= 0x4000 && address < 0x8000 ) {
		var bankOffset = gameboy.currentROMBank;
		var bank = bankOffset / 0x4000;
		return "("+(bank+"").padStart(2,'0')+")";
	}

	for( var i = 0; i < GameBoyCore.MemoryRegions.length; i++ ) {
		if( address < GameBoyCore.MemoryRegions[i].end ) {
			return GameBoyCore.MemoryRegions[i].label;
		}
	}

	return " BAD";
}

GameBoyCore.MemoryRegions = [{
		end: 0x4000,
		label: "ROM0"
	},{
		end: 0x8000,
		label: "ROM1"
	},{
		end: 0xA000,
		label: "VRAM"
	},{
		end: 0xC000,
		label: "SRAM"
	},{
		end: 0xE000,
		label: "WRAM"
	},{
		end: 0xFE00,
		label: "ECHO"
	},{
		end: 0xFEA0,
		label: " OAM"
	},{
		end: 0xFF00,
		label: "----"
	},{
		end: 0xFF80,
		label: " I/O"
	},{
		end: 0xFFFF,
		label: "HRAM"
}];

var MetaStackRegisteres = {
	'inc': [
		// Call
		0xCD,

		// Conditional Call
		0xC4,
		0xCC,
		0xD4,
		0xDC,

		// Push
		0xF5,
		0xC5,
		0xD5,
		0xE5,

		// RST
		0xC7,
		0xCF,
		0xD7,
		0xDF,
		0xE7,
		0xEf,
		0xF7,
		0xFF,

		// JP
		0xc2,
		0xca,
		0xd2,
		0xda,
		0xe9,
		0x18,
		0x20,
		0x28,
		0x30,
		0x38
	],
	'dec': [
		// Pop
		0xF1,
		0xC1,
		0xD1,
		0xE1,

		// Conditional Ret
		/*
		0xC0,
		0xC8,
		0xD0,
		0xD8,
		*/

		// Ret
		0xC9,

		// Reti
		0xD9
	]
};


GameBoyCore.prototype.GBBOOTROM = [		//GB BOOT ROM
	//Add 256 byte boot rom here if you are going to use it.
];
GameBoyCore.prototype.GBCBOOTROM = [	//GBC BOOT ROM
	//Add 2048 byte boot rom here if you are going to use it.
];
GameBoyCore.prototype.ffxxDump = [	//Dump of the post-BOOT I/O register state (From gambatte):
	0x0F, 0x00, 0x7C, 0xFF, 0x00, 0x00, 0x00, 0xF8, 	0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x01,
	0x80, 0xBF, 0xF3, 0xFF, 0xBF, 0xFF, 0x3F, 0x00, 	0xFF, 0xBF, 0x7F, 0xFF, 0x9F, 0xFF, 0xBF, 0xFF,
	0xFF, 0x00, 0x00, 0xBF, 0x77, 0xF3, 0xF1, 0xFF, 	0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
	0x00, 0xFF, 0x00, 0xFF, 0x00, 0xFF, 0x00, 0xFF, 	0x00, 0xFF, 0x00, 0xFF, 0x00, 0xFF, 0x00, 0xFF,
	0x91, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFC, 	0x00, 0x00, 0x00, 0x00, 0xFF, 0x7E, 0xFF, 0xFE,
	0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x3E, 0xFF, 	0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
	0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 	0xC0, 0xFF, 0xC1, 0x00, 0xFE, 0xFF, 0xFF, 0xFF,
	0xF8, 0xFF, 0x00, 0x00, 0x00, 0x8F, 0x00, 0x00, 	0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
	0xCE, 0xED, 0x66, 0x66, 0xCC, 0x0D, 0x00, 0x0B, 	0x03, 0x73, 0x00, 0x83, 0x00, 0x0C, 0x00, 0x0D,
	0x00, 0x08, 0x11, 0x1F, 0x88, 0x89, 0x00, 0x0E, 	0xDC, 0xCC, 0x6E, 0xE6, 0xDD, 0xDD, 0xD9, 0x99,
	0xBB, 0xBB, 0x67, 0x63, 0x6E, 0x0E, 0xEC, 0xCC, 	0xDD, 0xDC, 0x99, 0x9F, 0xBB, 0xB9, 0x33, 0x3E,
	0x45, 0xEC, 0x52, 0xFA, 0x08, 0xB7, 0x07, 0x5D, 	0x01, 0xFD, 0xC0, 0xFF, 0x08, 0xFC, 0x00, 0xE5,
	0x0B, 0xF8, 0xC2, 0xCE, 0xF4, 0xF9, 0x0F, 0x7F, 	0x45, 0x6D, 0x3D, 0xFE, 0x46, 0x97, 0x33, 0x5E,
	0x08, 0xEF, 0xF1, 0xFF, 0x86, 0x83, 0x24, 0x74, 	0x12, 0xFC, 0x00, 0x9F, 0xB4, 0xB7, 0x06, 0xD5,
	0xD0, 0x7A, 0x00, 0x9E, 0x04, 0x5F, 0x41, 0x2F, 	0x1D, 0x77, 0x36, 0x75, 0x81, 0xAA, 0x70, 0x3A,
	0x98, 0xD1, 0x71, 0x02, 0x4D, 0x01, 0xC1, 0xFF, 	0x0D, 0x00, 0xD3, 0x05, 0xF9, 0x00, 0x0B, 0x00
];
GameBoyCore.prototype.OPCODE = CoreOpCodes;
GameBoyCore.prototype.CBOPCODE = CoreOpCodesCB;

GameBoyCore.prototype.TICKTable = [		//Number of machine cycles for each instruction:
/*   0,  1,  2,  3,  4,  5,  6,  7,      8,  9,  A, B,  C,  D, E,  F*/
     4, 12,  8,  8,  4,  4,  8,  4,     20,  8,  8, 8,  4,  4, 8,  4,  //0
     4, 12,  8,  8,  4,  4,  8,  4,     12,  8,  8, 8,  4,  4, 8,  4,  //1
     8, 12,  8,  8,  4,  4,  8,  4,      8,  8,  8, 8,  4,  4, 8,  4,  //2
     8, 12,  8,  8, 12, 12, 12,  4,      8,  8,  8, 8,  4,  4, 8,  4,  //3

     4,  4,  4,  4,  4,  4,  8,  4,      4,  4,  4, 4,  4,  4, 8,  4,  //4
     4,  4,  4,  4,  4,  4,  8,  4,      4,  4,  4, 4,  4,  4, 8,  4,  //5
     4,  4,  4,  4,  4,  4,  8,  4,      4,  4,  4, 4,  4,  4, 8,  4,  //6
     8,  8,  8,  8,  8,  8,  4,  8,      4,  4,  4, 4,  4,  4, 8,  4,  //7

     4,  4,  4,  4,  4,  4,  8,  4,      4,  4,  4, 4,  4,  4, 8,  4,  //8
     4,  4,  4,  4,  4,  4,  8,  4,      4,  4,  4, 4,  4,  4, 8,  4,  //9
     4,  4,  4,  4,  4,  4,  8,  4,      4,  4,  4, 4,  4,  4, 8,  4,  //A
     4,  4,  4,  4,  4,  4,  8,  4,      4,  4,  4, 4,  4,  4, 8,  4,  //B

     8, 12, 12, 16, 12, 16,  8, 16,      8, 16, 12, 0, 12, 24, 8, 16,  //C
     8, 12, 12,  4, 12, 16,  8, 16,      8, 16, 12, 4, 12,  4, 8, 16,  //D
    12, 12,  8,  4,  4, 16,  8, 16,     16,  4, 16, 4,  4,  4, 8, 16,  //E
    12, 12,  8,  4,  4, 16,  8, 16,     12,  8, 16, 4,  0,  4, 8, 16   //F
];
GameBoyCore.prototype.SecondaryTICKTable = [	//Number of machine cycles for each 0xCBXX instruction:
/*  0, 1, 2, 3, 4, 5,  6, 7,        8, 9, A, B, C, D,  E, F*/
    8, 8, 8, 8, 8, 8, 16, 8,        8, 8, 8, 8, 8, 8, 16, 8,  //0
    8, 8, 8, 8, 8, 8, 16, 8,        8, 8, 8, 8, 8, 8, 16, 8,  //1
    8, 8, 8, 8, 8, 8, 16, 8,        8, 8, 8, 8, 8, 8, 16, 8,  //2
    8, 8, 8, 8, 8, 8, 16, 8,        8, 8, 8, 8, 8, 8, 16, 8,  //3

    8, 8, 8, 8, 8, 8, 12, 8,        8, 8, 8, 8, 8, 8, 12, 8,  //4
    8, 8, 8, 8, 8, 8, 12, 8,        8, 8, 8, 8, 8, 8, 12, 8,  //5
    8, 8, 8, 8, 8, 8, 12, 8,        8, 8, 8, 8, 8, 8, 12, 8,  //6
    8, 8, 8, 8, 8, 8, 12, 8,        8, 8, 8, 8, 8, 8, 12, 8,  //7

    8, 8, 8, 8, 8, 8, 16, 8,        8, 8, 8, 8, 8, 8, 16, 8,  //8
    8, 8, 8, 8, 8, 8, 16, 8,        8, 8, 8, 8, 8, 8, 16, 8,  //9
    8, 8, 8, 8, 8, 8, 16, 8,        8, 8, 8, 8, 8, 8, 16, 8,  //A
    8, 8, 8, 8, 8, 8, 16, 8,        8, 8, 8, 8, 8, 8, 16, 8,  //B

    8, 8, 8, 8, 8, 8, 16, 8,        8, 8, 8, 8, 8, 8, 16, 8,  //C
    8, 8, 8, 8, 8, 8, 16, 8,        8, 8, 8, 8, 8, 8, 16, 8,  //D
    8, 8, 8, 8, 8, 8, 16, 8,        8, 8, 8, 8, 8, 8, 16, 8,  //E
    8, 8, 8, 8, 8, 8, 16, 8,        8, 8, 8, 8, 8, 8, 16, 8   //F
];