import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteDialog from './DeleteDialog';
import * as apiModule from '../api';
import type { Environment } from '../api';

const mockEnv: Environment = {
  environmentId: 'test-env',
  projectName: 'my-project',
  frontendUrl: 'https://test.cloudfront.net',
  apiUrl: 'https://api.test.com',
  deployedAt: '2026-01-01',
  resources: [
    { arn: 'arn:1', resourceType: 's3', tags: {} },
    { arn: 'arn:2', resourceType: 'lambda', tags: {} },
  ],
};

/**
 * Helper to get the delete confirmation button (not the heading)
 * @returns The delete button element
 */
function getDeleteButton(): HTMLElement {
  return screen.getByRole('button', { name: /delete environment/i });
}

describe('DeleteDialog', () => {
  const onAuthExpired = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    onAuthExpired.mockClear();
  });

  it('should render confirmation dialog', () => {
    render(
      <DeleteDialog
        environment={mockEnv}
        onClose={vi.fn()}
        onDeleted={vi.fn()}
        onAuthExpired={onAuthExpired}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Delete Environment' })).toBeInTheDocument();
    expect(screen.getByText(/test-env/)).toBeInTheDocument();
    expect(screen.getByText(/2 resources/)).toBeInTheDocument();
  });

  it('should call onClose when cancel is clicked', async () => {
    const onClose = vi.fn();
    render(
      <DeleteDialog
        environment={mockEnv}
        onClose={onClose}
        onDeleted={vi.fn()}
        onAuthExpired={onAuthExpired}
      />,
    );
    await userEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should delete and call callbacks on confirm', async () => {
    const onClose = vi.fn();
    const onDeleted = vi.fn();
    vi.spyOn(apiModule, 'deleteEnvironment').mockResolvedValue({
      success: true,
      environmentId: 'test-env',
      deletedResources: ['arn:1'],
    });

    render(
      <DeleteDialog
        environment={mockEnv}
        onClose={onClose}
        onDeleted={onDeleted}
        onAuthExpired={onAuthExpired}
      />,
    );
    await userEvent.click(getDeleteButton());

    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalled();
      expect(onDeleted).toHaveBeenCalled();
    });
  });

  it('should show error on delete failure', async () => {
    vi.spyOn(apiModule, 'deleteEnvironment').mockRejectedValue(new Error('Access denied'));

    render(
      <DeleteDialog
        environment={mockEnv}
        onClose={vi.fn()}
        onDeleted={vi.fn()}
        onAuthExpired={onAuthExpired}
      />,
    );
    await userEvent.click(getDeleteButton());

    expect(await screen.findByText('Access denied')).toBeInTheDocument();
  });

  it('should show deleting state', async () => {
    vi.spyOn(apiModule, 'deleteEnvironment').mockImplementation(() => new Promise(() => {}));

    render(
      <DeleteDialog
        environment={mockEnv}
        onClose={vi.fn()}
        onDeleted={vi.fn()}
        onAuthExpired={onAuthExpired}
      />,
    );
    await userEvent.click(getDeleteButton());

    expect(screen.getByText('Deleting...')).toBeInTheDocument();
  });

  it('should call onAuthExpired when token is expired', async () => {
    vi.spyOn(apiModule, 'deleteEnvironment').mockRejectedValue(new apiModule.AuthError());

    render(
      <DeleteDialog
        environment={mockEnv}
        onClose={vi.fn()}
        onDeleted={vi.fn()}
        onAuthExpired={onAuthExpired}
      />,
    );
    await userEvent.click(getDeleteButton());

    await vi.waitFor(() => {
      expect(onAuthExpired).toHaveBeenCalled();
    });
  });
});
