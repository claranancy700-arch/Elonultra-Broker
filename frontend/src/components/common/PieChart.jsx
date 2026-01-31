import React from 'react';

const COLORS = ['#4f46e5','#06b6d4','#f59e0b','#ef4444','#10b981','#a78bfa','#f97316'];

export default function PieChart({ data = [], size = 160, stroke = 0 }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1;
  let cumulative = 0;

  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;

  function polarToCartesian(cx, cy, r, angle) {
    const rad = (angle - 90) * (Math.PI / 180.0);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function describeArc(cx, cy, r, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return [`M ${cx} ${cy}`, `L ${start.x} ${start.y}`, `A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`, 'Z'].join(' ');
  }

  const slices = data.map((d, i) => {
    const value = d.value || 0;
    const startAngle = (cumulative / total) * 360;
    cumulative += value;
    const endAngle = (cumulative / total) * 360;
    const path = describeArc(cx, cy, radius, startAngle, endAngle);
    const color = COLORS[i % COLORS.length];
    return { path, color, label: d.label, value };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Positions pie chart">
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} stroke="#071025" strokeWidth={stroke} />
      ))}
      <circle cx={cx} cy={cy} r={radius*0.45} fill="#071025" />
    </svg>
  );
}
