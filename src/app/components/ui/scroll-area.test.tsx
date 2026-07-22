import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ScrollArea, ScrollBar } from './scroll-area';

describe('ui/ScrollArea', () => {
  it('renders with content', () => {
    const { container } = render(
      <ScrollArea>
        <div>scrollable</div>
      </ScrollArea>
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});
