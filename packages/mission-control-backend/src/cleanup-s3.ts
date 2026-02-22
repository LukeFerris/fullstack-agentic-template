import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  DeleteBucketCommand,
} from '@aws-sdk/client-s3';

const s3 = new S3Client({});

/**
 * Empties and deletes all S3 buckets matching the resource prefix.
 * @param resourcePrefix - The environment resource prefix
 */
export async function cleanupS3Buckets(resourcePrefix: string): Promise<void> {
  const { Buckets } = await s3.send(new ListBucketsCommand({}));
  const matching = (Buckets ?? []).filter(
    (b) => b.Name?.startsWith(`${resourcePrefix}-frontend-`)
  );

  for (const bucket of matching) {
    await emptyAndDeleteBucket(bucket.Name!);
  }
}

/**
 * Empties all objects from a bucket then deletes it.
 * @param bucketName - Name of the S3 bucket
 */
async function emptyAndDeleteBucket(bucketName: string): Promise<void> {
  let continuationToken: string | undefined;

  do {
    const listResult = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
      })
    );

    const objects = listResult.Contents ?? [];
    if (objects.length > 0) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: { Objects: objects.map((o) => ({ Key: o.Key })) },
        })
      );
    }
    continuationToken = listResult.NextContinuationToken;
  } while (continuationToken);

  await s3.send(new DeleteBucketCommand({ Bucket: bucketName }));
}
