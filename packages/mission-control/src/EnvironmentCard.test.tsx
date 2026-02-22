import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EnvironmentCard from './EnvironmentCard';
import type { EnvironmentRecord } from './types';

const mockEnv: EnvironmentRecord = {
  environmentId: 'abc123',
  projectName: 'proj',
  frontendUrl: 'https://front.example.com',
  apiUrl: 'https://api.example.com',
  deployedAt: '2024-06-15T10:30:00Z',
  resourcePrefix: 'proj-abc123',
};

beforeEach(() => vi.restoreAllMocks());
afterEach(() => cleanup());

describe('EnvironmentCard', () => {
  it('renders environment details', () => {
    render(<EnvironmentCard env={mockEnv} onDelete={vi.fn()} />);
    expect(screen.getByText('proj-abc123')).toBeInTheDocument();
    expect(screen.getByText('https://front.example.com')).toBeInTheDocument();
    expect(screen.getByText('https://api.example.com')).toBeInTheDocument();
  });

  it('calls onDelete after confirm', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();

    render(<EnvironmentCard env={mockEnv} onDelete={onDelete} />);
    await user.click(screen.getByText('Delete'));

    expect(onDelete).toHaveBeenCalledWith('proj-abc123');
  });

  it('does not delete when confirm is cancelled', async () => {
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();

    render(<EnvironmentCard env={mockEnv} onDelete={onDelete} />);
    await user.click(screen.getByText('Delete'));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('shows error when delete fails with Error', async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error('Delete failed'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();

    render(<EnvironmentCard env={mockEnv} onDelete={onDelete} />);
    await user.click(screen.getByText('Delete'));

    expect(await screen.findByText('Delete failed')).toBeInTheDocument();
  });

  it('shows generic error for non-Error throws', async () => {
    const onDelete = vi.fn().mockRejectedValue('string error');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();

    render(<EnvironmentCard env={mockEnv} onDelete={onDelete} />);
    await user.click(screen.getByText('Delete'));

    expect(await screen.findByText('Delete failed')).toBeInTheDocument();
  });
});
