import React from 'react';

const svgs = {
  chart: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 18H20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 14V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 14V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17 14V4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  lock: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M7 11V8a5 5 0 0110 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  money: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="12" cy="14" r="2" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  ),
  link: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M10 14a5 5 0 007.07 0l1.41-1.41a5 5 0 00-7.07-7.07L9.41 6.93" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 10a5 5 0 00-7.07 0L5.52 11.41a5 5 0 007.07 7.07L12 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  bank: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M12 3v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M5 10v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M19 10v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  coin: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M8 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  pin: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <circle cx="12" cy="9" r="2" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  copy: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="9" y="9" width="9" height="11" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="4" y="4" width="9" height="11" rx="2" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M3 13h8V3H3v10zM13 21h8V11h-8v10zM13 3v6h8V3h-8zM3 21h8v-6H3v6z" stroke="currentColor" strokeWidth="0" fill="currentColor"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 15.5A3.5 3.5 0 1012 8.5a3.5 3.5 0 000 7z" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06A2 2 0 013.28 16.9l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82L4.3 3.28A2 2 0 017.13 1.45l.06.06A1.65 1.65 0 009 1.83c.56.21 1.16.21 1.73 0 .62-.24 1.27-.24 1.9 0 .32.13.63.32.88.54.26.22.49.47.69.74.25.34.51.67.79.98.2.22.41.43.64.62a1.65 1.65 0 001.82.33l.06-.06A2 2 0 0120.72 7.1l-.06.06a1.65 1.65 0 00-.33 1.82c.21.56.21 1.16 0 1.73-.24.62-.24 1.27 0 1.9.13.32.32.63.54.88.22.26.47.49.74.69.34.25.67.51.98.79.22.2.43.41.62.64a1.65 1.65 0 00.33 1.82l.06.06A2 2 0 0120.72 20.7l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51z" stroke="currentColor" strokeWidth="0" fill="currentColor"/>
    </svg>
  )
};

const Icon = ({ name, className }) => {
  const node = svgs[name] || svgs.chart;
  return (
    <span className={className ? `icon ${className}` : 'icon'} aria-hidden="true" style={{display:'inline-flex',verticalAlign:'middle'}}>
      {node}
    </span>
  );
};

export default Icon;
