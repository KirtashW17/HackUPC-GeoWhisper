// Compose (with disabled visibility selector) + Auth (login + signup).

function ComposeScreen({ t, onTab, onSend }) {
  const [text, setText] = React.useState("It always smells like rain here on Tuesdays. Hope you noticed too.");
  const [ttl, setTtl] = React.useState('1d');
  const [views, setViews] = React.useState(5);
  const [vis, setVis] = React.useState('public');

  return (
    <div style={{ position: 'absolute', inset: 0, background: t.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <StylizedMap t={t} width={390} height={780} dim />
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(180deg, ${t.bg}cc 0%, ${t.bg}ee 40%, ${t.bg} 100%)`,
      }} />

      <div style={{ position: 'relative', padding: '60px 22px 0', display: 'flex', justifyContent: 'space-between' }}>
        <button style={{
          background: t.card, border: `1px solid ${t.cardEdge}`, width: 38, height: 38,
          borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <Icon.back c={t.ink} />
        </button>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: t.card, border: `1px solid ${t.cardEdge}`,
          padding: '8px 12px', borderRadius: 999,
          fontFamily: t.mono, fontSize: 10, color: t.inkSoft, letterSpacing: 0.8,
        }}>
          <Icon.pin c={t.accent} s={12} /> CARRER DEL CLIP, BCN · LOCKED TO YOU
        </div>
      </div>

      <div style={{ position: 'relative', padding: '20px 22px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          fontFamily: t.mono, fontSize: 11, color: t.accent,
          letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6,
        }}>Drop a whisper</div>
        <div style={{
          fontFamily: t.serif, fontSize: 24, color: t.ink, lineHeight: '28px',
          fontWeight: 500, letterSpacing: -0.4, marginBottom: 14,
        }}>
          What should the next person here know?
        </div>

        <div style={{
          background: t.card, borderRadius: 16, padding: '14px 16px',
          border: `1px solid ${t.cardEdge}`, position: 'relative',
          boxShadow: `0 12px 30px -16px rgba(0,0,0,0.2)`,
        }}>
          <textarea value={text} onChange={(e) => setText(e.target.value)}
            style={{
              width: '100%', border: 'none', resize: 'none', outline: 'none',
              background: 'transparent', minHeight: 88,
              fontFamily: t.serif, fontSize: 17, lineHeight: '24px', color: t.ink,
            }}
          />
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontFamily: t.mono, fontSize: 10, color: t.inkFaint, marginTop: 4, letterSpacing: 0.5,
          }}>
            <span>SIGNED IN AS @marina · CA</span>
            <span>{text.length}/500</span>
          </div>
        </div>

        {/* Visibility — disabled, "soon" hint for future friend graph */}
        <div style={{ marginTop: 16 }}>
          <div style={{
            fontFamily: t.mono, fontSize: 10, color: t.inkSoft,
            letterSpacing: 1.2, marginBottom: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>VISIBLE TO</span>
            <span style={{
              padding: '2px 6px', borderRadius: 4, background: t.bgDeep,
              color: t.inkSoft, fontSize: 9, letterSpacing: 0.6,
            }}>SOON</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { k: 'public', label: 'Anyone here', icon: Icon.globe, on: true },
              { k: 'friends', label: 'Friends', icon: Icon.user, disabled: true },
              { k: 'one', label: 'One person', icon: Icon.feather, disabled: true },
            ].map(opt => {
              const I = opt.icon;
              const active = vis === opt.k && !opt.disabled;
              return (
                <button key={opt.k}
                  onClick={() => !opt.disabled && setVis(opt.k)}
                  disabled={opt.disabled}
                  style={{
                    flex: 1, padding: '10px 6px', borderRadius: 10,
                    background: active ? t.ink : t.card,
                    color: active ? t.bg : (opt.disabled ? t.inkFaint : t.ink),
                    border: `1px solid ${active ? t.ink : t.cardEdge}`,
                    fontFamily: t.sans, fontSize: 11, fontWeight: 600,
                    cursor: opt.disabled ? 'not-allowed' : 'pointer',
                    opacity: opt.disabled ? 0.55 : 1,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  }}>
                  <I c={active ? t.bg : (opt.disabled ? t.inkFaint : t.ink)} s={16} />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontFamily: t.mono, fontSize: 10, color: t.inkSoft, letterSpacing: 1.2 }}>FADES AFTER</span>
            <span style={{ fontFamily: t.serif, fontSize: 13, color: t.inkSoft, fontStyle: 'italic' }}>or whichever runs out first</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['15m', '1h', '1d', '1w', '30d'].map(v => (
              <button key={v} onClick={() => setTtl(v)} style={{
                flex: 1, padding: '9px 0', borderRadius: 10,
                background: ttl === v ? t.ink : t.card,
                color: ttl === v ? t.bg : t.ink,
                border: `1px solid ${ttl === v ? t.ink : t.cardEdge}`,
                fontFamily: t.mono, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>{v}</button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontFamily: t.mono, fontSize: 10, color: t.inkSoft, letterSpacing: 1.2 }}>OR AFTER READS</span>
            <span style={{ fontFamily: t.serif, fontSize: 13, color: t.accent, fontWeight: 600 }}>{views} reads</span>
          </div>
          <div style={{
            background: t.card, border: `1px solid ${t.cardEdge}`,
            borderRadius: 12, padding: '10px 14px',
          }}>
            <input type="range" min="1" max="100" value={views}
              onChange={(e) => setViews(+e.target.value)}
              style={{ width: '100%', accentColor: t.accent }} />
            <div style={{
              display: 'flex', justifyContent: 'space-between', marginTop: 2,
              fontFamily: t.mono, fontSize: 9, color: t.inkFaint, letterSpacing: 0.6,
            }}>
              <span>1</span><span>5</span><span>25</span><span>100</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', padding: '12px 22px 28px' }}>
        <button onClick={onSend} style={{
          width: '100%', background: t.accent, color: t.bg, border: 'none',
          padding: '16px 0', borderRadius: 14,
          fontFamily: t.sans, fontSize: 16, fontWeight: 600,
          letterSpacing: 0.2, cursor: 'pointer',
          boxShadow: `0 12px 24px -10px ${t.accent}aa`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Icon.feather c={t.bg} s={18} /> Leave it here
        </button>
      </div>
    </div>
  );
}

// ─── Auth — login + signup ────────────────────────────────────────
function AuthScreen({ t, mode = 'login', onSwitch, onSubmit }) {
  const isSignup = mode === 'signup';
  return (
    <div style={{ position: 'absolute', inset: 0, background: t.bg, display: 'flex', flexDirection: 'column' }}>
      {/* faded map */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.45 }}>
        <StylizedMap t={t} width={390} height={780} dim />
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(180deg, ${t.bg}cc, ${t.bg})`,
        }} />
      </div>

      <div style={{ position: 'relative', padding: '70px 28px 28px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* monogram */}
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: t.card, border: `1px solid ${t.cardEdge}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: t.serif, fontSize: 26, color: t.accent, fontWeight: 600,
          fontStyle: 'italic', marginBottom: 20,
        }}>g.</div>

        <div style={{
          fontFamily: t.mono, fontSize: 11, color: t.accent,
          letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6,
        }}>{isSignup ? 'Make a small mark' : 'Welcome back'}</div>

        <div style={{
          fontFamily: t.serif, fontSize: 32, lineHeight: '36px',
          color: t.ink, fontWeight: 500, letterSpacing: -0.4,
          textWrap: 'balance', marginBottom: 28,
        }}>
          {isSignup
            ? <>A name to <span style={{ fontStyle: 'italic', color: t.accent }}>sign</span> your whispers.</>
            : <>Pick up <span style={{ fontStyle: 'italic', color: t.accent }}>where you left</span> the last note.</>}
        </div>

        {/* form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isSignup && <AuthField t={t} label="HANDLE" value="@marina" />}
          <AuthField t={t} label="EMAIL" value="marina@geowhisper.app" />
          <AuthField t={t} label="PASSWORD" value="••••••••••" type="password" />
          {isSignup && (
            <div>
              <div style={{ fontFamily: t.mono, fontSize: 10, color: t.inkSoft, letterSpacing: 1.2, marginBottom: 6 }}>
                I READ WHISPERS IN
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['EN', true], ['ES', true], ['CA', true], ['FR', false], ['IT', false]].map(([l, on]) => (
                  <span key={l} style={{
                    padding: '7px 12px', borderRadius: 10,
                    background: on ? t.ink : t.card,
                    color: on ? t.bg : t.inkSoft,
                    border: `1px solid ${on ? t.ink : t.cardEdge}`,
                    fontFamily: t.mono, fontSize: 11, fontWeight: 600, letterSpacing: 0.4,
                  }}>{l}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 4px',
          fontFamily: t.mono, fontSize: 10, color: t.inkFaint, letterSpacing: 1.2,
        }}>
          <div style={{ flex: 1, height: 1, background: t.cardEdge }} />
          <span>OR</span>
          <div style={{ flex: 1, height: 1, background: t.cardEdge }} />
        </div>

        {/* Google OAuth — disabled, "soon" */}
        <button disabled style={{
          background: t.card, border: `1px solid ${t.cardEdge}`,
          padding: '13px 16px', borderRadius: 12,
          fontFamily: t.sans, fontSize: 14, fontWeight: 500, color: t.ink,
          cursor: 'not-allowed', opacity: 0.55,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          position: 'relative',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285f4" d="M22.5 12.2c0-.8-.1-1.4-.2-2H12v3.8h5.9c-.3 1.4-1 2.6-2.2 3.4v2.8h3.6c2.1-2 3.2-4.8 3.2-8z"/>
            <path fill="#34a853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.7 1.1-2.9 0-5.3-2-6.2-4.6H2v2.9C3.8 20.5 7.6 23 12 23z"/>
            <path fill="#fbbc04" d="M5.8 14c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2V6.7H2C1.2 8.3.7 10.1.7 12s.5 3.7 1.3 5.3L5.8 14z"/>
            <path fill="#ea4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.6l3.2-3.2C17.5 2.1 15 1 12 1 7.6 1 3.8 3.5 2 7l3.8 2.9C6.7 7.4 9.1 5.4 12 5.4z"/>
          </svg>
          Continue with Google
          <span style={{
            position: 'absolute', right: 14,
            padding: '2px 6px', borderRadius: 4, background: t.bgDeep,
            color: t.inkSoft, fontFamily: t.mono, fontSize: 9,
            letterSpacing: 0.6, fontWeight: 600,
          }}>SOON</span>
        </button>

        <div style={{ flex: 1 }} />

        <button onClick={onSubmit} style={{
          background: t.accent, color: t.bg, border: 'none',
          padding: '15px 0', borderRadius: 14,
          fontFamily: t.sans, fontSize: 16, fontWeight: 600,
          letterSpacing: 0.2, cursor: 'pointer', marginTop: 24,
          boxShadow: `0 12px 24px -10px ${t.accent}88`,
        }}>{isSignup ? 'Begin' : 'Sign in'}</button>

        <div style={{
          textAlign: 'center', marginTop: 12,
          fontFamily: t.serif, fontSize: 14, color: t.inkSoft, fontStyle: 'italic',
        }}>
          {isSignup ? <>Already have a name? <span onClick={onSwitch} style={{ color: t.accent, fontWeight: 600, cursor: 'pointer', fontStyle: 'normal' }}>Sign in</span></>
                    : <>New here? <span onClick={onSwitch} style={{ color: t.accent, fontWeight: 600, cursor: 'pointer', fontStyle: 'normal' }}>Make an account</span></>}
        </div>
      </div>
    </div>
  );
}

function AuthField({ t, label, value, type }) {
  return (
    <div style={{
      background: t.card, borderRadius: 12, padding: '10px 14px',
      border: `1px solid ${t.cardEdge}`,
    }}>
      <div style={{ fontFamily: t.mono, fontSize: 9, color: t.inkSoft, letterSpacing: 1.2 }}>{label}</div>
      <div style={{
        fontFamily: type === 'password' ? t.sans : t.serif,
        fontSize: 16, color: t.ink, marginTop: 2,
      }}>{value}</div>
    </div>
  );
}

window.ComposeScreen = ComposeScreen;
window.AuthScreen = AuthScreen;
