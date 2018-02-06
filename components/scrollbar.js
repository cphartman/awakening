var Scrollbar = function() {
	this.value = 0;
	this.height = 0;
	this.callback = false;
	this.$el = false;
	this.$window = false;
	this.rowHeight = 20;
	this.preventCallback = false;

	this.valueTarget = 0;
	this.valueTargetSpeed = 2;

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
				var interval = this.height *.00001;
				var offset = Math.floor(Math.abs(interval*e.deltaY)+.5);
				var direction = ( e.deltaY > 0 ? 1 : -1 );

				var new_val = this.value + offset*direction;
				
				this.setTarget(new_val);	
			}

			this.callback.apply();
		}
	}

	this.Get = function() {
		this.value = Math.floor(this.$el.scrollTop/this.rowHeight);
		return this.value;
	}

	this.setTarget = function(value, speed) {
		if( typeof speed != 'undefined' ) {
			this.valueTargetSpeed = speed;
		}

		this.valueTarget = Math.ceil(value);
		if( this.valueTarget < 0 ) {
			this.valueTarget = 0;
		}
		if( this.valueTarget > this.height ) {
			this.valueTarget = this.height;
		}
		this.setTargetCallback();
	}

	this.setTargetCallback = function() {
		console.log("Target Callback: "+this.value);
		if( this.valueTarget != Math.floor(this.value) ) {
			if( this.value < this.valueTarget ) {	
				this.Set(this.value+1);
			} else {
				this.Set(this.value-1);
			}
			this.callback.apply();
			window.setTimeout(this.setTargetCallback.bind(this), this.valueTargetSpeed);
		}
	}

	this.Set = function(value) {
		// Prevent scroll event triggering
		this.preventCallback = true;

		this.value = Math.floor(value);
		this.$el.scrollTop = this.value*this.rowHeight;
	}
}