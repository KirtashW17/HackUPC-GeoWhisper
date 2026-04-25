// StylizedMap — hand-drawn-feeling map for the prototype.
// Streets as offset paths, parks as soft splotches, water as a curve.
// `t` is theme tokens. `pulse` shows the user-here animated ring.

function StylizedMap({ t, width = 390, height = 540, dim = false, children }) {
  // Use a stable seed-ish pattern. Streets are drawn as a couple of curving
  // arteries plus a loose grid offset off them. Parks as bezier blobs.
  const stroke = t.mapStroke;
  const strokeSoft = t.mapStrokeSoft;
  return (
    <div style={{
      position: 'absolute', inset: 0, background: t.mapBg, overflow: 'hidden',
    }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
        style={{ position: 'absolute', inset: 0, opacity: dim ? 0.55 : 1 }}>
        <defs>
          <filter id="paper" x="0" y="0">
            <feTurbulence baseFrequency="0.9" numOctaves="2" seed="3" />
            <feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0 0.18  0 0 0 0.06 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
        </defs>

        {/* Park blobs */}
        <path d={`M ${width * 0.05} ${height * 0.14} q ${width * 0.18} -${height * 0.06} ${width * 0.32} ${height * 0.04} q ${width * 0.04} ${height * 0.16} -${width * 0.14} ${height * 0.18} q -${width * 0.22} ${height * 0.02} -${width * 0.18} -${height * 0.22} Z`}
          fill={t.mapPark} opacity="0.7" />
        <path d={`M ${width * 0.62} ${height * 0.62} q ${width * 0.26} -${height * 0.04} ${width * 0.34} ${height * 0.12} q ${width * 0.04} ${height * 0.18} -${width * 0.16} ${height * 0.18} q -${width * 0.28} -${height * 0.02} -${width * 0.22} -${height * 0.28} Z`}
          fill={t.mapPark} opacity="0.55" />

        {/* Water — broad bottom-left river */}
        <path d={`M -20 ${height * 0.78} C ${width * 0.3} ${height * 0.7}, ${width * 0.55} ${height * 0.95}, ${width + 20} ${height * 0.86} L ${width + 20} ${height + 20} L -20 ${height + 20} Z`}
          fill={t.mapWater} opacity="0.85" />

        {/* Major arteries */}
        <path d={`M -10 ${height * 0.36} C ${width * 0.3} ${height * 0.32}, ${width * 0.55} ${height * 0.46}, ${width + 10} ${height * 0.42}`}
          stroke={stroke} strokeWidth="14" fill="none" strokeLinecap="round" opacity="0.55" />
        <path d={`M -10 ${height * 0.36} C ${width * 0.3} ${height * 0.32}, ${width * 0.55} ${height * 0.46}, ${width + 10} ${height * 0.42}`}
          stroke={t.mapBg} strokeWidth="6" fill="none" strokeLinecap="round" />

        <path d={`M ${width * 0.18} -10 C ${width * 0.22} ${height * 0.3}, ${width * 0.3} ${height * 0.55}, ${width * 0.36} ${height + 10}`}
          stroke={stroke} strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.5" />
        <path d={`M ${width * 0.18} -10 C ${width * 0.22} ${height * 0.3}, ${width * 0.3} ${height * 0.55}, ${width * 0.36} ${height + 10}`}
          stroke={t.mapBg} strokeWidth="4" fill="none" strokeLinecap="round" />

        <path d={`M ${width * 0.78} -10 C ${width * 0.74} ${height * 0.25}, ${width * 0.82} ${height * 0.55}, ${width * 0.74} ${height + 10}`}
          stroke={stroke} strokeWidth="9" fill="none" strokeLinecap="round" opacity="0.5" />
        <path d={`M ${width * 0.78} -10 C ${width * 0.74} ${height * 0.25}, ${width * 0.82} ${height * 0.55}, ${width * 0.74} ${height + 10}`}
          stroke={t.mapBg} strokeWidth="3" fill="none" strokeLinecap="round" />

        {/* Side streets — soft hairlines */}
        {[0.10, 0.22, 0.50, 0.62, 0.74].map((y, i) => (
          <path key={'h'+i}
            d={`M -10 ${height * y} q ${width * 0.3} ${(i % 2 ? -1 : 1) * 8} ${width * 0.6} 4 t ${width * 0.5} -2`}
            stroke={strokeSoft} strokeWidth="1.2" fill="none" />
        ))}
        {[0.08, 0.30, 0.46, 0.58, 0.88].map((x, i) => (
          <path key={'v'+i}
            d={`M ${width * x} -10 q ${(i % 2 ? -1 : 1) * 6} ${height * 0.3} 2 ${height * 0.6} t -2 ${height * 0.5}`}
            stroke={strokeSoft} strokeWidth="1.2" fill="none" />
        ))}

        {/* Block fills — sparse, subtle */}
        {[
          [0.12, 0.16, 0.07, 0.04], [0.42, 0.18, 0.06, 0.05],
          [0.56, 0.24, 0.08, 0.05], [0.10, 0.46, 0.07, 0.04],
          [0.44, 0.50, 0.06, 0.05], [0.62, 0.48, 0.06, 0.04],
          [0.18, 0.66, 0.07, 0.04], [0.46, 0.66, 0.06, 0.04],
        ].map(([x,y,w,h], i) => (
          <rect key={i} x={width*x} y={height*y} width={width*w} height={height*h}
            fill={stroke} opacity="0.08" rx="1.5" />
        ))}
      </svg>
      {children}
    </div>
  );
}

// A whisper marker on the map — small ink dot with a halo.
function MapPin({ x, y, t, intensity = 1, label, fading = false }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      opacity: fading ? 0.4 : 1,
      transition: 'opacity 600ms',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: t.accent, opacity: 0.12 * intensity,
        position: 'absolute', inset: '-8px 0 0 -8px',
        animation: 'gw-pulse 2.4s ease-out infinite',
      }} />
      <div style={{
        width: 14, height: 14, borderRadius: '50%',
        background: t.accent, position: 'relative',
        boxShadow: `0 0 0 3px ${t.bg}, 0 2px 4px rgba(0,0,0,0.18)`,
      }} />
      {label && (
        <div style={{
          position: 'absolute', left: 20, top: -2, whiteSpace: 'nowrap',
          fontFamily: t.hand, fontSize: 16, color: t.ink, opacity: 0.75,
        }}>{label}</div>
      )}
    </div>
  );
}

// "You are here" — concentric pulse + dot in accent.
function HerePin({ x, y, t }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      transform: 'translate(-50%, -50%)',
    }}>
      <div style={{
        width: 88, height: 88, borderRadius: '50%',
        background: t.ghost, opacity: 0.10,
        position: 'absolute', inset: '-34px 0 0 -34px',
        animation: 'gw-pulse-here 2.6s ease-out infinite',
      }} />
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        background: t.ghost, border: `3px solid ${t.bg}`,
        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
        position: 'relative',
      }} />
    </div>
  );
}

window.StylizedMap = StylizedMap;
window.MapPin = MapPin;
window.HerePin = HerePin;
