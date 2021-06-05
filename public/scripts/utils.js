function copyLink(txt) {
	var text = document.getElementById(txt).innerText;
	var textArea = document.createElement("textarea");
	textArea.style.position = "fixed";
	textArea.style.top = 0;
	textArea.style.left = 0;

	// Ensure it has a small width and height. Setting to 1px / 1em
	// doesn't work as this gives a negative w/h on some browsers.
	textArea.style.width = "2em";
	textArea.style.height = "2em";

	// We don't need padding, reducing the size if it does flash render.
	textArea.style.padding = 0;

	// Clean up any borders.
	textArea.style.border = "none";
	textArea.style.outline = "none";
	textArea.style.boxShadow = "none";
	// Avoid flash of the white box if rendered for any reason.
	textArea.style.background = "transparent";
	textArea.value = text;

	document.body.appendChild(textArea);
	textArea.focus();
	textArea.select();
	try {
		var successful = document.execCommand("copy");
		var msg = successful ? "successful" : "unsuccessful";
		console.log("Copying text command was " + msg);
		if (txt.includes("hist")) {
			btnid = "hist-span" + txt.slice(-1);
			var copybtn = document.getElementById(btnid);
			copybtn.value = "assignment_turned_in";
			copybtn.innerHTML = "assignment_turned_in";
		} else {
			var copybtn = document.getElementById("copybtn");
			copybtn.value = "copied!";
			copybtn.innerHTML = "copied!";
		}
	} catch (err) {
		console.log(err);
	}

	document.body.removeChild(textArea);
}

function savem3u() {
	var link = document.getElementById("link-text").innerText;
	var source = document.getElementById("sourcelink").innerText;
	var text = "#EXTM3U \n" + link;
	var d = Date(Date.now()).split(" ");
	var datetime = d[3] + "-" + d[2] + "-" + d[4].replaceAll(":", "-");
	if (source.includes("http")) {
		s = source.split("/")[2];
	} else {
		s = source.split("/")[0];
	}
	filename = s + datetime + ".m3u";
	var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
	saveAs(blob, filename);
}

window.addEventListener("load", () => {
	const preloader = document.querySelector(".preload");
	preloader.classList.add("preload-finish");
});

function startAnim() {
	const preloader = document.querySelector(".preload");
	preloader.classList.remove("preload-finish");
}

function AddToHist() {
	var link = document.getElementById("link-text").innerText;
	var source = document.getElementById("sourcelink").innerText;
	localStorage.setItem(source, link);
	console.log("item added");
}
