(function () {
	var root = document.documentElement;

	function paint(val) {
		var btns = document.querySelectorAll(".theme-btn");
		for (var i = 0; i < btns.length; i++) {
			btns[i].classList.toggle(
				"active",
				btns[i].dataset.themeVal === val,
			);
		}
	}

	window.setTheme = function (val) {
		if (val === "system") root.removeAttribute("data-theme");
		else root.setAttribute("data-theme", val);
		try {
			localStorage.setItem("theme", val);
		} catch (e) {}
		paint(val);
	};

	setTheme(localStorage.getItem("theme") || "system");
})();
