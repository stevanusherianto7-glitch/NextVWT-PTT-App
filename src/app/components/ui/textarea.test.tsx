import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Textarea } from './textarea';

describe('ui/Textarea', () => {
  it('renders a textarea and accepts input', () => {
    render(<Textarea placeholder="Ketik pesan..." aria-label="pesan" />);
    const ta = screen.getByLabelText('pesan') as HTMLTextAreaElement;
    expect(ta).toBeInTheDocument();
    fireEvent.change(ta, { target: { value: 'halo' } });
    expect(ta.value).toBe('halo');
  });

  it('respects disabled state', () => {
    render(<Textarea disabled aria-label="pesan" />);
    expect(screen.getByLabelText('pesan')).toBeDisabled();
  });
});
