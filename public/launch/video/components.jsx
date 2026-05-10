// Knocker launch video — reusable visual components
// Loaded after animations.jsx; uses globals: React, Easing, interpolate, animate, clamp, useTime, useSprite

const KNOCKER_BLUE = '#007AFF';
const KNOCKER_BLUE_SOFT = '#E6F1FF';
const FACE_BLACK = '#0A0A0A';

// ─── KnockerWordmark ────────────────────────────────────────────────────────
// "Knocker" with a deliberate pin-like dot above the second 'k' or as 'o'.
function KnockerWordmark({ size = 96, color = '#0A0A0A', accent = KNOCKER_BLUE, weight = 700, withDot = true, style = {} }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'baseline',
      fontFamily: '"SF Pro Display", -apple-system, "Inter", system-ui, sans-serif',
      fontWeight: weight,
      fontSize: size,
      letterSpacing: '-0.045em',
      color,
      lineHeight: 1,
      position: 'relative',
      ...style,
    }}>
      <span>knocker</span>
      {withDot && (
        <span style={{
          width: size * 0.10, height: size * 0.10,
          background: accent,
          borderRadius: '50%',
          marginLeft: size * 0.04,
          alignSelf: 'flex-end',
          marginBottom: size * 0.08,
          boxShadow: `0 0 ${size * 0.15}px ${accent}80`,
        }} />
      )}
    </div>
  );
}

// ─── PinIcon — draws the various status pins seen in the app ───────────────
// kind: 'appointment' | 'interested' | 'not-interested' | 'callback' | 'no-answer' | 'dq' | 'new'
function PinIcon({ kind = 'new', size = 56, ringColor = '#fff', glow = false }) {
  const config = {
    appointment:    { bg: '#5DD0F0', emoji: '📅' },
    interested:     { bg: '#3DD64C', emoji: '👍' },
    'not-interested': { bg: '#FF3B30', emoji: '✕' },
    callback:       { bg: '#FF9500', emoji: '📞' },
    'no-answer':    { bg: '#8E8E93', emoji: '◯' },
    dq:             { bg: '#9F2D2D', emoji: '⊖' },
    new:            { bg: '#FFFFFF', emoji: '' },
  }[kind];

  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: config.bg,
      border: `${Math.max(2, size * 0.06)}px solid ${ringColor}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.5,
      color: kind === 'not-interested' ? '#fff' : '#000',
      boxShadow: glow
        ? `0 0 ${size * 0.6}px ${config.bg}cc, 0 ${size * 0.1}px ${size * 0.3}px rgba(0,0,0,0.25)`
        : `0 ${size * 0.08}px ${size * 0.2}px rgba(0,0,0,0.25)`,
      fontWeight: 700,
      lineHeight: 1,
    }}>
      {config.emoji}
    </div>
  );
}

// ─── DroppingPin — pin falls from height with bounce + shadow contracting ─
function DroppingPin({ kind, x, y, size = 56, dropStart = 0, dropDur = 0.7, ringColor = '#fff' }) {
  const { localTime } = useSprite();
  const t = clamp((localTime - dropStart) / dropDur, 0, 1);
  const eased = Easing.easeOutBack(t);

  // pin slams down from -200 with overshoot; shadow scales up as it lands
  const dy = (1 - eased) * -260;
  const shadowScale = 0.4 + 0.6 * t;
  const shadowOpacity = 0.08 + 0.18 * t;
  const popScale = t < 0.85 ? 1 : 1 + (1 - clamp((localTime - dropStart - dropDur * 0.85) / 0.15, 0, 1)) * 0.0;

  // tiny ripple ring after landing
  const rippleT = clamp((localTime - dropStart - dropDur) / 0.6, 0, 1);
  const rippleScale = 1 + rippleT * 2.2;
  const rippleOpacity = (1 - rippleT) * 0.5;

  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
    }}>
      {/* shadow on ground */}
      <div style={{
        position: 'absolute',
        left: '50%', top: size * 0.55,
        width: size * 0.9, height: size * 0.22,
        marginLeft: -(size * 0.45),
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.6), rgba(0,0,0,0) 70%)',
        opacity: shadowOpacity,
        transform: `scale(${shadowScale})`,
        transformOrigin: 'center',
      }}/>
      {/* ripple */}
      {rippleT > 0 && rippleT < 1 && (
        <div style={{
          position: 'absolute',
          left: '50%', top: '50%',
          width: size, height: size,
          marginLeft: -size/2, marginTop: -size/2,
          border: `2px solid ${KNOCKER_BLUE}`,
          borderRadius: '50%',
          transform: `scale(${rippleScale})`,
          opacity: rippleOpacity,
        }}/>
      )}
      {/* pin itself */}
      <div style={{ transform: `translateY(${dy}px) scale(${popScale})` }}>
        <PinIcon kind={kind} size={size} ringColor={ringColor} glow={t > 0.7 && t < 0.95}/>
      </div>
    </div>
  );
}

// ─── Phone3D ────────────────────────────────────────────────────────────────
// A floating iPhone with bezel, dynamic island, and rotating glow.
// Renders children inside the screen area.
function Phone3D({
  width = 360,
  rotateY = 0,
  rotateX = 0,
  rotateZ = 0,
  translateY = 0,
  translateZ = 0,
  scale = 1,
  glow = 0.6, // 0-1 intensity
  children,
  style = {},
}) {
  const aspect = 19.5 / 9;
  const height = width * aspect;
  const radius = width * 0.13;
  const bezel = width * 0.025;

  return (
    <div style={{
      position: 'absolute',
      width, height,
      transformStyle: 'preserve-3d',
      transform: `translate3d(0, ${translateY}px, ${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`,
      ...style,
    }}>
      {/* Soft glow under phone */}
      <div style={{
        position: 'absolute',
        inset: -width * 0.4,
        background: `radial-gradient(ellipse at center, rgba(0,122,255,${glow * 0.3}) 0%, rgba(0,122,255,0) 65%)`,
        filter: 'blur(20px)',
        transform: 'translateZ(-40px)',
        pointerEvents: 'none',
      }}/>

      {/* Phone body (back) */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, #1d1d1f 0%, #2a2a2c 50%, #1d1d1f 100%)',
        borderRadius: radius,
        boxShadow: `
          0 ${width * 0.08}px ${width * 0.2}px rgba(0,0,0,0.35),
          0 ${width * 0.02}px ${width * 0.05}px rgba(0,0,0,0.25),
          inset 0 0 0 1px rgba(255,255,255,0.06)
        `,
      }}/>

      {/* Screen */}
      <div style={{
        position: 'absolute',
        left: bezel, top: bezel,
        right: bezel, bottom: bezel,
        background: '#fff',
        borderRadius: radius - bezel * 0.5,
        overflow: 'hidden',
        boxShadow: `inset 0 0 0 ${bezel * 0.3}px #000`,
      }}>
        {children}
        {/* Dynamic island */}
        <div style={{
          position: 'absolute',
          left: '50%', top: width * 0.04,
          transform: 'translateX(-50%)',
          width: width * 0.32, height: width * 0.075,
          background: '#000',
          borderRadius: width * 0.04,
          zIndex: 30,
        }}/>
        {/* Specular sheen overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(${110 + rotateY * 1.5}deg, rgba(255,255,255,${0.18 * glow}) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 65%, rgba(255,255,255,${0.08 * glow}) 100%)`,
          pointerEvents: 'none',
          zIndex: 25,
        }}/>
      </div>
    </div>
  );
}

// ─── StatusBar — clean, simulated iOS top bar ─────────────────────────────
function StatusBar({ time = '7:22', dark = false, scale = 1 }) {
  const color = dark ? '#fff' : '#000';
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      height: 54 * scale,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: `0 ${28 * scale}px`,
      paddingTop: 14 * scale,
      fontFamily: '"SF Pro Display", -apple-system, system-ui, sans-serif',
      fontWeight: 600,
      fontSize: 17 * scale,
      color,
      zIndex: 40,
      pointerEvents: 'none',
    }}>
      <span>{time}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 * scale }}>
        {/* signal */}
        <svg width={18 * scale} height={12 * scale} viewBox="0 0 18 12" fill={color}>
          <rect x="0" y="8" width="3" height="4" rx="0.5"/>
          <rect x="5" y="6" width="3" height="6" rx="0.5"/>
          <rect x="10" y="3" width="3" height="9" rx="0.5"/>
          <rect x="15" y="0" width="3" height="12" rx="0.5"/>
        </svg>
        {/* battery */}
        <svg width={26 * scale} height={12 * scale} viewBox="0 0 26 12" fill="none">
          <rect x="0.5" y="0.5" width="22" height="11" rx="2.5" stroke={color} opacity="0.4"/>
          <rect x="2" y="2" width="19" height="8" rx="1.5" fill={color}/>
          <rect x="23" y="4" width="2" height="4" rx="1" fill={color} opacity="0.4"/>
        </svg>
      </div>
    </div>
  );
}

// ─── Tab bar (Map / Pipeline / Settings) ──────────────────────────────────
function TabBar({ active = 'map', scale = 1 }) {
  const tabs = [
    { key: 'map', label: 'Map', icon: (c, s) => (
      <svg width={24*s} height={24*s} viewBox="0 0 24 24" fill="none">
        <path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2zM9 3v16M15 5v16" stroke={c} strokeWidth="2" strokeLinejoin="round"/>
      </svg>
    )},
    { key: 'pipeline', label: 'Pipeline', icon: (c, s) => (
      <svg width={24*s} height={24*s} viewBox="0 0 24 24" fill={c}>
        <path d="M9 4h6a2 2 0 0 1 2 2v1h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3V6a2 2 0 0 1 2-2zm0 3h6V6H9v1z"/>
      </svg>
    )},
    { key: 'settings', label: 'Settings', icon: (c, s) => (
      <svg width={24*s} height={24*s} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke={c} strokeWidth="2"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={c} strokeWidth="2"/>
      </svg>
    )},
  ];

  return (
    <div style={{
      position: 'absolute',
      bottom: 22 * scale, left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 4 * scale,
      padding: `${10 * scale}px ${14 * scale}px`,
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(20px)',
      borderRadius: 999,
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      zIndex: 35,
    }}>
      {tabs.map(t => (
        <div key={t.key} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: `${6 * scale}px ${18 * scale}px`,
          background: active === t.key ? 'rgba(0,0,0,0.06)' : 'transparent',
          borderRadius: 999,
          gap: 2 * scale,
        }}>
          {t.icon(active === t.key ? KNOCKER_BLUE : '#000', scale)}
          <span style={{
            fontSize: 11 * scale, fontWeight: 600,
            color: active === t.key ? KNOCKER_BLUE : '#000',
            fontFamily: '"SF Pro Text", system-ui, sans-serif',
          }}>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── LogDoorSheet — recreates the bottom-sheet "Log Door" UI ────────────────
function LogDoorSheet({
  scale = 1,
  highlightStatus = null, // 'appointment' | 'interested' | etc
  highlightProgress = 0, // 0-1 ripple
  ownerName = 'Cleland Jesse A Trustee',
  address = '4 Brittney Lane',
}) {
  const s = scale;
  const statuses = [
    { key: 'appointment', label: 'Appointment', icon: '📅' },
    { key: 'interested', label: 'Interested', icon: '👍' },
    { key: 'callback', label: 'Callback', icon: '📞' },
    { key: 'not-interested', label: 'Not Interested', icon: '❌' },
    { key: 'no-answer', label: 'No Answer', icon: '⚪' },
    { key: 'dq', label: 'DQ', icon: '⛔' },
  ];

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'rgba(255,255,255,0.97)',
      backdropFilter: 'blur(40px)',
      padding: `${20 * s}px ${20 * s}px`,
      paddingTop: `${28 * s}px`,
      fontFamily: '"SF Pro Display", -apple-system, system-ui, sans-serif',
      color: '#000',
      boxSizing: 'border-box',
    }}>
      {/* drag handle */}
      <div style={{
        width: 48 * s, height: 5 * s,
        background: 'rgba(60,60,67,0.3)',
        borderRadius: 999,
        margin: '0 auto',
        marginBottom: 16 * s,
      }}/>
      {/* header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 28 * s,
      }}>
        <div style={{
          padding: `${8 * s}px ${16 * s}px`,
          background: 'rgba(120,120,128,0.12)',
          borderRadius: 999,
          fontSize: 17 * s, fontWeight: 500,
        }}>Cancel</div>
        <div style={{ fontSize: 19 * s, fontWeight: 700 }}>Log Door</div>
        <div style={{
          padding: `${8 * s}px ${16 * s}px`,
          background: highlightStatus ? KNOCKER_BLUE : 'rgba(120,120,128,0.12)',
          borderRadius: 999,
          fontSize: 17 * s, fontWeight: 600,
          color: highlightStatus ? '#fff' : 'rgba(60,60,67,0.5)',
          transition: 'background 200ms',
        }}>Log Door</div>
      </div>

      {/* owner card */}
      <div style={{
        background: '#fff',
        borderRadius: 14 * s,
        padding: `${14 * s}px ${16 * s}px`,
        marginBottom: 12 * s,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 * s }}>
          <div style={{
            width: 36 * s, height: 36 * s, borderRadius: '50%',
            background: KNOCKER_BLUE_SOFT,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width={20*s} height={20*s} viewBox="0 0 24 24" fill={KNOCKER_BLUE}><circle cx="12" cy="8" r="4"/><path d="M4 22a8 8 0 0 1 16 0z"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 17 * s, fontWeight: 700 }}>{ownerName}</div>
            <div style={{ fontSize: 13 * s, color: 'rgba(60,60,67,0.6)' }}>Property owner · County records</div>
          </div>
        </div>
      </div>

      {/* address */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10 * s,
        padding: `${8 * s}px ${12 * s}px`,
        marginBottom: 24 * s,
      }}>
        <svg width={22*s} height={22*s} viewBox="0 0 24 24" fill="none" stroke="rgba(60,60,67,0.6)" strokeWidth="2">
          <path d="M12 22s-7-7-7-13a7 7 0 0 1 14 0c0 6-7 13-7 13z"/>
          <circle cx="12" cy="9" r="2"/>
        </svg>
        <div style={{ fontSize: 17 * s, fontWeight: 500 }}>{address}</div>
      </div>

      {/* status section */}
      <div style={{
        fontSize: 15 * s, color: 'rgba(60,60,67,0.6)',
        fontWeight: 500, marginBottom: 12 * s,
      }}>Status</div>

      <div style={{
        background: '#fff',
        borderRadius: 14 * s,
        padding: 8 * s,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 4 * s,
      }}>
        {statuses.map(st => {
          const isHi = st.key === highlightStatus;
          const ripple = isHi ? highlightProgress : 0;
          return (
            <div key={st.key} style={{
              position: 'relative',
              padding: `${14 * s}px ${14 * s}px`,
              borderRadius: 10 * s,
              display: 'flex', alignItems: 'center', gap: 10 * s,
              background: isHi ? KNOCKER_BLUE_SOFT : 'transparent',
              border: isHi ? `2px solid ${KNOCKER_BLUE}` : '2px solid transparent',
              transition: 'background 120ms, border-color 120ms',
              overflow: 'hidden',
            }}>
              {isHi && ripple > 0 && (
                <div style={{
                  position: 'absolute',
                  left: '20%', top: '50%',
                  width: 200 * s, height: 200 * s,
                  marginLeft: -100 * s, marginTop: -100 * s,
                  background: `radial-gradient(circle, ${KNOCKER_BLUE}50 0%, ${KNOCKER_BLUE}00 70%)`,
                  borderRadius: '50%',
                  transform: `scale(${ripple * 1.3})`,
                  opacity: 1 - ripple,
                  pointerEvents: 'none',
                }}/>
              )}
              <span style={{ fontSize: 22 * s, lineHeight: 1 }}>{st.icon}</span>
              <span style={{
                fontSize: 17 * s, fontWeight: 500,
                color: isHi ? KNOCKER_BLUE : '#000',
              }}>{st.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── PipelineList — clean recreation of the History/Pipeline list ──────────
function PipelineList({ scale = 1, scrollOffset = 0 }) {
  const s = scale;
  const items = [
    { name: 'Cleland Jesse A Trustee', address: '4 Brittney Lane', time: '24 seconds ago', kind: 'appointment' },
    { name: 'Carey Daniel F', address: '2 Brittney Lane', time: '4 minutes ago', kind: 'callback' },
    { name: 'Radowicz Daniel J', address: '4 Katelyn Way', time: '4 minutes ago', kind: 'interested' },
    { name: 'Lebeau Scott P', address: '6 Brittney Lane', time: '4 minutes ago', kind: 'not-interested' },
    { name: 'Kelly Brian', address: '7 Katelyn Way', time: '4 minutes ago', kind: 'callback' },
    { name: 'Schmidt Gregory M', address: '8 Katelyn Way', time: '4 minutes ago', kind: 'appointment' },
    { name: 'Lundin Stacy D', address: '10 Katelyn Way', time: '5 minutes ago', kind: 'not-interested' },
  ];
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#fff',
      padding: `${68 * s}px ${20 * s}px ${20 * s}px`,
      fontFamily: '"SF Pro Display", -apple-system, system-ui, sans-serif',
      boxSizing: 'border-box',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        fontSize: 36 * s, fontWeight: 800, marginBottom: 16 * s,
        letterSpacing: '-0.02em',
      }}>History</div>

      {/* tab pill */}
      <div style={{
        background: 'rgba(120,120,128,0.12)',
        borderRadius: 999,
        padding: 3 * s,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        marginBottom: 20 * s,
        flexShrink: 0,
      }}>
        {['Pipeline','Calendar','History'].map((t,i) => (
          <div key={t} style={{
            padding: `${8 * s}px 0`,
            fontSize: 15 * s, fontWeight: 600,
            textAlign: 'center',
            color: '#000',
            background: i === 2 ? '#fff' : 'transparent',
            borderRadius: 999,
            boxShadow: i === 2 ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
          }}>{t}</div>
        ))}
      </div>

      {/* clipped list region */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        minHeight: 0,
      }}>
      <div style={{ transform: `translateY(${-scrollOffset * s}px)` }}>
        {items.map((it, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 14 * s,
            padding: `${14 * s}px 0`,
            borderBottom: '1px solid rgba(60,60,67,0.08)',
          }}>
            <PinIcon kind={it.kind} size={44 * s} ringColor="#fff"/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17 * s, fontWeight: 700 }}>{it.name}</div>
              <div style={{ fontSize: 14 * s, color: 'rgba(60,60,67,0.6)' }}>{it.address}</div>
              <div style={{ fontSize: 13 * s, color: 'rgba(60,60,67,0.5)' }}>{it.time}</div>
            </div>
            <svg width={14*s} height={14*s} viewBox="0 0 14 14" fill="none">
              <path d="M5 2l5 5-5 5" stroke="rgba(60,60,67,0.4)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

// ─── MapBackground — the aerial view with status pins ──────────────────────
function MapBackground({ src = 'video/assets/territory.jpg', zoom = 1, panX = 0, panY = 0, brightness = 1 }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      backgroundImage: `url(${src})`,
      backgroundSize: 'cover',
      backgroundPosition: `${50 + panX}% ${50 + panY}%`,
      transform: `scale(${zoom})`,
      transformOrigin: 'center',
      filter: `brightness(${brightness}) saturate(0.92)`,
    }}/>
  );
}

Object.assign(window, {
  KNOCKER_BLUE, KNOCKER_BLUE_SOFT,
  KnockerWordmark, PinIcon, DroppingPin,
  Phone3D, StatusBar, TabBar,
  LogDoorSheet, PipelineList, MapBackground,
});
