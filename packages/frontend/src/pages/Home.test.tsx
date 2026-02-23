import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Home from './Home';
import * as apiModule from '../api';

describe('Home Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should render the home page title', () => {
    vi.spyOn(apiModule, 'fetchHelloMessage').mockResolvedValue({
      message: 'Test message',
      timestamp: new Date().toISOString(),
      requestId: 'test-id',
    });

    render(<Home />);

    expect(screen.getByText('Fullstack Template')).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    vi.spyOn(apiModule, 'fetchHelloMessage').mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<Home />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show error message when API call fails with Error', async () => {
    vi.spyOn(apiModule, 'fetchHelloMessage').mockRejectedValue(new Error('Network error'));

    render(<Home />);

    expect(await screen.findByText('Network error')).toBeInTheDocument();
  });

  it('should show error message when API call fails with non-Error', async () => {
    vi.spyOn(apiModule, 'fetchHelloMessage').mockRejectedValue('String error');

    render(<Home />);

    expect(await screen.findByText('Unknown error')).toBeInTheDocument();
  });

  it('should show API response when loaded', async () => {
    vi.spyOn(apiModule, 'fetchHelloMessage').mockResolvedValue({
      message: 'Hello from Lambda!',
      timestamp: '2024-01-01T00:00:00.000Z',
      requestId: 'test-request-id',
    });

    render(<Home />);

    expect(await screen.findByText('Hello from Lambda!')).toBeInTheDocument();
  });

  it('should increment counter when button clicked', async () => {
    vi.spyOn(apiModule, 'fetchHelloMessage').mockResolvedValue({
      message: 'Test',
      timestamp: new Date().toISOString(),
      requestId: 'test-id',
    });

    const { getByRole } = render(<Home />);

    const button = getByRole('button', { name: /count/i });
    expect(button).toHaveTextContent('Count: 0');

    fireEvent.click(button);
    expect(button).toHaveTextContent('Count: 1');

    fireEvent.click(button);
    expect(button).toHaveTextContent('Count: 2');
  });
});
