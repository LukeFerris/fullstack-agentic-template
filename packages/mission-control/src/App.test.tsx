import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import * as authModule from './auth';
import * as apiModule from './api';

beforeEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});
afterEach(() => cleanup());

describe('App', () => {
  it('shows login page when not authenticated', () => {
    vi.spyOn(authModule, 'getStoredTokens').mockReturnValue(null);
    render(<App />);
    expect(screen.getByText('Mission Control')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
  });

  it('shows dashboard when authenticated', async () => {
    vi.spyOn(authModule, 'getStoredTokens').mockReturnValue({
      idToken: 'id', accessToken: 'access', refreshToken: 'refresh',
    });
    vi.spyOn(apiModule, 'fetchEnvironments').mockResolvedValue([]);
    render(<App />);
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Deployed Environments (0)')).toBeInTheDocument();
    });
  });

  it('logs out and shows login page', async () => {
    vi.spyOn(authModule, 'getStoredTokens').mockReturnValue({
      idToken: 'id', accessToken: 'access', refreshToken: 'refresh',
    });
    vi.spyOn(authModule, 'logout').mockImplementation(() => {});
    vi.spyOn(apiModule, 'fetchEnvironments').mockResolvedValue([]);

    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Sign Out'));
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
  });
});
