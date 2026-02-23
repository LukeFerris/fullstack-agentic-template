import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardHeader from './DashboardHeader';

describe('DashboardHeader', () => {
  it('should render Mission Control title', () => {
    const mockLogout = vi.fn();
    render(<DashboardHeader onLogout={mockLogout} />);

    expect(screen.getByText('Mission Control')).toBeInTheDocument();
    expect(screen.getByText('Environment Management')).toBeInTheDocument();
  });

  it('should render logout button', () => {
    const mockLogout = vi.fn();
    render(<DashboardHeader onLogout={mockLogout} />);

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    expect(logoutButton).toBeInTheDocument();
  });

  it('should call onLogout when button clicked', () => {
    const mockLogout = vi.fn();
    render(<DashboardHeader onLogout={mockLogout} />);

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('should render rocket emoji', () => {
    const mockLogout = vi.fn();
    render(<DashboardHeader onLogout={mockLogout} />);

    expect(screen.getByText('🚀')).toBeInTheDocument();
  });
});
