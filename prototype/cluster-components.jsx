// Cluster patterns — pin clustering on the map with a "stacked papers" visual
// + bottom sheet expansion. Five frames:
//   1. Cluster atlas — the visual vocabulary (single, 2, 3, 4+, 9+, 99+)
//   2. Map · clusters mixed with single pins (the realistic case)
//   3. Cluster tapped · bottom sheet open (3 notes)
//   4. Cluster tapped · bottom sheet open (12 notes — scrollable)
//   5. Edge: same-spot stack (5 notes at exactly the same coords)

// ── Cluster mark ────────────────────────────────────────────────────
// A small stack of paper rectangles, slightly rotated. Top sheet shows
// the count. Looks like notes pinned together at one place.
function ClusterMark({ t, count = 3, size = 'md', active = false }) {
  // size: sm (32), md (40), lg (52)
  const dim = size === 'sm' ? 32 : size === 'lg' ? 52 : 40;
  const layers = Math.min(count, 3); // visible layers
  const overflow = count > 9 ? '9+' : String(count);
  const big = count >= 99 ? '99+' : overflow;

  // Tilts and offsets per layer — bottom-most first, top-most last
  const tilts = [-7, 4, -2];
  const offsets = [
    { x: -3, y: 3 },
    { x: 3, y: 1 },
    { x: 0, y: -2 },
  ];

  return (
    <div style={{
      position: 'relative', width: dim, height: dim,
      filter: active ? 'drop-shadow(0 8px 14px rgba(0,0,0,0.25))' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.18))',
      transition: 'filter 180ms ease',
    }}>
      {Array.from({ length: layers }).map((_, i) => {
        const isTop = i === layers - 1;
        const off = offsets[i];
        const tilt = tilts[i];
        return (
          <div key={i} style={{
            position: 'absolute', inset: 0,
            transform: `translate(${off.x}px, ${off.y}px) rotate(${tilt}deg)`,
            background: isTop ? t.card : (i === 0 ? '#f3ead8' : '#fbf3e0'),
            border: `1px solid ${t.cardEdge}`,
            borderRadius: 6,
            display: isTop ? 'flex' : 'block',
            alignItems: 'center', justifyContent: 'center',
            // tiny corner crease on the top sheet
          }}>
            {isTop && (
              <>
                {/* corner fold */}
                <div style={{
                  position: 'absolute', top: 0, right: 0,
                  width: 9, height: 9,
                  background: t.bgDeep,
                  clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
                }} />
                <span style={{
                  fontFamily: t.serif, fontWeight: 600,
                  fontSize: count >= 99 ? 13 : count > 9 ? 14 : 16,
                  color: t.ink, lineHeight: 1,
                  letterSpacing: -0.3,
                }}>{big}</span>
              </>
            )}
          </div>
        );
      })}
      {/* small terracotta location dot below the stack */}
      <div style={{
        position: 'absolute', bottom: -5, left: '50%',
        transform: 'translateX(-50%)',
        width: 5, height: 5, borderRadius: '50%',
        background: t.accent,
        boxShadow: `0 0 0 2px ${t.bg}`,
      }} />
    </div>
  );
}

// Bottom sheet content listing the notes at this cluster
function ClusterSheet({ t, notes, place }) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      background: t.bg,
      borderRadius: '20px 20px 0 0',
      boxShadow: '0 -20px 40px -20px rgba(0,0,0,0.25)',
      padding: '8px 0 28px',
      maxHeight: '60%',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* drag handle */}
      <div style={{
        width: 36, height: 4, borderRadius: 2,
        background: t.inkFaint, opacity: 0.5,
        margin: '0 auto 12px',
      }} />

      <div style={{ padding: '0 22px 12px' }}>
        <div style={{
          fontFamily: t.mono, fontSize: 10, letterSpacing: 1.4,
          color: t.accent, textTransform: 'uppercase', marginBottom: 4,
        }}>{notes.length} whispers here</div>
        <div style={{
          fontFamily: t.serif, fontSize: 22, color: t.ink,
          fontWeight: 500, letterSpacing: -0.3,
        }}>{place}</div>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: '4px 22px 0',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {notes.map((n, i) => (
          <ClusterRow key={i} t={t} note={n} />
        ))}
      </div>
    </div>
  );
}

function ClusterRow({ t, note }) {
  return (
    <div style={{
      background: t.card, border: `1px solid ${t.cardEdge}`,
      borderRadius: 12, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 6,
      position: 'relative',
    }}>
      {/* corner crease */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 12, height: 12, background: t.bgDeep,
        clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
        borderTopRightRadius: 12,
      }} />
      <div style={{
        fontFamily: t.serif, fontSize: 14, color: t.ink,
        lineHeight: '20px', paddingRight: 14,
      }}>{note.text}</div>
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        fontFamily: t.mono, fontSize: 9, color: t.inkFaint, letterSpacing: 0.5,
      }}>
        <span>{note.lang}</span>
        <span style={{ width: 2, height: 2, borderRadius: '50%', background: t.inkFaint }} />
        <span>{note.left} reads left</span>
        <span style={{ width: 2, height: 2, borderRadius: '50%', background: t.inkFaint }} />
        <span>{note.fades}</span>
      </div>
    </div>
  );
}

// ── Frame 1 · Cluster atlas (the visual vocabulary) ───────────────
function ClusterAtlas({ t }) {
  const examples = [
    { label: 'SINGLE', count: 1, render: 'single' },
    { label: '2 NOTES', count: 2 },
    { label: '3 NOTES', count: 3 },
    { label: '7 NOTES', count: 7 },
    { label: '12 NOTES', count: 12 },
    { label: '120 NOTES', count: 120 },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, background: t.bg, padding: '70px 22px 28px' }}>
      <div style={{
        fontFamily: t.mono, fontSize: 11, color: t.accent,
        letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6,
      }}>Cluster vocabulary</div>
      <div style={{
        fontFamily: t.serif, fontSize: 26, color: t.ink, lineHeight: '30px',
        fontWeight: 500, letterSpacing: -0.4, marginBottom: 6,
      }}>One pin per place.</div>
      <div style={{
        fontFamily: t.serif, fontSize: 14, color: t.inkSoft,
        fontStyle: 'italic', marginBottom: 28, lineHeight: 1.5,
      }}>
        Notes stack like papers when they share a spot. The number is the count; the tilt is the texture.
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16,
      }}>
        {examples.map((e, i) => (
          <div key={i} style={{
            background: t.bgDeep, border: `1px solid ${t.cardEdge}`,
            borderRadius: 12, padding: '24px 8px 14px',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 14, minHeight: 110,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 56 }}>
              {e.render === 'single' ? (
                <div style={{ position: 'relative' }}>
                  <MapPin x={0} y={0} t={t} />
                </div>
              ) : (
                <ClusterMark t={t} count={e.count} size="md" />
              )}
            </div>
            <div style={{
              fontFamily: t.mono, fontSize: 9, color: t.inkSoft,
              letterSpacing: 1.2, textTransform: 'uppercase',
            }}>{e.label}</div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 28, padding: '14px 16px',
        background: t.card, border: `1px solid ${t.cardEdge}`,
        borderRadius: 12,
      }}>
        <div style={{
          fontFamily: t.mono, fontSize: 9, color: t.accent,
          letterSpacing: 1.2, marginBottom: 6,
        }}>BEHAVIOUR</div>
        <ul style={{
          margin: 0, padding: '0 0 0 16px',
          fontFamily: t.serif, fontSize: 13, color: t.ink, lineHeight: 1.6,
        }}>
          <li>Pins within ~40px screen-distance fuse into a stack.</li>
          <li>Tap a stack → bottom sheet opens with the notes inside.</li>
          <li>Zoom-in does <em>not</em> split same-spot stacks. Tap is the only way in.</li>
          <li>Stacks always show 3 sheets max + a count, regardless of size.</li>
        </ul>
      </div>
    </div>
  );
}

// ── Frame 2 · Map with mixed pins + clusters ──────────────────────
function MapWithClusters({ t, activeId = null, onPin = () => {} }) {
  const items = [
    { id: 'a', x: 88,  y: 220, kind: 'single' },
    { id: 'b', x: 168, y: 168, kind: 'cluster', count: 3 },
    { id: 'c', x: 252, y: 230, kind: 'single' },
    { id: 'd', x: 295, y: 320, kind: 'cluster', count: 12 },
    { id: 'e', x: 130, y: 360, kind: 'single' },
    { id: 'f', x: 78,  y: 430, kind: 'cluster', count: 2 },
    { id: 'g', x: 240, y: 470, kind: 'single' },
    { id: 'h', x: 192, y: 540, kind: 'cluster', count: 7 },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, background: t.bg }}>
      <StylizedMap t={t} width={390} height={780}>
        <HerePin x={195} y={400} t={t} />
        {items.map(it => (
          <div key={it.id}
            onClick={() => onPin(it)}
            style={{
              position: 'absolute', left: it.x, top: it.y,
              transform: 'translate(-50%, -50%)', cursor: 'pointer',
            }}>
            {it.kind === 'single'
              ? <div style={{ position: 'relative' }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: t.accent,
                    boxShadow: `0 0 0 3px ${t.bg}, 0 2px 4px rgba(0,0,0,0.18)`,
                  }} />
                </div>
              : <ClusterMark t={t} count={it.count} size={it.count > 9 ? 'lg' : 'md'} active={activeId === it.id} />
            }
          </div>
        ))}
      </StylizedMap>

      {/* top header (matches MapScreen) */}
      <div style={{
        position: 'absolute', top: 60, left: 22, right: 22,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{
          background: t.card, border: `1px solid ${t.cardEdge}`,
          padding: '8px 14px', borderRadius: 999,
          fontFamily: t.mono, fontSize: 10, color: t.inkSoft, letterSpacing: 0.8,
          display: 'inline-flex', gap: 6, alignItems: 'center',
        }}>
          <Icon.pin c={t.accent} s={11} /> EL BORN · 8 SPOTS
        </div>
        <div style={{
          background: t.card, border: `1px solid ${t.cardEdge}`,
          width: 38, height: 38, borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon.target c={t.ink} s={16} />
        </div>
      </div>
    </div>
  );
}

// ── Frame 3/4 · Cluster tapped → bottom sheet ─────────────────────
function ClusterExpanded({ t, count = 3 }) {
  const allNotes = [
    { text: 'They sell the only proper carquinyolis on this side of Via Laietana. Ask for them warm.', lang: 'CA', left: 12, fades: 'fades in 5h' },
    { text: 'Chess group, Tuesdays around 6pm. Bring your own board if you want to play; they always need a fourth.', lang: 'EN', left: 4, fades: 'fades in 2d' },
    { text: 'El gato negro duerme en la mesa de la ventana después de las cuatro. No lo despiertes.', lang: 'ES', left: 23, fades: 'fades in 12h' },
    { text: 'Wifi password is on a sticky note under the cash register, but the connection drops every twenty minutes anyway.', lang: 'EN', left: 9, fades: 'fades in 3d' },
    { text: 'La camarera de los lunes por la mañana hace el mejor café cortado. Se llama Júlia.', lang: 'ES', left: 17, fades: 'fades in 6h' },
    { text: 'If you sit at the back-left table, you can see the bell of Santa Maria framed perfectly through the door.', lang: 'EN', left: 31, fades: 'fades in 1w' },
    { text: 'The croissants come out of the oven at 8:15. After that, they reheat the morning batch and you can taste it.', lang: 'EN', left: 6, fades: 'fades in 11h' },
    { text: 'Pregunta por la mesa que mira al patio. La señora del fondo no la deja para turistas pero a veces sí.', lang: 'ES', left: 14, fades: 'fades in 2d' },
    { text: 'They do open mic on Thursdays. Sign-up is on a clipboard at the bar — get there before 9.', lang: 'EN', left: 19, fades: 'fades in 4d' },
    { text: 'Hi ha un gat negre que ve a demanar al migdia. Si li dones llet, no se\'n va.', lang: 'CA', left: 8, fades: 'fades in 16h' },
    { text: 'The bathroom is upstairs and the staircase creaks like the building is older than it is.', lang: 'EN', left: 11, fades: 'fades in 1d' },
    { text: 'Si vienes solo, pide la mesa de la esquina. Los días lluviosos huele a pan recién hecho.', lang: 'ES', left: 22, fades: 'fades in 5d' },
  ];
  const notes = allNotes.slice(0, count);

  // The cluster is "frozen" on the map — visible behind the sheet, dimmed
  return (
    <div style={{ position: 'absolute', inset: 0, background: t.bg }}>
      <StylizedMap t={t} width={390} height={780} dim />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(20,15,10,0.18)',
      }} />
      {/* the active cluster, slightly lifted */}
      <div style={{
        position: 'absolute', left: 195, top: 270,
        transform: 'translate(-50%, -50%) scale(1.15)',
      }}>
        <ClusterMark t={t} count={count} size="lg" active />
      </div>

      {/* close pill */}
      <div style={{
        position: 'absolute', top: 60, left: '50%',
        transform: 'translateX(-50%)',
        background: t.card, border: `1px solid ${t.cardEdge}`,
        padding: '8px 16px', borderRadius: 999,
        fontFamily: t.mono, fontSize: 10, color: t.inkSoft,
        letterSpacing: 0.8, display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        <Icon.back c={t.ink} s={12} /> CLOSE STACK
      </div>

      <ClusterSheet t={t} notes={notes} place="Cafè del Born" />
    </div>
  );
}

// ── Frame 5 · Same-spot edge (pure stack, no separation possible) ─
function SameSpotStack({ t }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: t.bg }}>
      <StylizedMap t={t} width={390} height={780}>
        <HerePin x={195} y={420} t={t} />
        {/* one big stack at center */}
        <div style={{
          position: 'absolute', left: 195, top: 320,
          transform: 'translate(-50%, -50%)',
        }}>
          <ClusterMark t={t} count={5} size="lg" />
        </div>
        {/* a couple of singles around */}
        <div style={{ position: 'absolute', left: 110, top: 260, transform: 'translate(-50%,-50%)' }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: t.accent, boxShadow: `0 0 0 3px ${t.bg}, 0 2px 4px rgba(0,0,0,0.18)` }} />
        </div>
        <div style={{ position: 'absolute', left: 290, top: 540, transform: 'translate(-50%,-50%)' }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: t.accent, boxShadow: `0 0 0 3px ${t.bg}, 0 2px 4px rgba(0,0,0,0.18)` }} />
        </div>
      </StylizedMap>

      {/* explanatory caption */}
      <div style={{
        position: 'absolute', top: 60, left: 22, right: 22,
      }}>
        <div style={{
          background: t.card, border: `1px solid ${t.cardEdge}`,
          padding: '14px 16px', borderRadius: 14,
        }}>
          <div style={{
            fontFamily: t.mono, fontSize: 10, color: t.accent,
            letterSpacing: 1.2, marginBottom: 4,
          }}>EDGE CASE · SAME COORDINATES</div>
          <div style={{
            fontFamily: t.serif, fontSize: 14, color: t.ink, lineHeight: 1.5,
          }}>
            When five whispers share the same GPS point, zoom can't split them.
            The stack stays a stack — only tap opens it.
          </div>
        </div>
      </div>
    </div>
  );
}

window.ClusterMark = ClusterMark;
window.ClusterSheet = ClusterSheet;
window.ClusterAtlas = ClusterAtlas;
window.MapWithClusters = MapWithClusters;
window.ClusterExpanded = ClusterExpanded;
window.SameSpotStack = SameSpotStack;
