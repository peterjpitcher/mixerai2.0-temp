import React from 'react';
import { render, screen } from '@testing-library/react';
import { Button } from '../button';

describe('Button primitive', () => {
  it('defaults to type="button" when rendered as native button', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toHaveAttribute('type', 'button');
  });

  it('respects an explicit type prop', () => {
    render(<Button type="submit">Submit</Button>);
    const button = screen.getByRole('button', { name: /submit/i });
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('does not force a type when using asChild', () => {
    render(
      <Button asChild>
        <a href="#">Link</a>
      </Button>
    );

    const link = screen.getByRole('link', { name: /link/i });
    expect(link).not.toHaveAttribute('type');
  });
});
