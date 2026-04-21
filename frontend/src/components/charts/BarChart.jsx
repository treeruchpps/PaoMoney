export default function BarChart({ data }) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.income, d.expense)));
  const W = 320, H = 160, padL = 10, padR = 10, padT = 10, padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW = (chartW / data.length) * 0.35;
  const gap  = (chartW / data.length) * 0.1;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <line
          key={i}
          x1={padL} x2={W - padR}
          y1={padT + chartH * (1 - t)} y2={padT + chartH * (1 - t)}
          stroke="#e2e8f0" strokeWidth="1"
        />
      ))}
      {data.map((d, i) => {
        const x    = padL + (chartW / data.length) * i + gap;
        const incH = (d.income  / maxVal) * chartH;
        const expH = (d.expense / maxVal) * chartH;
        return (
          <g key={i}>
            <rect x={x}           y={padT + chartH - incH} width={barW} height={incH} fill="#10b981" rx="3" opacity="0.85" />
            <rect x={x + barW + 3} y={padT + chartH - expH} width={barW} height={expH} fill="#f43f5e" rx="3" opacity="0.85" />
            <text x={x + barW} y={H - 8} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="Sarabun">{d.month}</text>
          </g>
        );
      })}
    </svg>
  );
}
