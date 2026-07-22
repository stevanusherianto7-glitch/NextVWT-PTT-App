import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './table';

describe('ui/Table', () => {
  it('renders a table with header, body, and caption', () => {
    render(
      <Table>
        <TableCaption>Daftar pengguna</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead>Peran</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Budi</TableCell>
            <TableCell>Operator</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>Total: 1</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    );
    expect(screen.getByText('Daftar pengguna')).toBeInTheDocument();
    expect(screen.getByText('Budi')).toBeInTheDocument();
    expect(screen.getByText('Operator')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
