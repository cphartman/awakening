var FileLoader = (function() {
	
	this.queueJs = [];
	this.timeoutHandleJs = false;
	this.currentQueueJs = false;
	this.callbacks = {};

	this.LoadJs = function(pathList, callback) {
		// Coerce parameter to a list
		if( typeof pathList == "string" ) {
			pathList = [pathList];
		}

		for( var i = 0; i < pathList.length; i++ ) {
			var path = pathList[i]+".js";
			this.queueJs.push(path);
			if( typeof callback == 'undefined' ) {
				callback = {};
			}
			this.callbacks[path] = callback;
		}

		this.UpdateQueueJs();
	}

	this.UpdateQueueJs = function() {
		if( !this.currentQueueJs && this.queueJs.length ) {
			var path = this.queueJs.shift();
			this.currentQueueJs = document.createElement("script");
			this.currentQueueJs.FileLoaderPath = path;
			this.currentQueueJs.type = "text/javascript";
				
			this.currentQueueJs.onload = function() {
				if( this.callbacks[this.currentQueueJs.FileLoaderPath] && this.callbacks[this.currentQueueJs.FileLoaderPath]['success'] ) {
					this.callbacks[this.currentQueueJs.FileLoaderPath]['success']();
				}

				this.currentQueueJs = false;
				window.setTimeout(this.UpdateQueueJs.bind(this),1);
			}.bind(this);
		
			this.currentQueueJs.onerror = function() {
				if( this.callbacks[this.currentQueueJs.FileLoaderPath] && this.callbacks[this.currentQueueJs.FileLoaderPath] ['error'] ) {
					this.callbacks[this.currentQueueJs.FileLoaderPath]['error']();
				}

				this.currentQueueJs = false;
				window.setTimeout(this.UpdateQueueJs.bind(this),1);
			}.bind(this);

			this.currentQueueJs.src = path;
			
			document.querySelector("head").appendChild(this.currentQueueJs);
		}
	}

	this.OnErrorHandler = function (e) {
		console.log("Load Error: e");
	}

	this.OnLoadHandler = function (e) {
		console.log("Loaded: e");
	}

	this.LoadCss = function(pathList) {
		// Coerce parameter to a list
		if( typeof pathList == "string" ) {
			pathList = [pathList];
		}

		for( var i = 0; i < pathList.length; i++ ) {
			var path = pathList[i];
			var css = document.createElement("link");
			css.rel = "stylesheet";
			css.href = path+".css";
			document.querySelector("head").appendChild(css);
		}
	}

	this.Load = function(pathList) {
		LoadJs(pathList);
		LoadCss(pathList);
	}

	return this;
})();