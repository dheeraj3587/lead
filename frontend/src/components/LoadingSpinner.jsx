import React from 'react';

const sizeMap = {
  small: 'h-4 w-4',
  medium: 'h-6 w-6',
  large: 'h-10 w-10'
};

const LoadingSpinner = ({ size = 'medium', message = 'Loading...' }) => {
  const sizeClass = sizeMap[size] || sizeMap.medium;
  return (
    <div className="flex items-center space-x-3">
      <svg className={`animate-spin text-blue-600 ${sizeClass}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" role="img" aria-label="Loading">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
      </svg>
      <div role="status" aria-live="polite" className="text-gray-700">{message}</div>
    </div>
  );
};

export default LoadingSpinner;
