import React from 'react';

const IconCetakVisum = ({ className = 'h-4 w-4', ...props }) => (
  <svg
    className={className}
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="3 0 20 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="100%"
    height="100%"
  >
    {/* Upright Stamp Device */}
    <path
      d="M12 2a2.5 2.5 0 0 0-2.5 2.5c0 1 1.5 2.5 1.5 3.5v2H8.5a1.5 1.5 0 0 0-1.5 1.5V13h10v-1.5A1.5 1.5 0 0 0 15.5 10H13V8c0-1 1.5-2.5 1.5-3.5A2.5 2.5 0 0 0 12 2z"
      fill="currentColor"
      fillOpacity="0.05"
    />
    <path d="M5 13h14" />
  </svg>
);

export default IconCetakVisum;
