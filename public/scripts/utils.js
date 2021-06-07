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
	try {
		if (window.localStorage.getItem("history")) {
			throw "History off";
		}

		var link = document.getElementById("link-text").innerText;
		var source = document.getElementById("sourcelink").innerText;
		localStorage.setItem(source, link);
		console.log("item added");
	} catch {
		console.log("histry off");
	}
}

function genHistTable() {
	noHistMsg = document.getElementById("no-hist-msg");
	noHistMsg.classList.toggle("off", true);
	if (window.localStorage.length != 0) {
		try {
			if (window.localStorage.getItem("history")) {
				throw "History off";
			}

			var tbody = document.getElementById("hist-tbody");
			rows = "";
			Object.keys(localStorage).forEach(function (key, i) {
				const result = JSON.parse(localStorage.getItem(key));
				const copybtn = ` 
	<button class="copybtn" onclick="copyLink('hist-link${i}')"><span id='hist-span${i}' class="material-icons">assignment</span></button>`;
				const row = `<tr>
								<td class="tbllinks">${key}</td>
								<td class="timestamp">${result[0]}</td>
								<td class="tbllinks" id='hist-link${i}'>${result[1]}</td>
								<td>${copybtn}</td>
								</tr>`;
				rows += row;
			});
			tbody.innerHTML = rows;
			const checkbtn = document.getElementById("hist-checkbox");
			checkbtn.checked = true;
			sortTableByColumn("hist-tbody", 1);
			psudop.classList.toggle("psudo-hidden", true);
			console.log("history on");
		} catch (e) {
			historyToggle();
			psudop.classList.toggle("psudo-hidden", false);
			console.log("history off");
		}
	} else {
		const noHistElems = document.getElementsByClassName("no-hist");
		Array.from(noHistElems).forEach((elem) => {
			elem.classList.toggle("off", true);
		});
		noHistMsg.classList.toggle("off", false);
		console.log("no history");
	}
}

function sortTableByColumn(tbl, column) {
	try {
		const tb = document.getElementById(tbl);
		const headerRow = tb.parentElement.firstElementChild.firstElementChild;
		headerRow.querySelectorAll("span").forEach((sp) => sp.classList.remove("off"));
		const headerCol = headerRow.querySelector(`th:nth-child(${column + 1})`);
		const asc = headerCol.classList.contains("sort-asc") ? true : false;
		const currentSortClass = asc ? "sort-asc" : "sort-desc";
		const newSortClass = asc ? "sort-desc" : "sort-asc";
		const dirModifer = asc ? 1 : -1;
		const rows = Array.from(tb.querySelectorAll("tr"));
		console.log("sorting table");

		const sortedRows = rows.sort((a, b) => {
			const aColText = a.querySelector(`td:nth-child(${column + 1})`).textContent.trim();
			const bColText = b.querySelector(`td:nth-child(${column + 1})`).textContent.trim();
			return aColText > bColText ? 1 * dirModifer : -1 * dirModifer;
		});
		tb.append(...sortedRows);
		headerCol.classList.replace(currentSortClass, newSortClass);
		if (asc) {
			headerCol.lastElementChild.classList.toggle("off", true);
		} else {
			headerCol.firstElementChild.classList.toggle("off", true);
		}
	} catch (err) {
		console.log(err);
	}
}

function historyToggle() {
	const histSwitch = document.getElementById("hist-switch");
	const checkbtn = document.getElementById("hist-checkbox");
	const psudop = document.getElementById("psudop");
	const histElems = document.getElementsByClassName("require-hist");
	if (!checkbtn.checked) {
		Array.from(histElems).forEach((elem) => {
			elem.classList.toggle("hidden", true);
		});
		localStorage.setItem("history", "true");
		histSwitch.classList.toggle("history-off", true);
		histSwitch.classList.toggle("history-on", false);
		psudop.classList.toggle("psudo-hidden", false);
	} else {
		Array.from(histElems).forEach((elem) => {
			elem.classList.toggle("hidden", false);
		});

		try {
			document.getElementById("hist-body").firstElementChild;
			localStorage.removeItem("history");
		} catch (e) {
			localStorage.removeItem("history");
			genHistTable();
		}
		histSwitch.classList.toggle("history-off", false);
		histSwitch.classList.toggle("history-on", true);
		psudop.classList.toggle("psudo-hidden", true);
	}
}
function clearHist() {
	if (confirm("are you sure?")) {
		window.localStorage.clear();
		window.location.reload()
	}
}
