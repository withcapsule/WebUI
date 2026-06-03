const API = "https://filemover.byseansingh.com";

let currentFileId = "";
let lastUploadAt = 0;
let lastSearchAt = 0;

function showTab( name ) {
	document.getElementById( "section-upload" ).classList.toggle( "visible", name === "upload" );
	document.getElementById( "section-download" ).classList.toggle( "visible", name === "download" );
	document.getElementById( "tab-upload" ).classList.toggle( "active", name === "upload" );
	document.getElementById( "tab-download" ).classList.toggle( "active", name === "download" );
}

function extractId( input ) {
	const i = input.lastIndexOf( "/download/" );

	if( i !== -1 ) {
		const after = input.slice( i + "/download/".length ).replace( /\/$/, "" );
		return after || input;
	}

	return input.trim();
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
	progress.value = 0;
	progress.classList.add( "visible" );
	btn.disabled = true;

	const form = new FormData( this );
	const xhr = new XMLHttpRequest();

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
			} else {
				status.textContent = text.trim();
			}
		} else {
			status.className = "error";
			status.textContent =
				xhr.responseText.trim() || "Upload failed ( " + xhr.status + " )";
		}
	};

	xhr.onerror = function () {
		progress.classList.remove( "visible" );
		btn.disabled = false;
		status.className = "error";
		status.textContent = "Network error.";
	};

	const startTime = Date.now();
	xhr.open( "POST", API + "/html_upload_processor" );
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

	status.textContent = "Searching...";
	status.className = "";
	dlBtn.classList.remove( "visible" );
	searchBtn.disabled = true;

	setTimeout( () => {
		searchBtn.disabled = false;
	}, 1000 );

	const form = new FormData();
	form.append( "file_download_field", id );

	const xhr = new XMLHttpRequest();

	xhr.onload = function () {
		if( xhr.status === 200 ) {
			currentFileId = id;
			status.textContent = xhr.responseText.trim();
			dlBtn.classList.add( "visible" );
		} else {
			status.className = "error";
			status.textContent =
				xhr.responseText.trim() || "Not found ( " + xhr.status + " )";
			dlBtn.classList.remove( "visible" );
		}
	};

	xhr.onerror = function () {
		status.className = "error";
		status.textContent = "Network error.";
	};

	xhr.open( "POST", API + "/html_download_processor" );
	xhr.send( form );
} );


document.getElementById( "download-btn" ).addEventListener( "click", function () {
	if( !currentFileId ) return;
	window.location.href = API + "/download/" + currentFileId;
} );


function copyFileId() {
	const id = document.getElementById( "file-id-text" ).textContent;
	if( !id ) return;
	navigator.clipboard.writeText( id ).then( () => {
		const btn = document.getElementById( "copy-btn" );
		const orig = btn.textContent;
		btn.textContent = "Copied";
		setTimeout( () => {
			btn.textContent = orig;
		}, 1200 );
	} );
}

showTab( "upload" );
