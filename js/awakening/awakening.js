awakening = {
	_settings: {

	},

	Init: function() {

		if( !this.IsReady() ) {
			window.setTimeout(this.Init.bind(this), 500);
		}

		this.LoadRom();
		this.LoadSaveState();
	},

	IsReady: function() {

		if( !la_rom ) {
			return false;
		}

		if( !la_savestate ) {
			return false;
		}

		if( document.readyState !== 'complete') {
			return false;
		}

		return true;
	},

	LoadRom: function() {
		initPlayer();
		start(mainCanvas, base64_decode(la_rom));
	},

	LoadSaveState: function() {
		gameboy.returnFromState(la_savestate);
	}
}
