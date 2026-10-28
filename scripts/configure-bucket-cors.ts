/**
 * Lets browsers upload straight to the bucket from this app's own origins.
 *
 * Runs before `next build` on Vercel (the `vercel-build` script), where the
 * AWS S3 integration's role credentials exist; they are never available
 * locally. It is idempotent, and a missing role or permission only logs a
 * warning so a deploy is never blocked by it.
 */
import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";

const roleArn = process.env.AWS_ROLE_ARN;
const bucket = process.env.S3_BUCKET ?? process.env.S3_BUCKET_NAME;

function origins(): string[] {
  const list = new Set<string>();
  if (process.env.BETTER_AUTH_URL) list.add(new URL(process.env.BETTER_AUTH_URL).origin);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) list.add(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  // Preview deployments of this project only, e.g. ledgerlens-abc123-team.vercel.app.
  const project = process.env.VERCEL_PROJECT_PRODUCTION_URL?.split(".")[0]?.replace(/-[a-z0-9]+$/, "");
  const team = process.env.VERCEL_URL?.split(".")[0]?.split("-").slice(-2).join("-");
  if (project && team) list.add(`https://${project}-*-${team}.vercel.app`);
  return [...list];
}

async function main() {
  if (!roleArn || !bucket) {
    console.log("[cors] No AWS S3 integration role; skipping bucket CORS.");
    return;
  }
  const allowed = origins();
  if (allowed.length === 0) {
    console.warn("[cors] No app origin known; skipping bucket CORS.");
    return;
  }
  const s3 = new S3Client({ region: process.env.AWS_REGION, credentials: awsCredentialsProvider({ roleArn }) });
  await s3.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          { AllowedOrigins: allowed, AllowedMethods: ["PUT"], AllowedHeaders: ["content-type"], MaxAgeSeconds: 3600 },
        ],
      },
    }),
  );
  console.log(`[cors] Browser uploads allowed from: ${allowed.join(", ")}`);
}

main().catch((err) => {
  console.warn(`[cors] Could not set bucket CORS (${err instanceof Error ? err.name : "error"}); uploads may be blocked.`);
});
