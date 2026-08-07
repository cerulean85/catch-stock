import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UsClock } from './UsClock';

describe('UsClock', () => {
  it('미국 현지시각을 MM/DD HH:mm:ss로 보여준다', () => {
    render(<UsClock />);

    expect(screen.getByText('미국 현지시각')).toBeInTheDocument();
    expect(screen.getByText(/^\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/)).toBeInTheDocument();
  });
});
