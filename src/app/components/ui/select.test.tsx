import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

describe('ui/Select', () => {
  it('renders trigger with placeholder', () => {
    render(
      <Select>
        <SelectTrigger aria-label="pilih">
          <SelectValue placeholder="Pilih saluran" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Satu</SelectItem>
          <SelectItem value="2">Dua</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(screen.getByText('Pilih saluran')).toBeInTheDocument();
    expect(screen.getByLabelText('pilih')).toBeInTheDocument();
  });
});
