var Scrollbar = function() {
	this.value = 0;
	this.height = 0;
	this.callback = false;
	this.$el = false;
	this.$window = false;
	this.rowHeight = 20;
	this.preventCallback = false;

	this.Init = function($window, height) {
		this.height = height;
		this.$window = $window;

		this.$el = document.createElement("div");
		this.$el.classList.add("scrollbar");
		this.$window.appendChild(this.$el);

		var box_height = this.height * this.rowHeight;
		this.$el.innerHTML = "<div class='heightbox' style='height: "+box_height+"px'></div>";

		this.$window.addEventListener('mousewheel', this.scrollEvent.bind(this), true);

		this.$el.addEventListener('scroll', this.scrollEvent.bind(this));
	}

	this.scrollEvent = function(e) {
		if( this.preventCallback ) {
			this.preventCallback = false;
			return;
		}
		if( this.callback ) {
			
			// Update scroll position for mouse wheel events captured on the window
			if( e.type == "mousewheel" ) {
				this.Set(this.value + parseInt(e.deltaY/2));	
			}

			this.callback.apply();
		}
	}

	this.Get = function() {
		this.value = Math.floor(this.$el.scrollTop/this.rowHeight);
		return this.value;
	}

	this.Set = function(value) {
		// Prevent scroll event triggering
		this.preventCallback = true;

		this.value = value;
		this.$el.scrollTop = this.value*this.rowHeight;
	}
}