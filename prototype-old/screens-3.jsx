// Detail (with ink-bleed vanish) + Settings/Profile.

// Simple fade vanish — no fancy animation, just opacity + soft blur out.
function VanishingNote({ t, stage, children }) {
  const opacity = stage === 0 ? 1 : stage === 1 ? 0.55 : 0;
  const blur    = stage === 0 ? 0 : stage === 1 ? 0.6  : 1.4;
  return (
    <div style={{
      position: 'relative',
      filter: `blur(${blur}px)`,
      opacity,
      transition: 'opacity 1600ms ease-in, filter 1600ms ease-in',
    }}>
      {children}
    </div>
  );
}

function DetailScreen({ t, vanishStage = 0 }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: t.bg, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <StylizedMap t={t} width={390} height={780} dim />
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(180deg, ${t.bg}aa 0%, ${t.bg}ee 50%, ${t.bg} 100%)`,
        }} />
      </div>

      <div style={{ position: 'relative', padding: '60px 22px 0', display: 'flex', justifyContent: 'space-between' }}>
        <button style={{
          background: t.card, border: `1px solid ${t.cardEdge}`, width: 38, height: 38,
          borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <Icon.back c={t.ink} />
        </button>
      </div>

      <div style={{ position: 'relative', padding: '32px 22px 0', flex: 1 }}>
        <div style={{
          fontFamily: t.mono, fontSize: 10, color: t.accent,
          letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icon.near c={t.accent} s={12} /> 12M AWAY · LEFT 4H AGO
        </div>

        {/* the note — wrapped in InkBleed */}
        <div style={{ position: 'relative' }}>
          {/* simple fade — no drip / melt artifacts */}
          <VanishingNote t={t} stage={vanishStage}>
            <div style={{
              background: t.card, borderRadius: 18,
              padding: '26px 24px 22px',
              border: `1px solid ${t.cardEdge}`,
              boxShadow: `0 30px 60px -30px rgba(0,0,0,0.35), 0 1px 0 ${t.cardEdge}`,
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: -8, left: 30, width: 56, height: 18,
                background: t.accentSoft, opacity: 0.7,
                transform: 'rotate(-3deg)', borderRadius: 2,
              }} />
              <div style={{
                fontFamily: t.serif, fontSize: 22, lineHeight: '30px',
                color: t.ink, fontWeight: 400, textWrap: 'pretty',
              }}>
                "Sit by the window — they bring out the saffron buns at 4.
                <br /><br />
                Order one with cardamom coffee. The barista won't tell you,
                but if you ask kindly she'll add the orange peel."
              </div>
              <div style={{
                marginTop: 22, paddingTop: 16,
                borderTop: `1px dashed ${t.cardEdge}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ fontFamily: t.hand, fontSize: 22, color: t.ghost }}>— a regular</div>
                <div style={{
                  padding: '3px 8px', borderRadius: 4,
                  background: t.bgDeep, color: t.inkSoft,
                  fontFamily: t.mono, fontSize: 10, letterSpacing: 0.4,
                }}>EN</div>
              </div>
            </div>
          </VanishingNote>
        </div>

        <div style={{
          marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14,
          opacity: vanishStage === 2 ? 0.4 : 1, transition: 'opacity 1200ms',
        }}>
          <LifecycleBar t={t} icon={Icon.clock} label="FADES IN" value="2h 14m" progress={0.62} subtext="of 6h" />
          <LifecycleBar t={t} icon={Icon.eye} label="READS LEFT" value={vanishStage > 0 ? '0' : '2'}
            progress={vanishStage > 0 ? 1 : 0.6}
            subtext={vanishStage > 0 ? 'last read · this one' : '3 of 5 read · you’re #4'} />
        </div>

        <div style={{
          marginTop: 22, display: 'flex', gap: 8,
          opacity: vanishStage === 2 ? 0.3 : 1, transition: 'opacity 1200ms',
        }}>
          <button style={{
            flex: 1, padding: '12px 0', borderRadius: 12,
            background: t.card, border: `1px solid ${t.cardEdge}`,
            color: t.ink, fontFamily: t.sans, fontSize: 14, fontWeight: 500,
            cursor: 'pointer', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Icon.wave c={t.ink} s={16} /> Whisper back
          </button>
          <button style={{
            padding: '12px 16px', borderRadius: 12,
            background: t.card, border: `1px solid ${t.cardEdge}`,
            color: t.inkSoft, fontFamily: t.sans, fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}>Report</button>
        </div>

        {vanishStage === 2 && (
          <div style={{
            marginTop: 22, textAlign: 'center',
            fontFamily: t.hand, fontSize: 22, color: t.accent,
            opacity: 0.85,
            animation: 'gw-vanish-text 600ms ease-out both',
          }}>
            this whisper has just vanished —
          </div>
        )}
      </div>
    </div>
  );
}

// (Removed drip helper — vanish is now a plain fade.)

function LifecycleBar({ t, icon: I, label, value, progress, subtext }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: t.mono, fontSize: 10, color: t.inkSoft, letterSpacing: 1.2,
        }}>
          <I c={t.inkSoft} s={12} /> {label}
        </span>
        <span style={{ fontFamily: t.serif, fontSize: 14, color: t.ink, fontWeight: 600 }}>
          {value} <span style={{ color: t.inkFaint, fontWeight: 400, fontSize: 12 }}>{subtext}</span>
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: t.bgDeep, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: t.accent, borderRadius: 2 }} />
      </div>
    </div>
  );
}

function SettingsScreen({ t, onTab }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: t.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '60px 22px 0' }}>
        <ScreenHeader t={t} eyebrow="@MARINA · BARCELONA" title="Yourself" />
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '6px 18px 110px' }}>
        <div style={{
          background: t.card, borderRadius: 16, padding: '18px',
          border: `1px solid ${t.cardEdge}`,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: t.accentSoft, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontFamily: t.serif, fontSize: 24, color: t.accent, fontWeight: 600,
            border: `1px solid ${t.cardEdge}`,
          }}>M</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: t.serif, fontSize: 18, color: t.ink, fontWeight: 600 }}>Marina</div>
            <div style={{ fontFamily: t.mono, fontSize: 11, color: t.inkSoft, marginTop: 2, letterSpacing: 0.4 }}>
              12 dropped · 4 still alive
            </div>
          </div>
          <Icon.arrow c={t.inkFaint} s={16} />
        </div>

        <SectionLabel t={t}>LANGUAGES</SectionLabel>
        <div style={{ background: t.card, borderRadius: 14, border: `1px solid ${t.cardEdge}`, overflow: 'hidden' }}>
          <SettingsRow t={t} title="Show whispers in" disabled
            detail={<><Chip t={t} on>EN</Chip><Chip t={t} on>ES</Chip><Chip t={t} on>CA</Chip></>} />
          <SettingsRow t={t} title="Interface" detail="Català" last />
        </div>

        <SectionLabel t={t}>PRESENCE</SectionLabel>
        <div style={{ background: t.card, borderRadius: 14, border: `1px solid ${t.cardEdge}`, overflow: 'hidden' }}>
          <SettingsRow t={t} title="Search radius" detail="200m" />
          <SettingsRow t={t} title="Notify me when nearby" detail="Sometimes" disabled />
          <SettingsRow t={t} title="Anonymous mode" detail="Off" disabled last />
        </div>

        <SectionLabel t={t}>YOUR TRAIL</SectionLabel>
        <div style={{
          background: t.card, borderRadius: 14, padding: '14px 16px',
          border: `1px solid ${t.cardEdge}`,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {[
            { c: 'Sit by the window — saffron buns at 4.', d: '12m · alive · 3/5 reads' },
            { c: 'It always smells like rain here on Tuesdays…', d: '2km · alive · 0/8 reads' },
            { c: 'The bench faces east at sunrise.', d: 'vanished 2 days ago', dim: true },
          ].map((n, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, opacity: n.dim ? 0.45 : 1 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: n.dim ? t.inkFaint : t.accent,
                marginTop: 8, flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: t.serif, fontSize: 14, color: t.ink,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{n.c}</div>
                <div style={{ fontFamily: t.mono, fontSize: 10, color: t.inkSoft, marginTop: 2, letterSpacing: 0.4 }}>{n.d}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          textAlign: 'center', marginTop: 28, marginBottom: 8,
          fontFamily: t.hand, fontSize: 18, color: t.inkSoft,
        }}>be quiet, be here.</div>
      </div>

      <TabBar t={t} active="me" onSelect={onTab} />
    </div>
  );
}

function SectionLabel({ t, children }) {
  return (
    <div style={{
      fontFamily: t.mono, fontSize: 10, color: t.inkSoft, letterSpacing: 1.4,
      padding: '20px 6px 8px',
    }}>{children}</div>
  );
}

function SettingsRow({ t, title, detail, last, disabled }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '14px 16px', gap: 10,
      borderBottom: last ? 'none' : `1px solid ${t.cardEdge}`,
      opacity: disabled ? 0.55 : 1,
    }}>
      <div style={{ flex: 1, fontFamily: t.serif, fontSize: 15, color: t.ink }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {disabled && (
          <span style={{
            padding: '2px 6px', borderRadius: 4, background: t.bgDeep,
            color: t.inkSoft, fontFamily: t.mono, fontSize: 9,
            letterSpacing: 0.6, fontWeight: 600,
          }}>SOON</span>
        )}
        {typeof detail === 'string' ? (
          <span style={{ fontFamily: t.mono, fontSize: 11, color: t.inkSoft, letterSpacing: 0.4 }}>{detail}</span>
        ) : <span style={{ display: 'flex', gap: 4 }}>{detail}</span>}
        <Icon.arrow c={t.inkFaint} s={14} />
      </div>
    </div>
  );
}

function Chip({ t, children, on }) {
  return (
    <span style={{
      padding: '3px 7px', borderRadius: 5,
      background: on ? t.accent : t.bgDeep,
      color: on ? t.bg : t.inkSoft,
      fontFamily: t.mono, fontSize: 10, letterSpacing: 0.6, fontWeight: 600,
    }}>{children}</span>
  );
}

window.DetailScreen = DetailScreen;
window.SettingsScreen = SettingsScreen;
