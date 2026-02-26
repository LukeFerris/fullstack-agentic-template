import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Navigation from './Navigation';
import * as authModule from '../auth';

describe('Navigation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should render title and admin badge', () => {
    render(<Navigation />);
    expect(screen.getByText('Mission Control')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('should render sign out button', () => {
    render(<Navigation />);
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('should call logout on sign out click', async () => {
    const logoutSpy = vi.spyOn(authModule, 'logout').mockImplementation(() => {});
    // Mock window.location.reload
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    });

    render(<Navigation />);
    await userEvent.click(screen.getByText('Sign out'));
    expect(logoutSpy).toHaveBeenCalled();
  });
});
