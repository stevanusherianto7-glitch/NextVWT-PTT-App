import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
} from './dropdown-menu';

describe('ui/DropdownMenu', () => {
  it('renders a trigger button', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger aria-label="buka menu">Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Pengaturan</DropdownMenuLabel>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    expect(screen.getByText('Menu')).toBeInTheDocument();
    expect(screen.getByLabelText('buka menu')).toBeInTheDocument();
  });
});
