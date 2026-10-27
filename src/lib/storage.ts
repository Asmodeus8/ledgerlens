import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

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

export async function putObject(key: string, body: Uint8Array, contentType: string) {
  await client.send(
    new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }),
  );
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
