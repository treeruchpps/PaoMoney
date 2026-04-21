import { fmt } from '../../constants/data';

export default function DonutChart({ data, size = 180 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  let cumulative = 0;
  const cx = size / 2, cy = size / 2;
  const r = size * 0.38, innerR = size * 0.22;

  const segments = data.map((d) => {
    const pct = d.value / total;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    cumulative += pct;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle),   y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(startAngle), iy1 = cy + innerR * Math.sin(startAngle);
    const ix2 = cx + innerR * Math.cos(endAngle),   iy2 = cy + innerR * Math.sin(endAngle);
    const large = pct > 0.5 ? 1 : 0;
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1} Z`;
    return { ...d, path };
  });

  return (
    <svg width={size} height={size}>
      {segments.map((s, i) => (
        <path
          key={i}
          d={s.path}
          fill={s.color}
          opacity="0.9"
          className="cursor-pointer hover:opacity-100 transition-opacity"
        />
      ))}
      <circle cx={cx} cy={cy} r={innerR - 2} fill="white" />
      <text x={cx} y={cy - 6}  textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="Sarabun">รายจ่าย</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="13" fontWeight="700" fill="#1e293b" fontFamily="Sarabun">{fmt(total)}</text>
      <text x={cx} y={cy + 24} textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="Sarabun">บาท</text>
    </svg>
  );
}
