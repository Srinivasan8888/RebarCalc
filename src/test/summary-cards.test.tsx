import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiameterSummaryCard } from '../components/DiameterSummaryCard';
import { ShapeSummaryCard } from '../components/ShapeSummaryCard';
import { MemberSummaryCard } from '../components/MemberSummaryCard';
import type { CalculatedBar } from '../types';

// Sample test data
const sampleBars: CalculatedBar[] = [
  {
    id: '1',
    memberType: 'BEAM',
    shapeCode: 'S1',
    diameter: 12,
    dimensions: { A: 1000 },
    spacing: 150,
    quantity: 10,
    cutLength: 1000,
    unitWeight: 0.888,
    totalLength: 10000,
    totalWeight: 8.88,
  },
  {
    id: '2',
    memberType: 'COLUMN',
    shapeCode: 'S2',
    diameter: 16,
    dimensions: { A: 800, B: 200 },
    spacing: 200,
    quantity: 5,
    cutLength: 1200,
    unitWeight: 1.58,
    totalLength: 6000,
    totalWeight: 7.9,
  },
];

describe('Summary Cards', () => {
  describe('DiameterSummaryCard', () => {
    it('should render diameter summary with correct data', () => {
      render(<DiameterSummaryCard bars={sampleBars} />);
      
      expect(screen.getByText('Diameter-wise Summary')).toBeInTheDocument();
      expect(screen.getByText('Ø12')).toBeInTheDocument();
      expect(screen.getByText('Ø16')).toBeInTheDocument();
      expect(screen.getByText('Grand Total')).toBeInTheDocument();
    });

    it('should not render when no bars provided', () => {
      const { container } = render(<DiameterSummaryCard bars={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('ShapeSummaryCard', () => {
    it('should render shape summary with correct data', () => {
      render(<ShapeSummaryCard bars={sampleBars} />);
      
      expect(screen.getByText('Shape-wise Summary')).toBeInTheDocument();
      expect(screen.getByText('S1 - Straight')).toBeInTheDocument();
      expect(screen.getByText('S2 - U-Bar')).toBeInTheDocument();
      expect(screen.getByText('Grand Total')).toBeInTheDocument();
    });

    it('should not render when no bars provided', () => {
      const { container } = render(<ShapeSummaryCard bars={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('MemberSummaryCard', () => {
    it('should render member summary with correct data', () => {
      render(<MemberSummaryCard bars={sampleBars} />);
      
      expect(screen.getByText('Member-wise Summary')).toBeInTheDocument();
      expect(screen.getByText('Beam')).toBeInTheDocument();
      expect(screen.getByText('Column')).toBeInTheDocument();
      expect(screen.getByText('Grand Total')).toBeInTheDocument();
    });

    it('should not render when no bars provided', () => {
      const { container } = render(<MemberSummaryCard bars={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });
});
