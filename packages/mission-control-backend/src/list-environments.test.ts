import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSend } = vi.hoisted(() => {
  const mockSend = vi.fn();
  return { mockSend };
});

vi.mock('@aws-sdk/client-ssm', () => {
  class MockSSMClient { send = mockSend; }
  return {
    SSMClient: MockSSMClient,
    GetParametersByPathCommand: class { constructor(public input: unknown) {} },
  };
});

import { listEnvironments } from './list-environments';

beforeEach(() => vi.clearAllMocks());

describe('listEnvironments', () => {
  it('returns empty array when no parameters exist', async () => {
    mockSend.mockResolvedValueOnce({ Parameters: [] });

    const result = await listEnvironments();
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.environments).toEqual([]);
  });

  it('returns parsed environments sorted by deployedAt descending', async () => {
    const env1 = {
      environmentId: 'aaa', projectName: 'proj', frontendUrl: 'https://a',
      apiUrl: 'https://a-api', deployedAt: '2024-01-01T00:00:00Z', resourcePrefix: 'proj-aaa',
    };
    const env2 = {
      environmentId: 'bbb', projectName: 'proj', frontendUrl: 'https://b',
      apiUrl: 'https://b-api', deployedAt: '2024-06-01T00:00:00Z', resourcePrefix: 'proj-bbb',
    };

    mockSend.mockResolvedValueOnce({
      Parameters: [
        { Value: JSON.stringify(env1) },
        { Value: JSON.stringify(env2) },
      ],
    });

    const result = await listEnvironments();
    const body = JSON.parse(result.body);

    expect(body.environments[0].environmentId).toBe('bbb');
    expect(body.environments[1].environmentId).toBe('aaa');
  });

  it('handles pagination', async () => {
    const env1 = {
      environmentId: 'aaa', projectName: 'proj', frontendUrl: 'https://a',
      apiUrl: 'https://a-api', deployedAt: '2024-01-01T00:00:00Z', resourcePrefix: 'proj-aaa',
    };

    mockSend
      .mockResolvedValueOnce({
        Parameters: [{ Value: JSON.stringify(env1) }],
        NextToken: 'token1',
      })
      .mockResolvedValueOnce({ Parameters: [] });

    const result = await listEnvironments();
    const body = JSON.parse(result.body);

    expect(body.environments).toHaveLength(1);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('handles undefined Parameters and empty Value', async () => {
    mockSend.mockResolvedValueOnce({ Parameters: undefined });

    const result = await listEnvironments();
    const body = JSON.parse(result.body);
    expect(body.environments).toEqual([]);
  });

  it('skips parameters with no Value', async () => {
    mockSend.mockResolvedValueOnce({
      Parameters: [{ Name: '/mission-control/environments/x', Value: undefined }],
    });

    const result = await listEnvironments();
    const body = JSON.parse(result.body);
    expect(body.environments).toEqual([]);
  });
});
