var EmulatorSymbolList = [
	{
		address: 0xdb00,
		type: "Memory",
		label: "Weapon B",
		namespace: "Link"
	},{
		address: 0xdb01,
		type: "Memory",
		label: "Weapon B",
		namespace: "Link"
	},{
		address: 0xdb02,
		type: "Memory",
		label: "Inv 1",
		namespace: "Link"
	},{
		address: 0xdb03,
		type: "Memory",
		label: "Inv 2",
		namespace: "Link"
	},

	{
		address: 0xff98,
		type: "Memory",
		label: "Pos X",
		namespace: "Link"
	},{
		address: 0xff99,
		type: "Memory",
		label: "Pos Y",
		namespace: "Link"
	},{
		address: 0xdb5a,
		type: "Memory",
		label: "HP",
		namespace: "Link"
	},{
		address: 0xdb5b,
		type: "Memory",
		label: "Max HP",
		namespace: "Link"
	},
];

var RamSymbols = {
// Inventory
	0xdb00: "Weapon B",
	0xdb01: "Weapon A",
	0xdb02: "Inv1",
	0xdb03: "Inv2",

// Link
	0xff98: "Pos X",
	0xff99: "Pos Y",
	0xdb5a: "HP",
	0xdb5b: "Max HP",
	0xdb45: "Arrow Count",
	0xdb4d: "Bomb Count",

// Enemy
	0xc360: "Enemy HP",
	0xc200: "Enemy X",
	0xc210: "Enemy Y",

	0xea40: "Bow Func"
}