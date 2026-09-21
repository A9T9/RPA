import React from 'react'

// Original inline artwork: no external image request or asset dependency.
export default function LocalExecutionIcon () {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" role="img"
      aria-label="No cloud AI or OCR used"
      style={{ color: '#238653', verticalAlign: '-3px', marginRight: '6px', flexShrink: 0 }}>
      <title>100% local execution — no cloud AI or OCR used</title>
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 18H6a4.5 4.5 0 0 1-.6-9A6.5 6.5 0 0 1 17.8 8a5 5 0 0 1 .2 10h-6" />
        <path d="M3 21 21 3" />
      </g>
    </svg>
  )
}
