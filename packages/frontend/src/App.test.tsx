import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import * as apiModule from './api';

const mockSuccess = {
  message: 'Hello from Lambda',
  timestamp: '2024-01-01T00:00:00.000Z',
  requestId: 'req-123',
};

beforeEach(() => vi.restoreAllMocks());
afterEach(() => cleanup());

describe('App API states', () => {
  it('shows loading state initially', () => {
    vi.spyOn(apiModule, 'fetchHelloMessage').mockReturnValue(new Promise(() => {}));
    render(<App />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays API response on success', async () => {
    vi.spyOn(apiModule, 'fetchHelloMessage').mockResolvedValue(mockSuccess);
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Hello from Lambda')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  it('displays error on failure', async () => {
    vi.spyOn(apiModule, 'fetchHelloMessage').mockRejectedValue(new Error('Network error'));
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('displays error for non-Error throws', async () => {
    vi.spyOn(apiModule, 'fetchHelloMessage').mockRejectedValue('string error');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Unknown error')).toBeInTheDocument();
    });
  });
});

describe('App counter', () => {
  it('increments counter on button click', async () => {
    vi.spyOn(apiModule, 'fetchHelloMessage').mockResolvedValue(mockSuccess);
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Hello from Lambda')).toBeInTheDocument();
    });
    const button = screen.getByRole('button', { name: /count/i });
    expect(button).toHaveTextContent('Count: 0');
    await user.click(button);
    expect(button).toHaveTextContent('Count: 1');
  });
});
