import React from 'react';

const Logo = ({ className = '' }: { className?: string }) => (
  <div className={`flex flex-col items-center ${className}`} aria-label="SL Auto Expertise">
    <svg
      width="80"
      height="52"
      viewBox="0 0 260 170"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* Stylized S */}
      <path d="
        M72 12
        C92 6, 112 10, 116 30
        C120 50, 98 62, 88 78
        C78 94, 72 106, 82 118
        C92 130, 108 124, 112 116
        L112 116
        C108 128, 88 138, 74 128
        C58 116, 66 98, 78 80
        C90 62, 110 52, 106 34
        C102 16, 84 14, 72 18
        Z
      " />
      {/* Stylized L */}
      <path d="
        M104 8
        L104 8
        C108 8, 114 8, 118 8
        L118 120
        L154 120
        L154 130
        L104 130
        Z
      " />
      {/* Decorative serif on S top */}
      <path d="
        M68 16
        C72 10, 80 8, 90 8
        L90 8
        C80 10, 74 14, 72 18
        Z
      " />
      {/* AUTO EXPERTISE text */}
      <text
        x="130"
        y="162"
        textAnchor="middle"
        fill="currentColor"
        fontSize="18"
        fontFamily="'Times New Roman', 'Georgia', serif"
        fontWeight="400"
        letterSpacing="7"
      >AUTO EXPERTISE</text>
    </svg>
  </div>
);

export default Logo;
