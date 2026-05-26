const TIMELINE_TOTAL = 45;
const TIMELINE_AXIS_Y = 0.78;
const TIMELINE_TOP = 0.18;
const TIMELINE_BOTTOM = 0.72;
const TIMELINE_POPUP_WIDTH = 280;
const TIMELINE_MODAL_WIDTH = 540;
const TIMELINE_COMPACT_BREAKPOINT = 960;
const TIMELINE_YEAR_MARKS = [2006, 2010, 2015, 2020, 2026];
const TIMELINE_FEATURED_MIN = 15;
const TIMELINE_TORCH_DELAY = 600;
const TIMELINE_LAMP_PULL = 520;
const TIMELINE_LAMP_DELAY = 110;
const TIMELINE_EMOTION_COLORS = {
  爱情: "#ff7f8f",
  心碎: "#ff4f8f",
  怀念: "#ffd369",
  励志: "#73d6ff",
  搞笑: "#ff9f68",
  治愈: "#86d9a2",
  共鸣: "#b29dff",
};

function timelineTrim(text, size = 72) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > size ? `${clean.slice(0, size)}…` : clean;
}

function formatTimelineYear(song) {
  if (Number.isFinite(song?.year)) return Number(song.year);
  const date = String(song?.releaseDate || "").slice(0, 4);
  const year = Number(date);
  return Number.isFinite(year) ? year : 2026;
}

function formatTimelineCount(value) {
  return Number(value || 0).toLocaleString("zh-CN");
}

function truncateTimelineTitle(title) {
  const clean = String(title || "").trim();
  if (!clean) return "未命名";
  return clean.length > 5 ? `${clean.slice(0, 4)}…` : clean;
}

function timelineCoverUrl(cover) {
  const src = String(cover || "").trim();
  return src ? `url("${encodeURI(src)}")` : "";
}

function timelineSongColor(song) {
  if (song?.sentimentColor) return song.sentimentColor;
  if (song?.color) return song.color;
  if (song?.dominantEmotion && TIMELINE_EMOTION_COLORS[song.dominantEmotion]) {
    return TIMELINE_EMOTION_COLORS[song.dominantEmotion];
  }
  return "rgba(245,241,230,.32)";
}

function timelineTopComments(song) {
  const list = Array.isArray(song?.topComments)
    ? song.topComments
    : Array.isArray(song?.top5Comments)
      ? song.top5Comments
      : song?.topComment
        ? [song.topComment]
        : [];
  return list
    .filter((entry) => entry?.content)
    .slice(0, 3)
    .map((entry) => ({
      content: timelineTrim(entry.content, 108),
      likes: Number(entry.likes || 0),
      date: String(entry.date || "").slice(0, 10),
      user: entry.user || "",
    }));
}

function pickTimelineFeaturedSongs(songs) {
  const albumLeads = new Map();
  songs.forEach((song) => {
    const current = albumLeads.get(song.album);
    if (!current || song.comments > current.comments) albumLeads.set(song.album, song);
  });
  const featured = [...albumLeads.values()]
    .sort((a, b) => a.year - b.year || b.comments - a.comments);
  const featuredIds = new Set(featured.map((song) => song.id));
  const target = Math.max(TIMELINE_FEATURED_MIN, featured.length);
  [...songs]
    .sort((a, b) => b.comments - a.comments)
    .forEach((song) => {
      if (featuredIds.size >= target) return;
      if (!featuredIds.has(song.id)) featuredIds.add(song.id);
    });
  return featuredIds;
}

function relaxTimelineSongs(songs, compact) {
  const gap = compact ? 0.034 : 0.024;
  const xBand = compact ? 0.08 : 0.06;
  const ordered = [...songs].sort((a, b) => a.x - b.x || a.y - b.y);
  const placed = [];
  ordered.forEach((song) => {
    let nextY = song.y;
    for (let index = placed.length - 1; index >= 0; index -= 1) {
      const prev = placed[index];
      if (song.x - prev.x > xBand) break;
      if (Math.abs(nextY - prev.displayY) < gap) {
        nextY = prev.displayY + gap;
      }
    }
    placed.push({
      ...song,
      displayY: clamp(nextY, TIMELINE_TOP, TIMELINE_BOTTOM),
    });
  });

  for (let index = placed.length - 1; index >= 0; index -= 1) {
    const song = placed[index];
    const overflow = song.displayY - TIMELINE_BOTTOM;
    if (overflow > 0) song.displayY -= overflow;
    if (index === 0) continue;
    const prev = placed[index - 1];
    if (song.x - prev.x <= xBand && song.displayY - prev.displayY < gap) {
      prev.displayY = clamp(song.displayY - gap, TIMELINE_TOP, TIMELINE_BOTTOM);
    }
  }

  return placed
    .sort((a, b) => a.order - b.order)
    .map((song, index) => ({
      ...song,
      y: clamp((song.y * 0.8) + (song.displayY * 0.2), TIMELINE_TOP, TIMELINE_BOTTOM),
      enterDelay: 1400 + ((index * 37) % 420),
      breathDelay: -(((index * 0.23) % 3.8).toFixed(2)),
      glowDelay: -(((index * 0.41) % 4.2).toFixed(2)),
    }));
}

function buildTimelineSongs(data, compact) {
  const rawSongs = Array.isArray(data?.songs) ? data.songs.slice(0, TIMELINE_TOTAL) : [];
  const normalized = rawSongs.map((song, index) => {
    const year = formatTimelineYear(song);
    const comments = Number(song.comments || 0);
    return {
      ...song,
      id: song.id || `song-${index + 1}`,
      title: song.title || song.name || `歌曲 ${index + 1}`,
      album: song.album || "单曲",
      year,
      comments,
      excerpt: timelineTrim(song.topComment?.content, 58),
      topComments: timelineTopComments(song),
      color: timelineSongColor(song),
      shortTitle: truncateTimelineTitle(song.title || song.name),
    };
  }).sort((a, b) => a.year - b.year || b.comments - a.comments || a.title.localeCompare(b.title, "zh-CN"));

  if (!normalized.length) return [];

  const minYear = TIMELINE_YEAR_MARKS[0];
  const maxYear = TIMELINE_YEAR_MARKS[TIMELINE_YEAR_MARKS.length - 1];
  const minLog = Math.log10(Math.max(1, Math.min(...normalized.map((song) => song.comments || 1))));
  const maxLog = Math.log10(Math.max(1, Math.max(...normalized.map((song) => song.comments || 1))));
  const yearBuckets = normalized.reduce((map, song) => {
    const list = map.get(song.year) || [];
    list.push(song);
    map.set(song.year, list);
    return map;
  }, new Map());
  const featuredIds = pickTimelineFeaturedSongs(normalized);
  const topFiveIds = new Set([...normalized].sort((a, b) => b.comments - a.comments).slice(0, 5).map((song) => song.id));

  const placed = normalized.map((song, order) => {
    const bucket = yearBuckets.get(song.year) || [song];
    const bucketIndex = bucket.findIndex((entry) => entry.id === song.id);
    const centerOffset = bucketIndex - ((bucket.length - 1) / 2);
    const spreadBoost = song.year >= 2024 ? 1.65 : song.year >= 2022 ? 1.35 : song.year >= 2019 ? 1.12 : 1;
    const intraYearSpread = centerOffset * Math.min(
      (compact ? 0.012 : 0.015) * spreadBoost,
      (0.006 + (bucket.length * 0.0017)) * spreadBoost,
    );
    const yearProgress = maxYear === minYear ? 0.5 : (song.year - minYear) / Math.max(1, maxYear - minYear);
    const x = clamp(yearProgress + intraYearSpread, 0.035, 0.982);
    const logComments = Math.log10(Math.max(1, song.comments || 1));
    const weight = maxLog === minLog ? 0.5 : (logComments - minLog) / Math.max(0.0001, maxLog - minLog);
    const y = TIMELINE_BOTTOM - (weight * (TIMELINE_BOTTOM - TIMELINE_TOP));
    const baseSize = compact
      ? 16 + (weight * 30)
      : 20 + (weight * 38);
    return {
      ...song,
      order,
      featured: featuredIds.has(song.id),
      topFive: topFiveIds.has(song.id),
      x,
      y,
      size: clamp(baseSize + (featuredIds.has(song.id) ? (compact ? 3 : 6) : 0), compact ? 16 : 18, compact ? 52 : 66),
    };
  });

  return relaxTimelineSongs(placed, compact);
}

function timelinePopupStyle(song, rootRect) {
  if (!song || !rootRect.width || !rootRect.height) return null;
  const baseX = song.x * rootRect.width;
  const baseY = song.y * rootRect.height;
  const cardWidth = TIMELINE_POPUP_WIDTH;
  const cardHeight = song.topComment?.content ? 214 : 142;
  const placeLeft = baseX > rootRect.width * 0.7;
  const placeBelow = baseY < rootRect.height * 0.25;
  const left = placeLeft
    ? baseX - cardWidth - 16
    : baseX + 16;
  const top = placeBelow
    ? baseY + 16
    : baseY - cardHeight + 24;
  return {
    left: `${clamp(left, 24, rootRect.width - cardWidth - 24)}px`,
    top: `${clamp(top, 74, rootRect.height - cardHeight - 28)}px`,
  };
}

function TimelineConstellationScene({ active, reducedMotion, data }) {
  const rootRef = useRef(null);
  const hoverTimerRef = useRef(null);
  const torchRafRef = useRef(0);
  const pullTimerRef = useRef(0);
  const pullResetTimerRef = useRef(0);
  const pointerTargetRef = useRef({ x: 0, y: 0 });
  const [entered, setEntered] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [lampOn, setLampOn] = useState(true);
  const [pullingCord, setPullingCord] = useState(false);
  const [torchMode, setTorchMode] = useState(false);
  const [rootRect, setRootRect] = useState({ width: 0, height: 0 });
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  const compact = rootRect.width > 0 && rootRect.width < TIMELINE_COMPACT_BREAKPOINT;
  const timelineSongs = useMemo(() => buildTimelineSongs(data, compact), [compact, data]);
  const hoveredSong = useMemo(
    () => timelineSongs.find((song) => song.id === hoveredId) || null,
    [hoveredId, timelineSongs],
  );
  const selectedSong = useMemo(
    () => timelineSongs.find((song) => song.id === selectedId) || null,
    [selectedId, timelineSongs],
  );
  const activeSong = selectedSong || hoveredSong;
  const popupStyle = useMemo(
    () => (!selectedSong ? timelinePopupStyle(hoveredSong, rootRect) : null),
    [hoveredSong, rootRect, selectedSong],
  );
  const minYear = timelineSongs[0]?.year || 2006;
  const maxYear = timelineSongs[timelineSongs.length - 1]?.year || 2026;

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const updateRect = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    setRootRect({ width: rect.width, height: rect.height });
    const center = { x: rect.width * 0.5, y: rect.height * 0.48 };
    pointerTargetRef.current = center;
    setPointer(center);
  }, []);

  useEffect(() => {
    if (!active) {
      setEntered(false);
      setHoveredId(null);
      setSelectedId(null);
      setLampOn(true);
      setPullingCord(false);
      setTorchMode(false);
      if (pullTimerRef.current) window.clearTimeout(pullTimerRef.current);
      if (pullResetTimerRef.current) window.clearTimeout(pullResetTimerRef.current);
      clearHoverTimer();
      return undefined;
    }
    updateRect();
    setHoveredId(null);
    setSelectedId(null);
    setLampOn(true);
    setPullingCord(false);
    setTorchMode(false);
    setEntered(Boolean(reducedMotion));
    if (reducedMotion) return undefined;
    const timer = window.setTimeout(() => setEntered(true), 40);
    return () => window.clearTimeout(timer);
  }, [active, clearHoverTimer, reducedMotion, updateRect]);

  useEffect(() => {
    if (!active) return undefined;
    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, [active, updateRect]);

  useEffect(() => {
    if (!active) return undefined;
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (key === "f") {
        event.preventDefault();
        setTorchMode((current) => !current);
        return;
      }
      if (event.key === "Escape") {
        if (selectedId) setSelectedId(null);
        else if (torchMode) setTorchMode(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, selectedId, torchMode]);

  useEffect(() => {
    if (!active || !torchMode) {
      if (torchRafRef.current) cancelAnimationFrame(torchRafRef.current);
      torchRafRef.current = 0;
      return undefined;
    }
    const tick = () => {
      setPointer((current) => {
        const target = pointerTargetRef.current;
        const nextX = current.x + ((target.x - current.x) * 0.18);
        const nextY = current.y + ((target.y - current.y) * 0.18);
        return {
          x: Math.abs(target.x - nextX) < 0.5 ? target.x : nextX,
          y: Math.abs(target.y - nextY) < 0.5 ? target.y : nextY,
        };
      });
      torchRafRef.current = requestAnimationFrame(tick);
    };
    torchRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (torchRafRef.current) cancelAnimationFrame(torchRafRef.current);
      torchRafRef.current = 0;
    };
  }, [active, torchMode]);

  const armHover = useCallback((songId) => {
    clearHoverTimer();
    if (torchMode) {
      hoverTimerRef.current = window.setTimeout(() => {
        setHoveredId(songId);
      }, TIMELINE_TORCH_DELAY);
      return;
    }
    setHoveredId(songId);
  }, [clearHoverTimer, torchMode]);

  useEffect(() => () => {
    clearHoverTimer();
    if (pullTimerRef.current) window.clearTimeout(pullTimerRef.current);
    if (pullResetTimerRef.current) window.clearTimeout(pullResetTimerRef.current);
  }, [clearHoverTimer]);

  if (!active) return null;

  const torchRadius = compact ? 140 : 200;
  const focusId = activeSong?.id || null;
  const handleLampPull = () => {
    if (pullTimerRef.current) window.clearTimeout(pullTimerRef.current);
    if (pullResetTimerRef.current) window.clearTimeout(pullResetTimerRef.current);
    setPullingCord(true);
    const nextLampOn = !lampOn;
    pullTimerRef.current = window.setTimeout(() => {
      setLampOn(nextLampOn);
      setTorchMode(!nextLampOn);
      if (nextLampOn) setHoveredId(null);
      pullTimerRef.current = 0;
    }, TIMELINE_LAMP_DELAY);
    pullResetTimerRef.current = window.setTimeout(() => {
      setPullingCord(false);
      pullResetTimerRef.current = 0;
    }, TIMELINE_LAMP_PULL);
  };

  return (
    <div
      ref={rootRef}
      className={[
        "od-constellation",
        entered ? "is-entered" : "",
        torchMode ? "is-torch" : "",
        selectedSong ? "is-detail-open" : "",
      ].filter(Boolean).join(" ")}
      onMouseMove={(event) => {
        const rect = rootRef.current?.getBoundingClientRect();
        if (!rect) return;
        pointerTargetRef.current = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
        if (!torchMode) setPointer(pointerTargetRef.current);
      }}
    >
      <Chrome corner="tl" visible>{`04 / 13`}</Chrome>
      <Chrome corner="tr" visible>TIMELINE · 45 SONGS</Chrome>

      <div className={`od-constellation-world ${selectedSong ? "is-muted" : ""}`}>
        <div className={`od-constellation-lamp ${lampOn ? "is-on" : "is-off"}`} aria-hidden="true">
          <div className="od-constellation-lampStem" />
          <div className="od-constellation-lampShade" />
          <div className="od-constellation-lampGlow" />
        </div>
        <button
          type="button"
          className={`od-constellation-lampCord ${pullingCord ? "is-pulling" : ""}`}
          onClick={handleLampPull}
          aria-label={lampOn ? "拉灯绳关灯" : "拉灯绳开灯"}
          title={lampOn ? "拉一下，关灯" : "拉一下，开灯"}
        >
          <span className="od-constellation-lampCordLine" />
          <span className="od-constellation-lampCordKnob" />
        </button>

        <div className="od-constellation-titleBlock">
          <div className="od-constellation-kicker">{`45 SONGS · ${minYear} — ${maxYear}`}</div>
          <h2 className="od-constellation-title">评论引力图</h2>
          <p className="od-constellation-titleSub">45 首歌，悬在同一条时间轴上。评论越重，位置越高。</p>
        </div>

        <div className="od-constellation-note">
          <span>它们按时间和评论量摆好了。</span>
          <span>哪首先点，看你。</span>
        </div>

        <div className="od-constellation-axisWrap" aria-hidden="true">
          <div className="od-constellation-axisLine" />
          <div className="od-constellation-years">
            {TIMELINE_YEAR_MARKS.map((year, index) => {
              const progress = clamp((year - minYear) / Math.max(1, maxYear - minYear), 0, 1);
              return (
                <span
                  key={year}
                  className="od-constellation-year"
                  style={{ left: `${(progress * 100).toFixed(3)}%`, transitionDelay: `${600 + (index * 80)}ms` }}
                >
                  {year}
                </span>
              );
            })}
          </div>
        </div>

        {focusId && (
          <div
            className="od-constellation-focusLine"
            style={{
              left: `${(activeSong.x * 100).toFixed(3)}%`,
              top: `${(activeSong.y * 100).toFixed(3)}%`,
              height: `${Math.max(16, (TIMELINE_AXIS_Y - activeSong.y) * 100).toFixed(3)}%`,
            }}
            aria-hidden="true"
          />
        )}

        <div className="od-constellation-field">
          {timelineSongs.map((song) => {
            const activeNode = song.id === hoveredId || song.id === selectedId;
            const dimmed = Boolean(focusId && focusId !== song.id);
            const showLabel = compact ? activeNode : (song.featured || activeNode);
            const cover = timelineCoverUrl(song.cover);
            const nodeStyle = {
              left: `${(song.x * 100).toFixed(3)}%`,
              top: `${(song.y * 100).toFixed(3)}%`,
              width: `${song.size}px`,
              height: `${song.size}px`,
              "--node-size": `${song.size}px`,
              "--accent": song.color,
              "--enter-delay": `${song.enterDelay}ms`,
              "--breath-delay": `${song.breathDelay}s`,
              "--glow-delay": `${song.glowDelay}s`,
              "--drop-offset": `${Math.max(48, (TIMELINE_AXIS_Y - song.y) * (rootRect.height || 720))}px`,
            };

            return (
              <button
                key={song.id}
                type="button"
                className={[
                  "od-constellation-node",
                  song.featured ? "is-featured" : "is-secondary",
                  song.topFive ? "is-top" : "",
                  activeNode ? "is-active" : "",
                  dimmed ? "is-dimmed" : "",
                  showLabel ? "show-label" : "",
                ].filter(Boolean).join(" ")}
                style={nodeStyle}
                onMouseEnter={() => armHover(song.id)}
                onMouseLeave={() => {
                  clearHoverTimer();
                  if (!selectedSong) setHoveredId((current) => (current === song.id ? null : current));
                }}
                onFocus={() => armHover(song.id)}
                onBlur={() => {
                  clearHoverTimer();
                  if (!selectedSong) setHoveredId((current) => (current === song.id ? null : current));
                }}
                onClick={() => {
                  clearHoverTimer();
                  setHoveredId(song.id);
                  setSelectedId(song.id);
                }}
              >
                <span
                  className={`od-constellation-disc ${cover ? "has-cover" : "is-fallback"}`}
                  style={cover ? { backgroundImage: cover } : { backgroundColor: song.color }}
                >
                  <span className="od-constellation-discOverlay" />
                </span>
                <span className="od-constellation-nodeTitle" title={song.title}>{showLabel ? song.shortTitle : song.title}</span>
                <span className="od-constellation-nodeYear">{song.year}</span>
              </button>
            );
          })}
        </div>

        {hoveredSong && popupStyle && !selectedSong && (
          <div className="od-constellation-popup" style={popupStyle}>
            <div className="od-constellation-popupHead">
              <div className="od-constellation-popupTitle">{hoveredSong.title}</div>
              <div className="od-constellation-popupYear">{hoveredSong.year}</div>
            </div>
            <div className="od-constellation-popupAlbum">{hoveredSong.album || "单曲"}</div>
            <div className="od-constellation-popupRule" />
            {hoveredSong.topComment?.content ? (
              <>
                <div className="od-constellation-popupQuote">{timelineTrim(hoveredSong.topComment.content, compact ? 68 : 88)}</div>
                <div className="od-constellation-popupMeta">
                  <span>{hoveredSong.topComment?.date ? String(hoveredSong.topComment.date).slice(0, 10) : "高赞评论"}</span>
                  <span>{`× ${formatTimelineCount(hoveredSong.topComment?.likes || 0)}`}</span>
                </div>
              </>
            ) : (
              <div className="od-constellation-popupMeta is-alone">
                <span>{`${formatTimelineCount(hoveredSong.comments)} 条评论`}</span>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          className={`od-constellation-tool ${torchMode ? "is-active" : ""}`}
          onClick={() => setTorchMode((current) => !current)}
        >
          <span className="od-constellation-toolIcon" aria-hidden="true" />
          <span className="od-constellation-toolLabel">{torchMode ? "关闭手电筒 · F" : "手电筒 · F"}</span>
        </button>
      </div>

      {torchMode && (
        <div
          className="od-constellation-torchmask"
          style={{
            background: "rgba(4,3,9,.84)",
            WebkitMaskImage: `radial-gradient(circle ${torchRadius + 60}px at ${pointer.x}px ${pointer.y}px, transparent 0, transparent ${torchRadius}px, rgba(0,0,0,.55) ${torchRadius + 34}px, #000 ${torchRadius + 60}px)`,
            maskImage: `radial-gradient(circle ${torchRadius + 60}px at ${pointer.x}px ${pointer.y}px, transparent 0, transparent ${torchRadius}px, rgba(0,0,0,.55) ${torchRadius + 34}px, #000 ${torchRadius + 60}px)`,
          }}
          aria-hidden="true"
        />
      )}

      {selectedSong && (
        <div
          className="od-constellation-detailBackdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedId(null);
          }}
        >
          <article className="od-constellation-detailCard">
            <button
              type="button"
              className="od-constellation-detailClose"
              onClick={() => setSelectedId(null)}
              aria-label="关闭歌曲详情"
            >
              ×
            </button>

            <div className="od-constellation-detailHead">
              <div className="od-constellation-detailCoverWrap">
                {selectedSong.cover ? (
                  <img
                    className="od-constellation-detailCover"
                    src={selectedSong.cover}
                    alt={`${selectedSong.album || selectedSong.title} 封面`}
                  />
                ) : (
                  <div className="od-constellation-detailFallback" aria-hidden="true" />
                )}
              </div>

              <div className="od-constellation-detailMeta">
                <div className="od-constellation-detailTitle">{selectedSong.title}</div>
                <div className="od-constellation-detailTopline">
                  <span>{selectedSong.year}</span>
                  <span>{selectedSong.album || "单曲"}</span>
                </div>
                <div className="od-constellation-detailStats">{`× ${formatTimelineCount(selectedSong.comments)} 条评论`}</div>
              </div>
            </div>

            <div className="od-constellation-detailRule" />

            <div className="od-constellation-detailComments">
              {(selectedSong.topComments.length ? selectedSong.topComments : [{
                content: timelineTrim(selectedSong.topComment?.content, 108) || "这首歌还没挂出可引用的高赞评论。",
                likes: Number(selectedSong.topComment?.likes || 0),
                date: String(selectedSong.topComment?.date || "").slice(0, 10),
              }]).map((comment, index) => (
                <section key={`${selectedSong.id}-comment-${index}`} className="od-constellation-detailComment">
                  <div className="od-constellation-detailCommentBody">{comment.content}</div>
                  <div className="od-constellation-detailCommentMeta">
                    <span>{comment.date || `TOP ${index + 1}`}</span>
                    <span>{`× ${formatTimelineCount(comment.likes || 0)}`}</span>
                  </div>
                </section>
              ))}
            </div>
          </article>
        </div>
      )}
    </div>
  );
}

window.TimelineConstellationScene = TimelineConstellationScene;
