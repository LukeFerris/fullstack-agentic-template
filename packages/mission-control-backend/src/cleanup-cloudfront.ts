import {
  CloudFrontClient,
  ListDistributionsCommand,
  GetDistributionConfigCommand,
  UpdateDistributionCommand,
  ListOriginAccessControlsCommand,
  DeleteOriginAccessControlCommand,
  GetOriginAccessControlCommand,
} from '@aws-sdk/client-cloudfront';

const cf = new CloudFrontClient({});

/**
 * Disables CloudFront distributions matching the resource prefix.
 * Full deletion requires waiting for the disabled state, so we only disable here.
 * @param resourcePrefix - The environment resource prefix
 */
export async function disableCloudFrontDistributions(resourcePrefix: string): Promise<void> {
  const comment = `${resourcePrefix} frontend`;
  const { DistributionList } = await cf.send(new ListDistributionsCommand({}));
  const items = DistributionList?.Items ?? [];
  const matching = items.filter((d) => d.Comment === comment);

  for (const dist of matching) {
    if (dist.Enabled) {
      await disableDistribution(dist.Id!);
    }
  }
}

/**
 * Disables a single CloudFront distribution.
 * @param distributionId - The distribution ID
 */
async function disableDistribution(distributionId: string): Promise<void> {
  const { DistributionConfig, ETag } = await cf.send(
    new GetDistributionConfigCommand({ Id: distributionId })
  );
  if (!DistributionConfig || !ETag) return;

  DistributionConfig.Enabled = false;
  await cf.send(
    new UpdateDistributionCommand({
      Id: distributionId,
      DistributionConfig,
      IfMatch: ETag,
    })
  );
}

/**
 * Deletes CloudFront OACs matching the resource prefix.
 * @param resourcePrefix - The environment resource prefix
 */
export async function deleteCloudFrontOACs(resourcePrefix: string): Promise<void> {
  const oacName = `${resourcePrefix}-frontend-oac`;
  const { OriginAccessControlList } = await cf.send(
    new ListOriginAccessControlsCommand({})
  );
  const items = OriginAccessControlList?.Items ?? [];
  const matching = items.filter((o) => o.Name === oacName);

  for (const oac of matching) {
    const { ETag } = await cf.send(
      new GetOriginAccessControlCommand({ Id: oac.Id! })
    );
    await cf.send(
      new DeleteOriginAccessControlCommand({ Id: oac.Id!, IfMatch: ETag! })
    );
  }
}
