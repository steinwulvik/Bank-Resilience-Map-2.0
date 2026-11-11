/**
 * Små flagg for de nordiske landene som SVG. Emoji-flagg vises ikke i Windows,
 * så flaggene tegnes selv. Dekorative: landsnavnet står alltid ved siden av.
 */
const FLAGS: Record<string, { w: number; h: number; bg: string; cross: [string, number][]; x: number; y: number }> = {
  // Nordisk kors: [farge, tykkelse], korsets midtpunkt (x, y) i flaggets enheter.
  no: { w: 22, h: 16, bg: '#BA0C2F', cross: [['#FFFFFF', 4], ['#00205B', 2]], x: 8, y: 8 },
  se: { w: 16, h: 10, bg: '#006AA7', cross: [['#FECC02', 2]], x: 6, y: 5 },
  dk: { w: 37, h: 28, bg: '#C8102E', cross: [['#FFFFFF', 4]], x: 14, y: 14 },
  fi: { w: 18, h: 11, bg: '#FFFFFF', cross: [['#002F6C', 3]], x: 6.5, y: 5.5 },
};

export function Flag({ code, height = 14 }: { code: string; height?: number }) {
  const f = FLAGS[code];
  if (!f) return null;
  return (
    <svg
      className="flag"
      viewBox={`0 0 ${f.w} ${f.h}`}
      height={height}
      width={(height * f.w) / f.h}
      aria-hidden="true"
      focusable="false"
    >
      <rect width={f.w} height={f.h} fill={f.bg} />
      {f.cross.map(([color, t]) => (
        <g key={color} fill={color}>
          <rect x={f.x - t / 2} y={0} width={t} height={f.h} />
          <rect x={0} y={f.y - t / 2} width={f.w} height={t} />
        </g>
      ))}
    </svg>
  );
}
