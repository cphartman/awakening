var FileLoader = (function() {

	this.LoadJs = function(pathList) {
		// Coerce parameter to a list
		if( typeof pathList == "string" ) {
			pathList = [pathList];
		}

		for( var i = 0; i < pathList.length; i++ ) {
			var path = pathList[i];
			var js = document.createElement("script");
			js.type = "text/javascript";
			js.onError = FileLoader.OnErrorHandler;
			js.onLoad = FileLoader.OnLoadHandler;
			js.src = path+".js";
			
			document.querySelector("body").appendChild(js);
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
			document.querySelector("body").appendChild(css);
		}
	}

	this.Load = function(pathList) {
		LoadJs(pathList);
		LoadCss(pathList);
	}

	return this;
})();