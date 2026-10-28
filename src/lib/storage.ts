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
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";

/**
 * Object storage for uploaded documents. On Vercel with the AWS S3
 * integration, credentials come from the integration's IAM role via OIDC;
 * otherwise from static keys, so Cloudflare R2 or any S3-compatible store
 * works too (docker-compose runs S3Mock for local dev).
 */
const roleArn = process.env.AWS_ROLE_ARN;

const client = new S3Client({
  region: process.env.S3_REGION ?? process.env.AWS_REGION ?? "auto",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: roleArn
    ? awsCredentialsProvider({ roleArn })
    : {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
      },
  // Only send checksums S3 itself requires; not every S3-compatible store accepts the newer defaults.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const bucket = () => {
  const name = process.env.S3_BUCKET ?? process.env.S3_BUCKET_NAME;
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
