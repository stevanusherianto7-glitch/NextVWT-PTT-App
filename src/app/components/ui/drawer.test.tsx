import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from './drawer';

describe('ui/Drawer', () => {
  it('renders trigger', () => {
    render(
      <Drawer>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Title</DrawerTitle>
            <DrawerDescription>Desc</DrawerDescription>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>
    );
    expect(screen.getByText('Open')).toBeInTheDocument();
  });
});
