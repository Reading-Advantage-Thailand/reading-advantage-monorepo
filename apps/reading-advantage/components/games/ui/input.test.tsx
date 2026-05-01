import { render, screen } from '@testing-library/react';
import { Input } from './input';

describe('Input', () => {
  it('renders an input with provided attributes', () => {
    render(<Input type='email' aria-label='Email' className='extra' />);

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('data-slot', 'input');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveClass('extra');
  });
});
