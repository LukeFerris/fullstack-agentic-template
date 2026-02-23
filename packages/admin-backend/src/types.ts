/**
 * Represents a deployed environment
 */
export interface Environment {
  environmentId: string;
  projectName: string;
  frontendUrl: string;
  apiUrl: string;
  deployedAt: string;
  resources: ResourceInfo[];
}

/**
 * Represents an AWS resource in an environment
 */
export interface ResourceInfo {
  arn: string;
  resourceType: string;
  tags: Record<string, string>;
}

/**
 * Response from list environments endpoint
 */
export interface ListEnvironmentsResponse {
  environments: Environment[];
}

/**
 * Response from delete environment endpoint
 */
export interface DeleteEnvironmentResponse {
  success: boolean;
  environmentId: string;
  deletedResources: string[];
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  error: string;
  message: string;
}
