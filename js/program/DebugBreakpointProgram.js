var DebugBreakpointProgram = function(emulation_core, address) {
	this.emulationCore = emulation_core;
	this.address = address;
	this.enable = true;
	this.type = "EXECUTION"
	this.onBreak = false;
	this.$window = false;

	this.emulationCore.debug_breakpoints.push(this);

	this.InitWindow = function($window) {
		this.$window = $window;
	}
}