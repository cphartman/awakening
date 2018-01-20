var Scrollbar = function() {
	this.value = 0;
	this.height = 0;
	this.callback = false;
	this.$el = false;
	this.$window = false;
	this.rowHeight = 20;

	this.Init = function($window, height) {
		this.height = height;
		this.$window = $window;

		this.$el = document.createElement("div");
		this.$el.classList.add("scrollbar");
		this.$window.appendChild(this.$el);

		var box_height = this.height * this.rowHeight;
		this.$el.innerHTML = "<div class='heightbox' style='height: "+box_height+"px'></div>";

		this.$el.addEventListener('scroll', this.scrollEvent.bind(this));
	}

	this.scrollEvent = function() {
		if( this.callback ) {
			this.callback.apply();
		}
	}

	this.Get = function() {
		this.value = Math.floor(this.$el.scrollTop/this.rowHeight);
		return this.value;
	}

	this.Set = function(value) {
		this.value = value*this.rowHeight;
		this.$el.scrollTop = this.value;
	}
}