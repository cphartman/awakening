var Window = function() {
	this.root = document.querySelector("body");

	this.top = 0;
	this.left = 0;
	this.width = 100;
	this.height = 100;
	this.$el = false;
	this.program = false;

	this.Init = function(template) {
		this.$el = document.createElement("div");
		this.$el.classList.add("window");
		this.$el.innerHTML = template;

		this.root.appendChild(this.$el);
		this.Refresh();
	}

	this.Refresh = function() {
		this.$el.style['top'] = this.top+"px";
		this.$el.style['left'] = this.left+"px";
		this.$el.style['width'] = this.width+"px";
		this.$el.style['height'] = this.height+"px";
	}
}
