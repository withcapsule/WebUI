const API = "https://send.withcapsule.dev";

function track( name, props ) {
	plausible( name, props ? { props } : undefined );
	window.umami?.track( name, props );
}

function setTheme( val, doTrack = false ) {
	if( val === "system" ) {
		document.documentElement.removeAttribute( "data-theme" );
	} else {
		document.documentElement.setAttribute( "data-theme", val );
	}
	localStorage.setItem( "theme", val );
	document.querySelectorAll( ".theme-btn" ).forEach( btn => {
		btn.classList.toggle( "active", btn.dataset.themeVal === val );
	} );
	if( doTrack ) track( "Theme Change", { theme: val } );
}

( function () {
	const saved = localStorage.getItem( "theme" ) || "system";
	setTheme( saved );
} )();

let currentFileId = "";
let lastUploadAt = 0;
let lastSearchAt = 0;

const CURL_UPLOAD   = 'curl -F "f=@photo.jpg" https://send.withcapsule.dev/upload';
const CURL_DOWNLOAD = "curl -OJ https://send.withcapsule.dev/download/[file_ID]";

function showTab( name ) {
	document.getElementById( "section-upload" ).classList.toggle( "visible", name === "upload" );
	document.getElementById( "section-download" ).classList.toggle( "visible", name === "download" );
	document.getElementById( "tab-upload" ).classList.toggle( "active", name === "upload" );
	document.getElementById( "tab-download" ).classList.toggle( "active", name === "download" );
	document.getElementById( "hero-cmd" ).textContent = name === "upload" ? CURL_UPLOAD : CURL_DOWNLOAD;
	track( "Tab Switch", { tab: name } );
}

function extractId( input ) {
	const i = input.lastIndexOf( "/download/" );

	if( i !== -1 ) {
		const after = input.slice( i + "/download/".length ).replace( /\/$/, "" );
		return after || input;
	}

	return input.trim();
}

function copyCmd( id, btn ) {
	const text = document.getElementById( id ).textContent;
	if( !text ) return;
	navigator.clipboard.writeText( text ).then( () => {
		track( "Copy Curl Command" );
		const orig = btn.textContent;
		btn.textContent = "copied";
		setTimeout( () => {
			btn.textContent = orig;
		}, 1200 );
	} );
}

function copyFileId() {
	const id = document.getElementById( "file-id-text" ).textContent;
	if( !id ) return;
	navigator.clipboard.writeText( id ).then( () => {
		track( "Copy File ID" );
		const btn = document.getElementById( "copy-btn" );
		const orig = btn.textContent;
		btn.textContent = "Copied";
		setTimeout( () => {
			btn.textContent = orig;
		}, 1200 );
	} );
}


document.getElementById( "upload-form" ).addEventListener( "submit", function ( e ) {
	e.preventDefault();

	const now = Date.now();
	if( now - lastUploadAt < 1000 ) return;
	lastUploadAt = now;

	const fileInput = document.getElementById( "file-input" );
	if( !fileInput.files.length ) return;

	const status = document.getElementById( "upload-status" );
	const progress = document.getElementById( "upload-progress" );
	const result = document.getElementById( "upload-result" );
	const btn = document.getElementById( "upload-btn" );

	status.textContent = "";
	status.className = "";
	result.classList.remove( "visible" );
	const qr = document.getElementById( "qr-canvas" );
	qr.classList.remove( "visible" );
	progress.value = 0;
	progress.classList.add( "visible" );
	btn.disabled = true;

	const fileSizeMB = ( fileInput.files[0].size / ( 1024 * 1024 ) ).toFixed( 1 );
	track( "Upload Started", { size_mb: fileSizeMB } );

	const form = new FormData( this );
	const xhr = new XMLHttpRequest();
	const startTime = Date.now();

	xhr.upload.onprogress = function ( e ) {
		if( e.lengthComputable ) {
			progress.value = Math.round( ( e.loaded / e.total ) * 100 );
			const mbps = (
				e.loaded /
				( ( Date.now() - startTime ) / 1000 ) /
				( 1024 * 1024 )
			).toFixed( 1 );
			status.textContent = progress.value + "% — " + mbps + " MB/s";
		}
	};

	xhr.onload = function () {
		progress.classList.remove( "visible" );
		btn.disabled = false;
		if( xhr.status === 200 ) {
			const text = xhr.responseText;
			const marker = "File ID for downloading is ";
			const idx = text.indexOf( marker );
			if( idx !== -1 ) {
				const after = text.slice( idx + marker.length );
				currentFileId = after.match( /^[A-Za-z0-9]+/ )?.[0] ?? "";
			}
			if( currentFileId ) {
				document.getElementById( "file-id-text" ).textContent =
					currentFileId;
				result.classList.add( "visible" );
				status.textContent = "Uploaded.";
				track( "Upload Success", { size_mb: fileSizeMB } );
				const canvas = document.getElementById( "qr-canvas" );
				const downloadUrl = API + "/download/" + currentFileId;
				QRCode.toCanvas( canvas, downloadUrl, { width: 160, margin: 1 }, function() {
					canvas.classList.add( "visible" );
				} );
			} else {
				status.textContent = text.trim();
			}
		} else {
			status.className = "error";
			status.textContent =
				xhr.responseText.trim() || "Upload failed ( " + xhr.status + " )";
			track( "Upload Failed", { status: xhr.status } );
		}
	};

	xhr.onerror = function () {
		progress.classList.remove( "visible" );
		btn.disabled = false;
		status.className = "error";
		status.textContent = "Network error.";
		track( "Upload Failed", { status: "network_error" } );
	};

	xhr.open( "POST", API + "/upload?encrypted=false" );
	xhr.send( form );
} );


document.getElementById( "download-form" ).addEventListener( "submit", function ( e ) {
	e.preventDefault();

	const now = Date.now();
	if( now - lastSearchAt < 1000 ) return;
	lastSearchAt = now;

	const raw = document.getElementById( "download-input" ).value.trim();
	const id = extractId( raw );
	const status = document.getElementById( "download-status" );
	const dlBtn = document.getElementById( "download-btn" );
	const searchBtn = document.getElementById( "search-btn" );

	track( "File Search" );
	status.textContent = "Searching...";
	status.className = "";
	dlBtn.classList.remove( "visible" );
	searchBtn.disabled = true;

	setTimeout( () => {
		searchBtn.disabled = false;
	}, 1000 );

	const xhr = new XMLHttpRequest();

	xhr.onload = function () {
		if( xhr.status === 200 ) {
			const info = JSON.parse( xhr.responseText );
			currentFileId = id;
			const mb = info.file_size / ( 1024 * 1024 );
			const sizeStr = mb >= 1 ? mb.toFixed( 1 ) + " MB" : ( info.file_size / 1024 ).toFixed( 1 ) + " KB";
			const minLeft = Math.max( 1, Math.ceil( info.time_remaining / 60 ) );
			status.textContent = info.file_name + " · " + sizeStr + " · " + minLeft + " min left";
			dlBtn.classList.add( "visible" );
			track( "File Found" );
		} else {
			status.className = "error";
			status.textContent =
				xhr.responseText.trim() || "Not found ( " + xhr.status + " )";
			dlBtn.classList.remove( "visible" );
			track( "File Not Found" );
		}
	};

	xhr.onerror = function () {
		status.className = "error";
		status.textContent = "Network error.";
	};

	xhr.open( "GET", API + "/status/" + id );
	xhr.send();
} );


document.getElementById( "download-btn" ).addEventListener( "click", function () {
	if( !currentFileId ) return;
	track( "File Downloaded" );
	window.location.href = API + "/download/" + currentFileId;
} );


( function () {
	const dropZone = document.querySelector( ".pane-tool" );
	let dragCounter = 0;

	dropZone.addEventListener( "dragenter", function ( e ) {
		if( !e.dataTransfer.types.includes( "Files" ) ) return;
		e.preventDefault();
		dragCounter++;
		dropZone.classList.add( "drag-active" );
	} );

	dropZone.addEventListener( "dragleave", function () {
		if( --dragCounter === 0 ) dropZone.classList.remove( "drag-active" );
	} );

	dropZone.addEventListener( "dragover", function ( e ) {
		e.preventDefault();
		e.dataTransfer.dropEffect = "copy";
	} );

	dropZone.addEventListener( "drop", function ( e ) {
		e.preventDefault();
		dragCounter = 0;
		dropZone.classList.remove( "drag-active" );

		const files = e.dataTransfer.files;
		if( !files.length ) return;

		showTab( "upload" );

		const dt = new DataTransfer();
		dt.items.add( files[ 0 ] );
		document.getElementById( "file-input" ).files = dt.files;
	} );
} )();


document.addEventListener( "paste", function ( e ) {
	const files = e.clipboardData?.files;
	if( !files?.length ) return;

	showTab( "upload" );

	const dt = new DataTransfer();
	dt.items.add( files[ 0 ] );
	document.getElementById( "file-input" ).files = dt.files;
} );


showTab( "upload" );

function showInstallTab( platform ) {
	[ 'mac', 'linux', 'windows' ].forEach( p => {
		document.getElementById( 'install-' + p ).classList.toggle( 'visible', p === platform );
		document.getElementById( 'itab-' + p ).classList.toggle( 'active', p === platform );
	} );
}

function copyInstall( platform ) {
	const text = document.getElementById( 'install-cmd-' + platform ).textContent;
	navigator.clipboard.writeText( text ).then( () => {
		track( 'Copy Install Command', { platform } );
		const btn = document.querySelector( '#install-' + platform + ' .cmd-copy' );
		const orig = btn.textContent;
		btn.textContent = 'copied';
		setTimeout( () => { btn.textContent = orig; }, 1200 );
	} );
}

( function () {
	const ua = navigator.userAgent;
	const pl = ( navigator.userAgentData?.platform || navigator.platform || '' ).toLowerCase();
	if( pl.includes( 'win' ) || ua.includes( 'Windows' ) ) {
		showInstallTab( 'windows' );
	} else if( !pl.includes( 'mac' ) && !ua.includes( 'Mac' ) ) {
		showInstallTab( 'linux' );
	} else {
		showInstallTab( 'mac' );
	}
} )();

( function () {
	function findAnchor( target ) {
		let el = target;
		for( let i = 0; i <= 3 && el; i++, el = el.parentNode ) {
			if( el.tagName?.toLowerCase() === "a" && el.href ) return el;
		}
		return null;
	}

	function handleClick( e ) {
		if( e.type === "auxclick" && e.button !== 1 ) return;
		const anchor = findAnchor( e.target );
		if( anchor && anchor.host && anchor.host !== location.host ) {
			window.umami?.track( "Outbound Link: Click", { url: anchor.href } );
		}
	}
	document.addEventListener( "click", handleClick );
	document.addEventListener( "auxclick", handleClick );

	function pageHeight() {
		const b = document.body || {}, d = document.documentElement || {};
		return Math.max(
			b.scrollHeight || 0, b.offsetHeight || 0,
			d.scrollHeight || 0, d.offsetHeight || 0, d.clientHeight || 0,
		);
	}

	let totalH = pageHeight();
	let maxScroll = ( window.scrollY || 0 ) + ( window.innerHeight || document.documentElement?.clientHeight || 0 );
	let activeStart = document.hasFocus() ? Date.now() : 0;
	let activeMs = 0;
	let sent = false;

	document.addEventListener( "scroll", () => {
		totalH = pageHeight();
		const reached = ( window.scrollY || 0 ) + ( window.innerHeight || document.documentElement?.clientHeight || 0 );
		if( reached > maxScroll ) maxScroll = reached;
	} );

	window.addEventListener( "load", () => { totalH = pageHeight(); } );

	function onFocusChange() {
		if( document.hasFocus() && document.visibilityState === "visible" ) {
			if( !activeStart ) activeStart = Date.now();
		} else {
			if( activeStart ) { activeMs += Date.now() - activeStart; activeStart = 0; }
			flush();
		}
	}
	document.addEventListener( "visibilitychange", onFocusChange );
	window.addEventListener( "blur", onFocusChange );
	window.addEventListener( "focus", onFocusChange );

	function flush() {
		if( sent ) return;
		const vp = window.innerHeight || document.documentElement?.clientHeight || 0;
		const sd = totalH <= vp ? 100 : Math.round( ( maxScroll / totalH ) * 100 );
		const elapsed = activeStart ? activeMs + ( Date.now() - activeStart ) : activeMs;
		if( elapsed < 0 ) return;
		sent = true;
		window.umami?.track( "engagement", { sd, e: elapsed } );
	}
} )();

