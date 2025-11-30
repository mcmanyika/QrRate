import React from 'react'

interface KombiIconProps {
  className?: string
}

export default function KombiIcon({ className = '' }: KombiIconProps) {
  return (
    <svg
      viewBox="0 0 120 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Kombi van icon"
    >
      {/* Main body - classic kombi boxy shape */}
      <rect x="15" y="25" width="90" height="30" rx="3" fill="currentColor" />
      
      {/* Rounded front section - iconic kombi front */}
      <path
        d="M 15 25 Q 10 25 10 30 L 10 55 Q 10 60 15 60"
        fill="currentColor"
      />
      
      {/* Split windshield - classic kombi feature */}
      <rect x="12" y="28" width="8" height="14" rx="1" fill="currentColor" opacity="0.15" />
      <rect x="22" y="28" width="8" height="14" rx="1" fill="currentColor" opacity="0.15" />
      
      {/* VW-style front grill */}
      <rect x="8" y="32" width="4" height="18" rx="1" fill="currentColor" opacity="0.4" />
      
      {/* Front headlights */}
      <circle cx="10" cy="35" r="2" fill="currentColor" opacity="0.5" />
      <circle cx="10" cy="47" r="2" fill="currentColor" opacity="0.5" />
      
      {/* Side windows */}
      <rect x="35" y="28" width="18" height="14" rx="2" fill="currentColor" opacity="0.15" />
      <rect x="57" y="28" width="18" height="14" rx="2" fill="currentColor" opacity="0.15" />
      <rect x="79" y="28" width="15" height="14" rx="2" fill="currentColor" opacity="0.15" />
      
      {/* Side door lines */}
      <line x1="35" y1="28" x2="35" y2="55" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <line x1="57" y1="28" x2="57" y2="55" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      
      {/* Door handles */}
      <rect x="33" y="35" width="1.5" height="2" rx="0.5" fill="currentColor" opacity="0.4" />
      <rect x="55" y="35" width="1.5" height="2" rx="0.5" fill="currentColor" opacity="0.4" />
      
      {/* Rear section with rear window */}
      <rect x="98" y="28" width="15" height="14" rx="2" fill="currentColor" opacity="0.15" />
      
      {/* Wheels - prominent kombi wheels */}
      <circle cx="30" cy="57" r="6" fill="currentColor" />
      <circle cx="85" cy="57" r="6" fill="currentColor" />
      <circle cx="30" cy="57" r="4" fill="currentColor" opacity="0.2" />
      <circle cx="85" cy="57" r="4" fill="currentColor" opacity="0.2" />
      
      {/* Wheel rims */}
      <circle cx="30" cy="57" r="2" fill="currentColor" opacity="0.4" />
      <circle cx="85" cy="57" r="2" fill="currentColor" opacity="0.4" />
      
      {/* Side accent lines */}
      <line x1="35" y1="42" x2="95" y2="42" stroke="currentColor" strokeWidth="1" opacity="0.2" />
    </svg>
  )
}

