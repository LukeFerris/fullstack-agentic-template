import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EnvironmentStats from './EnvironmentStats';

describe('EnvironmentStats', () => {
  it('should display loading state', () => {
    render(<EnvironmentStats count={0} loading={true} />);

    expect(screen.getByText('Total Environments')).toBeInTheDocument();
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('should display environment count', () => {
    render(<EnvironmentStats count={5} loading={false} />);

    expect(screen.getByText('Total Environments')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should display zero count', () => {
    render(<EnvironmentStats count={0} loading={false} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should display large count', () => {
    render(<EnvironmentStats count={123} loading={false} />);

    expect(screen.getByText('123')).toBeInTheDocument();
  });

  it('should render package emoji', () => {
    render(<EnvironmentStats count={5} loading={false} />);

    expect(screen.getByText('📦')).toBeInTheDocument();
  });
});
