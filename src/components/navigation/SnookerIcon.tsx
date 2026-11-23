'use client';

import React, { useId } from 'react';

interface SnookerIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

export const SnookerIcon: React.FC<SnookerIconProps> = ({
  className = "w-5 h-5",
  size = 24,
  ...props
}) => {
  const rawId = useId();
  const cleanId = rawId.replace(/[^a-zA-Z0-9-_]/g, '');
  const redGradId = `snooker-red-${cleanId}`;
  const cueGradId = `snooker-cue-${cleanId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <defs>
        {/* Aramith Snooker Red Ball Radial Gradient */}
        <radialGradient id={redGradId} cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#ff7b7b" />
          <stop offset="45%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#881337" />
        </radialGradient>

        {/* Snooker Cue Ball Radial Gradient with Specular Sheen */}
        <radialGradient id={cueGradId} cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </radialGradient>
      </defs>

      {/* Triangular Snooker Rack Frame */}
      <path
        d="M12 6.8L18.8 18.8C19.2 19.5 18.7 20.3 17.9 20.3H6.1C5.3 20.3 4.8 19.5 5.2 18.8L12 6.8Z"
        className="stroke-emerald-600/80 dark:stroke-emerald-400/80"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />

      {/* Trajectory / Aiming Track Line from Cue Ball to Apex Red */}
      <line
        x1="12"
        y1="5.7"
        x2="12"
        y2="8.8"
        className="stroke-emerald-500 dark:stroke-emerald-400"
        strokeWidth="1"
        strokeDasharray="1 1.2"
        strokeLinecap="round"
      />

      {/* White Cue Ball */}
      <circle
        cx="12"
        cy="3.5"
        r="2.2"
        fill={`url(#${cueGradId})`}
        stroke="rgba(0,0,0,0.12)"
        className="dark:stroke-white/30"
        strokeWidth="0.4"
      />

      {/* Apex Red Ball */}
      <circle cx="12" cy="11.2" r="2" fill={`url(#${redGradId})`} />

      {/* Row 2 Red Balls */}
      <circle cx="9.9" cy="14.8" r="2" fill={`url(#${redGradId})`} />
      <circle cx="14.1" cy="14.8" r="2" fill={`url(#${redGradId})`} />

      {/* Row 3 Red Balls */}
      <circle cx="7.8" cy="18.3" r="2" fill={`url(#${redGradId})`} />
      <circle cx="12" cy="18.3" r="2" fill={`url(#${redGradId})`} />
      <circle cx="16.2" cy="18.3" r="2" fill={`url(#${redGradId})`} />
    </svg>
  );
};
