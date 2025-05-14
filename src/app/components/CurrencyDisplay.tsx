import React from 'react';
import { formatCurrency } from '@/app/lib/utils';
import RupeeIcon from './RupeeIcon';

interface CurrencyDisplayProps {
  amount: number | string;
  className?: string;
  iconSize?: number;
  iconColor?: string;
  fontWeight?: string | number;
  fontSize?: string | number;
}

const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  className = '',
  iconSize = 18,
  iconColor = 'currentColor',
  fontWeight = 'medium',
  fontSize = 'inherit',
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <RupeeIcon size={iconSize} color={iconColor} className="mr-1" />
      <span
        style={{
          fontWeight: fontWeight as any,
          fontSize: fontSize as any,
        }}
      >
        {formatCurrency(amount).replace('₹', '')}
      </span>
    </div>
  );
};

export default CurrencyDisplay; 