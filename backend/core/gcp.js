import { Storage } from "@google-cloud/storage";
import vision from "@google-cloud/vision";
import path from "path";
import { getSecret, requireSecret } from "./config.js";

let storageSingleton;
let visionSingleton;

export function getStorage() {
  if (!storageSingleton) {
    const projectId = requireSecret("GOOGLE_CLOUD_PROJECT_ID");
    const keyFile = getSecret("GOOGLE_CLOUD_KEY_FILE");
    storageSingleton = new Storage(
      keyFile ? { projectId, keyFilename: keyFile } : { projectId }
    );
  }
  return storageSingleton;
}

export function getVision() {
  if (!visionSingleton) {
    const keyFile = getSecret("GOOGLE_CLOUD_KEY_FILE");
    const options = keyFile ? { keyFilename: keyFile } : {};
    visionSingleton = new vision.ImageAnnotatorClient(options);
  }
  return visionSingleton;
}

export async function uploadBufferToBucket({ buffer, contentType, destPath }) {
  const bucketName = requireSecret("GCS_UPLOADS_BUCKET");
  const storage = getStorage();
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(destPath);
  await file.save(buffer, { metadata: { contentType }, resumable: false, public: true });
  const publicUrl = `https://storage.googleapis.com/${bucketName}/${destPath}`;
  return { bucketName, fileName: destPath, publicUrl, contentType, size: buffer.length };
}

export async function uploadBufferToAssets({ buffer, contentType, destPath }) {
  const bucketName = requireSecret("GCS_ASSETS_BUCKET");
  const storage = getStorage();
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(destPath);
  await file.save(buffer, { metadata: { contentType }, resumable: false, public: true });
  const publicUrl = `https://storage.googleapis.com/${bucketName}/${destPath}`;
  return { bucketName, fileName: destPath, publicUrl, contentType, size: buffer.length };
}

export async function createSignedUploadUrl({ contentType, prefix = "uploads", ext = "" }) {
  const bucketName = requireSecret("GCS_UPLOADS_BUCKET");
  const storage = getStorage();
  const bucket = storage.bucket(bucketName);
  const safeExt = ext ? (ext.startsWith(".") ? ext : `.${ext}`) : "";
  const objectPath = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`;
  const file = bucket.file(objectPath);
  const expiresAt = Date.now() + 15 * 60 * 1000;
  const [uploadUrl] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: expiresAt,
    contentType,
  });
  const publicUrl = `https://storage.googleapis.com/${bucketName}/${objectPath}`;
  return { uploadUrl, publicUrl, objectPath, expiresAt };
}

export async function classifyImageFromUrl(url) {
  const client = getVision();
  const [result] = await client.annotateImage({
    image: { source: { imageUri: url } },
    features: [
      { type: "SAFE_SEARCH_DETECTION" },
      { type: "FACE_DETECTION" },
      { type: "IMAGE_PROPERTIES" },
      { type: "OBJECT_LOCALIZATION" },
    ],
  });
  return result;
}

export function decideAssetType(visionResult) {
  // Heuristic placeholder
  const hasFaces = (visionResult.faceAnnotations || []).length > 0;
  return hasFaces ? "illustration" : "toon";
}


