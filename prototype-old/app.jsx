// Phone container + canvas layout. Soft & Paper only (KISS).
// Each frame demonstrates one screen; the Detail frame auto-loops the
// ink-bleed vanish so the showpiece animation runs without a click.

function Phone({ t, initial = 'map', initialEmpty = false, autoVanish = false, authErrors }) {
  const [screen, setScreen] = React.useState(initial);
  const [vanishStage, setVanishStage] = React.useState(0);
  const [authMode, setAuthMode] = React.useState('login');

  // Auto-loop the ink-bleed demo on the detail frame.
  React.useEffect(() => {
    if (!autoVanish || screen !== 'detail') return;
    let id;
    const loop = () => {
      setVanishStage(0);
      id = setTimeout(() => setVanishStage(1), 1800);
      id = setTimeout(() => setVanishStage(2), 3800);
      id = setTimeout(loop, 8000);
    };
    loop();
    return () => clearTimeout(id);
  }, [autoVanish, screen]);

  const goTab = (k) => {
    if (k === 'drop') setScreen('compose');
    else if (k === 'me') setScreen('settings');
    else setScreen('map');
  };

  // Manual vanish demo for the interactive map → detail tap-through.
  const openDetail = () => {
    setScreen('detail');
    setVanishStage(0);
    setTimeout(() => setVanishStage(1), 2200);
    setTimeout(() => setVanishStage(2), 4200);
    setTimeout(() => { setVanishStage(0); setScreen('map'); }, 8200);
  };

  let inner;
  if (screen === 'onboarding')   inner = <OnboardingScreen t={t} onContinue={() => setScreen('map')} />;
  else if (screen === 'login')   inner = <AuthScreen t={t} mode="login" errors={authErrors} onSwitch={() => setScreen('signup')} onSubmit={() => setScreen('map')} />;
  else if (screen === 'signup')  inner = <AuthScreen t={t} mode="signup" errors={authErrors} onSwitch={() => setScreen('login')} onSubmit={() => setScreen('map')} />;
  else if (screen === 'denied')  inner = <DeniedScreen t={t} onRetry={() => setScreen('onboarding')} />;
  else if (screen === 'map')     inner = <MapScreen t={t} onTab={goTab} onOpenNote={openDetail} view="map" empty={initialEmpty} />;
  else if (screen === 'list')    inner = <MapScreen t={t} onTab={goTab} onOpenNote={openDetail} view="list" />;
  else if (screen === 'empty')   inner = <MapScreen t={t} onTab={goTab} view="map" empty />;
  else if (screen === 'compose') inner = <ComposeScreen t={t} onTab={goTab} onSend={() => setScreen('map')} />;
  else if (screen === 'detail')  inner = <DetailScreen t={t} vanishStage={vanishStage} />;
  else if (screen === 'settings')inner = <SettingsScreen t={t} onTab={goTab} />;

  return (
    <div style={{ width: 390, height: 780, position: 'relative' }}>
      <IOSDevice width={390} height={780} dark={t.statusDark}>
        <div style={{ position: 'absolute', inset: 0, background: t.bg }}>
          {inner}
        </div>
      </IOSDevice>
    </div>
  );
}

// ─── Logo kit card ────────────────────────────────────────────────
// Renders one favicon kit (the SVG hero + every export size from the
// kit folder) as a single artboard inside the main canvas. Lets the
// design review compare the three brand directions in context with
// the screens, instead of having to open logos/preview.html.
function LogoKit({ name, headline, blurb, chosen, t }) {
  const Row = ({ label, children }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      borderTop: `1px dashed ${t.cardEdge}`, paddingTop: 14,
    }}>
      <div style={{
        fontFamily: t.mono, fontSize: 9, color: t.inkSoft,
        letterSpacing: 1.2, textTransform: 'uppercase', minWidth: 72,
      }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
        {children}
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'absolute', inset: 0, background: t.bg,
      padding: 28, display: 'flex', flexDirection: 'column', gap: 18,
    }}>
      <div>
        <div style={{
          fontFamily: t.mono, fontSize: 10, color: t.accent,
          letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 8,
        }}>{name}{chosen && <span style={{
          marginLeft: 10, padding: '2px 8px', borderRadius: 999,
          background: t.accent, color: t.bg, fontSize: 9,
          letterSpacing: 0.6, fontWeight: 600,
        }}>IN USE</span>}</div>
        <div style={{
          fontFamily: t.serif, fontSize: 24, fontWeight: 500,
          color: t.ink, letterSpacing: -0.3, lineHeight: '28px',
        }}>{headline}</div>
        <div style={{
          fontFamily: t.serif, fontStyle: 'italic',
          fontSize: 14, color: t.inkSoft, marginTop: 4, lineHeight: '20px',
        }}>{blurb}</div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '12px 0',
        borderRadius: 16, background: t.card,
        border: `1px solid ${t.cardEdge}`,
      }}>
        <img src={`logos/${name}/favicon.svg`}
             alt={`${name} favicon`}
             width={120} height={120}
             style={{ display: 'block' }} />
      </div>

      <Row label="Favicon">
        <img src={`logos/${name}/favicon-16.png`} width={16} height={16} alt="" />
        <img src={`logos/${name}/favicon-32.png`} width={32} height={32} alt="" />
        <img src={`logos/${name}/favicon-48.png`} width={48} height={48} alt="" />
        <span style={{
          fontFamily: t.mono, fontSize: 9, color: t.inkFaint, letterSpacing: 0.6,
        }}>16 · 32 · 48</span>
      </Row>

      <Row label="iOS">
        <img src={`logos/${name}/apple-touch-icon.png`}
             width={60} height={60}
             alt=""
             style={{ borderRadius: 14, border: `1px solid ${t.cardEdge}` }} />
        <span style={{
          fontFamily: t.mono, fontSize: 9, color: t.inkFaint, letterSpacing: 0.6,
        }}>180 · home screen</span>
      </Row>

      <Row label="PWA">
        <img src={`logos/${name}/icon-192.png`}
             width={48} height={48}
             alt=""
             style={{ borderRadius: 12, border: `1px solid ${t.cardEdge}` }} />
        <img src={`logos/${name}/icon-512.png`}
             width={84} height={84}
             alt=""
             style={{ borderRadius: 18, border: `1px solid ${t.cardEdge}` }} />
        <span style={{
          fontFamily: t.mono, fontSize: 9, color: t.inkFaint, letterSpacing: 0.6,
        }}>192 · 512</span>
      </Row>
    </div>
  );
}

// ─── Persistent "Logo kits →" link ────────────────────────────────
// Anchored to the viewport, not the canvas world, so it stays put
// while panning/zooming the design canvas. Mirrors the header link
// promised in prototype/HANDOFF.md.
function CornerLink() {
  return (
    <a href="logos/preview.html" target="_blank" rel="noopener noreferrer"
       style={{
         position: 'fixed', top: 18, right: 22, zIndex: 50,
         padding: '8px 14px', borderRadius: 999,
         background: '#fffaf0', color: '#2a2118',
         border: '1px solid rgba(60, 40, 20, 0.10)',
         fontFamily: '"JetBrains Mono", ui-monospace, monospace',
         fontSize: 11, letterSpacing: 0.6,
         textDecoration: 'none', boxShadow: '0 4px 14px -8px rgba(0,0,0,0.25)',
       }}>
      Logo kits →
    </a>
  );
}

function App() {
  const t = PAPER;
  return (
    <>
      <CornerLink />
      <DesignCanvas>
        <DCSection id="flow" title="Soft & Paper · core flow"
          subtitle="Mobile-first. Map is home; everything else lives one tap away.">
          <DCArtboard id="onb"     label="01 · Onboarding"          width={390} height={780}><Phone t={t} initial="onboarding" /></DCArtboard>
          <DCArtboard id="login"   label="02 · Sign in"             width={390} height={780}><Phone t={t} initial="login" /></DCArtboard>
          <DCArtboard id="signup"  label="03 · Sign up"             width={390} height={780}><Phone t={t} initial="signup" /></DCArtboard>
          <DCArtboard id="map"     label="04 · Map · home"          width={390} height={780}><Phone t={t} initial="map" /></DCArtboard>
          <DCArtboard id="list"    label="05 · Nearby list (toggle)" width={390} height={780}><Phone t={t} initial="list" /></DCArtboard>
          <DCArtboard id="compose" label="06 · Drop a whisper"      width={390} height={780}><Phone t={t} initial="compose" /></DCArtboard>
          <DCArtboard id="detail"  label="07 · Read · ink-bleed vanish" width={390} height={780}><Phone t={t} initial="detail" autoVanish /></DCArtboard>
          <DCArtboard id="me"      label="08 · Yourself"            width={390} height={780}><Phone t={t} initial="settings" /></DCArtboard>
        </DCSection>

        <DCSection id="states" title="Edge states"
          subtitle="The moments where it's easy to write something cold and forgettable.">
          <DCArtboard id="empty"  label="09 · Empty · no ghosts here yet" width={390} height={780}><Phone t={t} initial="empty" /></DCArtboard>
          <DCArtboard id="denied" label="10 · Location denied"            width={390} height={780}><Phone t={t} initial="denied" /></DCArtboard>
        </DCSection>

        <DCSection id="errors" title="Form validation · inline per-field errors"
          subtitle="Red 1.5px border + soft halo on the field, helper text below in sans-12, role=alert. Errors clear as the user types in the real impl.">
          <DCArtboard id="signup-err" label="Sign up · multi-field error" width={390} height={780}>
            <Phone t={t} initial="signup" authErrors={{
              handle: 'That handle is already taken.',
              email: 'Doesn’t look like a valid email.',
              password: 'At least 8 characters, please.',
            }} />
          </DCArtboard>
          <DCArtboard id="login-err" label="Sign in · server-returned error" width={390} height={780}>
            <Phone t={t} initial="login" authErrors={{
              password: 'Wrong password. Try again or reset it.',
            }} />
          </DCArtboard>
        </DCSection>

        <DCSection id="logos" title="Logo kits · pick one for the brand"
          subtitle="Three favicon directions, all kits drop-in interchangeable. Open prototype/logos/preview.html (or the link in the corner) for the full sizing grid.">
          <DCArtboard id="logo-ghost"    label="A · Ghost-pin"   width={390} height={620}>
            <LogoKit name="ghost-pin"   headline="Ghost in a pin." blurb="Most literal. Leans whimsical." t={t} />
          </DCArtboard>
          <DCArtboard id="logo-ink"      label="B · Ink-pin"     width={390} height={620}>
            <LogoKit name="ink-pin"     headline="A pin, brushed in ink." blurb="Editorial. Matches the Newsreader serif." t={t} />
          </DCArtboard>
          <DCArtboard id="logo-monogram" label="C · Monogram-g · in use" width={390} height={620}>
            <LogoKit name="monogram-g"  headline="Just a g." blurb="Single-letter G with a pin counter. Compact, scales best at 16×16." chosen t={t} />
          </DCArtboard>
        </DCSection>

        <DCSection id="hero" title="Tap-through demo · Map → read → vanish"
          subtitle="One phone. Tap the peek card on the map and watch the ink bleed. Use the bottom tabs to navigate.">
          <DCArtboard id="hero" label="Live · tap to explore" width={390} height={780}>
            <Phone t={t} initial="map" />
          </DCArtboard>
        </DCSection>
      </DesignCanvas>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
