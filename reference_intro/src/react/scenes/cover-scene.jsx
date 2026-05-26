function CoverScene({ active, entered, onEnter, reducedMotion }) {
  const audio = useAudio();
  const [clock, setClock] = useState(0);
  const [chromeVisible, setChromeVisible] = useState(false);
  const [manualEnter, setManualEnter] = useState(false);
  const rootRef = useRef(null);
  const idleTimerRef = useRef(null);
  const enterLockRef = useRef(false);
  const rafRef = useRef(0);
  const spectrumSize = 160;

  const titleTimes = [1500, 1800, 2100, 2400, 2700];
  const lineVisible = active && clock >= 0;
  const waveVisible = active && clock >= 800;
  const subtitleVisible = entered || (active && clock >= 3600);
  const promptVisible = !entered && active && clock >= 4000;
  const handVisible = entered || (active && clock >= 3200);
  const titleVisible = titleTimes.map((delay) => entered || (active && clock >= delay));

  useEffect(() => {
    if (!active) {
      setClock(0);
      setChromeVisible(false);
      setManualEnter(false);
      enterLockRef.current = false;
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      return undefined;
    }
    if (reducedMotion) {
      setClock(5000);
      return undefined;
    }
    const started = performance.now();
    setClock(0);
    const tick = (now) => {
      setClock(now - started);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [active, reducedMotion]);

  useEffect(() => {
    if (!active) return undefined;
    const revealChrome = () => {
      setChromeVisible(false);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => {
        setChromeVisible(true);
      }, 2000);
    };
    const hideChrome = () => {
      setChromeVisible(false);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
    revealChrome();
    const onMove = () => revealChrome();
    const onLeave = () => hideChrome();
    const node = rootRef.current;
    node?.addEventListener("pointermove", onMove);
    node?.addEventListener("pointerleave", onLeave);
    return () => {
      node?.removeEventListener("pointermove", onMove);
      node?.removeEventListener("pointerleave", onLeave);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [active]);

  useEffect(() => {
    if (!active || entered || enterLockRef.current) return undefined;
    const trigger = (event) => {
      if (event.target?.closest?.("button,input,select,textarea,audio")) return;
      if (["Shift", "Control", "Alt", "Meta"].includes(event.key)) return;
      enterLockRef.current = true;
      setManualEnter(true);
      onEnter?.();
    };
    const onPointerDown = () => {
      enterLockRef.current = true;
      setManualEnter(true);
      onEnter?.();
    };
    window.addEventListener("keydown", trigger);
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => {
      window.removeEventListener("keydown", trigger);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [active, entered, onEnter]);

  const spectrumPath = useMemo(() => {
    const values = waveVisible ? audio.getAnalyserData(spectrumSize) : Array.from({ length: spectrumSize }, () => 0.5);
    const width = 1000;
    const height = 220;
    const yMid = 110;
    const amp = waveVisible
      ? (clock < 1500 ? 8 : clock < 3200 ? 18 : 26)
      : 0;
    const points = values.map((value, index) => {
      const x = (index / (spectrumSize - 1)) * width;
      const wobble = (value - 0.5) * 2;
      const drift = reducedMotion ? 0 : Math.sin((clock / 250) + index * 0.13) * (clock >= 800 ? 1.4 : 0);
      const y = yMid + wobble * amp + drift;
      return `${x.toFixed(2)} ${y.toFixed(2)}`;
    });
    return `M ${points.join(" L ")}`;
  }, [audio, clock, reducedMotion, waveVisible]);

  const titleChars = ["听", "过", "他", "的", "人"];
  const titleOffsets = [
    ["-2.12em", "0.03em", "-2.4deg"],
    ["-1.08em", "-0.02em", "1.8deg"],
    ["-0.02em", "0.05em", "-1.2deg"],
    ["0.98em", "-0.03em", "2deg"],
    ["1.92em", "0.02em", "-1.4deg"],
  ];

  return (
    <div className={`od-cover ${manualEnter || entered ? "is-entered" : ""}`} ref={rootRef}>
      <svg className={`od-cover-wave ${lineVisible ? "is-visible" : ""}`} viewBox="0 0 1000 220" preserveAspectRatio="none" aria-hidden="true">
        <path d={spectrumPath} className="od-cover-wave-path" />
      </svg>
      <div className={`od-cover-shell ${entered || clock >= 1180 ? "is-revealed" : ""} ${subtitleVisible ? "is-subtitle" : ""}`}>
        <div className="od-cover-topline">A · DATA · STORY · ABOUT · 薛之谦 · 2006 — 2026</div>
        <div className="od-cover-hero" aria-label="认真听过他的人">
          <span className={`od-cover-hand ${handVisible ? "is-visible" : ""}`}>认真</span>
          <div className="od-cover-title">
            {titleChars.map((char, index) => (
              <span
                key={char}
                className={`od-cover-char ${titleVisible[index] ? "is-visible" : ""}`}
                style={{
                  "--x": titleOffsets[index][0],
                  "--y": titleOffsets[index][1],
                  "--rot": titleOffsets[index][2],
                  "--delay": `${index * 0.12}s`,
                }}
                data-text={char}
              >
                {char}
              </span>
            ))}
          </div>
        </div>
        <div className={`od-cover-subtitle ${subtitleVisible ? "is-visible" : ""}`}>
          <span>—— 我没办法听完所有人</span>
          <span>　　但我把他们写下的话，留下来了</span>
        </div>
      </div>
      <div className={`od-cover-enter ${promptVisible ? "is-visible" : ""}`}>
        <span className="od-cover-dot" />
        <span>按任意键，让声音先进来</span>
      </div>
      <Chrome corner="tl" visible={chromeVisible}>CloudNet · 2026</Chrome>
      <Chrome corner="tr" visible={chromeVisible}>45 SONGS · 6.4M COMMENTS</Chrome>
      <Chrome corner="bl" visible={chromeVisible}>A DATA STORY</Chrome>
      <Chrome corner="br" visible={chromeVisible}>2006 — 2026</Chrome>
      <div className={`od-cover-ripple ${entered || manualEnter ? "is-visible" : ""}`} aria-hidden="true" />
    </div>
  );
}

window.CoverScene = CoverScene;
