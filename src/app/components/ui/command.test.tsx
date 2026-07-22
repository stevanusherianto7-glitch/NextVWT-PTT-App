import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Command, CommandList, CommandItem, CommandEmpty } from './command';

describe('ui/Command', () => {
  it('renders command items', () => {
    render(
      <Command>
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandItem>Item 1</CommandItem>
        </CommandList>
      </Command>
    );
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });
});
