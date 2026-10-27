import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NoSuchKey,
  NotFound,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Object storage for uploaded documents. Cloudflare R2 in production; any
 * S3-compatible store works (docker-compose runs S3Mock for local dev).
 */
const client = new S3Client({
  region: process.env.S3_REGION ?? "auto",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
  // Only send checksums S3 itself requires; not every S3-compatible store accepts the newer defaults.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const bucket = () => {
  const name = process.env.S3_BUCKET;
  if (!name) throw new Error("S3_BUCKET is not set");
  return name;
};

/** Keys never contain the original file name, which is user input. */
export function newObjectKey(userId: string): string {
  return `users/${userId}/${crypto.randomUUID()}`;
}

/** A short-lived URL the browser PUTs the file to, so uploads never pass through the app. */
export function presignUpload(key: string, contentType: string): Promise<string> {
  return getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }),
    { expiresIn: 600 },
  );
}

/** What actually landed in storage, or null if nothing did. */
export async function headObject(key: string): Promise<{ size: number; contentType: string } | null> {
  try {
    const res = await client.send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return { size: res.ContentLength ?? 0, contentType: res.ContentType ?? "" };
  } catch (err) {
    if (err instanceof NotFound || err instanceof NoSuchKey) return null;
    throw err;
  }
}

/** Returns null when the object doesn't exist. */
export async function getObject(key: string): Promise<Uint8Array | null> {
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    return res.Body ? await res.Body.transformToByteArray() : null;
  } catch (err) {
    if (err instanceof NoSuchKey) return null;
    throw err;
  }
}

export async function deleteObject(key: string) {
  await client.send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}
