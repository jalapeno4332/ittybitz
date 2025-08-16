# IttyBitz

This is a client-side file and text encryption tool built with Next.js and Firebase Studio. It offers a secure and private way to encrypt sensitive information directly in your browser without ever sending it to a server.

## Core Features

- **Client-Side Encryption/Decryption:** All cryptographic operations happen in your browser. Your files and secrets are never sent to a server.
- **File & Text Support:** Encrypt and decrypt both files and text snippets.
- **Password & Key File Protection:** Secure your data with a strong password, an optional key file, or both for an added layer of security.
- **No Accounts Required:** Works entirely without user accounts or sign-ins.

---

## How to Use IttyBitz

The tool has two main modes: **Encrypt** and **Decrypt**, which you can select using the tabs at the top. Within each mode, you can choose to work with either a **File** or **Text**.

### Encrypting a File

1.  Select the **Encrypt** tab.
2.  Ensure the **File** option is selected.
3.  Click the file selection area to choose a file from your device, or drag and drop a file onto it.
4.  Enter a strong password. The password field border will turn green when your password is at least 24 characters and includes uppercase letters, lowercase letters, numbers, and special characters.
5.  (Optional) For extra security, enable the **Use Key File** switch and select an additional file to be used as part of the key.
6.  Click the **Encrypt File** button.
7.  Your browser will download the encrypted file, which will have an `.ib` extension added to its original name.

### Decrypting a File

1.  Select the **Decrypt** tab.
2.  Ensure the **File** option is selected.
3.  Select the encrypted `.ib` file you want to decrypt.
4.  Enter the exact password that was used to encrypt the file.
5.  (Optional) If a key file was used during encryption, you must enable the **Use Key File** switch and select the exact same key file.
6.  Click the **Decrypt File** button.
7.  The original, decrypted file will be downloaded by your browser.

### Encrypting Text

1.  Select the **Encrypt** tab.
2.  Select the **Text** option.
3.  Type or paste your secret into the "Secret Text" area.
4.  Enter a strong password and, optionally, add a key file.
5.  Click the **Encrypt Text** button.
6.  The encrypted text (a long string of characters) will appear in the "Result" box below. Use the **Copy** button to copy it to your clipboard.

### Decrypting Text

1.  Select the **Decrypt** tab.
2.  Select the **Text** option.
3.  Paste the encrypted text you want to decrypt into the "Secret Text" area.
4.  Enter the password that was used to encrypt the text and provide the key file if one was used.
5.  Click the **Decrypt Text** button.
6.  The decrypted secret will appear in the "Result" box. For your privacy, the result is **blurred by default**. Click the **eyeball icon** to reveal the content.

---

## Security Features

The security of your data is the highest priority. Here is a summary of the security measures built into IttyBitz:

- **Client-Side Operations:** All encryption and decryption processes happen entirely within your browser. Your password, key files, and secret data are **never** transmitted over the internet or stored on any server.
- **Strong Encryption Standard:** IttyBitz uses **AES-256-GCM**, which is the standard for symmetric encryption recommended by the NSA for Top Secret information. It provides both confidentiality and data integrity.
- **Strong Key Derivation:** Your password is not used directly as the encryption key. Instead, it is run through the **PBKDF2** (Password-Based Key Derivation Function 2) algorithm with **1,000,000 iterations**. This makes brute-force attacks against your password extremely slow and computationally expensive, even for weak passwords.
- **Cryptographically Secure Randomness:** The application uses `window.crypto.getRandomValues()` to generate the salt for key derivation, the Initialization Vector (IV) for AES-GCM, and the random characters for the password generator. This is a cryptographically secure pseudo-random number generator (CSPRNG) that is suitable for security-sensitive applications.
- **Password Strength Indicator:** To encourage strong security practices, the UI provides real-time feedback, guiding users to create passwords that are at least 24 characters long and contain a mix of character types.
- **Secure Memory Handling:** After an encryption or decryption operation is complete, the application code makes an explicit effort to overwrite sensitive variables (like the derived key and salt) in memory, reducing the window of opportunity for sophisticated memory-scraping attacks.
- **No User Tracking:** The application does not use cookies, analytics, or trackers. Your activity is your own.

---
## 🔬 Third-Party Validation

### **Independent Security Review**
This application has undergone a detailed security analysis. You can view the full report here: [View Security Analysis Report](https://claude.ai/public/artifacts/f4bb6437-1130-4fd3-bc56-74b2399274f9)

### **Open Source Advantage**
- **Transparent code**: Every line of security code is publicly auditable
- **Community verified**: Security experts worldwide can review our implementation
- **No hidden backdoors**: Impossible to hide security vulnerabilities

### **Industry-Standard Compliance**
- **FIPS 140-2 compatible**: Meets US government encryption standards
- **NSA Suite B ready**: Compatible with top-tier government security requirements
- **GDPR privacy by design**: Built from the ground up for maximum privacy protection
