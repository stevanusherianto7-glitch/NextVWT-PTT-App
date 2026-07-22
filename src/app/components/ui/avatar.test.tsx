import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';

describe('ui/Avatar', () => {
  it('renders avatar with fallback', () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="https://example.com/x.png" alt="u" />
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );
    expect(container.firstChild).toBeInTheDocument();
    expect(container.querySelector('AvatarFallback, [data-fallback]') || container.textContent).toBeTruthy();
  });
});
