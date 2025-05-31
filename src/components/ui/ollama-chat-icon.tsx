import React from 'react';

interface OllamaChatIconProps {
  className?: string;
  size?: number;
}

export const OllamaChatIcon: React.FC<OllamaChatIconProps> = ({ 
  className = "", 
  size = 24 
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
      {/* Outer circle representing the chat bubble */}
      <circle
        cx="12"
        cy="10"
        r="8"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      
      {/* Inner dots representing conversation */}
      <circle cx="8" cy="9" r="1.5" fill="currentColor" />
      <circle cx="12" cy="9" r="1.5" fill="currentColor" />
      <circle cx="16" cy="9" r="1.5" fill="currentColor" />
      
      {/* Neural network connection lines */}
      <path
        d="M8 11L10 13M12 11L10 13M12 11L14 13M16 11L14 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      
      {/* AI/Tech accent - small geometric shape */}
      <rect
        x="10"
        y="13"
        width="4"
        height="2"
        rx="1"
        fill="currentColor"
        opacity="0.7"
      />
      
      {/* Chat tail */}
      <path
        d="M7 17L9 19L7 21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};

export default OllamaChatIcon;
