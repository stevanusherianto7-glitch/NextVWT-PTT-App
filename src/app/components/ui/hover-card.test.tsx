import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from './hover-card';

describe('ui/HoverCard', () => {
  it('renders trigger', () => {
    render(
      <HoverCard>
        <HoverCardTrigger>Hover</HoverCardTrigger>
        <HoverCardContent>Card</HoverCardContent>
      </HoverCard>
    );
    expect(screen.getByText('Hover')).toBeInTheDocument();
  });
});
