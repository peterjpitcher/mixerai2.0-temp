import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ValidatedTextarea } from '../validated-textarea';

describe('ValidatedTextarea', () => {
  function Wrapper({
    initialValue = '',
    required = false,
    maxLength,
    maxRows,
  }: {
    initialValue?: string;
    required?: boolean;
    maxLength?: number;
    maxRows?: number;
  }) {
    const [value, setValue] = React.useState(initialValue);

    return (
      <ValidatedTextarea
        value={value}
        onChange={setValue}
        field={{
          name: 'notes',
          label: 'Notes',
          config: {
            required,
            max_length: maxLength,
            max_rows: maxRows,
          },
        }}
      />
    );
  }

  it('applies ARIA attributes for required fields and counter metadata', () => {
    render(<Wrapper initialValue="Hello" required maxLength={100} maxRows={5} />);

    const textarea = screen.getByLabelText(/Notes/);

    expect(textarea).toHaveAttribute('aria-required', 'true');
    expect(textarea).toHaveAttribute('aria-describedby');

    const describedBy = textarea.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();

    if (!describedBy) return;

    const ids = describedBy.split(' ');
    const counter = document.getElementById(ids[0]);
    expect(counter).toBeTruthy();
    if (counter) {
      expect(counter.textContent).toContain('rows');
    }
  });

  it('shows validation error when max length is exceeded', () => {
    render(<Wrapper initialValue="Hello" maxLength={10} />);

    const textarea = screen.getByLabelText('Notes');
    fireEvent.change(textarea, { target: { value: 'This text is definitely longer than ten characters' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Maximum');
  });
});
