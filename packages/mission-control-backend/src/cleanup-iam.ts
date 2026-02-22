import {
  IAMClient,
  ListAttachedRolePoliciesCommand,
  DetachRolePolicyCommand,
  ListRolePoliciesCommand,
  DeleteRolePolicyCommand,
  DeleteRoleCommand,
  DeletePolicyCommand,
  ListPoliciesCommand,
} from '@aws-sdk/client-iam';

const iam = new IAMClient({});

/**
 * Detaches all policies from a role, then deletes the role.
 * @param resourcePrefix - The environment resource prefix
 */
export async function deleteIamRole(resourcePrefix: string): Promise<void> {
  const roleName = `${resourcePrefix}-lambda-role`;
  try {
    await detachManagedPolicies(roleName);
    await deleteInlinePolicies(roleName);
    await iam.send(new DeleteRoleCommand({ RoleName: roleName }));
  } catch (err: unknown) {
    if (!isNotFoundError(err)) throw err;
  }
}

/**
 * Detaches all managed policies from a role.
 * @param roleName - IAM role name
 */
async function detachManagedPolicies(roleName: string): Promise<void> {
  const { AttachedPolicies } = await iam.send(
    new ListAttachedRolePoliciesCommand({ RoleName: roleName })
  );
  for (const policy of AttachedPolicies ?? []) {
    await iam.send(
      new DetachRolePolicyCommand({ RoleName: roleName, PolicyArn: policy.PolicyArn! })
    );
  }
}

/**
 * Deletes all inline policies from a role.
 * @param roleName - IAM role name
 */
async function deleteInlinePolicies(roleName: string): Promise<void> {
  const { PolicyNames } = await iam.send(
    new ListRolePoliciesCommand({ RoleName: roleName })
  );
  for (const name of PolicyNames ?? []) {
    await iam.send(
      new DeleteRolePolicyCommand({ RoleName: roleName, PolicyName: name })
    );
  }
}

/**
 * Deletes the custom IAM policy for the environment.
 * @param resourcePrefix - The environment resource prefix
 */
export async function deleteIamPolicy(resourcePrefix: string): Promise<void> {
  const policyName = `${resourcePrefix}-lambda-ssm-read`;
  try {
    const { Policies } = await iam.send(
      new ListPoliciesCommand({ Scope: 'Local', MaxItems: 500 })
    );
    const match = (Policies ?? []).find((p) => p.PolicyName === policyName);
    if (match) {
      await iam.send(new DeletePolicyCommand({ PolicyArn: match.Arn! }));
    }
  } catch (err: unknown) {
    if (!isNotFoundError(err)) throw err;
  }
}

/**
 * Checks if an error is a not-found error from AWS.
 * @param err - The error to check
 * @returns True if the error indicates the resource was not found
 */
function isNotFoundError(err: unknown): boolean {
  const code = (err as { name?: string }).name ?? '';
  return code === 'NoSuchEntityException' || code === 'NotFoundException';
}
