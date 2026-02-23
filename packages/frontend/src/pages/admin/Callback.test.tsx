import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Callback from './Callback';
import * as useAuthModule from '../../hooks/useAuth';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../hooks/useAuth');

describe('Callback', () => {
  const mockSetToken = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    delete (window as any).location;
    (window as any).location = { hash: '' };

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      setToken: mockSetToken,
      isAuthenticated: false,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getToken: () => null,
      config: null,
    });
  });

  it('should render loading state', () => {
    render(
      <BrowserRouter>
        <Callback />
      </BrowserRouter>
    );

    expect(screen.getByText('Completing login...')).toBeInTheDocument();
  });

  it('should extract token from URL hash and navigate to admin', async () => {
    (window as any).location.hash = '#id_token=test-token-123&access_token=access-123';

    render(
      <BrowserRouter>
        <Callback />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockSetToken).toHaveBeenCalledWith('test-token-123');
      expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true });
    });
  });

  it('should redirect to home when no id_token present', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    (window as any).location.hash = '#access_token=access-123';

    render(
      <BrowserRouter>
        <Callback />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('No id_token in callback URL');
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    consoleError.mockRestore();
  });

  it('should handle empty hash', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    (window as any).location.hash = '';

    render(
      <BrowserRouter>
        <Callback />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    consoleError.mockRestore();
  });

  it('should handle malformed hash', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    (window as any).location.hash = '#invalid-format';

    render(
      <BrowserRouter>
        <Callback />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    consoleError.mockRestore();
  });

  it('should handle exception during token extraction', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockError = new Error('Token processing error');
    mockSetToken.mockImplementation(() => {
      throw mockError;
    });

    (window as any).location.hash = '#id_token=test-token';

    render(
      <BrowserRouter>
        <Callback />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Error processing callback:', mockError);
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    consoleError.mockRestore();
  });

  it('should not call setToken when token is missing', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    (window as any).location.hash = '#access_token=only';

    render(
      <BrowserRouter>
        <Callback />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockSetToken).not.toHaveBeenCalled();
    });

    consoleError.mockRestore();
  });
});
