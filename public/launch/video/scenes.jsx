// Knocker launch video — scenes
// Globals from animations.jsx + components.jsx

const STAGE = 1080;

// ─── Scene 1: Cold open — pin drops, becomes accent dot of wordmark (0–4s) ─
function SceneOpen() {
  const { localTime } = useSprite();
  const t = localTime;

  // pin falls in 0–0.9s, lands and ripples
  const pinY = t < 0.9
    ? STAGE * 0.5 - 600 + Easing.easeInQuad(t / 0.9) * 600
    : STAGE * 0.5 - (Math.sin((t - 0.9) * 14) * Math.exp(-(t - 0.9) * 8) * 18);
  const pinScale = t < 0.9 ? 1 : 1 + Math.sin((t - 0.9) * 14) * Math.exp(-(t - 0.9) * 6) * 0.08;
  const pinOpacity = clamp(t / 0.2, 0, 1);

  // ripple after landing
  const rippleT = clamp((t - 0.9) / 1.2, 0, 1);
  const rippleScale = 1 + rippleT * 6;
  const rippleOpacity = (1 - rippleT) * 0.4;

  // wordmark slides in 1.4s, fades 3.6s
  const wmT = clamp((t - 1.3) / 0.7, 0, 1);
  const wmEase = Easing.easeOutCubic(wmT);
  const wmOpacity = wmEase;
  const wmDy = (1 - wmEase) * 24;

  // exit fade 3.5–4
  const exitT = clamp((t - 3.4) / 0.6, 0, 1);
  const groupOpacity = 1 - exitT;
  const groupScale = 1 + exitT * 0.04;

  // pin slides into the wordmark position by t=2.5
  const tuckT = clamp((t - 1.6) / 0.8, 0, 1);
  const tuckEase = Easing.easeInOutCubic(tuckT);
  const pinFinalX = STAGE * 0.5 + 280 * tuckEase;
  const pinFinalY = STAGE * 0.5 + 50 * tuckEase + (tuckT >= 1 ? Math.sin((t - 2.4) * 4) * 2 : 0);
  const pinFinalScale = 1 - 0.6 * tuckEase;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#fff',
      opacity: groupOpacity,
      transform: `scale(${groupScale})`,
    }}>
      {/* ripple */}
      <div style={{
        position: 'absolute',
        left: STAGE * 0.5, top: STAGE * 0.5,
        width: 80, height: 80,
        marginLeft: -40, marginTop: -40,
        border: `2px solid ${KNOCKER_BLUE}`,
        borderRadius: '50%',
        transform: `scale(${rippleScale})`,
        opacity: rippleOpacity,
      }}/>
      {/* the falling pin → tucks beside wordmark */}
      <div style={{
        position: 'absolute',
        left: tuckT > 0 ? pinFinalX : STAGE * 0.5,
        top: tuckT > 0 ? pinFinalY : pinY,
        transform: `translate(-50%, -50%) scale(${tuckT > 0 ? pinFinalScale : pinScale})`,
        opacity: pinOpacity,
      }}>
        <div style={{
          width: 80, height: 80,
          background: KNOCKER_BLUE,
          borderRadius: '50%',
          boxShadow: `0 0 60px ${KNOCKER_BLUE}66, 0 12px 24px rgba(0,0,0,0.18)`,
        }}/>
      </div>

      {/* wordmark */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: `translate(-50%, calc(-50% + ${wmDy}px))`,
        opacity: wmOpacity,
        display: 'flex', alignItems: 'center',
        marginLeft: -40,
      }}>
        <KnockerWordmark size={150} withDot={false} weight={700} color="#0A0A0A"/>
      </div>
    </div>
  );
}

// ─── Scene 2: Aerial map with status pins dropping in (4–11s) ─────────────
function SceneMap() {
  const { localTime } = useSprite();
  const t = localTime;
  const dur = 7;

  // slow Ken-Burns zoom on the map
  const zoom = 1.15 + (t / dur) * 0.18;
  const panX = -2 + (t / dur) * 4;
  const panY = -1 + (t / dur) * 2;

  // entry / exit
  const entryT = clamp(t / 0.6, 0, 1);
  const exitT = clamp((t - dur + 0.6) / 0.6, 0, 1);
  const groupOpacity = entryT * (1 - exitT);

  // territory.jpg already contains the real app's pins on actual houses;
  // no synthetic pins layered on top.
  const pins = [];

  // caption
  const captionT = clamp((t - 1.0) / 0.6, 0, 1);
  const captionExitT = clamp((t - 5.4) / 0.5, 0, 1);
  const captionOpacity = Easing.easeOutCubic(captionT) * (1 - captionExitT);
  const captionDy = (1 - Easing.easeOutCubic(captionT)) * 14;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#fff',
      opacity: groupOpacity,
      overflow: 'hidden',
    }}>
      <MapBackground src="video/assets/territory.jpg" zoom={zoom} panX={panX} panY={panY} brightness={0.92}/>
      {/* gentle vignette + bottom fade for caption legibility */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 45%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.18) 90%)',
      }}/>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: STAGE * 0.35,
        background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.92) 80%)',
      }}/>

      {/* pins */}
      {pins.map((p, i) => (
        <Sprite key={i} start={p.drop} end={dur + 0.5} keepMounted={false}>
          <DroppingPin
            kind={p.kind}
            x={p.x * STAGE}
            y={p.y * STAGE}
            size={72}
            dropDur={0.55}
          />
        </Sprite>
      ))}

      {/* caption */}
      <div style={{
        position: 'absolute',
        left: '50%', bottom: 110,
        transform: `translate(-50%, ${captionDy}px)`,
        opacity: captionOpacity,
        textAlign: 'center',
        fontFamily: '"SF Pro Display", -apple-system, system-ui, sans-serif',
      }}>
        <div style={{
          fontSize: 22, fontWeight: 600, color: KNOCKER_BLUE,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          marginBottom: 8,
        }}>Your territory</div>
        <div style={{
          fontSize: 64, fontWeight: 700,
          color: '#0A0A0A',
          letterSpacing: '-0.035em',
          lineHeight: 1.05,
        }}>Every door,<br/>at a glance.</div>
      </div>
    </div>
  );
}

// ─── Scene 3: 3D phone reveals map view (11–17.5s) ────────────────────────
function ScenePhoneMap() {
  const { localTime } = useSprite();
  const t = localTime;
  const dur = 6.5;

  // Phone rotates from -55° to 0°, scale 0.85 → 1
  const rotY = interpolate([0, dur * 0.7, dur], [-55, -8, 0], Easing.easeOutCubic)(t);
  const rotX = interpolate([0, dur * 0.7, dur], [12, 4, 0], Easing.easeOutCubic)(t);
  const rotZ = interpolate([0, dur * 0.7, dur], [-3, -1, 0], Easing.easeOutCubic)(t);
  const phoneScale = interpolate([0, dur * 0.7, dur], [0.86, 1.0, 1.0], Easing.easeOutCubic)(t);
  const ty = interpolate([0, 0.6, dur * 0.6, dur], [80, 0, 0, -10], Easing.easeOutCubic)(t);

  const entryT = clamp(t / 0.5, 0, 1);
  const exitT = clamp((t - dur + 0.5) / 0.5, 0, 1);
  const opacity = entryT * (1 - exitT);

  // pins on phone screen drop in after rotation settles
  const pinPositions = [
    { kind: 'appointment',    x: 0.20, y: 0.30, drop: 1.6 },
    { kind: 'interested',     x: 0.55, y: 0.34, drop: 1.9 },
    { kind: 'callback',       x: 0.30, y: 0.48, drop: 2.2 },
    { kind: 'interested',     x: 0.68, y: 0.52, drop: 2.5 },
    { kind: 'appointment',    x: 0.42, y: 0.62, drop: 2.8 },
    { kind: 'not-interested', x: 0.18, y: 0.72, drop: 3.1 },
  ];

  // caption
  const captionT = clamp((t - 4.0) / 0.5, 0, 1);
  const captionExitT = clamp((t - dur + 0.4) / 0.4, 0, 1);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#FAFBFC',
      opacity,
      perspective: 2200,
      perspectiveOrigin: '50% 40%',
    }}>
      {/* Subtle gradient backdrop */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 60%, rgba(0,122,255,0.08) 0%, rgba(0,122,255,0) 60%)',
      }}/>

      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: `translate(-50%, -50%)`,
        transformStyle: 'preserve-3d',
      }}>
        <Phone3D
          width={420}
          rotateY={rotY}
          rotateX={rotX}
          rotateZ={rotZ}
          translateY={ty}
          scale={phoneScale}
          glow={0.7}
          style={{ transform: `translate(-50%, -50%) translateY(${ty}px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${phoneScale})` }}
        >
          {/* Map screen content */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(video/assets/territory.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'saturate(0.95)',
          }}/>
          <StatusBar time="7:22" dark={false} scale={420/390}/>

          {/* dropping pins on screen */}
          {pinPositions.map((p, i) => (
            <Sprite key={i} start={p.drop} end={dur} keepMounted={false}>
              <DroppingPin
                kind={p.kind}
                x={p.x * 420}
                y={p.y * 420 * (19.5/9)}
                size={36}
                dropDur={0.5}
              />
            </Sprite>
          ))}

          <TabBar active="map" scale={420/390}/>
        </Phone3D>
      </div>

      {/* caption */}
      <div style={{
        position: 'absolute',
        left: 60, bottom: 80,
        opacity: Easing.easeOutCubic(captionT) * (1 - captionExitT),
        transform: `translateY(${(1 - Easing.easeOutCubic(captionT)) * 14}px)`,
        fontFamily: '"SF Pro Display", -apple-system, system-ui, sans-serif',
      }}>
        <div style={{
          fontSize: 20, fontWeight: 600, color: KNOCKER_BLUE,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          marginBottom: 8,
        }}>Homeowner data</div>
        <div style={{
          fontSize: 56, fontWeight: 700, color: '#0A0A0A',
          letterSpacing: '-0.035em', lineHeight: 1.05,
        }}>Know who's home.<br/>Before you knock.</div>
      </div>
    </div>
  );
}

// ─── Scene 4: Door log sheet — tap "Interested" (17.5–24s) ────────────────
function SceneLogDoor() {
  const { localTime } = useSprite();
  const t = localTime;
  const dur = 6.5;

  // sheet slides up over the map (0 → 0.7s)
  const sheetT = clamp(t / 0.8, 0, 1);
  const sheetY = (1 - Easing.easeOutCubic(sheetT)) * 800;

  // Map background continues with subtle pan
  const mapZoom = 1.4 + t * 0.01;

  // Tap "Interested" at t=2.4
  const tapT = t - 2.4;
  // cursor moves to interested button
  const cursorXT = clamp((t - 1.5) / 0.9, 0, 1);
  const cursorEase = Easing.easeInOutCubic(cursorXT);
  // start near middle of phone, move to interested cell
  // Sheet: marginTop STAGE*0.10=108. With scale s=1.6 in LogDoorSheet, the
  // status grid begins ~y=487 in stage coords; "Interested" cell center ≈ y=540.
  // Right-column center x ≈ 740.
  const cursorStartX = 540, cursorStartY = 760;
  // Interested button center ≈ (729, 559) in stage coords.
  // Cursor SVG (38×48) uses translate(-30%, -30%) so the arrow tip lands ~9px
  // left and ~12px above (cursorX, cursorY). Offset target so the tip is on the button.
  const cursorEndX = (window.__tweakCursorX ?? 646);
  const cursorEndY = (window.__tweakCursorY ?? 621);
  const cursorX = cursorStartX + (cursorEndX - cursorStartX) * cursorEase;
  const cursorY = cursorStartY + (cursorEndY - cursorStartY) * cursorEase;
  const cursorOpacity = clamp((t - 1.2) / 0.3, 0, 1) * (1 - clamp((t - 3.5) / 0.3, 0, 1));

  // tap ripple at t=2.4
  const tapPulse = tapT > 0 && tapT < 0.5 ? 1 - tapT/0.5 : 0;
  const cursorScale = tapT > 0 && tapT < 0.2 ? 0.78 : 1;

  // highlight progress (status flips on at tap)
  const highlightProgress = tapT > 0 ? clamp(tapT / 0.7, 0, 1) : 0;
  const isHighlighted = tapT > 0;

  // confirmation flash
  const confirmT = clamp((t - 3.4) / 0.4, 0, 1);
  const confirmOpacity = confirmT * (1 - clamp((t - 4.8) / 0.6, 0, 1));

  // sheet exit (slide down 5.8 → 6.5)
  const exitT = clamp((t - dur + 0.7) / 0.7, 0, 1);
  const sheetExitY = Easing.easeInCubic(exitT) * 800;

  // overall scene fade
  const entryFade = clamp(t / 0.3, 0, 1);
  const exitFade = clamp((t - dur + 0.3) / 0.3, 0, 1);
  const groupOpacity = entryFade * (1 - exitFade);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#fff',
      opacity: groupOpacity,
      overflow: 'hidden',
    }}>
      {/* Map behind */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url(video/assets/territory.jpg)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        transform: `scale(${mapZoom})`,
        filter: 'brightness(0.85) saturate(0.9) blur(2px)',
      }}/>

      {/* Sheet container */}
      <div style={{
        position: 'absolute',
        left: '50%', top: 0,
        transform: `translateX(-50%) translateY(${sheetY + sheetExitY}px)`,
        width: STAGE * 0.78, height: STAGE * 0.92,
        marginTop: STAGE * 0.10,
        borderRadius: 36,
        overflow: 'hidden',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
      }}>
        <LogDoorSheet
          scale={1.6}
          highlightStatus={isHighlighted ? 'interested' : null}
          highlightProgress={highlightProgress}
        />
      </div>

      {/* optional target guide for tweaking cursor position */}
      {window.__tweakShowCursorGuide && (
        <div style={{
          position: 'absolute', left: cursorEndX, top: cursorEndY,
          width: 16, height: 16, marginLeft: -8, marginTop: -8,
          border: '2px solid #FF3B30', borderRadius: '50%',
          zIndex: 49, pointerEvents: 'none',
        }}/>
      )}

      {/* cursor */}
      {cursorOpacity > 0 && (
        <div style={{
          position: 'absolute',
          left: cursorX, top: cursorY,
          transform: `translate(-30%, -30%) scale(${cursorScale})`,
          opacity: cursorOpacity,
          pointerEvents: 'none',
          zIndex: 50,
          transition: 'transform 80ms',
        }}>
          {tapPulse > 0 && (
            <div style={{
              position: 'absolute',
              left: 14, top: 14,
              width: 60, height: 60,
              marginLeft: -30, marginTop: -30,
              border: `3px solid ${KNOCKER_BLUE}`,
              borderRadius: '50%',
              transform: `scale(${1 + (1 - tapPulse) * 1.5})`,
              opacity: tapPulse * 0.7,
            }}/>
          )}
          <svg width="38" height="48" viewBox="0 0 38 48" style={{
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
          }}>
            <path d="M2 2 L2 36 L11 28 L16 42 L22 40 L17 26 L30 26 Z"
                  fill="#fff" stroke="#000" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      {/* confirm checkmark */}
      {confirmOpacity > 0 && (
        <div style={{
          position: 'absolute',
          left: '50%', top: '38%',
          transform: `translate(-50%, -50%) scale(${0.7 + confirmOpacity * 0.3})`,
          opacity: confirmOpacity,
          width: 140, height: 140,
          borderRadius: '50%',
          background: '#3DD64C',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 12px 40px rgba(61,214,76,0.4)',
          zIndex: 60,
        }}>
          <svg width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12 L10 18 L20 6"/>
          </svg>
        </div>
      )}

      {/* caption */}
      <div style={{
        position: 'absolute',
        left: 60, top: 80,
        opacity: clamp((t - 0.6) / 0.5, 0, 1) * (1 - clamp((t - dur + 0.5) / 0.4, 0, 1)),
        fontFamily: '"SF Pro Display", -apple-system, system-ui, sans-serif',
        zIndex: 5,
      }}>
        <div style={{
          fontSize: 20, fontWeight: 600, color: KNOCKER_BLUE,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          marginBottom: 6,
          mixBlendMode: 'difference', filter: 'invert(1)',
        }}>Log a door</div>
      </div>
    </div>
  );
}

// ─── Scene 5: Pipeline / history list scrolls (24–27.5s) ───────────────────
function ScenePipeline() {
  const { localTime } = useSprite();
  const t = localTime;
  const dur = 3.5;

  const entry = clamp(t / 0.4, 0, 1);
  const exit = clamp((t - dur + 0.4) / 0.4, 0, 1);
  const opacity = entry * (1 - exit);

  // tilt phone slightly + scroll list
  const rotY = interpolate([0, dur], [8, -8])(t);
  const scroll = clamp(t * 60, 0, 200);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#FAFBFC',
      opacity,
      perspective: 2200,
      perspectiveOrigin: '50% 50%',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 50%, rgba(0,122,255,0.06) 0%, rgba(0,122,255,0) 60%)',
      }}/>

      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transformStyle: 'preserve-3d',
        transform: `translate(-50%, -50%)`,
      }}>
        <div style={{ transform: `translate(-50%, -50%) rotateY(${rotY}deg)`, transformStyle: 'preserve-3d' }}>
          <Phone3D width={460} rotateY={0} glow={0.5}>
            <PipelineList scale={1.18} scrollOffset={scroll}/>
          </Phone3D>
        </div>
      </div>

      {/* caption */}
      <div style={{
        position: 'absolute',
        right: 60, top: 100,
        textAlign: 'right',
        opacity: clamp((t - 0.4) / 0.4, 0, 1) * (1 - clamp((t - dur + 0.4) / 0.4, 0, 1)),
        fontFamily: '"SF Pro Display", -apple-system, system-ui, sans-serif',
      }}>
        <div style={{
          fontSize: 20, fontWeight: 600, color: KNOCKER_BLUE,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          marginBottom: 8,
        }}>Team history</div>
        <div style={{
          fontSize: 48, fontWeight: 700, color: '#0A0A0A',
          letterSpacing: '-0.035em', lineHeight: 1.05,
        }}>Every interaction,<br/>captured.</div>
      </div>
    </div>
  );
}

// ─── Scene 6: Logo lockup (27.5–30s) ──────────────────────────────────────
function SceneLogo() {
  const { localTime } = useSprite();
  const t = localTime;
  const dur = 2.5;

  const entryT = clamp(t / 0.7, 0, 1);
  const eased = Easing.easeOutCubic(entryT);

  // pin slides in, wordmark assembles
  const pinX = -60 + eased * 60;
  const pinOpacity = eased;
  const wmOpacity = clamp((t - 0.3) / 0.5, 0, 1);
  const wmDy = (1 - Easing.easeOutCubic(clamp((t - 0.3) / 0.5, 0, 1))) * 16;

  const taglineOpacity = clamp((t - 0.9) / 0.6, 0, 1);
  const taglineDy = (1 - Easing.easeOutCubic(clamp((t - 0.9) / 0.6, 0, 1))) * 14;

  // pulse on the dot
  const pulseT = (t - 1.4);
  const pulseScale = pulseT > 0 ? 1 + Math.exp(-pulseT * 4) * 0.15 : 1;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#fff',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end',
        opacity: 1,
      }}>
        <div style={{
          opacity: wmOpacity,
          transform: `translateY(${wmDy}px)`,
          fontFamily: '"SF Pro Display", -apple-system, system-ui, sans-serif',
          fontSize: 180, fontWeight: 700,
          letterSpacing: '-0.045em',
          color: '#0A0A0A',
          lineHeight: 1,
        }}>knocker</div>
        <div style={{
          width: 28, height: 28,
          background: KNOCKER_BLUE,
          borderRadius: '50%',
          marginLeft: 12, marginBottom: 16,
          opacity: pinOpacity,
          transform: `translateX(${pinX}px) scale(${pulseScale})`,
          boxShadow: `0 0 ${30 * pulseScale}px ${KNOCKER_BLUE}80`,
        }}/>
      </div>

      <div style={{
        marginTop: 28,
        opacity: taglineOpacity,
        transform: `translateY(${taglineDy}px)`,
        fontFamily: '"SF Pro Display", -apple-system, system-ui, sans-serif',
        fontSize: 36, fontWeight: 500,
        color: 'rgba(60,60,67,0.7)',
        letterSpacing: '-0.01em',
      }}>Knock smarter.</div>

      <div style={{
        position: 'absolute', bottom: 64,
        opacity: clamp((t - 1.4) / 0.6, 0, 1),
        fontFamily: '"SF Pro Display", -apple-system, system-ui, sans-serif',
        fontSize: 18, fontWeight: 500,
        color: 'rgba(60,60,67,0.5)',
        letterSpacing: '0.06em',
      }}>Available now on iOS</div>
    </div>
  );
}

Object.assign(window, {
  SceneOpen, SceneMap, ScenePhoneMap, SceneLogDoor, ScenePipeline, SceneLogo,
});
