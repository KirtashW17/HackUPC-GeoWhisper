// Phone container + canvas layout. Soft & Paper only (KISS).
// Each frame demonstrates one screen; the Detail frame auto-loops the
// ink-bleed vanish so the showpiece animation runs without a click.

function Phone({ t, initial = 'map', initialEmpty = false, autoVanish = false }) {
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
  else if (screen === 'login')   inner = <AuthScreen t={t} mode="login" onSwitch={() => setScreen('signup')} onSubmit={() => setScreen('map')} />;
  else if (screen === 'signup')  inner = <AuthScreen t={t} mode="signup" onSwitch={() => setScreen('login')} onSubmit={() => setScreen('map')} />;
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

function App() {
  const t = PAPER;
  return (
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

      <DCSection id="hero" title="Tap-through demo · Map → read → vanish"
        subtitle="One phone. Tap the peek card on the map and watch the ink bleed. Use the bottom tabs to navigate.">
        <DCArtboard id="hero" label="Live · tap to explore" width={390} height={780}>
          <Phone t={t} initial="map" />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
