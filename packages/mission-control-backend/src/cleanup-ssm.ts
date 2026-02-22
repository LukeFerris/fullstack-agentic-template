import {
  SSMClient,
  GetParametersByPathCommand,
  DeleteParameterCommand,
} from '@aws-sdk/client-ssm';
import { REGISTRY_PREFIX } from './types';

const ssm = new SSMClient({});

/**
 * Deletes all SSM parameters under the environment's namespace.
 * @param resourcePrefix - The environment resource prefix
 */
export async function deleteEnvironmentSsmParams(resourcePrefix: string): Promise<void> {
  const path = `/${resourcePrefix}/`;
  let nextToken: string | undefined;

  do {
    const result = await ssm.send(
      new GetParametersByPathCommand({ Path: path, Recursive: true, NextToken: nextToken })
    );
    for (const param of result.Parameters ?? []) {
      await ssm.send(new DeleteParameterCommand({ Name: param.Name! }));
    }
    nextToken = result.NextToken;
  } while (nextToken);
}

/**
 * Removes the environment's entry from the Mission Control registry.
 * @param resourcePrefix - The environment resource prefix
 */
export async function deleteRegistryEntry(resourcePrefix: string): Promise<void> {
  const name = `${REGISTRY_PREFIX}${resourcePrefix}`;
  try {
    await ssm.send(new DeleteParameterCommand({ Name: name }));
  } catch (err: unknown) {
    if ((err as { name?: string }).name !== 'ParameterNotFound') throw err;
  }
}
