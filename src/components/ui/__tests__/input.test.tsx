import React from 'react';
import { render } from '@testing-library/react';
import { Input } from '../input';

describe('Input primitive', () => {
  it('forwards refs to the underlying element and defaults to type="text"', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} defaultValue="hello" />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.type).toBe('text');
    expect(ref.current?.value).toBe('hello');
  });

  it('respects an explicit type prop', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} type="email" defaultValue="user@example.com" />);

    expect(ref.current?.type).toBe('email');
  });
});
