const API = "https://send.withcapsule.dev";

function track(name, props) {
	try {
		plausible(name, props ? { props } : undefined);
	} catch (e) {}
	window.umami?.track(name, props);
}

function setTheme(val, doTrack = false) {
	if (val === "system")
		document.documentElement.removeAttribute("data-theme");
	else document.documentElement.setAttribute("data-theme", val);
	localStorage.setItem("theme", val);
	document
		.querySelectorAll(".theme-btn")
		.forEach((btn) =>
			btn.classList.toggle("active", btn.dataset.themeVal === val),
		);
	if (doTrack) track("Theme Change", { theme: val });
}
setTheme(localStorage.getItem("theme") || "system");

let currentFileId = "";
let currentFileName = "";
let currentIsEncrypted = false;
let lastUploadAt = 0;
let lastSearchAt = 0;

const $ = (id) => document.getElementById(id);

function showTab(name, doTrack) {
	$("section-upload").classList.toggle("visible", name === "upload");
	$("section-download").classList.toggle("visible", name === "download");
	$("tab-upload").classList.toggle("active", name === "upload");
	$("tab-download").classList.toggle("active", name === "download");
	if (doTrack) track("Tab Switch", { tab: name });
}
const isUpload = () => $("tab-upload").classList.contains("active");
const isDownload = () => $("tab-download").classList.contains("active");

function extractId(input) {
	const i = input.lastIndexOf("/download/");
	let id;
	if (i !== -1) {
		const after = input.slice(i + "/download/".length).replace(/\/$/, "");
		id = after || input;
	} else {
		id = input.trim();
	}
	return id.replace(/^-+|-+$/g, "");
}

function copyCmd(id, btn) {
	const text = $(id).textContent;
	if (!text) return;
	navigator.clipboard.writeText(text).then(() => {
		track("Copy Curl Command");
		const orig = btn.textContent;
		btn.textContent = "copied";
		setTimeout(() => (btn.textContent = orig), 1200);
	});
}
function copyFileId() {
	const id = $("file-id-text").textContent;
	if (!id) return;
	navigator.clipboard.writeText(id).then(() => {
		track("Copy Link");
		const btn = $("copy-btn");
		const orig = btn.textContent;
		btn.textContent = "copied";
		setTimeout(() => (btn.textContent = orig), 1200);
	});
}
function copyMnemonic() {
	const text = $("mnemonic-text").textContent;
	if (!text) return;
	navigator.clipboard.writeText(text).then(() => {
		track("Copy Mnemonic");
		const btn = $("mnemonic-copy");
		const orig = btn.textContent;
		btn.textContent = "copied";
		setTimeout(() => (btn.textContent = orig), 1200);
	});
}

$("upload-form").addEventListener("submit", async function (e) {
	e.preventDefault();
	const now = Date.now();
	if (now - lastUploadAt < 1000) return;
	lastUploadAt = now;

	const fileInput = $("file-input");
	if (!fileInput.files.length) return;
	const file = fileInput.files[0];

	const status = $("upload-status");
	const prog = $("upload-progress");
	const fill = $("progress-fill");
	const result = $("upload-result");
	const btn = $("upload-btn");
	const mnemonicBlock = $("mnemonic-block");

	status.textContent = "";
	status.className = "status";
	result.classList.remove("on");
	mnemonicBlock.classList.remove("on");
	$("share-btn").classList.add("hidden");
	$("qr-canvas").classList.remove("on");
	fill.style.width = "0%";
	btn.disabled = true;

	const encrypt = $("encrypt-toggle").checked;
	const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
	track("Upload Started", { size_mb: fileSizeMB, encrypted: encrypt });

	let form;
	let mnemonic = "";

	if (encrypt) {
		if (!window.CapsuleCrypto) {
			status.className = "status error";
			status.textContent =
				"Encryption unavailable. Reload and try again.";
			btn.disabled = false;
			return;
		}
		try {
			status.textContent = "Encrypting…";
			mnemonic = CapsuleCrypto.makeMnemonic();
			const plain = new Uint8Array(await file.arrayBuffer());
			const cipher = await CapsuleCrypto.encryptFile(plain, mnemonic);
			form = new FormData();
			form.append(
				"f",
				new Blob([cipher], { type: "application/octet-stream" }),
				file.name,
			);
		} catch (err) {
			status.className = "status error";
			status.textContent = "Encryption failed.";
			btn.disabled = false;
			track("Encrypt Failed");
			return;
		}
	} else {
		form = new FormData($("upload-form"));
	}

	prog.classList.add("on");
	const xhr = new XMLHttpRequest();
	const startTime = Date.now();

	xhr.upload.onprogress = function (e) {
		if (e.lengthComputable) {
			const pct = Math.round((e.loaded / e.total) * 100);
			fill.style.width = pct + "%";
			const mbps = (
				e.loaded /
				((Date.now() - startTime) / 1000) /
				(1024 * 1024)
			).toFixed(1);
			status.textContent = pct + "% · " + mbps + " MB/s";
		}
	};

	xhr.onload = function () {
		prog.classList.remove("on");
		btn.disabled = false;
		if (xhr.status === 200) {
			const text = xhr.responseText;
			const marker = "File ID for downloading is ";
			const idx = text.indexOf(marker);
			if (idx !== -1) {
				const after = text.slice(idx + marker.length);
				currentFileId = after.match(/^[A-Za-z0-9-]+/)?.[0] ?? "";
			}
			if (currentFileId) {
				const downloadUrl = API + "/download/" + currentFileId;
				$("file-id-text").textContent = downloadUrl;
				$("result-ok").textContent = encrypt
					? "✓ encrypted & uploaded. Share this link:"
					: "✓ uploaded. Share this link:";
				result.classList.add("on");
				status.textContent = "";
				track("Upload Success", {
					size_mb: fileSizeMB,
					encrypted: encrypt,
				});

				const canvas = $("qr-canvas");
				QRCode.toCanvas(
					canvas,
					downloadUrl,
					{ width: 168, margin: 1 },
					function () {
						canvas.classList.add("on");
					},
				);

				if (encrypt && mnemonic) {
					$("mnemonic-text").textContent = mnemonic;
					mnemonicBlock.classList.add("on");
				}

				const shareBtn = $("share-btn");
				if (navigator.share) {
					shareBtn.classList.remove("hidden");
					shareBtn.onclick = function () {
						navigator
							.share({ url: downloadUrl })
							.then(() => track("Share Link"))
							.catch(() => {});
					};
				}
			} else {
				status.textContent = text.trim();
			}
		} else {
			status.className = "status error";
			status.textContent =
				xhr.responseText.trim() ||
				"Upload failed ( " + xhr.status + " )";
			track("Upload Failed", { status: xhr.status });
		}
	};

	xhr.onerror = function () {
		prog.classList.remove("on");
		btn.disabled = false;
		status.className = "status error";
		status.textContent = "Network error.";
		track("Upload Failed", { status: "network_error" });
	};

	xhr.open("POST", API + "/upload?encrypted=" + (encrypt ? "true" : "false"));
	xhr.send(form);
});

$("download-input").addEventListener("input", function () {
	if (this.value.indexOf(" ") !== -1) {
		const start = this.selectionStart;
		const end = this.selectionEnd;
		this.value = this.value.replace(/ /g, "-");
		this.setSelectionRange(start, end);
	}
});

$("download-form").addEventListener("submit", function (e) {
	e.preventDefault();
	const now = Date.now();
	if (now - lastSearchAt < 1000) return;
	lastSearchAt = now;

	const raw = $("download-input").value.trim();
	$("download-input").blur();
	const id = extractId(raw);
	if (!id) return;

	const status = $("download-status");
	const dlBtn = $("download-btn");
	const searchBtn = $("search-btn");

	track("File Search");
	status.textContent = "Searching…";
	status.className = "status";
	dlBtn.classList.add("hidden");
	searchBtn.disabled = true;
	setTimeout(() => (searchBtn.disabled = false), 1000);

	const xhr = new XMLHttpRequest();
	xhr.onload = function () {
		const decryptBlock = $("decrypt-block");
		if (xhr.status === 200) {
			const info = JSON.parse(xhr.responseText);
			currentFileId = id;
			currentFileName = info.file_name;
			currentIsEncrypted = !!info.is_encrypted;
			const mb = info.file_size / (1024 * 1024);
			const sizeStr =
				mb >= 1
					? mb.toFixed(1) + " MB"
					: (info.file_size / 1024).toFixed(1) + " KB";
			const minLeft = Math.max(1, Math.ceil(info.time_remaining / 60));
			status.textContent =
				info.file_name +
				" · " +
				sizeStr +
				" · " +
				minLeft +
				" min left" +
				(currentIsEncrypted ? " · encrypted" : "");
			decryptBlock.classList.toggle("on", currentIsEncrypted);
			$("mnemonic-input").value = "";
			dlBtn.innerHTML =
				(currentIsEncrypted ? "decrypt &amp; save" : "receive") +
				' <kbd aria-hidden="true">D</kbd>';
			dlBtn.classList.remove("hidden");
			track("File Found", { encrypted: currentIsEncrypted });
		} else {
			decryptBlock.classList.remove("on");
			status.className = "status error";
			status.textContent =
				xhr.responseText.trim() || "Not found ( " + xhr.status + " )";
			dlBtn.classList.add("hidden");
			track("File Not Found");
		}
	};
	xhr.onerror = function () {
		status.className = "status error";
		status.textContent = "Network error.";
	};
	xhr.open("GET", API + "/status/" + id);
	xhr.send();
});

$("download-btn").addEventListener("click", async function () {
	if (!currentFileId) return;
	const status = $("download-status");

	if (!currentIsEncrypted) {
		track("File Downloaded", { encrypted: false });
		window.location.href = API + "/download/" + currentFileId;
		return;
	}
	if (!window.CapsuleCrypto) {
		status.className = "status error";
		status.textContent = "Decryption unavailable. Reload and try again.";
		return;
	}
	const phrase = $("mnemonic-input").value;
	if (!phrase.trim()) {
		status.className = "status error";
		status.textContent = "Enter the phrase to decrypt.";
		return;
	}

	const dlBtn = this;
	dlBtn.disabled = true;
	status.className = "status";
	status.textContent = "Downloading…";

	try {
		const resp = await fetch(API + "/download/" + currentFileId);
		if (!resp.ok) {
			status.className = "status error";
			status.textContent = "Download failed ( " + resp.status + " )";
			return;
		}
		const cipher = new Uint8Array(await resp.arrayBuffer());
		status.textContent = "Decrypting…";
		let plain;
		try {
			plain = await CapsuleCrypto.decryptFile(cipher, phrase);
		} catch (err) {
			status.className = "status error";
			status.textContent = "Incorrect phrase or corrupted file.";
			track("Decrypt Failed");
			return;
		}
		saveBlob(plain, currentFileName || "download");
		status.className = "status";
		status.textContent = "Decrypted & saved.";
		track("File Downloaded", { encrypted: true });
	} catch (err) {
		status.className = "status error";
		status.textContent = "Network error.";
	} finally {
		dlBtn.disabled = false;
	}
});

function saveBlob(bytes, name) {
	const blob = new Blob([bytes], { type: "application/octet-stream" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = name;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

function setUploadFile(file) {
	showTab("upload");
	const dt = new DataTransfer();
	dt.items.add(file);
	$("file-input").files = dt.files;
	$("picked").textContent = "› " + file.name;
	$("slot").classList.add("has-file");
}
$("file-input").addEventListener("change", function () {
	if (this.files[0]) {
		$("picked").textContent = "› " + this.files[0].name;
		$("slot").classList.add("has-file");
	}
});

$("encrypt-toggle").addEventListener("change", function () {
	track("Encryption Toggled", { enabled: this.checked });
});

(function () {
	let dragCounter = 0;
	document.addEventListener("dragenter", function (e) {
		if (!e.dataTransfer?.types.includes("Files")) return;
		e.preventDefault();
		dragCounter++;
		document.body.classList.add("drag");
	});
	document.addEventListener("dragleave", function () {
		if (--dragCounter <= 0) {
			dragCounter = 0;
			document.body.classList.remove("drag");
		}
	});
	document.addEventListener("dragover", function (e) {
		if (!e.dataTransfer?.types.includes("Files")) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = "copy";
	});
	document.addEventListener("drop", function (e) {
		if (!e.dataTransfer?.files.length) return;
		e.preventDefault();
		dragCounter = 0;
		document.body.classList.remove("drag");
		setUploadFile(e.dataTransfer.files[0]);
	});
})();

document.addEventListener("paste", function (e) {
	const el = document.activeElement;
	const inField =
		el &&
		(el.tagName === "INPUT" ||
			el.tagName === "TEXTAREA" ||
			el.isContentEditable);

	if (isDownload()) {
		if (inField) return;
		const text = e.clipboardData?.getData("text/plain");
		if (!text) return;
		const input = $("download-input");
		input.focus();
		input.value = text.trim();
		input.dispatchEvent(new Event("input", { bubbles: true }));
		return;
	}
	const files = e.clipboardData?.files;
	if (files?.length) {
		setUploadFile(files[0]);
		return;
	}
	if (inField) return;
	const text = e.clipboardData?.getData("text/plain");
	if (!text) return;
	setUploadFile(new File([text], "pasted.txt", { type: "text/plain" }));
});

document.addEventListener("keydown", function (e) {
	if (e.ctrlKey || e.metaKey || e.altKey) return;
	const el = document.activeElement;
	if (
		el &&
		(el.tagName === "INPUT" ||
			el.tagName === "TEXTAREA" ||
			el.tagName === "SELECT" ||
			el.isContentEditable)
	)
		return;
	const key = e.key.toLowerCase();

	if (key === "/") {
		e.preventDefault();
		$( "sc-btn" ).click();
		return;
	}

	if (key === "enter") {
		if (!isUpload()) return;
		const fileInput = $("file-input");
		const btn = $("upload-btn");
		if (!fileInput.files.length || btn.disabled) return;
		$("upload-form").requestSubmit();
		return;
	}
	if (key === "e") {
		if (!isUpload()) return;
		$("encrypt-toggle").click();
		return;
	}
	if (key === "d") {
		if (!isDownload()) return;
		const dlBtn = $("download-btn");
		if (dlBtn.classList.contains("hidden") || dlBtn.disabled) return;
		dlBtn.click();
		return;
	}
	if (key === "c") {
		if (!isUpload()) return;
		if (!$("upload-result").classList.contains("on")) return;
		copyFileId();
		return;
	}
	const target = key === "s" ? "upload" : key === "r" ? "download" : null;
	if (!target) return;
	const tabId = target === "upload" ? "tab-upload" : "tab-download";
	if ($(tabId).classList.contains("active")) return;
	showTab(target, true);
});

(function () {
	const scBtn = $("sc-btn");
	const scFly = $("sc-flyout");
	scBtn.addEventListener("click", (e) => {
		e.stopPropagation();
		const open = scFly.classList.toggle("open");
		scBtn.setAttribute("aria-expanded", open);
		if (open) track("Shortcuts Opened");
	});
	document.addEventListener("click", (e) => {
		if (!scFly.contains(e.target) && e.target !== scBtn) {
			scFly.classList.remove("open");
			scBtn.setAttribute("aria-expanded", "false");
		}
	});
	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape") {
			scFly.classList.remove("open");
			scBtn.setAttribute("aria-expanded", "false");
		}
	});
})();

function showInstallTab(platform, doTrack) {
	["mac", "linux", "windows"].forEach((p) => {
		$("install-" + p).classList.toggle("visible", p === platform);
		$("itab-" + p).classList.toggle("active", p === platform);
	});
	if (doTrack) track("Install Tab Viewed", { platform });
}
function copyInstall(platform) {
	const text = $("install-cmd-" + platform).textContent;
	navigator.clipboard.writeText(text).then(() => {
		track("Copy Install Command", { platform });
		const btn = document.querySelector("#install-" + platform + " .copy");
		const orig = btn.textContent;
		btn.textContent = "copied";
		setTimeout(() => (btn.textContent = orig), 1200);
	});
}
(function () {
	const ua = navigator.userAgent;
	const pl = (
		navigator.userAgentData?.platform ||
		navigator.platform ||
		""
	).toLowerCase();
	if (pl.includes("win") || ua.includes("Windows")) showInstallTab("windows");
	else if (!pl.includes("mac") && !ua.includes("Mac"))
		showInstallTab("linux");
	else showInstallTab("mac");
})();

(function () {
	function findAnchor(target) {
		let el = target;
		for (let i = 0; i <= 3 && el; i++, el = el.parentNode) {
			if (el.tagName?.toLowerCase() === "a" && el.href) return el;
		}
		return null;
	}
	function handleClick(e) {
		if (e.type === "auxclick" && e.button !== 1) return;
		const anchor = findAnchor(e.target);
		if (anchor && anchor.host && anchor.host !== location.host) {
			window.umami?.track("Outbound Link: Click", { url: anchor.href });
		}
	}
	document.addEventListener("click", handleClick);
	document.addEventListener("auxclick", handleClick);
})();

showTab("upload");
