# Capsule Web UI

This is the simple browser client for Capsule. It provides a public upload and download interface backed by the Capsule server API.

## What is here

- `index.html` - the page shell
- `style.css` - styling
- `scripts.js` - upload, download, QR generation, and client behavior
- `worker.js` - Cloudflare Worker used for analytics proxying

## Local use

This project is static. You can serve it with any simple HTTP server.

Example:

```sh
python3 -m http.server
```

Then open the served page in a browser.

## Server endpoint

The UI currently talks to:

```js
const API = "https://send.withcapsule.dev";
```

If you self-host Capsule, update that value in `scripts.js` to point at your own server.

## Notes

- the public-facing hosted site is `https://withcapsule.dev`
- the direct API host is `https://send.withcapsule.dev`
- the UI uses the HTML upload and download helper endpoints exposed by the server
