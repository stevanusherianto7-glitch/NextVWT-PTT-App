import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './input-otp';

describe('ui/InputOTP', () => {
  it('renders slots', () => {
    render(
      <InputOTP maxLength={4}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
        </InputOTPGroup>
      </InputOTP>
    );
    // Radix renders input elements for each slot
    expect(document.querySelectorAll('input').length).toBeGreaterThan(0);
  });
});
