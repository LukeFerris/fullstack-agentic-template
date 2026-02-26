import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import * as authModule from './auth';
import * as apiModule from './api';

describe('App', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should show login page when not authenticated', () => {
    vi.spyOn(authModule, 'initAuth').mockReturnValue(false);
    render(<App />);
    expect(screen.getByText('Mission Control')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  it('should show navigation when authenticated', () => {
    vi.spyOn(authModule, 'initAuth').mockReturnValue(true);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ environments: [] }),
    } as Response);

    render(<App />);
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('should redirect to login when auth expires', async () => {
    vi.spyOn(authModule, 'initAuth').mockReturnValue(true);
    vi.spyOn(authModule, 'logout');
    vi.spyOn(apiModule, 'listEnvironments').mockRejectedValue(new apiModule.AuthError());

    render(<App />);
    expect(await screen.findByLabelText('Username')).toBeInTheDocument();
    expect(authModule.logout).toHaveBeenCalled();
  });
});
