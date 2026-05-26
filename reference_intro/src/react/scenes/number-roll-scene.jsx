const NUMBER_ROLL_TARGET = 6432819;

// 翻牌动画时间线（单位 ms，相对 active 进入这一页的 0 时刻）
const FLAP_DIGIT_STAGGER = 180;     // 每一位数字相邻启动间隔
const FLAP_PER_DIGIT_DURATION = 1100; // 单一位翻牌动画总时长（含若干次翻动 + 落定）
const FLAP_FLIP_COUNT = 5;          // 单位翻动次数（最后一次落到真值）
const FLAP_TOTAL_DELAY = 400;       // 整体延迟启动，让进场更松弛
// 文案显隐时间锚点（基于持续推进的 clock，不依赖数字动画状态）
const COPY_MAIN_START = 3200;
const COPY_MAIN_CHAR_INTERVAL = 70;
const COPY_SUB_START = 4900;
const SATELLITE_START = 5700;
const SATELLITE_STAGGER = 180;
const SATELLITE_DURATION = 700;
// 飘字
const PHRASE_START_AT = 250;
const PHRASE_STOP_AT = 5400;
const PHRASE_INTERVAL = 200;
const PHRASE_LIMIT = 22;

const COPY_MAIN = "这是 45 首歌下面，留下的话。";
const COPY_SUB = "评论区不是数据，是声音的副本。";
const SATELLITE_ITEMS = [
  { label: "LONG · 长评", value: 18, suffix: "%" },
  { label: "SUPERFAN · 超粉", value: 4823, suffix: " 人" },
  { label: "AVG · 平均长度", value: 47, suffix: " 字" },
];

function easeOutExpo(progress) {
  if (progress >= 1) return 1;
  return 1 - Math.pow(2, -10 * progress);
}

function easeInOutCubic(progress) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

// 把目标数字拆成"位"——保留千分位逗号位置
// 6432819 -> ['6', ',', '4', '3', '2', ',', '8', '1', '9']
function buildDigitTrack(targetNumber) {
  const formatted = new Intl.NumberFormat("en-US").format(targetNumber);
  return formatted.split("").map((ch, idx) => ({
    key: `slot-${idx}`,
    char: ch,
    isDigit: /\d/.test(ch),
  }));
}

// 给每一位数字生成一个"翻动序列"：[随机, 随机, 随机, 随机, 真值]
function buildFlipSequence(finalDigit, flipCount) {
  const seq = [];
  let prev = -1;
  for (let i = 0; i < flipCount - 1; i += 1) {
    let n;
    do {
      n = Math.floor(Math.random() * 10);
    } while (n === prev);
    prev = n;
    seq.push(n);
  }
  seq.push(parseInt(finalDigit, 10));
  return seq;
}

function randomPhraseSource(data) {
  const list = Array.isArray(data?.floatPhrases) ? data.floatPhrases.filter(Boolean) : [];
  if (list.length) return list;
  return [
    "我也在这里停过",
    "听到后来就沉默了",
    "像把自己写进去",
    "那年冬天我也在",
    "总有人替我说了",
    "有些话只能留在歌里",
  ];
}

function spawnPhrase(id, text, viewport) {
  const center = {
    x: viewport.width / 2,
    y: viewport.height * 0.4,
  };
  const edge = Math.floor(Math.random() * 4);
  const margin = 80;
  let x = 0;
  let y = 0;

  if (edge === 0) {
    x = Math.random() * viewport.width;
    y = -margin;
  } else if (edge === 1) {
    x = viewport.width + margin;
    y = Math.random() * viewport.height;
  } else if (edge === 2) {
    x = Math.random() * viewport.width;
    y = viewport.height + margin;
  } else {
    x = -margin;
    y = Math.random() * viewport.height;
  }

  const dx = center.x - x;
  const dy = center.y - y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const baseSpeed = 22 + Math.random() * 18;
  const drift = (Math.random() - 0.5) * 0.5;

  return {
    id,
    text,
    x,
    y,
    vx: (dx / distance) * baseSpeed,
    vy: (dy / distance) * baseSpeed,
    drift,
    opacity: 0,
    size: 13 + Math.random() * 7,
    age: 0,
    lifespan: 5.5 + Math.random() * 2,
  };
}

// —— 单个翻牌位（一个数字字符） ——
function FlapDigit({ slot, clock, reducedMotion }) {
  // 非数字位（逗号）：直接静态显示
  if (!slot.isDigit) {
    return <span className="od-flap-comma">{slot.char}</span>;
  }

  const startAt = slot.startAt;
  const localClock = clock - startAt;

  // reducedMotion 或动画结束：直接显示真值
  if (reducedMotion || localClock >= FLAP_PER_DIGIT_DURATION) {
    return (
      <span className="od-flap-card od-flap-card--final">
        <span className="od-flap-half od-flap-half--top">
          <span className="od-flap-half-glyph">{slot.char}</span>
        </span>
        <span className="od-flap-half od-flap-half--bottom">
          <span className="od-flap-half-glyph">{slot.char}</span>
        </span>
        <span className="od-flap-divider" />
      </span>
    );
  }

  // 还没到此位的启动时间：显示 0 静止
  if (localClock < 0) {
    return (
      <span className="od-flap-card od-flap-card--idle">
        <span className="od-flap-half od-flap-half--top">
          <span className="od-flap-half-glyph">0</span>
        </span>
        <span className="od-flap-half od-flap-half--bottom">
          <span className="od-flap-half-glyph">0</span>
        </span>
        <span className="od-flap-divider" />
      </span>
    );
  }

  // 翻牌进行中
  const sequence = slot.sequence;
  const flipDuration = FLAP_PER_DIGIT_DURATION / FLAP_FLIP_COUNT;
  // 减速曲线：让最后几次翻动逐渐放慢，模拟"咔哒咔哒咔哒...咔...哒"
  const easedClock = easeOutExpo(localClock / FLAP_PER_DIGIT_DURATION) * FLAP_PER_DIGIT_DURATION;
  const flipIdx = Math.min(FLAP_FLIP_COUNT - 1, Math.floor(easedClock / flipDuration));
  const flipProgress = (easedClock - flipIdx * flipDuration) / flipDuration; // 0-1
  const currentDigit = sequence[flipIdx];
  const nextDigit = sequence[Math.min(sequence.length - 1, flipIdx + 1)];

  // 翻牌动画原理：
  // 0~0.5: 上半"当前数字"翻盖从 0° → -90°（翻上去离开），同时下半静态显示新数字的下半
  // 0.5~1: 下半"新数字"翻盖从 90° → 0°（翻下来落定）
  const topFlipDeg = flipProgress < 0.5 ? -180 * flipProgress : -90;
  const bottomFlipDeg = flipProgress >= 0.5 ? 90 - 180 * (flipProgress - 0.5) : 90;
  const topShadow = flipProgress < 0.5 ? 1 - flipProgress * 2 : 0;
  const bottomShadow = flipProgress >= 0.5 ? (flipProgress - 0.5) * 2 : 0;

  return (
    <span className="od-flap-card">
      <span className="od-flap-half od-flap-half--top">
        <span className="od-flap-half-glyph">{currentDigit}</span>
      </span>
      <span className="od-flap-half od-flap-half--bottom">
        <span className="od-flap-half-glyph">{nextDigit}</span>
      </span>
      <span className="od-flap-divider" />
      <span
        className="od-flap-flip od-flap-flip--top"
        style={{
          transform: `rotateX(${topFlipDeg}deg)`,
          opacity: flipProgress < 0.5 ? 1 : 0,
        }}
      >
        <span className="od-flap-flip-inner">{currentDigit}</span>
        <span className="od-flap-flip-shadow" style={{ opacity: topShadow * 0.5 }} />
      </span>
      <span
        className="od-flap-flip od-flap-flip--bottom"
        style={{
          transform: `rotateX(${bottomFlipDeg}deg)`,
          opacity: flipProgress >= 0.5 ? 1 : 0,
        }}
      >
        <span className="od-flap-flip-inner">{nextDigit}</span>
        <span className="od-flap-flip-shadow" style={{ opacity: bottomShadow * 0.5 }} />
      </span>
    </span>
  );
}

function NumberRollScene({ active, reducedMotion, data }) {
  const [clock, setClock] = useState(0);
  const [phrases, setPhrases] = useState([]);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? 1440 : window.innerWidth,
    height: typeof window === "undefined" ? 900 : window.innerHeight,
  }));
  const rafRef = useRef(0);
  const phraseRafRef = useRef(0);
  const spawnCarryRef = useRef(0);
  const phraseIdRef = useRef(0);
  const phraseSource = useMemo(() => randomPhraseSource(data), [data]);

  // 翻牌槽位：数字 + 逗号；为每个数字位计算 startAt 和翻动序列
  const flapSlots = useMemo(() => {
    const base = buildDigitTrack(NUMBER_ROLL_TARGET);
    let digitIndex = 0;
    return base.map((slot) => {
      if (!slot.isDigit) return slot;
      const startAt = FLAP_TOTAL_DELAY + digitIndex * FLAP_DIGIT_STAGGER;
      const sequence = buildFlipSequence(slot.char, FLAP_FLIP_COUNT);
      digitIndex += 1;
      return { ...slot, startAt, sequence };
    });
  }, []);

  const totalAnimationDuration = useMemo(() => {
    const lastDigit = [...flapSlots].reverse().find((s) => s.isDigit);
    return (lastDigit?.startAt || 0) + FLAP_PER_DIGIT_DURATION;
  }, [flapSlots]);

  // 主时钟：必须持续推进直到所有显隐节点都过去（之前 bug 就出在这里：动画停了 clock 也停了）
  useEffect(() => {
    if (!active) {
      setClock(0);
      setPhrases([]);
      return undefined;
    }
    if (reducedMotion) {
      setClock(SATELLITE_START + SATELLITE_DURATION + SATELLITE_STAGGER * SATELLITE_ITEMS.length + 200);
      setPhrases([]);
      return undefined;
    }

    setClock(0);
    setPhrases([]);

    const startedAt = performance.now();
    const stopAt = Math.max(
      totalAnimationDuration,
      SATELLITE_START + SATELLITE_STAGGER * SATELLITE_ITEMS.length + SATELLITE_DURATION,
      PHRASE_STOP_AT,
    ) + 800;

    const tick = (now) => {
      const elapsed = now - startedAt;
      setClock(elapsed);
      if (elapsed < stopAt) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = 0;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [active, reducedMotion, totalAnimationDuration]);

  useEffect(() => {
    if (!active) return undefined;
    const syncViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, [active]);

  useEffect(() => {
    if (!active || reducedMotion) {
      setPhrases([]);
      return undefined;
    }

    const startedAt = performance.now();
    let lastNow = startedAt;
    spawnCarryRef.current = 0;

    const update = (now) => {
      const delta = Math.min(48, now - lastNow);
      lastNow = now;
      const elapsed = now - startedAt;
      const centerX = viewport.width / 2;
      const centerY = viewport.height * 0.4;

      setPhrases((current) => {
        let next = current;

        if (elapsed >= PHRASE_START_AT && elapsed <= PHRASE_STOP_AT && next.length < PHRASE_LIMIT) {
          spawnCarryRef.current += delta;
          const capacity = PHRASE_LIMIT - next.length;
          const spawnCount = Math.min(capacity, Math.floor(spawnCarryRef.current / PHRASE_INTERVAL));
          if (spawnCount > 0) {
            spawnCarryRef.current -= spawnCount * PHRASE_INTERVAL;
            const created = Array.from({ length: spawnCount }, () => {
              const text = phraseSource[Math.floor(Math.random() * phraseSource.length)];
              phraseIdRef.current += 1;
              return spawnPhrase(phraseIdRef.current, text, viewport);
            });
            next = next.concat(created);
          }
        }

        return next
          .map((phrase) => {
            const dx = centerX - phrase.x;
            const dy = centerY - phrase.y;
            const distance = Math.max(1, Math.hypot(dx, dy));
            const pull = distance < 160 ? 0.16 : 0.028;
            const turbulence = Math.sin((phrase.age + phrase.id) * 2.4) * phrase.drift * 24;
            const towardX = (dx / distance) * pull * delta;
            const towardY = (dy / distance) * pull * delta;
            const nextVx = phrase.vx + towardX + turbulence * 0.012;
            const nextVy = phrase.vy + towardY - turbulence * 0.01;
            const nextX = phrase.x + nextVx * (delta / 1000);
            const nextY = phrase.y + nextVy * (delta / 1000);
            const nextAge = phrase.age + delta / 1000;
            const fadeIn = Math.min(1, nextAge / 0.9) * 0.32;
            const lifeFade = Math.max(0, 1 - nextAge / phrase.lifespan);
            // 距数字越近越透明（让数字主体清晰）
            const absorbFade = distance < 180 ? clamp((distance - 30) / 150, 0, 1) : 1;
            const opacity = fadeIn * lifeFade * absorbFade;
            return {
              ...phrase,
              x: nextX,
              y: nextY,
              vx: nextVx,
              vy: nextVy,
              age: nextAge,
              opacity,
            };
          })
          .filter((phrase) => phrase.opacity > 0.01 && phrase.age < phrase.lifespan + 0.6);
      });

      phraseRafRef.current = requestAnimationFrame(update);
    };

    phraseRafRef.current = requestAnimationFrame(update);
    return () => {
      if (phraseRafRef.current) cancelAnimationFrame(phraseRafRef.current);
      phraseRafRef.current = 0;
    };
  }, [active, phraseSource, reducedMotion, viewport]);

  if (!active) return null;

  // 文案显隐：用持续推进的 clock 驱动（旧 bug 修复点）
  const typedMainLength = reducedMotion
    ? COPY_MAIN.length
    : clamp(Math.floor((clock - COPY_MAIN_START) / COPY_MAIN_CHAR_INTERVAL), 0, COPY_MAIN.length);
  const copyMainText = COPY_MAIN.slice(0, typedMainLength);
  const copySubVisible = reducedMotion || clock >= COPY_SUB_START;

  return (
    <div className="od-numberroll">
      <Chrome corner="tl" visible>{`03 / 13`}</Chrome>
      <Chrome corner="tr" visible>DATASET OVERVIEW</Chrome>

      <div className="od-numberroll-phrases" aria-hidden="true">
        {phrases.map((phrase) => (
          <span
            key={phrase.id}
            className="od-numberroll-phrase"
            style={{
              transform: `translate(${phrase.x}px, ${phrase.y}px)`,
              opacity: phrase.opacity,
              fontSize: `${phrase.size}px`,
            }}
          >
            {phrase.text}
          </span>
        ))}
      </div>

      <div className="od-numberroll-shell">
        <div
          className={`od-flap-board ${clock >= totalAnimationDuration ? "is-ready" : ""}`}
          aria-label={`${NUMBER_ROLL_TARGET}`}
        >
          {flapSlots.map((slot) => (
            <FlapDigit
              key={slot.key}
              slot={slot}
              clock={clock}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>

        <div className="od-numberroll-copy">
          <div className="od-numberroll-copy-main">
            {copyMainText}
            {!reducedMotion && typedMainLength > 0 && typedMainLength < COPY_MAIN.length && (
              <span className="od-numberroll-caret" aria-hidden="true">|</span>
            )}
          </div>
          <div className={`od-numberroll-copy-sub ${copySubVisible ? "is-visible" : ""}`}>
            {COPY_SUB}
          </div>
        </div>

        <div className="od-numberroll-satellites">
          {SATELLITE_ITEMS.map((item, index) => {
            const startAt = SATELLITE_START + index * SATELLITE_STAGGER;
            const progress = reducedMotion
              ? 1
              : clamp((clock - startAt) / SATELLITE_DURATION, 0, 1);
            const visible = progress > 0;
            const eased = easeInOutCubic(progress);
            const value = progress >= 1 ? item.value : item.value * eased;
            const formatted = item.value === 18
              ? Math.round(value)
              : new Intl.NumberFormat("en-US").format(Math.round(value));
            return (
              <div
                key={item.label}
                className={`od-numberroll-satellite ${visible ? "is-visible" : ""}`}
              >
                <div className="od-numberroll-satellite-label">{item.label}</div>
                <div className="od-numberroll-satellite-value">
                  {formatted}
                  <span className="od-numberroll-satellite-suffix">{item.suffix}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

window.NumberRollScene = NumberRollScene;
