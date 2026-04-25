// Map (default) + Nearby (list) + Empty + Denied + first-launch onboarding.

// ─── Onboarding ────────────────────────────────────────────────────
function OnboardingScreen({ t, onContinue }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: t.bg,
      display: 'flex', flexDirection: 'column',
      padding: '60px 28px 40px',
    }}>
      <div style={{ position: 'absolute', top: 90, left: 30, opacity: 0.5 }}><Icon.ghost c={t.ghost} s={14} /></div>
      <div style={{ position: 'absolute', top: 140, right: 50, opacity: 0.35 }}><Icon.ghost c={t.ghost} s={11} /></div>
      <div style={{ position: 'absolute', top: 230, left: 70, opacity: 0.25 }}><Icon.ghost c={t.ghost} s={9} /></div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{
          fontFamily: t.mono, fontSize: 11, color: t.accent,
          letterSpacing: 2, textTransform: 'uppercase', marginBottom: 18,
        }}>GeoWhisper</div>
        <div style={{
          fontFamily: t.serif, fontSize: 44, lineHeight: '46px',
          color: t.ink, fontWeight: 500, letterSpacing: -0.8,
          textWrap: 'balance',
        }}>
          Leave a note<br />
          <span style={{ fontStyle: 'italic', color: t.accent }}>where you stood</span>.
        </div>
        <div style={{
          fontFamily: t.serif, fontSize: 17, lineHeight: '24px',
          color: t.inkSoft, marginTop: 22, maxWidth: 300, textWrap: 'pretty',
        }}>
          Whispers only appear to those who walk close enough — and they fade after being read.
        </div>

        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            ['Anchored', 'A note lives at the place it was dropped'],
            ['Ephemeral', 'It vanishes after a time, or after a few reads'],
            ['Quiet', 'No followers, no feed — just here, just now'],
          ].map(([h, s]) => (
            <div key={h} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.accent, marginTop: 8, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: t.serif, fontSize: 16, color: t.ink, fontWeight: 600 }}>{h}</div>
                <div style={{ fontFamily: t.sans, fontSize: 13, color: t.inkSoft, marginTop: 1 }}>{s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={onContinue} style={{
        background: t.accent, color: t.bg, border: 'none',
        padding: '16px 0', borderRadius: 14,
        fontFamily: t.sans, fontSize: 16, fontWeight: 600,
        letterSpacing: 0.2, cursor: 'pointer',
        boxShadow: `0 12px 24px -10px ${t.accent}88`,
      }}>Allow location & begin</button>
      <div style={{
        textAlign: 'center', marginTop: 12,
        fontFamily: t.mono, fontSize: 10, color: t.inkFaint, letterSpacing: 0.5,
      }}>WE NEVER STORE WHERE YOU'VE BEEN</div>
    </div>
  );
}

// ─── Map ──────────────────────────────────────────────────────────
// Internal `view` toggle — 'map' | 'list'. Empty when no notes.
function MapScreen({ t, onTab, onOpenNote, view = 'map', empty = false }) {
  const [mode, setMode] = React.useState(view);

  const pins = empty ? [] : [
    { x: 110, y: 180, intensity: 1, label: 'a tip' },
    { x: 230, y: 130, intensity: 0.7 },
    { x: 280, y: 240, intensity: 1, label: 'memory' },
    { x: 90, y: 320, intensity: 0.6 },
    { x: 200, y: 380, intensity: 0.85 },
    { x: 310, y: 420, intensity: 0.5 },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, background: t.bg, overflow: 'hidden' }}>
      {mode === 'map' ? (
        <>
          <StylizedMap t={t} width={390} height={780}>
            {pins.map((p, i) => <MapPin key={i} {...p} t={t} />)}
            <HerePin x={195} y={300} t={t} />
          </StylizedMap>

          {/* top header overlay */}
          <MapTopBar t={t} mode={mode} setMode={setMode} count={empty ? 0 : 6} />

          {/* peek bottom sheet OR empty state */}
          {empty ? (
            <EmptyPeek t={t} />
          ) : (
            <div style={{ position: 'absolute', bottom: 96, left: 16, right: 16 }}>
              <div onClick={() => onOpenNote && onOpenNote()} style={{
                background: t.card, borderRadius: 16,
                border: `1px solid ${t.cardEdge}`, padding: '14px 16px',
                boxShadow: '0 12px 30px rgba(0,0,0,0.1)', cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6,
                  fontFamily: t.mono, fontSize: 10, color: t.accent, letterSpacing: 1 }}>
                  <Icon.near c={t.accent} s={11} /> 12M FROM YOU · CLOSEST
                </div>
                <div style={{ fontFamily: t.serif, fontSize: 17, lineHeight: '23px',
                  color: t.ink, marginTop: 6, fontWeight: 500 }}>
                  "Sit by the window — they bring out the saffron buns at 4."
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10,
                  fontFamily: t.mono, fontSize: 10, color: t.inkSoft, letterSpacing: 0.4 }}>
                  <Icon.clock c={t.inkSoft} s={11} /> 2h 14m left
                  <span style={{ width: 2, height: 2, borderRadius: '50%', background: t.inkFaint }} />
                  <Icon.eye c={t.inkSoft} s={11} /> 3 of 5 reads
                  <span style={{ flex: 1 }} />
                  <Icon.arrow c={t.accent} s={14} />
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <NearbyList t={t} onOpenNote={onOpenNote} mode={mode} setMode={setMode} empty={empty} />
      )}

      <TabBar t={t} active="map" onSelect={onTab} />
    </div>
  );
}

function MapTopBar({ t, mode, setMode, count }) {
  return (
    <div style={{
      position: 'absolute', top: 56, left: 16, right: 16,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div style={{
        background: t.card, padding: '8px 6px 8px 14px', borderRadius: 14,
        border: `1px solid ${t.cardEdge}`, boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon.near c={t.accent} s={16} />
          <div>
            <div style={{ fontFamily: t.mono, fontSize: 9, color: t.inkSoft, letterSpacing: 1 }}>NEARBY</div>
            <div style={{ fontFamily: t.serif, fontSize: 14, color: t.ink, fontWeight: 600, marginTop: -1 }}>
              {count} {count === 1 ? 'whisper' : 'whispers'} · 200m
            </div>
          </div>
        </div>
        {/* segmented map / list */}
        <div style={{
          display: 'flex', gap: 2, padding: 3, background: t.bgDeep,
          borderRadius: 999, fontFamily: t.mono, fontSize: 10,
        }}>
          {[['map', 'MAP'], ['list', 'LIST']].map(([k, l]) => (
            <button key={k} onClick={() => setMode(k)} style={{
              padding: '5px 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: mode === k ? t.card : 'transparent',
              color: mode === k ? t.ink : t.inkSoft,
              letterSpacing: 0.8, fontWeight: 600, fontFamily: t.mono, fontSize: 10,
            }}>{l}</button>
          ))}
        </div>
      </div>
      <div title="Recenter on me" style={{
        background: t.card, width: 42, height: 42, borderRadius: '50%',
        border: `1px solid ${t.cardEdge}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
      }}>
        <Icon.near c={t.ink} s={18} />
      </div>
    </div>
  );
}

function NearbyList({ t, onOpenNote, mode, setMode, empty }) {
  const notes = empty ? [] : [
    { content: "Sit by the window — they bring out the saffron buns at 4.", distance: "12m", ttl: "2h 14m", views: "3/5", language: "EN" },
    { content: "M'he assegut aquí pensant en tu. Espero que això et faci somriure.", distance: "48m", ttl: "5h 02m", views: "0/3", language: "CA", hand: true },
    { content: "Cola por la izquierda — la otra es para reservas.", distance: "85m", ttl: "32m", views: "8/12", language: "ES" },
    { content: "If you're reading this, the bench faces east. Wait for the 7am light.", distance: "120m", ttl: "1d 4h", views: "1/8", language: "EN" },
    { content: "Treasure: 14 paces toward the fountain. Look low.", distance: "180m", ttl: "44m", views: "2/3", language: "EN", hand: true },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, background: t.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '52px 16px 8px' }}>
        <MapTopBar t={t} mode={mode} setMode={setMode} count={empty ? 0 : 6} />
      </div>
      <div style={{ padding: '60px 18px 110px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {empty ? <EmptyState t={t} inline /> : notes.map((n, i) => (
          <WhisperCard key={i} t={t} {...n} onClick={() => onOpenNote && onOpenNote()} />
        ))}
      </div>
    </div>
  );
}

// Empty peek (over the map) — no list, just a soft prompt.
function EmptyPeek({ t }) {
  return (
    <div style={{ position: 'absolute', bottom: 96, left: 16, right: 16 }}>
      <div style={{
        background: t.card, borderRadius: 16,
        border: `1px solid ${t.cardEdge}`, padding: '18px 20px',
        boxShadow: '0 12px 30px rgba(0,0,0,0.1)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: t.bgDeep, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon.ghost c={t.ghost} s={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: t.serif, fontSize: 16, color: t.ink, fontWeight: 600 }}>
            No ghosts nearby.
          </div>
          <div style={{ fontFamily: t.serif, fontSize: 13, color: t.inkSoft, marginTop: 2, fontStyle: 'italic' }}>
            Be the first to leave a whisper here.
          </div>
        </div>
        <Icon.feather c={t.accent} s={20} />
      </div>
    </div>
  );
}

function EmptyState({ t, inline }) {
  return (
    <div style={{
      padding: inline ? '60px 22px' : '120px 22px',
      textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <div style={{ marginBottom: 18, opacity: 0.7 }}>
        <Icon.ghost c={t.ghost} s={48} />
      </div>
      <div style={{
        fontFamily: t.serif, fontSize: 24, color: t.ink, fontWeight: 500,
        letterSpacing: -0.3, marginBottom: 8,
      }}>No ghosts nearby.</div>
      <div style={{
        fontFamily: t.serif, fontSize: 16, color: t.inkSoft,
        lineHeight: '22px', maxWidth: 260, textWrap: 'pretty', fontStyle: 'italic',
      }}>
        Drop the first one — whoever passes through next will find it.
      </div>
      <div style={{
        marginTop: 22, display: 'flex', gap: 16,
        fontFamily: t.mono, fontSize: 9, color: t.inkFaint, letterSpacing: 1,
      }}>
        <span>EN · No ghosts nearby.</span>
        <span>·</span>
        <span>ES · Sin susurros aquí.</span>
        <span>·</span>
        <span>CA · Cap xiuxiueig.</span>
      </div>
    </div>
  );
}

// ─── GPS denied ────────────────────────────────────────────────────
function DeniedScreen({ t, onRetry }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: t.bg, display: 'flex', flexDirection: 'column' }}>
      {/* faded map watermark */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
        <StylizedMap t={t} width={390} height={780} dim />
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(180deg, ${t.bg}cc, ${t.bg})`,
        }} />
      </div>
      <div style={{ position: 'relative', padding: '90px 28px 28px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: t.card, border: `1px solid ${t.cardEdge}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 8px 20px -8px rgba(0,0,0,0.2)`,
          marginBottom: 24,
        }}>
          <Icon.pin c={t.accent} s={28} />
        </div>
        <div style={{
          fontFamily: t.mono, fontSize: 11, color: t.accent,
          letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8,
        }}>Location needed</div>
        <div style={{
          fontFamily: t.serif, fontSize: 32, lineHeight: '36px',
          color: t.ink, fontWeight: 500, letterSpacing: -0.4,
          textWrap: 'balance', marginBottom: 14,
        }}>GeoWhisper only works <span style={{ fontStyle: 'italic', color: t.accent }}>here</span>.</div>
        <div style={{
          fontFamily: t.serif, fontSize: 17, lineHeight: '24px',
          color: t.inkSoft, textWrap: 'pretty',
        }}>
          A whisper has nowhere to live without a place. Allow location to read or drop notes nearby — we never keep your trail.
        </div>

        {/* steps card */}
        <div style={{
          marginTop: 28, background: t.card, borderRadius: 14,
          border: `1px solid ${t.cardEdge}`, padding: '14px 16px',
        }}>
          <div style={{
            fontFamily: t.mono, fontSize: 10, color: t.inkSoft, letterSpacing: 1.2, marginBottom: 10,
          }}>HOW TO ENABLE</div>
          {[
            ['1', 'Open Settings → Privacy → Location'],
            ['2', 'Find GeoWhisper in the list'],
            ['3', 'Choose “While Using the App”'],
          ].map(([n, s]) => (
            <div key={n} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '8px 0', borderTop: n === '1' ? 'none' : `1px dashed ${t.cardEdge}`,
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: t.bgDeep, color: t.accent,
                fontFamily: t.mono, fontSize: 11, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>{n}</div>
              <div style={{ fontFamily: t.serif, fontSize: 14, color: t.ink, paddingTop: 1 }}>{s}</div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <button onClick={onRetry} style={{
          background: t.accent, color: t.bg, border: 'none',
          padding: '16px 0', borderRadius: 14,
          fontFamily: t.sans, fontSize: 16, fontWeight: 600,
          letterSpacing: 0.2, cursor: 'pointer', marginTop: 20,
          boxShadow: `0 12px 24px -10px ${t.accent}88`,
        }}>Try again</button>
        <button style={{
          background: 'transparent', color: t.inkSoft, border: 'none',
          padding: '14px 0', fontFamily: t.sans, fontSize: 14, cursor: 'pointer',
        }}>Browse a sample of public whispers</button>
      </div>
    </div>
  );
}

window.OnboardingScreen = OnboardingScreen;
window.MapScreen = MapScreen;
window.DeniedScreen = DeniedScreen;
