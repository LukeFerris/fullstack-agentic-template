import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EnvironmentCard from './EnvironmentCard';

describe('EnvironmentCard', () => {
  const mockEnvironment = {
    environmentId: 'abc12345',
    projectName: 'test-project',
    frontendUrl: 'https://d123.cloudfront.net',
    apiUrl: 'https://api123.execute-api.us-east-1.amazonaws.com/prod',
    deployedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
  };

  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockReturnValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render environment details', () => {
    render(<EnvironmentCard environment={mockEnvironment} onDelete={mockOnDelete} />);

    expect(screen.getByText('abc12345')).toBeInTheDocument();
    expect(screen.getByText(/hours ago/)).toBeInTheDocument();
    expect(screen.getByText('https://d123.cloudfront.net')).toBeInTheDocument();
    expect(screen.getByText('https://api123.execute-api.us-east-1.amazonaws.com/prod')).toBeInTheDocument();
  });

  it('should show "Just now" for recent deployments', () => {
    const recentEnv = {
      ...mockEnvironment,
      deployedAt: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
    };

    render(<EnvironmentCard environment={recentEnv} onDelete={mockOnDelete} />);

    expect(screen.getByText('Just now')).toBeInTheDocument();
  });

  it('should show minutes for deployments less than 1 hour old', () => {
    const recentEnv = {
      ...mockEnvironment,
      deployedAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    };

    render(<EnvironmentCard environment={recentEnv} onDelete={mockOnDelete} />);

    expect(screen.getByText('30 minutes ago')).toBeInTheDocument();
  });

  it('should show hours for deployments less than 1 day old', () => {
    const recentEnv = {
      ...mockEnvironment,
      deployedAt: new Date(Date.now() - 18000000).toISOString(), // 5 hours ago
    };

    render(<EnvironmentCard environment={recentEnv} onDelete={mockOnDelete} />);

    expect(screen.getByText('5 hours ago')).toBeInTheDocument();
  });

  it('should show days for older deployments', () => {
    const oldEnv = {
      ...mockEnvironment,
      deployedAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    };

    render(<EnvironmentCard environment={oldEnv} onDelete={mockOnDelete} />);

    expect(screen.getByText('3 days ago')).toBeInTheDocument();
  });

  it('should call onDelete when delete button clicked and confirmed', async () => {
    mockOnDelete.mockResolvedValue(undefined as void);

    render(<EnvironmentCard environment={mockEnvironment} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete environment/i });
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('abc12345')
    );

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('abc12345');
    });
  });

  it('should not call onDelete when user cancels confirmation', () => {
    vi.mocked(window.confirm).mockReturnValue(false);

    render(<EnvironmentCard environment={mockEnvironment} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete environment/i });
    fireEvent.click(deleteButton);

    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it('should show "Deleting..." while deletion is in progress', async () => {
    const slowDelete = vi.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 100)));

    render(<EnvironmentCard environment={mockEnvironment} onDelete={slowDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete environment/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });
  });

  it('should disable button while deleting', async () => {
    const slowDelete = vi.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 100)));

    render(<EnvironmentCard environment={mockEnvironment} onDelete={slowDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete environment/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(deleteButton).toBeDisabled();
    });
  });

  it('should show alert on deletion error', async () => {
    const mockError = new Error('Network error');
    mockOnDelete.mockRejectedValue(mockError);

    render(<EnvironmentCard environment={mockEnvironment} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete environment/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to delete: Network error');
    });
  });

  it('should handle non-Error exceptions', async () => {
    mockOnDelete.mockRejectedValue('String error');

    render(<EnvironmentCard environment={mockEnvironment} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete environment/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to delete: Unknown error');
    });
  });

  it('should re-enable button after deletion error', async () => {
    mockOnDelete.mockRejectedValue(new Error('Failed'));

    render(<EnvironmentCard environment={mockEnvironment} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete environment/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(deleteButton).not.toBeDisabled();
    });
  });

  it('should make frontend URL clickable', () => {
    render(<EnvironmentCard environment={mockEnvironment} onDelete={mockOnDelete} />);

    const link = screen.getByRole('link', { name: mockEnvironment.frontendUrl });
    expect(link).toHaveAttribute('href', mockEnvironment.frontendUrl);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
