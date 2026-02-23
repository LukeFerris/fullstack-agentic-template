import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handler } from './authorizer';
import type { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

vi.mock('aws-jwt-verify');

describe('Cognito Authorizer', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      USER_POOL_ID: 'us-east-1_testpool',
      CLIENT_ID: 'test-client-id',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  /**
   * Test helper to create a mock authorizer event
   * @param authHeader - Authorization header value
   * @returns Mock authorizer event
   */
  function createMockEvent(
    authHeader?: string
  ): APIGatewayRequestAuthorizerEvent {
    return {
      type: 'REQUEST',
      methodArn: 'arn:aws:execute-api:us-east-1:123456789:api/prod/GET/admin/environments',
      headers: authHeader ? { Authorization: authHeader } : {},
      resource: '',
      path: '',
      httpMethod: 'GET',
      queryStringParameters: null,
      pathParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayRequestAuthorizerEvent['requestContext'],
      multiValueHeaders: {},
      multiValueQueryStringParameters: null,
    };
  }

  it('should deny access when no authorization header is provided', async () => {
    const event = createMockEvent();
    const response = await handler(event);

    expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
    expect(response.principalId).toBe('unknown');
  });

  it('should deny access when authorization header is empty', async () => {
    const event = createMockEvent('Bearer ');
    const response = await handler(event);

    expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
  });

  it('should handle lowercase authorization header', async () => {
    const event: APIGatewayRequestAuthorizerEvent = {
      ...createMockEvent(),
      headers: { authorization: 'Bearer test-token' },
    };

    const response = await handler(event);

    expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
  });

  it('should allow access for valid token', async () => {
    const mockVerify = vi.fn().mockResolvedValue({ sub: 'user-123' });
    vi.mocked(CognitoJwtVerifier.create).mockReturnValue({ verify: mockVerify } as any);

    const event = createMockEvent('Bearer valid-token');
    const response = await handler(event);

    expect(mockVerify).toHaveBeenCalledWith('valid-token');
    expect(response.principalId).toBe('user-123');
    expect(response.policyDocument.Statement[0].Effect).toBe('Allow');
    expect(response.policyDocument.Statement[0].Resource).toBe(event.methodArn);
  });

  it('should deny access when USER_POOL_ID is missing', async () => {
    delete process.env.USER_POOL_ID;

    const event = createMockEvent('Bearer token');
    const response = await handler(event);

    expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
  });

  it('should deny access when CLIENT_ID is missing', async () => {
    delete process.env.CLIENT_ID;

    const event = createMockEvent('Bearer token');
    const response = await handler(event);

    expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
  });

  it('should deny access when token verification fails', async () => {
    const mockVerify = vi.fn().mockRejectedValue(new Error('Invalid token'));
    vi.mocked(CognitoJwtVerifier.create).mockReturnValue({ verify: mockVerify } as any);

    const event = createMockEvent('Bearer invalid-token');
    const response = await handler(event);

    expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
  });

  it('should create verifier with correct parameters', async () => {
    const mockCreate = vi.mocked(CognitoJwtVerifier.create);
    const mockVerify = vi.fn().mockResolvedValue({ sub: 'user-123' });
    mockCreate.mockReturnValue({ verify: mockVerify } as any);

    const event = createMockEvent('Bearer token');
    await handler(event);

    expect(mockCreate).toHaveBeenCalledWith({
      userPoolId: 'us-east-1_testpool',
      clientId: 'test-client-id',
      tokenUse: 'id',
    });
  });

  it('should strip Bearer prefix case-insensitively', async () => {
    const mockVerify = vi.fn().mockResolvedValue({ sub: 'user-123' });
    vi.mocked(CognitoJwtVerifier.create).mockReturnValue({ verify: mockVerify } as any);

    const event = createMockEvent('bearer lowercase-token');
    await handler(event);

    expect(mockVerify).toHaveBeenCalledWith('lowercase-token');
  });

  it('should allow token without Bearer prefix', async () => {
    const mockVerify = vi.fn().mockResolvedValue({ sub: 'user-123' });
    vi.mocked(CognitoJwtVerifier.create).mockReturnValue({ verify: mockVerify } as any);

    const event = createMockEvent('raw-token-without-bearer');
    const response = await handler(event);

    expect(mockVerify).toHaveBeenCalledWith('raw-token-without-bearer');
    expect(response.policyDocument.Statement[0].Effect).toBe('Allow');
  });

  it('should return correct policy document structure', async () => {
    const mockVerify = vi.fn().mockResolvedValue({ sub: 'user-456' });
    vi.mocked(CognitoJwtVerifier.create).mockReturnValue({ verify: mockVerify } as any);

    const event = createMockEvent('Bearer valid-token');
    const response = await handler(event);

    expect(response.policyDocument).toEqual({
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: event.methodArn,
        },
      ],
    });
  });
});
