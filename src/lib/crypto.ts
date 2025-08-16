
"use client";

const PBKDF2_ITERATIONS = 1000000;
const SALT_LENGTH = 16; // bytes
const IV_LENGTH = 12; // bytes for AES-GCM

// Derive a key from password and/or keyfile using PBKDF2
async function deriveKey(password: string, salt: Uint8Array, keyFileData: ArrayBuffer | null): Promise<CryptoKey> {
  const passwordEncoder = new TextEncoder();
  let passwordBuffer = passwordEncoder.encode(password);
  
  // Combine password and keyfile data to form the base material for key derivation
  let baseMaterial = passwordBuffer;
  if (keyFileData) {
    const combined = new Uint8Array(baseMaterial.length + keyFileData.byteLength);
    combined.set(new Uint8Array(baseMaterial), 0);
    combined.set(new Uint8Array(keyFileData), baseMaterial.length);
    baseMaterial = combined;
  }
  
  const baseKey = await crypto.subtle.importKey(
    'raw',
    baseMaterial,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  // Clear sensitive intermediate buffers
  passwordBuffer.fill(0);
  if (baseMaterial !== passwordBuffer) {
      baseMaterial.fill(0);
  }

  return derivedKey;
}

/**
 * Encrypts a file buffer using a password and an optional key file.
 * @param dataBuffer The content of the file or text to encrypt.
 * @param password The password for encryption. Must not be empty.
 * @param keyFileBuffer Optional buffer from a key file.
 * @returns A promise that resolves with the encrypted data as an ArrayBuffer.
 */
export async function encryptFile(dataBuffer: ArrayBuffer, password: string, keyFileBuffer: ArrayBuffer | null): Promise<ArrayBuffer> {
  if (!password) {
    throw new Error("A password is required for encryption.");
  }
  
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  let key: CryptoKey | null = null;
  try {
    key = await deriveKey(password, salt, keyFileBuffer);

    const encryptedContent = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBuffer
    );

    // Prepend salt and IV to the encrypted content.
    const encryptedFile = new Uint8Array(salt.length + iv.length + encryptedContent.byteLength);
    encryptedFile.set(salt, 0);
    encryptedFile.set(iv, salt.length);
    encryptedFile.set(new Uint8Array(encryptedContent), salt.length + iv.length);

    return encryptedFile.buffer;
  } finally {
    // Clear sensitive data from memory
    salt.fill(0);
    iv.fill(0);
    if(keyFileBuffer) new Uint8Array(keyFileBuffer).fill(0);
    // While we can't directly clear the CryptoKey object, removing references helps GC.
    key = null;
  }
}

/**
 * Decrypts an encrypted file buffer using a password and an optional key file.
 * @param encryptedBuffer The content of the encrypted file (salt + IV + ciphertext).
 * @param password The password for decryption. Can be empty if a keyfile is provided.
 * @param keyFileBuffer Optional buffer from a key file.
 * @returns A promise that resolves with the decrypted data as an ArrayBuffer.
 * @throws Will throw an error if decryption fails.
 */
export async function decryptFile(encryptedBuffer: ArrayBuffer, password: string, keyFileBuffer: ArrayBuffer | null): Promise<ArrayBuffer> {
   if (!password && !keyFileBuffer) {
    throw new Error("A password or key file is required for decryption.");
  }
  
  const totalHeaderLength = SALT_LENGTH + IV_LENGTH;
  if (encryptedBuffer.byteLength <= totalHeaderLength) {
    throw new Error('Invalid encrypted data. Data is too short.');
  }

  const salt = new Uint8Array(encryptedBuffer.slice(0, SALT_LENGTH));
  const iv = new Uint8Array(encryptedBuffer.slice(SALT_LENGTH, totalHeaderLength));
  const encryptedContent = new Uint8Array(encryptedBuffer.slice(totalHeaderLength));

  let key: CryptoKey | null = null;
  try {
    key = await deriveKey(password, salt, keyFileBuffer);
    const decryptedContent = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedContent
    );
    return decryptedContent;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Decryption failed. The password or key file may be incorrect, or the data may be corrupted.');
  } finally {
    // Clear sensitive data from memory
    salt.fill(0);
    iv.fill(0);
    if(keyFileBuffer) new Uint8Array(keyFileBuffer).fill(0);
    // While we can't directly clear the CryptoKey object, removing references helps GC.
    key = null;
  }
}

    