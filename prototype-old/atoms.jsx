// Shared atoms used across screens.

// Whisper card — paper-textured note with optional fading state.
function WhisperCard({ t, content, distance, ttl, views, language, author, hand = false, fading = false, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: t.card,
      border: `1px solid ${t.cardEdge}`,
      borderRadius: 14,
      padding: '14px 16px 12px',
      boxShadow: `0 1px 0 ${t.cardEdge}, 0 12px 24px -18px rgba(0,0,0,0.25)`,
      position: 'relative',
      opacity: fading ? 0.45 : 1,
      filter: fading ? 'blur(0.4px)' : 'none',
      transition: 'opacity 800ms, filter 800ms',
      cursor: onClick ? 'pointer' : 'default',
    }}>
      {/* corner crease */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 22, height: 22,
        background: `linear-gradient(225deg, ${t.bgDeep} 50%, transparent 50%)`,
        borderTopRightRadius: 14,
        opacity: 0.6,
      }} />
      <div style={{
        fontFamily: hand ? t.hand : t.serif,
        fontSize: hand ? 22 : 17,
        lineHeight: hand ? '26px' : '23px',
        color: t.ink, marginBottom: 10,
        fontWeight: hand ? 400 : 400,
        textWrap: 'pretty',
      }}>
        {content}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        fontFamily: t.mono, fontSize: 11, color: t.inkSoft,
        letterSpacing: 0.2,
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Icon.near c={t.accent} s={12} />
          {distance}
        </span>
        <span style={{ width: 2, height: 2, borderRadius: '50%', background: t.inkFaint }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Icon.clock c={t.inkSoft} s={11} /> {ttl}
        </span>
        <span style={{ width: 2, height: 2, borderRadius: '50%', background: t.inkFaint }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Icon.eye c={t.inkSoft} s={11} /> {views}
        </span>
        <span style={{ flex: 1 }} />
        {language && <span style={{
          padding: '2px 6px', borderRadius: 4,
          background: t.bgDeep, color: t.inkSoft,
          fontSize: 10, letterSpacing: 0.4,
        }}>{language}</span>}
      </div>
    </div>
  );
}

// Tab bar — bottom nav. Three tabs only (KISS): Map / Drop / Me.
// "Nearby list" lives as a toggle inside Map.
function TabBar({ t, active = 'map', onSelect = () => {} }) {
  const items = [
    { k: 'map', label: 'Map', icon: Icon.pin },
    { k: 'drop', label: 'Drop', icon: Icon.feather, primary: true },
    { k: 'me', label: 'Me', icon: Icon.user },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: t.bg,
      borderTop: `1px solid ${t.cardEdge}`,
      paddingBottom: 24, paddingTop: 8,
      display: 'flex', justifyContent: 'space-around',
      zIndex: 10,
    }}>
      {items.map(it => {
        const I = it.icon;
        const isActive = active === it.k;
        if (it.primary) {
          return (
            <button key={it.k} onClick={() => onSelect(it.k)} style={{
              border: 'none', background: t.accent, color: t.bg,
              width: 52, height: 52, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: -22, boxShadow: `0 8px 18px ${t.accent}55`,
              cursor: 'pointer',
            }}>
              <I c={t.bg} s={22} />
            </button>
          );
        }
        return (
          <button key={it.k} onClick={() => onSelect(it.k)} style={{
            border: 'none', background: 'transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 2, padding: '6px 12px', cursor: 'pointer',
            color: isActive ? t.ink : t.inkFaint,
          }}>
            <I c={isActive ? t.ink : t.inkFaint} s={22} />
            <span style={{
              fontFamily: t.sans, fontSize: 10, letterSpacing: 0.3,
              fontWeight: isActive ? 600 : 400,
            }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Reusable header with eyebrow + serif title (used on most screens).
function ScreenHeader({ t, eyebrow, title, trailing }) {
  return (
    <div style={{ padding: '8px 22px 14px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{
          fontFamily: t.mono, fontSize: 11, color: t.accent,
          letterSpacing: 1.5, textTransform: 'uppercase',
        }}>{eyebrow}</div>
        {trailing}
      </div>
      <div style={{
        fontFamily: t.serif, fontSize: 28, color: t.ink,
        lineHeight: '32px', marginTop: 4, fontWeight: 500,
        letterSpacing: -0.4,
      }}>{title}</div>
    </div>
  );
}

window.WhisperCard = WhisperCard;
window.TabBar = TabBar;
window.ScreenHeader = ScreenHeader;
