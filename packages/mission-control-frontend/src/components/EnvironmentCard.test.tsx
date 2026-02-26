import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EnvironmentCard from './EnvironmentCard';
import type { Environment } from '../api';

const mockEnv: Environment = {
  environmentId: 'test-env-123',
  projectName: 'my-project',
  frontendUrl: 'https://d123.cloudfront.net',
  apiUrl: 'https://api123.execute-api.us-east-1.amazonaws.com/prod',
  deployedAt: '2026-01-15T10:00:00Z',
  resources: [
    { arn: 'arn:aws:s3:::bucket-1', resourceType: 's3', tags: {} },
    { arn: 'arn:aws:lambda:us-east-1:123:function:fn', resourceType: 'lambda', tags: {} },
    { arn: 'arn:aws:s3:::bucket-2', resourceType: 's3', tags: {} },
  ],
};

describe('EnvironmentCard', () => {
  it('should render environment details', () => {
    render(<EnvironmentCard environment={mockEnv} onDelete={vi.fn()} />);
    expect(screen.getByText('test-env-123')).toBeInTheDocument();
    expect(screen.getByText('my-project')).toBeInTheDocument();
    expect(screen.getByText('3 resources:')).toBeInTheDocument();
  });

  it('should render unique resource type badges', () => {
    render(<EnvironmentCard environment={mockEnv} onDelete={vi.fn()} />);
    expect(screen.getByText('s3')).toBeInTheDocument();
    expect(screen.getByText('lambda')).toBeInTheDocument();
  });

  it('should render frontend and API URLs as links', () => {
    render(<EnvironmentCard environment={mockEnv} onDelete={vi.fn()} />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBe(2);
    expect(links[0]).toHaveAttribute('href', mockEnv.frontendUrl);
    expect(links[1]).toHaveAttribute('href', mockEnv.apiUrl);
  });

  it('should call onDelete when delete is clicked', async () => {
    const onDelete = vi.fn();
    render(<EnvironmentCard environment={mockEnv} onDelete={onDelete} />);
    await userEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith(mockEnv);
  });
});
