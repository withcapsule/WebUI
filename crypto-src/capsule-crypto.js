// Capsule WebUI crypto module.
//
// Bundled (esbuild) into public/vendor/capsule-crypto.js and exposed on the page
// as `window.CapsuleCrypto`. Self-hosted on purpose: this code handles the
// passphrase and the plaintext, so it must not be fetched from a third-party CDN.
//
// Interop contract (must match the CLI `age` and Android `kage`):
//   - age v1, BINARY format, scrypt passphrase recipient
//   - passphrase = 12-word English BIP39 mnemonic, single-space joined, UTF-8
//   - scrypt work factor is written into the file, so decrypt auto-reads it

import { Encrypter, Decrypter } from "age-encryption";
import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

// Canonical 12-word English mnemonic (single spaces) — matches the CLI's
// `mnemonic.to_string()` and Android's `words.joinToString(" ")`.
export function makeMnemonic() {
	return generateMnemonic( wordlist, 128 );
}

// Collapse whitespace the way Android does on decrypt, so a phrase pasted with
// stray spaces / newlines still matches a canonically-encrypted file.
export function normalize( phrase ) {
	return phrase.trim().replace( /\s+/g, " " );
}

// Encrypt bytes (Uint8Array) with the mnemonic passphrase.
// Returns binary age (Uint8Array), interoperable with the reference age impls.
export async function encryptFile( bytes, mnemonic ) {
	const e = new Encrypter();
	e.setPassphrase( normalize( mnemonic ) );
	return await e.encrypt( bytes );
}

// Decrypt binary age bytes with the mnemonic. Throws on a wrong passphrase.
export async function decryptFile( bytes, mnemonic ) {
	const d = new Decrypter();
	d.addPassphrase( normalize( mnemonic ) );
	return await d.decrypt( bytes, "uint8array" );
}
