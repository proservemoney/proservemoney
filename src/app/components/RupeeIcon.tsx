import React from 'react';

interface RupeeIconProps {
  className?: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const RupeeIcon: React.FC<RupeeIconProps> = ({
  className = '',
  size = 24,
  color = 'currentColor',
  strokeWidth = 2,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M6 3H18M6 8H18M14 21L8 8H6M14 21L9 13.5M14 21H6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default RupeeIcon; 