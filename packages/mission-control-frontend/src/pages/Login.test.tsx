import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './Login';
import * as authModule from '../auth';

describe('Login', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should render the login form', () => {
    render(<Login onAuth={vi.fn()} />);
    expect(screen.getByText('Mission Control')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('should call login with credentials on submit', async () => {
    const loginSpy = vi.spyOn(authModule, 'login').mockResolvedValue();
    const onAuth = vi.fn();
    render(<Login onAuth={onAuth} />);

    await userEvent.type(screen.getByLabelText('Username'), 'admin');
    await userEvent.type(screen.getByLabelText('Password'), 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(loginSpy).toHaveBeenCalledWith('admin', 'password');
    expect(onAuth).toHaveBeenCalled();
  });

  it('should show error on failed login', async () => {
    vi.spyOn(authModule, 'login').mockRejectedValue(new Error('Incorrect username or password.'));
    render(<Login onAuth={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Username'), 'admin');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Incorrect username or password.');
  });

  it('should disable button while loading', async () => {
    let resolveLogin: () => void;
    vi.spyOn(authModule, 'login').mockImplementation(
      () => new Promise<void>((resolve) => { resolveLogin = resolve; }),
    );
    render(<Login onAuth={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Username'), 'admin');
    await userEvent.type(screen.getByLabelText('Password'), 'pass');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled();
    resolveLogin!();
  });
});
