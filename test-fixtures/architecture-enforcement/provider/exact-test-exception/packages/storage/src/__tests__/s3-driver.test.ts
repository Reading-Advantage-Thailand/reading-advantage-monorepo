import { S3Client } from "@aws-sdk/client-s3";

/** Exact reviewed adapter test fixture that constructs an injected S3 client. */
export const exactTestClient = new S3Client({});
