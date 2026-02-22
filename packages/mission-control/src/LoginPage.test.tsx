import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './LoginPage';
import * as authModule from './auth';

beforeEach(() => vi.restoreAllMocks());
afterEach(() => cleanup());

describe('LoginPage', () => {
  it('renders login form', () => {
    render(<LoginPage onLogin={vi.fn()} />);
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('calls login and onLogin on successful submit', async () => {
    const tokens = { idToken: 'id', accessToken: 'access', refreshToken: 'refresh' };
    vi.spyOn(authModule, 'login').mockResolvedValue(tokens);
    const onLogin = vi.fn();
    const user = userEvent.setup();

    render(<LoginPage onLogin={onLogin} />);
    await user.type(screen.getByPlaceholderText('Username'), 'admin');
    await user.type(screen.getByPlaceholderText('Password'), 'pass');
    await user.click(screen.getByText('Sign In'));

    expect(authModule.login).toHaveBeenCalledWith('admin', 'pass');
    expect(onLogin).toHaveBeenCalledWith(tokens);
  });

  it('shows error on failed login', async () => {
    vi.spyOn(authModule, 'login').mockRejectedValue(new Error('Bad credentials'));
    const user = userEvent.setup();

    render(<LoginPage onLogin={vi.fn()} />);
    await user.type(screen.getByPlaceholderText('Username'), 'admin');
    await user.type(screen.getByPlaceholderText('Password'), 'wrong');
    await user.click(screen.getByText('Sign In'));

    expect(await screen.findByText('Bad credentials')).toBeInTheDocument();
  });

  it('shows generic error for non-Error throws', async () => {
    vi.spyOn(authModule, 'login').mockRejectedValue('string error');
    const user = userEvent.setup();

    render(<LoginPage onLogin={vi.fn()} />);
    await user.type(screen.getByPlaceholderText('Username'), 'admin');
    await user.type(screen.getByPlaceholderText('Password'), 'wrong');
    await user.click(screen.getByText('Sign In'));

    expect(await screen.findByText('Login failed')).toBeInTheDocument();
  });
});
