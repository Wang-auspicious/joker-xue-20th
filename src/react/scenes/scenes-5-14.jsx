function useSceneClock(active) {
  const [clock, setClock] = useState(0);

  useEffect(() => {
    if (!active) {
      setClock(0);
      return undefined;
    }
    const startedAt = performance.now();
    let raf = 0;
    const tick = (now) => {
      setClock(now - startedAt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return clock;
}

function phaseForYear(year) {
  if (year <= 2014) return "early";
  if (year <= 2020) return "mid";
  return "late";
}

function buildDustLyricLines(lyrics) {
  const cleaned = (Array.isArray(lyrics) ? lyrics : [])
    .map((entry, index) => {
      if (typeof entry === "string") {
        const text = entry.replace(/\s+/g, " ").trim();
        return text ? { id: `dust-lyric-${index}`, text, time: index * 5200 } : null;
      }
      const text = String(entry?.text || entry?.content || "").replace(/\s+/g, " ").trim();
      if (!text) return null;
      const time = Number(entry?.time ?? entry?.timeMs ?? (index * 5200));
      return {
        id: entry?.id || `dust-lyric-${index}`,
        text,
        time: Number.isFinite(time) ? Math.max(0, time) : index * 5200,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.time - b.time);

  if (cleaned.length) return cleaned;

  return [
    { id: "dust-placeholder-1", text: "这份音频里没有读出可用的歌词标签。", time: 0 },
    { id: "dust-placeholder-2", text: "如果你之后补一份 .lrc 或带歌词 tag 的音频，", time: 5200 },
    { id: "dust-placeholder-3", text: "这一页会自动切成完整的滚动歌词。", time: 10400 },
  ];
}

function sceneWordHit(song, word) {
  return (song.wordStats || []).find((item) => item.word === word)?.count
    || ((song.words || []).includes(word) ? 1 : 0);
}

function HourlyCommentsScene({ active, data, reducedMotion }) {
  const visible = useEnterAnimation(active, 80);
  const hours = data?.hourlyHighlights || [];
  const peak = Math.max(1, ...hours.map((entry) => entry.count || 0));
  const [selectedHour, setSelectedHour] = useState(3);

  useEffect(() => {
    if (!active || reducedMotion || !hours.length) return undefined;
    setSelectedHour(3);
    const timer = window.setInterval(() => {
      setSelectedHour((current) => (current + 1) % hours.length);
    }, 1600);
    return () => window.clearInterval(timer);
  }, [active, hours.length, reducedMotion]);

  const activeHour = hours[selectedHour] || hours[0] || { hour: 0, count: 0, sample: null };
  const handRotation = ((activeHour.hour / 24) * 360) - 90;
  const isNight = activeHour.hour <= 5;
  const samples = (activeHour.samples?.length ? activeHour.samples : [activeHour.sample].filter(Boolean)).slice(0, 4);
  const hourAnchors = [0, 1, 2, 3, 4, 5, 6, 12, 18, 23];

  return (
    <div className={`od-hourly ${visible ? "is-visible" : ""}`}>
      <Chrome corner="tl" visible>{`06 / 13`}</Chrome>
      <Chrome corner="tr" visible>凌晨三点的评论区</Chrome>

      <div className="od-sceneHead">
        <div className="od-sceneKicker">HOURLY CUT · 24 HOURS</div>
        <h2 className="od-sceneTitle">凌晨三点的评论区</h2>
        <p className="od-sceneCopy">不是每个小时说的话都一样。越往深夜，字越长，语气越私人。</p>
      </div>

      <div className={`od-hourlyDial ${isNight ? "is-night" : "is-day"}`}>
        <div className="od-hourlyDialFace" />
        <div className="od-hourlyDialHand" style={{ transform: `translate(-50%, -100%) rotate(${handRotation}deg)` }} />
        <div className="od-hourlyDialCenter" />
        <div className="od-hourlyDialHour">{`${String(activeHour.hour).padStart(2, "0")}:00`}</div>
        <div className="od-hourlyDialCount">{`${formatCompactZh(activeHour.count)} 条评论`}</div>
      </div>

      <div className="od-hourlySelector">
        {hourAnchors.map((hour) => {
          const item = hours[hour] || { count: 0 };
          return (
            <button
              key={hour}
              type="button"
              className={`od-hourlyAnchor ${selectedHour === hour ? "is-active" : ""}`}
              onMouseEnter={() => setSelectedHour(hour)}
              onFocus={() => setSelectedHour(hour)}
              onClick={() => setSelectedHour(hour)}
            >
              <span className="od-hourlyAnchorDot" style={{ transform: `scale(${0.65 + ((item.count / peak) * 0.7)})` }} />
              <span>{hour === 23 ? "23" : String(hour).padStart(2, "0")}</span>
            </button>
          );
        })}
      </div>

      <div className="od-hourlySample">
        <div className="od-hourlySampleLabel">这个时刻的人在说什么</div>
        <div className="od-hourlySampleStack">
          {samples.map((sample, index) => (
            <article key={`${activeHour.hour}-${index}`} className="od-hourlySampleCard">
              <div className="od-hourlySampleSong">
                {sample ? `${sample.title || sample.song || "未知歌曲"} · ${String(sample.date || "").slice(0, 16)}` : "没有留下可引用样本"}
              </div>
              <p>{timelineTrim(sample?.content, 84) || "夜深的时候，评论区也会变得很安静。"}</p>
              <div className="od-hourlySampleLikes">{`× ${formatTimelineCount(sample?.likes || 0)}`}</div>
            </article>
          ))}
        </div>
      </div>

      <div className="od-hourlyMiniBars">
        {hours.map((entry) => (
          <span
            key={entry.hour}
            className={`od-hourlyMiniBar ${selectedHour === entry.hour ? "is-active" : ""}`}
            style={{ height: `${Math.max(8, (entry.count / peak) * 100)}%` }}
            onMouseEnter={() => setSelectedHour(entry.hour)}
          />
        ))}
      </div>
    </div>
  );
}

function RecurringPhrasesScene({ active, data, reducedMotion }) {
  const visible = useEnterAnimation(active, 120);
  const phrases = data?.recurringPhrases || [];
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!active || reducedMotion || phrases.length <= 1) return undefined;
    setSelected(0);
    const timer = window.setInterval(() => {
      setSelected((current) => (current + 1) % phrases.length);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [active, phrases.length, reducedMotion]);

  const activePhrase = phrases[selected] || phrases[0] || { phrase: "世界和平", occurrences: 0, examples: [] };

  return (
    <div className={`od-recurring ${visible ? "is-visible" : ""}`}>
      <Chrome corner="tl" visible>{`07 / 13`}</Chrome>
      <Chrome corner="tr" visible>RECURRING PHRASES</Chrome>

      <div className="od-sceneHead">
        <div className="od-sceneKicker">COMMENT ECHO</div>
        <h2 className="od-sceneTitle">被反复写下的句子</h2>
        <p className="od-sceneCopy">评论区会自己长出几句话。有人先写了一次，后来很多人都借来用。</p>
      </div>

      <div className="od-recurringHero">
        <div className="od-recurringCount">{formatCompactZh(activePhrase.occurrences)}</div>
        <div className="od-recurringWord">{activePhrase.phrase}</div>
      </div>

      <div className="od-recurringExamples">
        {(activePhrase.examples || []).map((example, index) => (
          <article key={`${activePhrase.phrase}-${index}`} className="od-recurringExample" style={{ transform: `rotate(${(index - 1.5) * 2.4}deg)` }}>
            <div className="od-recurringExampleSong">{example.title}</div>
            <p>{timelineTrim(example.content, 64)}</p>
          </article>
        ))}
      </div>

      <div className="od-recurringRail">
        {phrases.map((entry, index) => (
          <button
            key={entry.phrase}
            type="button"
            className={`od-recurringChip ${index === selected ? "is-active" : ""}`}
            onMouseEnter={() => setSelected(index)}
            onFocus={() => setSelected(index)}
            onClick={() => setSelected(index)}
          >
            <span>{entry.phrase}</span>
            <strong>{formatCompactZh(entry.occurrences)}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

function CommentWallScene({ active, data }) {
  const visible = useEnterAnimation(active, 120);
  const cards = useMemo(
    () => [
      ...((data?.mentionNotes?.artist || []).slice(0, 6).map((item) => ({ ...item, lane: "artist" }))),
      ...((data?.mentionNotes?.people || []).slice(0, 12).map((item) => ({ ...item, lane: "people" }))),
    ],
    [data],
  );
  const [focused, setFocused] = useState(cards[0] || null);

  useEffect(() => {
    setFocused(cards[0] || null);
  }, [cards]);

  return (
    <div className={`od-evidence ${visible ? "is-visible" : ""}`}>
      <Chrome corner="tl" visible>{`08 / 13`}</Chrome>
      <Chrome corner="tr" visible>EVIDENCE WALL</Chrome>

      <div className="od-sceneHead">
        <div className="od-sceneKicker">TOP COMMENTS · NOTE WALL</div>
        <h2 className="od-sceneTitle">评论区在贴便签</h2>
        <p className="od-sceneCopy">最重的话，不会排成表格。它们更像被人贴在墙上的纸片，谁路过都能认出一点自己。</p>
      </div>

      <div className="od-evidenceWall">
        {cards.map((card, index) => {
          const row = Math.floor(index / 6);
          const col = index % 6;
          const left = 7 + (col * 15.3) + ((row % 2) * 2.6);
          const top = 20 + (row * 20.2) + ((col % 2) * 1.2);
          return (
            <button
              key={`${card.songId}-${index}`}
              type="button"
              className={`od-evidenceCard ${focused?.songId === card.songId && focused?.content === card.content ? "is-active" : ""}`}
              style={{ left: `${left}%`, top: `${top}%`, transform: `rotate(${(col - 2.5) * 1.6 + (row * 0.8)}deg)` }}
              onMouseEnter={() => setFocused(card)}
              onFocus={() => setFocused(card)}
              onClick={() => setFocused(card)}
            >
              <div className="od-evidenceCardSong">{card.lane === "artist" ? "写给薛之谦" : `写给 @${card.target}`}</div>
              <p>{timelineTrim(card.content, 56)}</p>
              <div className="od-evidenceCardMeta">{`${card.title} · × ${formatTimelineCount(card.likes)}`}</div>
            </button>
          );
        })}
      </div>

      {focused && (
        <aside className="od-evidenceFocus">
          <div className="od-evidenceFocusSong">{focused.lane === "artist" ? "写给薛之谦" : `写给 @${focused.target}`}</div>
          <div className="od-evidenceFocusAlbum">{focused.title}</div>
          <p>{focused.content}</p>
          <div className="od-evidenceFocusMeta">
            <span>{focused.date ? String(focused.date).slice(0, 10) : `TOP ${focused.rank}`}</span>
            <span>{`× ${formatTimelineCount(focused.likes)}`}</span>
          </div>
        </aside>
      )}
    </div>
  );
}

function LanguageShiftScene({ active, data }) {
  const visible = useEnterAnimation(active, 120);
  const phaseWords = data?.phaseWords || { early: [], mid: [], late: [] };
  const [focusWord, setFocusWord] = useState("");

  useEffect(() => {
    const defaultWord = phaseWords.early[0]?.word || phaseWords.mid[0]?.word || phaseWords.late[0]?.word || "";
    setFocusWord(defaultWord);
  }, [phaseWords.early, phaseWords.late, phaseWords.mid]);

  const relatedSongs = useMemo(() => {
    if (!focusWord) return [];
    return (data?.songs || [])
      .map((song) => ({
        title: song.title,
        year: song.year,
        count: sceneWordHit(song, focusWord),
      }))
      .filter((song) => song.count > 0)
      .sort((a, b) => b.count - a.count || a.year - b.year)
      .slice(0, 6);
  }, [data, focusWord]);

  const phaseDefs = [
    ["early", "早期", phaseWords.early],
    ["mid", "中期", phaseWords.mid],
    ["late", "近期", phaseWords.late],
  ];

  return (
    <div className={`od-language ${visible ? "is-visible" : ""}`}>
      <Chrome corner="tl" visible>{`10 / 13`}</Chrome>
      <Chrome corner="tr" visible>LANGUAGE SHIFT</Chrome>

      <div className="od-sceneHead">
        <div className="od-sceneKicker">WORDS BY PHASE</div>
        <h2 className="od-sceneTitle">二十年的语言搬家</h2>
        <p className="od-sceneCopy">早期的人在说歌。后来的很多人，已经开始借这些歌讲自己的生活。</p>
      </div>

      <div className="od-languageColumns">
        {phaseDefs.map(([key, label, entries]) => (
          <section key={key} className="od-languageColumn">
            <div className="od-languageColumnHead">{label}</div>
            <div className="od-languageCloud">
              {entries.map((entry, index) => (
                <button
                  key={`${key}-${entry.word}`}
                  type="button"
                  className={`od-languageWord ${focusWord === entry.word ? "is-active" : ""}`}
                  style={{
                    fontSize: `${14 + Math.max(0, 30 - index)}px`,
                    opacity: `${Math.max(0.35, 1 - (index * 0.03))}`,
                  }}
                  onMouseEnter={() => setFocusWord(entry.word)}
                  onFocus={() => setFocusWord(entry.word)}
                  onClick={() => setFocusWord(entry.word)}
                >
                  {entry.word}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <aside className="od-languageFocus">
        <div className="od-languageFocusWord">{focusWord || "——"}</div>
        <div className="od-languageFocusLabel">这个词反复落在哪些歌下</div>
        <div className="od-languageFocusList">
          {relatedSongs.map((song) => (
            <div key={`${focusWord}-${song.title}`} className="od-languageFocusItem">
              <span>{song.title}</span>
              <span>{`${song.year} · ${song.count}`}</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function LongCommentScene({ active, data }) {
  const visible = useEnterAnimation(active, 120);
  const samples = data?.longCommentSamples || [];
  const [sampleIndex, setSampleIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [typed, setTyped] = useState(0);
  const sample = samples[sampleIndex] || samples[0] || null;
  const backgroundSnippets = useMemo(
    () => [
      ...(data?.commentWall || []).map((item) => item.content),
      ...(samples || []).map((item) => item.content),
    ].filter(Boolean).slice(0, 52),
    [data, samples],
  );

  useEffect(() => {
    if (!active || !sample || showBack) return undefined;
    setTyped(0);
    const text = sample.content || "";
    const timer = window.setInterval(() => {
      setTyped((current) => {
        if (current >= text.length) {
          window.clearInterval(timer);
          return current;
        }
        return current + 2;
      });
    }, 22);
    return () => window.clearInterval(timer);
  }, [active, sample, showBack, sampleIndex]);

  return (
    <div className={`od-longcomment ${visible ? "is-visible" : ""}`}>
      <Chrome corner="tl" visible>{`11 / 13`}</Chrome>
      <Chrome corner="tr" visible>LONG COMMENTS</Chrome>

      <div className="od-longcommentWall" aria-hidden="true">
        {backgroundSnippets.map((text, index) => (
          <span key={`${index}`} style={{ left: `${(index * 7) % 100}%`, top: `${(index * 9) % 100}%` }}>{timelineTrim(text, 36)}</span>
        ))}
      </div>

      {sample && (
        <article className={`od-longcommentCard ${showBack ? "is-back" : ""}`}>
          {!showBack ? (
            <>
              <div className="od-longcommentCardText">{sample.content.slice(0, typed)}</div>
              <div className="od-longcommentCardSign">{`—— ${sample.user}，《${sample.song}》评论区`}</div>
              <div className="od-longcommentCardLine">写得长，是因为短的话装不下。</div>
            </>
          ) : (
            <>
              <div className="od-longcommentCardMetaTitle">关于“长评”这件事</div>
              <div className="od-longcommentStats">
                <div><strong>{formatCompactZh(data?.stats?.longCommentRate || 0)}%</strong><span>长评占比</span></div>
                <div><strong>{formatCompactZh(data?.longCommentSamples?.length || 0)}</strong><span>样本数</span></div>
                <div><strong>{formatCompactZh(sample.length)}</strong><span>当前字数</span></div>
              </div>
              <p className="od-longcommentCardBackCopy">这只是很多长评里的一条。有人把一首歌写成了自己的夜记。</p>
            </>
          )}

          <div className="od-longcommentActions">
            <button type="button" onClick={() => { setSampleIndex((current) => (current + 1) % samples.length); setShowBack(false); }}>换一条</button>
            <button type="button" onClick={() => setShowBack((current) => !current)}>{showBack ? "回到正文" : "看数据"}</button>
          </div>
        </article>
      )}
    </div>
  );
}

function EmotionMigrationScene({ active, data }) {
  const visible = useEnterAnimation(active, 120);
  const flows = data?.emotionMigration?.flows || [];
  const [selected, setSelected] = useState(flows[0]?.label || "");

  useEffect(() => {
    setSelected(flows[0]?.label || "");
  }, [flows]);

  const phases = {
    early: data?.emotionMigration?.early || [],
    mid: data?.emotionMigration?.mid || [],
    late: data?.emotionMigration?.late || [],
  };
  const allLabels = flows.map((flow) => flow.label);
  const selectedFlow = flows.find((flow) => flow.label === selected) || flows[0] || null;
  const maxValue = Math.max(1, ...flows.flatMap((flow) => [flow.from, flow.mid, flow.to]));
  const columnX = [18, 50, 82];
  const rowY = allLabels.reduce((map, label, index) => {
    map[label] = 18 + (index * 10);
    return map;
  }, {});

  return (
    <div className={`od-emigration ${visible ? "is-visible" : ""}`}>
      <Chrome corner="tl" visible>{`12 / 13`}</Chrome>
      <Chrome corner="tr" visible>EMOTION MIGRATION</Chrome>

      <div className="od-sceneHead">
        <div className="od-sceneKicker">EMOTION FLOW</div>
        <h2 className="od-sceneTitle">情绪在搬家</h2>
        <p className="od-sceneCopy">五种情绪在不同阶段的重量变了。有人先在说喜欢，后来更多人在说失去与怀念。</p>
      </div>

      <div className="od-emigrationStage">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="od-emigrationSvg" aria-hidden="true">
          {flows.map((flow) => {
            const y = rowY[flow.label] || 18;
            const dimmed = selectedFlow && selectedFlow.label !== flow.label;
            return (
              <path
                key={flow.label}
                d={`M ${columnX[0]} ${y} C 31 ${y - 4}, 38 ${y - 2}, ${columnX[1]} ${y} S 69 ${y + 4}, ${columnX[2]} ${y}`}
                className={`od-emigrationPath ${selectedFlow?.label === flow.label ? "is-active" : ""} ${dimmed ? "is-dimmed" : ""}`}
                style={{ strokeWidth: `${1.2 + ((Math.max(flow.from, flow.mid, flow.to) / maxValue) * 3.8)}` }}
              />
            );
          })}
        </svg>

        {["early", "mid", "late"].map((phaseKey, phaseIndex) => (
          <div key={phaseKey} className="od-emigrationColumn" style={{ left: `${columnX[phaseIndex]}%` }}>
            <div className="od-emigrationColumnLabel">{phaseIndex === 0 ? "早期" : phaseIndex === 1 ? "中期" : "近期"}</div>
            {(phases[phaseKey] || []).map((entry) => (
              <button
                key={`${phaseKey}-${entry.label}`}
                type="button"
                className={`od-emigrationTag ${selected === entry.label ? "is-active" : ""}`}
                onMouseEnter={() => setSelected(entry.label)}
                onFocus={() => setSelected(entry.label)}
                onClick={() => setSelected(entry.label)}
              >
                <span>{entry.label}</span>
                <strong>{formatCompactZh(entry.value)}</strong>
              </button>
            ))}
          </div>
        ))}
      </div>

      {selectedFlow && (
        <aside className="od-emigrationPanel">
          <div className="od-emigrationPanelTitle">{selectedFlow.label}</div>
          <div className="od-emigrationPanelFlow">{`早期 ${formatCompactZh(selectedFlow.from)} → 中期 ${formatCompactZh(selectedFlow.mid)} → 近期 ${formatCompactZh(selectedFlow.to)}`}</div>
          <p>一种感觉不会消失，只会在不同年份里改头换面。你现在点到的，是它二十年的搬家路线。</p>
        </aside>
      )}
    </div>
  );
}

function ThemeJourneyScene({ active, data }) {
  const visible = useEnterAnimation(active, 120);
  const themes = data?.themeJourney || [];
  const songs = data?.songs || [];
  const [selected, setSelected] = useState(themes[0]?.word || "");

  useEffect(() => {
    setSelected(themes[0]?.word || "");
  }, [themes]);

  const activeTheme = themes.find((entry) => entry.word === selected) || themes[0] || null;
  const yearMin = 2006;
  const yearMax = 2026;
  const pointMap = songs.map((song) => ({
    ...song,
    x: 8 + (((song.year - yearMin) / (yearMax - yearMin)) * 84),
  }));

  const activePoints = (activeTheme?.timeline || []).map((point, index) => {
    const base = pointMap.find((song) => song.title === point.title);
    return {
      ...point,
      x: base?.x || 10,
      y: 54 - Math.min(28, index * 6) - Math.min(16, point.count * 0.4),
    };
  });

  const path = activePoints.map((point, index) => (
    `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
  )).join(" ");

  return (
    <div className={`od-themejourney ${visible ? "is-visible" : ""}`}>
      <Chrome corner="tl" visible>{`11 / 14`}</Chrome>
      <Chrome corner="tr" visible>THEME JOURNEY</Chrome>

      <div className="od-sceneHead">
        <div className="od-sceneKicker">WORD HOST</div>
        <h2 className="od-sceneTitle">一种感觉，找了二十年宿主</h2>
        <p className="od-sceneCopy">同一个词，在不同的歌下，找不同的人。</p>
      </div>

      <div className="od-themePicker">
        {themes.map((theme) => (
          <button
            key={theme.word}
            type="button"
            className={`od-themeChip ${selected === theme.word ? "is-active" : ""}`}
            onMouseEnter={() => setSelected(theme.word)}
            onFocus={() => setSelected(theme.word)}
            onClick={() => setSelected(theme.word)}
          >
            {theme.word}
          </button>
        ))}
      </div>

      <div className="od-themeStage">
        <svg viewBox="0 0 100 70" preserveAspectRatio="none" className="od-themeSvg" aria-hidden="true">
          <path d="M 8 60 L 92 60" className="od-themeAxis" />
          {activePoints.length > 1 && <path d={path} className="od-themePath" pathLength="1" />}
          {activePoints.map((point) => (
            <circle key={`${point.title}-${point.year}`} cx={point.x} cy={point.y} r={2.4 + Math.min(4, point.count * 0.18)} className="od-themePoint" />
          ))}
        </svg>
        <div className="od-themeSongRow">
          {pointMap.map((song) => {
            const activeHit = activePoints.some((point) => point.title === song.title);
            return (
              <div key={song.id} className={`od-themeSong ${activeHit ? "is-active" : ""}`} style={{ left: `${song.x}%` }}>
                <span>{truncateTimelineTitle(song.title)}</span>
                <em>{song.year}</em>
              </div>
            );
          })}
        </div>
      </div>

      {activeTheme && (
        <div className="od-themeStory">
          <div className="od-themeStoryWord">{activeTheme.word}</div>
          <p>{`${activeTheme.word} 这个词，先落在 ${activeTheme.timeline[0]?.title || "最早的那首歌"}。后来它一路往后，停在不同年份、不同的人身上。`}</p>
        </div>
      )}
    </div>
  );
}

function DateAnchorWallScene({ active, data }) {
  const visible = useEnterAnimation(active, 120);
  const cards = useMemo(() => (data?.dateAnchors || []).slice(0, 18), [data]);
  const [focusedId, setFocusedId] = useState(cards[0] ? `${cards[0].songId}-${cards[0].date}` : null);

  useEffect(() => {
    setFocusedId(cards[0] ? `${cards[0].songId}-${cards[0].date}` : null);
  }, [cards]);

  return (
    <div className={`od-datewall ${visible ? "is-visible" : ""}`}>
      <Chrome corner="tl" visible>{`09 / 13`}</Chrome>
      <Chrome corner="tr" visible>DATE NOTES</Chrome>

      <div className="od-sceneHead">
        <div className="od-sceneKicker">DATES REMEMBERED</div>
        <h2 className="od-sceneTitle">被记住的那些日子</h2>
        <p className="od-sceneCopy">这里只放被人认真写下来的具体日期。它们像一整面便签墙，每一张都钉住某一天。</p>
      </div>

      <div className="od-dateWall">
        {cards.map((card, index) => (
          <button
            key={`${card.songId}-${card.date}-${index}`}
            type="button"
            className={`od-dateCard ${focusedId === `${card.songId}-${card.date}` ? "is-active" : ""}`}
            style={{
              left: `${7 + ((index % 6) * 15.1) + ((Math.floor(index / 6) % 2) * 2.8)}%`,
              top: `${24 + (Math.floor(index / 6) * 21.5) + ((index % 2) * 1.2)}%`,
              transform: `rotate(${((index % 5) - 2) * 1.7}deg)`,
              transitionDelay: `${180 + index * 45}ms`,
            }}
            onMouseEnter={() => setFocusedId(`${card.songId}-${card.date}`)}
            onFocus={() => setFocusedId(`${card.songId}-${card.date}`)}
            onClick={() => setFocusedId(`${card.songId}-${card.date}`)}
          >
            <div className="od-dateCardDate">{card.label}</div>
            <p>{timelineTrim(card.content, 58)}</p>
            <div className="od-dateCardMeta">{`${card.title} · ${card.year}`}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function DustListeningScene({ active, data }) {
  const visible = useEnterAnimation(active, 120);
  const audio = useAudio();
  const [spectrum, setSpectrum] = useState(() => fakeSpectrum(48, 0));
  const dustSong = (data?.songs || []).find((song) => song.title === "尘") || data?.songs?.[0] || null;
  const lyricLines = useMemo(
    () => buildDustLyricLines(data?.dust?.lyrics),
    [data],
  );

  useEffect(() => {
    if (!active) return undefined;
    let raf = 0;
    const tick = () => {
      setSpectrum(audio.getAnalyserData(48));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, audio]);

  const playheadMs = audio.getCurrentTimeMs ? audio.getCurrentTimeMs() : 0;
  const lyricCursorMs = Math.max(0, playheadMs + 2800);
  const inferredDurationMs = (lyricLines[lyricLines.length - 1]?.time || 0) + 18000;
  const durationMs = Math.max(1, audio.getDurationMs ? audio.getDurationMs() : 0, inferredDurationMs);
  const progress = clamp((playheadMs / durationMs) * 100, 0, 100);
  const activeLyricIndex = useMemo(() => {
    if (!lyricLines.length) return 0;
    let index = 0;
    for (let i = 0; i < lyricLines.length; i += 1) {
      if ((lyricLines[i].time || 0) <= lyricCursorMs) index = i;
      else break;
    }
    return index;
  }, [lyricCursorMs, lyricLines]);
  const formatSeconds = (timeMs) => {
    const totalSeconds = Math.max(0, Math.floor(timeMs / 1000));
    const minute = Math.floor(totalSeconds / 60);
    const second = totalSeconds % 60;
    return `${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
  };

  return (
    <div className={`od-dustscene ${visible ? "is-visible" : ""}`}>
      <Chrome corner="tl" visible>{`02 / 13`}</Chrome>
      <Chrome corner="tr" visible>DUST · NOW PLAYING</Chrome>

      <div className="od-dustsceneLayout">
        <div className="od-dustsceneCenter">
          <div className="od-dustsceneTitle">尘</div>
          <div className="od-dustsceneHalo">
            {spectrum.slice(0, 24).map((value, index) => (
              <span
                key={index}
                className="od-dustsceneRay"
                style={{ transform: `rotate(${index * 15}deg) translateY(-50%)`, height: `${46 + value * 84}px` }}
              />
            ))}
          </div>
          <div className="od-dustsceneCoverWrap">
            {data?.dust?.cover ? <img src={data.dust.cover} alt="尘 封面" className="od-dustsceneCover" /> : <div className="od-dustsceneCoverFallback" />}
          </div>
          <div className="od-dustsceneMeta">{`2019 · ${formatCompactZh(dustSong?.comments || 0)} 条评论`}</div>
          <div className="od-dustscenePlayerBar">
            <div className="od-dustscenePlayerTimes">
              <span>{formatSeconds(playheadMs)}</span>
              <span>{formatSeconds(durationMs)}</span>
            </div>
            <div className="od-dustscenePlayerTrack">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="od-dustsceneLyrics">
          <div className="od-dustsceneLyricsKicker">LYRICS · 尘</div>
          <div className="od-dustsceneLyricsViewport">
            <div
              className="od-dustsceneLyricsRail"
              style={{ transform: `translateY(${76 - (activeLyricIndex * 84)}px)` }}
            >
              {lyricLines.map((line, index) => (
                <div
                  key={line.id}
                  className={`od-dustsceneLyricLine ${index === activeLyricIndex ? "is-active" : ""} ${Math.abs(index - activeLyricIndex) > 3 ? "is-far" : ""} ${index < activeLyricIndex ? "is-past" : "is-future"}`}
                >
                  {line.text}
                </div>
              ))}
            </div>
          </div>
          <div className="od-dustsceneCommentMeta">
            {lyricLines[0]?.id?.startsWith("dust-placeholder")
              ? "当前这份 FLAC 没有读到歌词标签。"
              : "像网易云歌词那样，一句句往下走。"}
          </div>
        </div>
      </div>

      <div className="od-dustsceneSpectrum">
        {spectrum.map((value, index) => (
          <span key={index} style={{ height: `${16 + value * 84}px` }} />
        ))}
      </div>

      <div className="od-dustsceneControls">
        <button type="button" onClick={() => (audio.isPlaying ? audio.pause() : audio.play())}>{audio.isPlaying ? "⏸" : "▶"}</button>
      </div>
    </div>
  );
}

const FINALE_PHRASE = "世界和平";
const FINALE_FALLBACK_TOTAL = 6432819;
const FINALE_FALLBACK_OCCURRENCES = 187432;
const FINALE_COLORS = ["#f4ede1", "#ebdfc9", "#e0d2b3", "#d4c4a3", "#c9b893", "#beac7f"];
const FINALE_ACCUMULATE_MS = 50000;
const FINALE_MIN_SKIP_MS = 30000;
const FINALE_CONVERGE_MS = 8000;

function seededFinaleRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function finaleTargetCount() {
  const width = window.innerWidth || 1280;
  if (width < 960) return 82;
  const areaFactor = clamp((width * (window.innerHeight || 720)) / (1920 * 1080), 0.55, 1.12);
  return Math.round(250 * areaFactor);
}

function finaleScheduleCount(elapsed, target) {
  if (elapsed < 2000) return 0;
  if (elapsed < 8000) return Math.min(target, 1 + Math.floor((elapsed - 2000) / 1600));
  if (elapsed < 25000) return Math.min(target, 5 + Math.floor((elapsed - 8000) / 600));
  if (elapsed < 45000) return Math.min(target, 33 + Math.floor((elapsed - 25000) / 250));
  return Math.min(target, 113 + Math.floor((elapsed - 45000) / 50));
}

function rectsIntersect(a, b, pad = 12) {
  return !(a.x + a.w + pad < b.x || b.x + b.w + pad < a.x || a.y + a.h + pad < b.y || b.y + b.h + pad < a.y);
}

function placeFinalePhrase(index, placedRects, viewport, compact = false) {
  const rand = seededFinaleRandom(index * 7919 + 104729);
  const small = compact || index > 110;
  const minSize = small ? 18 : 28;
  const maxSize = small ? 26 : 56;
  const fontSize = minSize + rand() * (maxSize - minSize);
  const width = Math.max(68, fontSize * FINALE_PHRASE.length * .98);
  const height = fontSize * 1.18;
  const safe = {
    left: Math.min(58, viewport.width * .045),
    right: Math.min(58, viewport.width * .045),
    top: Math.min(64, viewport.height * .07),
    bottom: Math.min(128, viewport.height * .14),
  };
  const centerRect = {
    x: viewport.width * .5 - width / 2,
    y: viewport.height * .39 - height / 2,
    w: width,
    h: height,
  };
  const attempts = index === 0 ? [centerRect] : [];
  for (let attempt = 0; attempt < 30; attempt += 1) {
    attempts.push({
      x: safe.left + rand() * Math.max(1, viewport.width - safe.left - safe.right - width),
      y: safe.top + rand() * Math.max(1, viewport.height - safe.top - safe.bottom - height),
      w: width,
      h: height,
    });
  }
  const rect = attempts.find((candidate) => !placedRects.some((placed) => rectsIntersect(candidate, placed, 12)));
  if (!rect) return null;
  const centerX = viewport.width / 2;
  const centerY = viewport.height * .43;
  return {
    id: `finale-${index}`,
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
    fs: fontSize,
    rotate: (rand() * 6) - 3,
    opacity: .45 + rand() * .4,
    color: FINALE_COLORS[Math.floor(rand() * FINALE_COLORS.length)],
    dx: centerX - (rect.x + rect.w / 2),
    dy: centerY - (rect.y + rect.h / 2),
  };
}

function getFinaleOccurrenceCount(data) {
  const peaceLength = Number(data?.peacePhrases?.length || 0);
  if (peaceLength >= 1000) return peaceLength;
  const direct = Number(data?.finalePhrase?.text === FINALE_PHRASE ? data?.finalePhrase?.count : 0);
  if (direct >= 1000) return direct;
  const peaceRecurring = (data?.recurringPhrases || []).find((entry) => entry?.phrase === FINALE_PHRASE || entry?.text === FINALE_PHRASE);
  const recurringCount = Number(peaceRecurring?.occurrences || peaceRecurring?.count || 0);
  if (recurringCount >= 1000) return recurringCount;
  return FINALE_FALLBACK_OCCURRENCES;
}

function PeaceFinaleScene({ active, data, onReplay, onChromeReadyChange, reducedMotion }) {
  const visible = useEnterAnimation(active, 80);
  const [phase, setPhase] = useState("accumulate");
  const [phrases, setPhrases] = useState([]);
  const [targetCount, setTargetCount] = useState(250);
  const startedAtRef = useRef(0);
  const placedRectsRef = useRef([]);
  const phraseCountRef = useRef(0);
  const rafRef = useRef(0);
  const skipRef = useRef(false);
  const restTimerRef = useRef(0);
  const totalComments = Number(data?.stats?.totalComments || FINALE_FALLBACK_TOTAL);
  const occurrences = getFinaleOccurrenceCount(data);
  const formattedCount = String(phrases.length).padStart(6, "0").replace(/(\d{2})(\d{3})$/, "$1,$2");

  const addUntil = useCallback((wanted, compact = false) => {
    const viewport = { width: window.innerWidth || 1280, height: window.innerHeight || 720 };
    const next = [];
    const placed = placedRectsRef.current;
    let cursor = phraseCountRef.current;
    let guard = 0;
    while (cursor < wanted && guard < Math.max(60, (wanted - phraseCountRef.current) * 5)) {
      const placedPhrase = placeFinalePhrase(cursor, placed, viewport, compact);
      guard += 1;
      cursor += 1;
      phraseCountRef.current = cursor;
      if (!placedPhrase) continue;
      placed.push({ x: placedPhrase.x, y: placedPhrase.y, w: placedPhrase.w, h: placedPhrase.h });
      next.push(placedPhrase);
    }
    if (next.length) setPhrases((current) => current.concat(next));
  }, []);

  const startConverge = useCallback(() => {
    if (skipRef.current) return;
    skipRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    setPhase("converge");
    if (restTimerRef.current) window.clearTimeout(restTimerRef.current);
    restTimerRef.current = window.setTimeout(() => setPhase("rest"), reducedMotion ? 1200 : FINALE_CONVERGE_MS);
  }, [reducedMotion]);

  useEffect(() => {
    onChromeReadyChange?.(active && phase === "rest");
  }, [active, onChromeReadyChange, phase]);

  useEffect(() => {
    if (!active) {
      setPhase("accumulate");
      setPhrases([]);
      placedRectsRef.current = [];
      phraseCountRef.current = 0;
      skipRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (restTimerRef.current) window.clearTimeout(restTimerRef.current);
      return undefined;
    }

    const target = reducedMotion ? Math.min(60, finaleTargetCount()) : finaleTargetCount();
    setTargetCount(target);
    setPhase(reducedMotion ? "converge" : "accumulate");
    setPhrases([]);
    placedRectsRef.current = [];
    phraseCountRef.current = 0;
    skipRef.current = reducedMotion;
    startedAtRef.current = performance.now();
    if (reducedMotion) {
      addUntil(Math.min(48, target), true);
      restTimerRef.current = window.setTimeout(() => setPhase("rest"), 1400);
      return () => {
        if (restTimerRef.current) window.clearTimeout(restTimerRef.current);
      };
    }

    const tick = (now) => {
      const elapsed = now - startedAtRef.current;
      const wanted = finaleScheduleCount(elapsed, target);
      if (wanted > placedRectsRef.current.length) addUntil(wanted, elapsed > 45000);
      if (elapsed >= FINALE_ACCUMULATE_MS) {
        startConverge();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (restTimerRef.current) window.clearTimeout(restTimerRef.current);
    };
  }, [active, addUntil, reducedMotion, startConverge]);

  useEffect(() => {
    if (!active || phase !== "accumulate") return undefined;
    const requestSkip = (event) => {
      if (event.target?.closest?.("button,input,select,textarea,audio")) return;
      if (event.type === "keydown" && ![" ", "Enter"].includes(event.key)) return;
      event.preventDefault?.();
      const elapsed = performance.now() - startedAtRef.current;
      const minimum = elapsed < FINALE_MIN_SKIP_MS ? 80 : Math.max(80, placedRectsRef.current.length);
      addUntil(Math.min(targetCount, minimum), true);
      window.setTimeout(startConverge, elapsed < FINALE_MIN_SKIP_MS ? 520 : 0);
    };
    window.addEventListener("keydown", requestSkip);
    window.addEventListener("pointerdown", requestSkip);
    return () => {
      window.removeEventListener("keydown", requestSkip);
      window.removeEventListener("pointerdown", requestSkip);
    };
  }, [active, addUntil, phase, startConverge, targetCount]);

  const handleReplay = useCallback(() => {
    onReplay?.();
  }, [onReplay]);

  return (
    <div className={["od-finale", visible ? "is-visible" : "", `is-${phase}`].filter(Boolean).join(" ")}>
      <Chrome corner="tl" visible={phase === "rest"}>{`13 / 13`}</Chrome>
      <Chrome corner="tr" visible={phase === "rest"}>FINALE</Chrome>

      <div className="od-finaleField" aria-hidden="true">
        {phrases.map((item) => (
          <span
            key={item.id}
            className="od-finalePhrase"
            style={{
              "--x": `${item.x}px`,
              "--y": `${item.y}px`,
              "--w": `${item.w}px`,
              "--h": `${item.h}px`,
              "--fs": `${item.fs}px`,
              "--rotate": `${item.rotate}deg`,
              "--final-opacity": item.opacity,
              "--phrase-color": item.color,
              "--dx": `${item.dx}px`,
              "--dy": `${item.dy}px`,
            }}
          >
            {FINALE_PHRASE}
          </span>
        ))}
      </div>

      <div className="od-finaleCounter">正在累积 · {formattedCount}</div>

      <div className="od-finaleCore">
        <div className="od-finaleTitle">{FINALE_PHRASE}</div>
        <div className="od-finaleStats">
          <span>{formatTimelineCount(totalComments)}</span> 个人留下的话里，<br />
          有 <span>{formatTimelineCount(occurrences)}</span> 句“{FINALE_PHRASE}”。
        </div>
        <div className="od-finalePoem">
          <div>二十年里，他们彼此不认识，</div>
          <div>在不同的歌底下，</div>
          <div>写下了同一句话。</div>
        </div>
      </div>
      <button type="button" className="od-finaleReplay" onClick={handleReplay}>再听一遍</button>
      <div className="od-finaleFlash" aria-hidden="true" />
    </div>
  );
}

window.HourlyCommentsScene = HourlyCommentsScene;
window.RecurringPhrasesScene = RecurringPhrasesScene;
window.CommentWallScene = CommentWallScene;
window.LanguageShiftScene = LanguageShiftScene;
window.LongCommentScene = LongCommentScene;
window.EmotionMigrationScene = EmotionMigrationScene;
window.ThemeJourneyScene = ThemeJourneyScene;
window.DateAnchorWallScene = DateAnchorWallScene;
window.DustListeningScene = DustListeningScene;
window.PeaceFinaleScene = PeaceFinaleScene;
