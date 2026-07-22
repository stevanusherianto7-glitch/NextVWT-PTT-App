import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './resizable';

describe('ui/Resizable', () => {
  it('renders panels and handle', () => {
    const { container } = render(
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel>One</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>Two</ResizablePanel>
      </ResizablePanelGroup>
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});
