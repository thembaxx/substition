import { validateWorkspace, type Workspace } from "./subscriptions";

export type Envelope = {
  version: 1;
  algorithm: "AES-GCM";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
};
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const decode = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
const buffer = (bytes: Uint8Array) =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
export async function deriveKey(password: string, salt: Uint8Array, iterations = 310000) {
  if (password.length < 10 || password.length > 256)
    throw new Error("Use a passphrase between 10 and 256 characters.");
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: buffer(salt), iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function encryptWorkspace(
  workspace: Workspace,
  key: CryptoKey,
  salt: Uint8Array,
  iterations = 310000,
): Promise<Envelope> {
  validateWorkspace(workspace);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: buffer(iv) },
    key,
    new TextEncoder().encode(JSON.stringify(workspace)),
  );
  // Chunk conversion avoids call-stack limits for large workspaces.
  let binary = "";
  for (const byte of new Uint8Array(encrypted)) binary += String.fromCharCode(byte);
  return {
    version: 1,
    algorithm: "AES-GCM",
    iterations,
    salt: encode(salt),
    iv: encode(iv),
    ciphertext: btoa(binary),
  };
}
export function validateEnvelope(value: unknown): Envelope {
  const e = value as Envelope;
  if (
    !e ||
    e.version !== 1 ||
    e.algorithm !== "AES-GCM" ||
    e.iterations !== 310000 ||
    typeof e.ciphertext !== "string" ||
    e.ciphertext.length > 8e6 ||
    typeof e.salt !== "string" ||
    typeof e.iv !== "string" ||
    decode(e.salt).length !== 16 ||
    decode(e.iv).length !== 12
  )
    throw new Error("This is not a supported Substition encrypted backup.");
  return e;
}
export async function unlockWorkspace(envelope: Envelope, password: string) {
  validateEnvelope(envelope);
  const salt = decode(envelope.salt);
  const key = await deriveKey(password, salt, envelope.iterations);
  let data: ArrayBuffer;
  try {
    data = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: buffer(decode(envelope.iv)) },
      key,
      buffer(decode(envelope.ciphertext)),
    );
  } catch {
    throw new Error("That passphrase did not unlock this vault, or the backup is damaged.");
  }
  return { workspace: validateWorkspace(JSON.parse(new TextDecoder().decode(data))), key, salt };
}
async function db() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("substition-vault", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("vault");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("Browser storage is unavailable. Your changes could not be saved."));
  });
}
export async function readVault(): Promise<Envelope | undefined> {
  const database = await db();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction("vault").objectStore("vault").get("workspace");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}
export async function writeVault(envelope: Envelope | null) {
  const database = await db();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("vault", "readwrite");
      const store = transaction.objectStore("vault");
      if (envelope) store.put(envelope, "workspace");
      else store.delete("workspace");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(new Error("Could not save to this device. Export a backup before closing."));
      transaction.onabort = () => reject(new Error("Storage transaction was interrupted."));
    });
  } finally {
    database.close();
  }
}
