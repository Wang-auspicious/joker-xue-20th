const {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} = React;

const AudioContextState = React.createContext(null);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatCompactZh(value) {
  const num = Number(value || 0);
  if (num >= 100000000) return `${(num / 100000000).toFixed(1)}亿`;
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`;
  return num.toLocaleString("zh-CN");
}

function fakeSpectrum(size, timeMs) {
  const t = timeMs / 1000;
  return Array.from({ length: size }, (_, index) => {
    const f = index / Math.max(1, size - 1);
    const kick = Math.sin(t * 2.4 + f * 3.2) * 0.14;
    const mid = Math.sin(t * 4.8 + index * 0.21) * 0.22;
    const air = Math.cos(t * 1.7 + index * 0.09) * 0.11;
    const pulse = Math.max(0, Math.sin(t * 3.3)) * (0.14 - Math.abs(f - 0.5) * 0.16);
    return clamp(0.5 + kick + mid + air + pulse, 0.08, 0.92);
  });
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

function useEnterAnimation(active, delay = 0) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [active, delay]);

  return visible;
}

function useScene({ total, initialIndex = 0, isLocked = () => false }) {
  const [sceneIdx, setSceneIdx] = useState(initialIndex);
  const wheelGate = useRef(0);
  const touchStart = useRef(null);
  const locked = isLocked(sceneIdx);

  const jumpTo = useCallback((nextIndex, force = false) => {
    if (locked && !force) return;
    setSceneIdx(clamp(nextIndex, 0, total - 1));
  }, [locked, total]);

  const next = useCallback((force = false) => {
    if (locked && !force) return;
    setSceneIdx((current) => clamp(current + 1, 0, total - 1));
  }, [locked, total]);

  const prev = useCallback((force = false) => {
    if (locked && !force) return;
    setSceneIdx((current) => clamp(current - 1, 0, total - 1));
  }, [locked, total]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (locked) return;
      if (["ArrowRight", "PageDown"].includes(event.key)) {
        event.preventDefault();
        next();
      } else if (["ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        prev();
      }
    };

    const onWheel = (event) => {
      if (locked) return;
      const now = performance.now();
      if (now - wheelGate.current < 640) return;
      if (Math.abs(event.deltaY) < 18) return;
      wheelGate.current = now;
      if (event.deltaY > 0) next();
      else prev();
    };

    const onTouchStart = (event) => {
      const touch = event.touches && event.touches[0];
      if (!touch) return;
      touchStart.current = { x: touch.clientX, y: touch.clientY };
    };

    const onTouchEnd = (event) => {
      if (locked || !touchStart.current) return;
      const touch = event.changedTouches && event.changedTouches[0];
      if (!touch) return;
      const deltaX = touch.clientX - touchStart.current.x;
      const deltaY = touch.clientY - touchStart.current.y;
      touchStart.current = null;
      if (Math.abs(deltaX) < 52 || Math.abs(deltaX) < Math.abs(deltaY)) return;
      if (deltaX < 0) next();
      else prev();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [locked, next, prev]);

  return { sceneIdx, jumpTo, next, prev, setSceneIdx };
}

function useAudioEngine(dust, reducedMotion) {
  const playbackAudioRef = useRef(null);
  const analysisAudioRef = useRef(null);
  const analyserRef = useRef(null);
  const analysisSourceRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioSyncTimerRef = useRef(null);
  const fadeRafRef = useRef(null);
  const startPromiseRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [currentSource, setCurrentSource] = useState(dust?.audioMp3 || "");
  const [sourceIndex, setSourceIndex] = useState(0);
  const sources = useMemo(
    () => [dust?.audioMp3, dust?.audioFlac].filter(Boolean),
    [dust?.audioFlac, dust?.audioMp3],
  );

  const syncAudioPair = useCallback((force = false) => {
    const playbackAudio = playbackAudioRef.current;
    const analysisAudio = analysisAudioRef.current;
    if (!playbackAudio || !analysisAudio) return;
    const targetTime = playbackAudio.currentTime || 0;
    const drift = Math.abs((analysisAudio.currentTime || 0) - targetTime);
    if (force || drift > 0.18) {
      try {
        analysisAudio.currentTime = targetTime;
      } catch (error) {}
    }
  }, []);

  const ensureAnalyser = useCallback(() => {
    if (reducedMotion) return null;
    const analysisAudio = analysisAudioRef.current;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!analysisAudio || !Ctx) return null;
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new Ctx();
      } catch (error) {
        return null;
      }
    }
    if (!analyserRef.current) {
      try {
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.82;
        analyserRef.current = analyser;
      } catch (error) {
        return null;
      }
    }
    if (!analysisSourceRef.current) {
      // 优先用 captureStream（不会劫持原 audio 输出）
      try {
        if (typeof analysisAudio.captureStream === "function") {
          const stream = analysisAudio.captureStream();
          if (stream?.getAudioTracks?.().length) {
            analysisSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
          }
        }
      } catch (error) {}
      // fallback：createMediaElementSource。注意这会把 analysisAudio 的输出
      // 完全劫持到 AudioContext 里——但因为 analysisAudio.muted=true 且我们
      // 不 connect 到 destination，它本身就不该出声，所以 OK。
      // 关键：playbackAudio 不参与这个链路，外放完全靠它。
      if (!analysisSourceRef.current) {
        try {
          analysisSourceRef.current = audioContextRef.current.createMediaElementSource(analysisAudio);
        } catch (error) {
          // 如果连这个都失败，分析就放弃，但播放不受影响。
          return null;
        }
      }
      if (analysisSourceRef.current && analyserRef.current) {
        try {
          analysisSourceRef.current.connect(analyserRef.current);
        } catch (error) {}
      }
    }
    return analyserRef.current;
  }, [reducedMotion]);

  const setAudioSource = useCallback((index) => {
    if (index < 0 || index >= sources.length) return "";
    const nextSource = sources[index];
    const playbackAudio = playbackAudioRef.current;
    const analysisAudio = analysisAudioRef.current;
    if (!nextSource || !playbackAudio || !analysisAudio) return "";
    if (currentSource === nextSource && playbackAudio.src) return nextSource;
    playbackAudio.src = encodeURI(nextSource);
    analysisAudio.src = encodeURI(nextSource);
    playbackAudio.load();
    analysisAudio.load();
    setCurrentSource(nextSource);
    setSourceIndex(index);
    setIsReady(false);
    setDurationMs(0);
    return nextSource;
  }, [currentSource, sources]);

  const advanceAudioSource = useCallback(
    () => setAudioSource(sourceIndex + 1),
    [setAudioSource, sourceIndex],
  );

  useEffect(() => {
    if (!playbackAudioRef.current) {
      const playbackAudio = new Audio();
      playbackAudio.loop = true;
      playbackAudio.preload = "auto";
      playbackAudio.playsInline = true;
      // 注意：不要设 crossOrigin。本地静态文件加了 crossOrigin="anonymous"
      // 会让浏览器走 CORS 检查，本地服务器一般不返回 CORS 头，导致音频被阻塞。
      // mox 原始版本也没设这个，是直接出声的。
      playbackAudioRef.current = playbackAudio;
    }
    if (!analysisAudioRef.current) {
      const analysisAudio = new Audio();
      analysisAudio.loop = true;
      analysisAudio.preload = "auto";
      analysisAudio.playsInline = true;
      // analysisAudio 也不设 crossOrigin。它只走 captureStream / createMediaElementSource
      // 喂给 AudioContext 做频谱，不需要跨域 fetch。
      analysisAudio.muted = true;
      analysisAudio.volume = 0;
      analysisAudioRef.current = analysisAudio;
    }

    const playbackAudio = playbackAudioRef.current;
    const analysisAudio = analysisAudioRef.current;
    if (!playbackAudio.src && sources[0]) {
      playbackAudio.src = encodeURI(sources[0]);
      analysisAudio.src = encodeURI(sources[0]);
      playbackAudio.load();
      analysisAudio.load();
      setCurrentSource(sources[0]);
    }

    const onPlay = () => {
      setIsPlaying(true);
      syncAudioPair(true);
    };
    const onPause = () => setIsPlaying(false);
    const onCanPlay = () => setIsReady(true);
    const onLoadedMetadata = () => {
      const seconds = Number(playbackAudio.duration || 0);
      setDurationMs(Number.isFinite(seconds) ? Math.max(0, seconds * 1000) : 0);
    };
    const onSeeked = () => syncAudioPair(true);
    const onError = () => {
      const nextSource = sources[sourceIndex + 1];
      if (!nextSource || nextSource === currentSource) return;
      setAudioSource(sourceIndex + 1);
    };

    playbackAudio.addEventListener("play", onPlay);
    playbackAudio.addEventListener("pause", onPause);
    playbackAudio.addEventListener("canplay", onCanPlay);
    playbackAudio.addEventListener("loadedmetadata", onLoadedMetadata);
    playbackAudio.addEventListener("seeked", onSeeked);
    playbackAudio.addEventListener("error", onError);
    analysisAudio.addEventListener("error", onError);
    return () => {
      playbackAudio.removeEventListener("play", onPlay);
      playbackAudio.removeEventListener("pause", onPause);
      playbackAudio.removeEventListener("canplay", onCanPlay);
      playbackAudio.removeEventListener("loadedmetadata", onLoadedMetadata);
      playbackAudio.removeEventListener("seeked", onSeeked);
      playbackAudio.removeEventListener("error", onError);
      analysisAudio.removeEventListener("error", onError);
      if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
      if (audioSyncTimerRef.current) {
        clearInterval(audioSyncTimerRef.current);
        audioSyncTimerRef.current = null;
      }
    };
  }, [currentSource, setAudioSource, sourceIndex, sources, syncAudioPair]);

  const applyPlaybackState = useCallback((mutedValue = isMuted) => {
    const playbackAudio = playbackAudioRef.current;
    const analysisAudio = analysisAudioRef.current;
    if (!playbackAudio || !analysisAudio) return;
    playbackAudio.muted = mutedValue;
    playbackAudio.volume = mutedValue ? 0 : 1;
    analysisAudio.muted = true;
    analysisAudio.volume = 0;
  }, [isMuted]);

  useEffect(() => {
    applyPlaybackState();
  }, [applyPlaybackState, isMuted]);

  const playPair = useCallback(async (options = {}) => {
    const playbackAudio = playbackAudioRef.current;
    const analysisAudio = analysisAudioRef.current;
    if (!playbackAudio || !analysisAudio) return;
    const { skipApply = false, fadeVolume = null } = options;
    if (!currentSource && !setAudioSource(0)) return;
    if (!skipApply) applyPlaybackState();
    if (fadeVolume !== null) {
      playbackAudio.muted = false;
      playbackAudio.volume = fadeVolume;
    }

    try {
      ensureAnalyser();
    } catch (error) {}

    const analysisPlay = analysisAudio.paused ? analysisAudio.play().catch(() => null) : Promise.resolve();
    let playbackPlay = playbackAudio.paused ? playbackAudio.play() : Promise.resolve();
    syncAudioPair(true);
    try {
      await playbackPlay;
    } catch (error) {
      const fallback = advanceAudioSource();
      if (!fallback) throw error;
      if (!skipApply) applyPlaybackState();
      if (fadeVolume !== null) {
        playbackAudio.muted = false;
        playbackAudio.volume = fadeVolume;
      }
      const retryAnalysis = analysisAudio.paused ? analysisAudio.play().catch(() => null) : Promise.resolve();
      playbackPlay = playbackAudio.play();
      await retryAnalysis;
      await playbackPlay;
    }

    if (audioContextRef.current?.state === "suspended") {
      await audioContextRef.current.resume().catch(() => {});
    }
    await analysisPlay;
    syncAudioPair(true);
    if (!audioSyncTimerRef.current) {
      audioSyncTimerRef.current = window.setInterval(() => {
        const playingAudio = playbackAudioRef.current;
        const analyserAudio = analysisAudioRef.current;
        if (!playingAudio || !analyserAudio) return;
        if (!analyserAudio.paused && !playingAudio.paused) syncAudioPair(false);
      }, 700);
    }
  }, [advanceAudioSource, applyPlaybackState, currentSource, ensureAnalyser, setAudioSource, syncAudioPair]);

  const startBackgroundAudio = useCallback(async (options = {}) => {
    if (startPromiseRef.current) return startPromiseRef.current;
    startPromiseRef.current = playPair(options).finally(() => {
      startPromiseRef.current = null;
    });
    return startPromiseRef.current;
  }, [playPair]);

  const play = useCallback(async () => {
    applyPlaybackState();
    await startBackgroundAudio();
  }, [applyPlaybackState, startBackgroundAudio]);

  const pause = useCallback(() => {
    if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
    if (audioSyncTimerRef.current) {
      clearInterval(audioSyncTimerRef.current);
      audioSyncTimerRef.current = null;
    }
    playbackAudioRef.current?.pause();
    analysisAudioRef.current?.pause();
  }, []);

  const fadeInAndPlay = useCallback(async (duration = 1200) => {
    const playbackAudio = playbackAudioRef.current;
    if (!playbackAudio) return;
    setIsMuted(false);
    if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
    playbackAudio.volume = 0;
    await startBackgroundAudio({ skipApply: true, fadeVolume: 0 });
    const startedAt = performance.now();
    return new Promise((resolve) => {
      const tick = (now) => {
        const progress = clamp((now - startedAt) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        playbackAudio.volume = eased;
        if (progress < 1) {
          fadeRafRef.current = requestAnimationFrame(tick);
        } else {
          playbackAudio.volume = 1;
          fadeRafRef.current = null;
          resolve();
        }
      };
      fadeRafRef.current = requestAnimationFrame(tick);
    });
  }, [startBackgroundAudio]);

  const toggleMute = useCallback(async () => {
    if (!playbackAudioRef.current) return;
    if (playbackAudioRef.current.paused) {
      setIsMuted(false);
      await startBackgroundAudio().catch(() => {});
      return;
    }
    setIsMuted((current) => !current);
  }, [startBackgroundAudio]);

  const ensureStarted = useCallback(() => startBackgroundAudio().catch(() => {}), [startBackgroundAudio]);
  const getCurrentTimeMs = useCallback(() => {
    const playbackAudio = playbackAudioRef.current;
    return playbackAudio ? Math.max(0, playbackAudio.currentTime * 1000) : 0;
  }, []);
  const getDurationMs = useCallback(() => {
    const playbackAudio = playbackAudioRef.current;
    const seconds = Number(playbackAudio?.duration || 0);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
    return durationMs;
  }, [durationMs]);

  const getAnalyserData = useCallback((size = 128) => {
    const analyser = ensureAnalyser();
    if (!analyser || !analysisAudioRef.current || analysisAudioRef.current.paused) {
      return fakeSpectrum(size, performance.now());
    }
    const sourceArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(sourceArray);
    const step = sourceArray.length / size;
    const values = new Array(size).fill(0).map((_, index) => {
      const start = Math.floor(index * step);
      const end = Math.max(start + 1, Math.floor((index + 1) * step));
      let total = 0;
      for (let cursor = start; cursor < end; cursor += 1) total += sourceArray[cursor] / 255;
      const average = total / Math.max(1, end - start);
      return clamp(Math.pow(average, 0.84), 0.08, 0.96);
    });
    const energy = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
    return energy < 0.02 ? fakeSpectrum(size, performance.now()) : values;
  }, [ensureAnalyser]);

  return {
    isPlaying,
    isMuted,
    isRunning: isPlaying,
    isReady,
    currentSource,
    play,
    pause,
    toggleMute,
    ensureStarted,
    startBackgroundAudio,
    fadeInAndPlay,
    getAnalyserData,
    getCurrentTimeMs,
    getDurationMs,
  };
}

function AudioProvider({ dust, reducedMotion, children }) {
  const engine = useAudioEngine(dust, reducedMotion);
  return (
    <AudioContextState.Provider value={engine}>
      {children}
    </AudioContextState.Provider>
  );
}

function useAudio() {
  return useContext(AudioContextState);
}

function Stage({ scenes, activeIndex }) {
  return (
    <div className="od-stage">
      {scenes.map((scene, index) => {
        const distance = Math.abs(index - activeIndex);
        const mounted = distance <= 1;
        return (
          <section
            key={scene.id}
            className={[
              "od-scene",
              index === activeIndex ? "is-active" : "",
              mounted ? "is-mounted" : "",
            ].filter(Boolean).join(" ")}
            aria-hidden={index === activeIndex ? "false" : "true"}
          >
            {mounted ? scene.render({ active: index === activeIndex, index }) : null}
          </section>
        );
      })}
    </div>
  );
}

function Chrome({ corner, children, visible = true }) {
  return (
    <div className={`od-chrome od-chrome-${corner} ${visible ? "is-visible" : ""}`}>
      {children}
    </div>
  );
}

function ProgressBar({ total, active, onJump, disabled = false }) {
  return (
    <div className={`od-progress ${disabled ? "is-disabled" : ""}`}>
      <div className="od-progress-track" />
      <div className="od-progress-dots">
        {Array.from({ length: total }, (_, index) => (
          <button
            key={index}
            type="button"
            className={[
              "od-progress-dot",
              index === active ? "is-active" : "",
              index < active ? "is-past" : "",
            ].filter(Boolean).join(" ")}
            onClick={() => onJump(index)}
            aria-label={`跳转到第 ${index + 1} 页`}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

function NoiseLayer() {
  return <div className="od-noise" aria-hidden="true" />;
}

function ScanlinesLayer() {
  return <div className="od-scanlines" aria-hidden="true" />;
}

function VignetteLayer() {
  return <div className="od-vignette" aria-hidden="true" />;
}
