# IttyBitz Security Audit

**Date:** March 14, 2026
**Scope:** Full codebase review of IttyBitz v1.3.0 (client-side encryption tool)
**Files reviewed:** `src/lib/crypto.ts`, `src/components/encryptor-tool.tsx`, `src/app/layout.tsx`, `next.config.js`, `package.json`, `README.md`

---

## Summary

IttyBitz is a well-intentioned client-side encryption tool with a solid cryptographic core. The choice of AES-256-GCM, a high PBKDF2 iteration count, proper IV/salt generation via CSPRNG, and input validation all reflect good security thinking. That said, the review identified several issues ranging from a privacy-undermining external dependency to misleading documentation claims. None of these are catastrophic "your data is compromised" bugs, but several are worth addressing — especially the ones that erode the trust the app is working hard to build.

Findings are grouped by severity below.

---

## High Severity

### 1. Google Fonts loading contradicts core privacy promise

**Location:** `src/app/layout.tsx`, lines 19–20

The app loads fonts from `fonts.googleapis.com` and `fonts.gstatic.com` on every page load. This sends the user's IP address, browser fingerprint, and referrer header to Google's servers.

This directly contradicts the README's claims that "your files and secrets are never transmitted over the internet", "no user tracking", and the UI's "Nothing leaves your browser. No servers, no uploads, no tracking." While the encryption keys aren't sent, the fact that the user *visited* this encryption tool is leaked to Google on every page load — which is meaningful for a privacy tool.

**Recommendation:** Self-host the Inter font or use system fonts (`font-family: system-ui, -apple-system, sans-serif`). For a tool whose entire value proposition is privacy, no external requests should be made.

---

## Medium Severity

### 2. Misleading compliance and certification claims in README

**Location:** `README.md`, lines 80–83

The README claims "FIPS 140-2 compatible", "NSA Suite B ready", and "GDPR privacy by design". These are formal standards/certifications that require validation processes, audits, and in the case of FIPS 140-2, testing by an accredited lab. A web application cannot claim these without going through those processes. Using FIPS-approved *algorithms* (AES-256, PBKDF2) is not the same as being FIPS-certified.

**Recommendation:** Replace with accurate language like "Uses FIPS-approved algorithms (AES-256-GCM, PBKDF2)" and remove the certification claims entirely.

### 3. Secure memory erasure is largely ineffective in JavaScript

**Location:** `src/lib/crypto.ts`, `secureErase()` function and the README's "Secure memory handling" claim

The `secureErase` function performs 3-pass random overwrites followed by a zero-fill on ArrayBuffers. While well-intentioned, JavaScript's garbage collector can copy buffer contents to new memory locations at any time, JIT compilers may optimize away writes to "dead" buffers, and the `TextEncoder.encode()` call on line 64 creates intermediate copies the app never erases. The function provides a false sense of security — the data it's trying to protect may exist in multiple places in the heap that the app cannot reach.

Additionally, the fallback on line 23 uses `Math.random()` (which is not cryptographically secure) when `crypto.getRandomValues` is unavailable. If crypto isn't available, the app should refuse to run entirely (which it does check elsewhere), making this fallback dead code that could mask a serious state.

**Recommendation:** Keep the erasure as a best-effort measure but don't market it as a security feature. Update the README to say something like "best-effort memory clearing (limited by JavaScript runtime constraints)". Remove the `Math.random()` fallback — if the CSPRNG isn't available, the function should throw or no-op.

### 4. No format version identifier in encrypted output

**Location:** `src/lib/crypto.ts`, `encryptFile()` lines 146–149

The encrypted output format is `salt (16 bytes) || IV (12 bytes) || ciphertext`. There is no magic number, version byte, or format identifier. This means:

- If the algorithm, iteration count, or parameters ever change, there's no way to detect which version produced a given file.
- A wrong-format file (say a random binary file) given to decrypt will produce a generic "decryption failed" error indistinguishable from a wrong password, which is confusing for users.

**Recommendation:** Prepend a short header like `IBTZ\x01` (magic bytes + version) to the encrypted output. This costs 5 bytes, enables format evolution, and improves error messages.

### 5. PBKDF2 instead of a memory-hard KDF

**Location:** `src/lib/crypto.ts`, line 3 and `deriveKey()`

PBKDF2-HMAC-SHA-256 with 1,000,000 iterations is acceptable and meets current OWASP recommendations. However, it is not resistant to GPU or ASIC-based attacks the way memory-hard KDFs like Argon2id or scrypt are. For a tool that targets security-conscious users protecting sensitive files, this is a meaningful gap.

**Recommendation:** This is a "good vs. better" issue, not a vulnerability. Consider migrating to Argon2id if/when browser support allows. If sticking with PBKDF2, document the rationale.

---

## Low Severity

### 6. Clipboard auto-clear is unreliable

**Location:** `src/components/encryptor-tool.tsx`, lines 329–339

The app promises users "Clipboard will auto-clear in 60 seconds" but the implementation reads the clipboard back to verify the content hasn't changed before clearing. This requires `clipboard-read` permission, which browsers may deny silently if the tab isn't focused. The `catch` block on line 335 silently swallows the failure, meaning the user thinks their sensitive data was cleared when it may not have been.

**Recommendation:** Change the toast message to "Clipboard will auto-clear in 60 seconds (best-effort)" or remove the promise entirely and just attempt the clear silently.

### 7. Side-effect mutation of caller's keyFileBuffer

**Location:** `src/lib/crypto.ts`, lines 158 and 214

Both `encryptFile` and `decryptFile` call `secureErase(keyFileBuffer)` in their `finally` blocks, zeroing out the buffer that was passed in by the caller. This is a side effect — the caller's reference now points to all-zeros. If the UI ever needed to reuse the keyfile buffer (e.g., for batch operations), it would silently fail. Currently the app doesn't reuse it, so this is theoretical, but it violates the principle of least surprise.

**Recommendation:** Either document this behavior clearly or clone the buffer internally before erasing.

### 8. Version mismatch between package.json and UI

**Location:** `package.json` line 3 vs. `src/components/encryptor-tool.tsx` line 827

`package.json` declares version `1.3.0` while the footer in the UI displays `v1.4.0`. For a security tool, version accuracy matters — users checking which version they're running will get conflicting answers.

**Recommendation:** Keep versions in sync. Consider deriving the UI version from `package.json` at build time.

### 9. Error message sanitization is fragile

**Location:** `src/components/encryptor-tool.tsx`, lines 477–479

The error handler checks if the error message contains "decrypt" or "corrupted" keywords to decide whether to show a generic message. Any other error message passes through directly, which could leak implementation details (e.g., Web Crypto API error strings, stack traces from certain browsers).

**Recommendation:** Default to a generic error message for all processing failures and only show specific messages for known, safe error strings.

---

## Informational / Nitpicks

### 10. No Content Security Policy

Since the app is a static export, CSP must be configured at the hosting level. The `CNAME` points to `ittybitz.app` — wherever that's hosted should enforce a strict CSP that blocks inline scripts and restricts `connect-src`, `font-src`, etc. This is outside the app's codebase but worth noting for deployment.

### 11. Unnecessary remote image pattern in next.config.js

`next.config.js` allows remote images from `placehold.co`. This appears to be leftover configuration and isn't used by the app. Remove it to reduce the configuration surface.

### 12. "No External Dependencies" claim in README

The README states "No External Dependencies: All cryptographic operations happen locally." While true for cryptographic operations specifically, the app does make external network requests (Google Fonts). The claim should be more precise or the external requests should be removed (see Finding #1).

---

## What the app does well

It's worth calling out the things this codebase gets right, because there are several:

- AES-256-GCM is the correct choice for authenticated encryption.
- 1,000,000 PBKDF2 iterations is at the high end of current recommendations.
- All randomness uses `crypto.getRandomValues()` — no `Math.random()` in any security path.
- The password generator uses rejection sampling to avoid modulo bias (lines 302–311 in encryptor-tool.tsx). This is a subtle detail that most implementations get wrong.
- Input validation is thorough: null byte checks, file size limits, path traversal prevention, password length bounds.
- The CryptoKey is created with `extractable: false`, preventing key export via the Web Crypto API.
- Error messages on decryption failure are deliberately generic to prevent oracle attacks.
- The app is a static export with no server-side code, eliminating an entire class of vulnerabilities.
