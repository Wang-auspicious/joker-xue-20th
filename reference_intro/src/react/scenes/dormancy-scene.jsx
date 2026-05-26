const DORMANCY_MIN_YEAR = 2006;
const DORMANCY_MAX_YEAR = 2026;
const DORMANCY_AXIS_YEARS = [2006, 2010, 2015, 2020, 2026];

function dormancyTone(yearsAfterRelease) {
  if (yearsAfterRelease <= 1) return "instant";
  if (yearsAfterRelease <= 5) return "mid";
  return "late";
}

function dormancyToneLabel(yearsAfterRelease) {
  if (yearsAfterRelease <= 1) return "0—1 年";
  if (yearsAfterRelease <= 5) return "2—5 年";
  return "5 年后";
}

function dormancyExcerpt(text, max = 220) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function dormancyCommentMetrics(text) {
  const content = String(text || "").replace(/\s+/g, "").trim();
  const length = content.length;
  if (length <= 60) return { fontSize: "19px", lineHeight: 1.7 };
  if (length <= 95) return { fontSize: "17px", lineHeight: 1.62 };
  if (length <= 130) return { fontSize: "15px", lineHeight: 1.56 };
  if (length <= 170) return { fontSize: "13px", lineHeight: 1.5 };
  return { fontSize: "12px", lineHeight: 1.45 };
}

function dormancyX(year) {
  const safeYear = clamp(Number(year || DORMANCY_MIN_YEAR), DORMANCY_MIN_YEAR, DORMANCY_MAX_YEAR);
  return ((safeYear - DORMANCY_MIN_YEAR) / (DORMANCY_MAX_YEAR - DORMANCY_MIN_YEAR)) * 100;
}

function dormancyDotRadius(likes) {
  return clamp(6 + Math.log10(Math.max(1, Number(likes || 0))) * 1.8, 7, 16);
}

function dormancyCount(value) {
  return Number(value || 0).toLocaleString("zh-CN");
}

function normalizeDormancySong(song) {
  const primaryRaw = (song.topComments || [])[0] || song.farthestComment || null;
  if (!primaryRaw) {
    return {
      ...song,
      releaseX: dormancyX(song.releaseYear),
      dormancyYears: Number(song.topCommentYearsAfterRelease || 0),
      primary: null,
    };
  }

  const commentYear = Number(
    primaryRaw.commentYear
    || String(primaryRaw.date || "").slice(0, 4)
    || song.releaseYear
    || DORMANCY_MIN_YEAR,
  );
  const yearsAfterRelease = Number(
    primaryRaw.yearsAfterRelease
    ?? Math.max(0, commentYear - Number(song.releaseYear || DORMANCY_MIN_YEAR)),
  );

  return {
    ...song,
    releaseX: dormancyX(song.releaseYear),
    dormancyYears: yearsAfterRelease,
    primary: {
      ...primaryRaw,
      commentYear,
      yearsAfterRelease,
      tone: dormancyTone(yearsAfterRelease),
      x: dormancyX(commentYear),
      size: dormancyDotRadius(primaryRaw.likes),
      contentShort: dormancyExcerpt(primaryRaw.content),
    },
  };
}

function sortDormancyRows(a, b) {
  if (b.dormancyYears !== a.dormancyYears) return b.dormancyYears - a.dormancyYears;
  if ((b.primary?.likes || 0) !== (a.primary?.likes || 0)) return (b.primary?.likes || 0) - (a.primary?.likes || 0);
  if (a.releaseYear !== b.releaseYear) return a.releaseYear - b.releaseYear;
  return String(a.song || "").localeCompare(String(b.song || ""), "zh-CN");
}

function buildDormancyRows(data) {
  const normalized = (Array.isArray(data?.songs) ? data.songs : [])
    .map(normalizeDormancySong)
    .filter((song) => song.primary);

  const longDormancy = normalized
    .filter((song) => song.dormancyYears > 1)
    .sort(sortDormancyRows)
    .slice(0, 28);

  const blueRepresentatives = normalized
    .filter((song) => song.dormancyYears <= 1)
    .sort((a, b) => {
      if ((b.primary?.likes || 0) !== (a.primary?.likes || 0)) return (b.primary?.likes || 0) - (a.primary?.likes || 0);
      if ((b.commentCount || 0) !== (a.commentCount || 0)) return (b.commentCount || 0) - (a.commentCount || 0);
      return String(a.song || "").localeCompare(String(b.song || ""), "zh-CN");
    })
    .slice(0, 2);

  return [...longDormancy, ...blueRepresentatives].sort(sortDormancyRows);
}

function DormancyScene({ active, data }) {
  const dormancyData = window.DORMANCY_DATA || data?.dormancy || { songs: [], summary: {} };
  const baseSongs = window.DATA?.songs || data?.songs || [];
  const songMetaByTitle = useMemo(() => new Map(
    (baseSongs || []).map((song) => [song.title, song]),
  ), [baseSongs]);
  const rows = useMemo(() => buildDormancyRows(dormancyData).map((row) => ({
    ...row,
    cover: songMetaByTitle.get(row.song)?.cover || "",
  })), [dormancyData, songMetaByTitle]);
  const [selectedSongId, setSelectedSongId] = useState(null);

  useEffect(() => {
    if (!active) {
      setSelectedSongId(null);
      return;
    }
    setSelectedSongId((current) => (
      rows.some((row) => row.song === current)
        ? current
        : rows[0]?.song || null
    ));
  }, [active, rows]);

  if (!active) return null;

  const summary = dormancyData.summary || {};
  const activeSong = rows.find((row) => row.song === selectedSongId) || rows[0] || null;
  const lateCount = Number(summary.topCommentAfter5YearsCount || rows.filter((row) => row.dormancyYears > 5).length || 0);
  const longestYears = Number(summary.longestDormancySong?.maxDormancyYears || rows[0]?.dormancyYears || 0);
  const longestSongName = summary.longestDormancySong?.song || rows[0]?.song || "";
  const activeComment = activeSong?.primary?.content || activeSong?.farthestComment?.content || "";
  const activeCommentStyle = dormancyCommentMetrics(activeComment);

  return (
    <div className="od-dormancy">
      <Chrome corner="tl" visible>{`05 / 13`}</Chrome>
      <Chrome corner="tr" visible>DORMANCY MAP</Chrome>

      <div className="od-dormancy-topline">
        <div className="od-dormancy-kicker">Dormancy Map · 沉睡时间地图</div>
        <div className="od-dormancy-headRow">
          <h2 className="od-dormancy-title">有些歌，是很多年后才被听懂</h2>
          <p className="od-dormancy-subtitle">每条线连接一首歌的发行年份，和它最高赞评论出现的年份。</p>
        </div>
      </div>

      <div className="od-dormancy-layout">
        <section className="od-dormancy-main">
          <div className="od-dormancy-chartHeader">
            <div className="od-dormancy-question">最高赞评论，通常出现在歌曲发行多久之后？</div>
            <div className="od-dormancy-legend" aria-hidden="true">
              <span><i className="is-release" /> 发行</span>
              <span><i className="is-instant" /> 0–1 年</span>
              <span><i className="is-mid" /> 2–5 年</span>
              <span><i className="is-late" /> 5 年后</span>
            </div>
          </div>

          <div className="od-dormancy-chartShell">
            <div className="od-dormancy-axisTop">
              <div className="od-dormancy-axisSpacer" />
              <div className="od-dormancy-axisLabels">
                {DORMANCY_AXIS_YEARS.map((year) => (
                  <span
                    key={year}
                    className="od-dormancy-axisLabel"
                    style={{ left: `${dormancyX(year)}%` }}
                  >
                    {year}
                  </span>
                ))}
              </div>
            </div>

            <div className="od-dormancy-plot">
              <div className="od-dormancy-guides" aria-hidden="true">
                {DORMANCY_AXIS_YEARS.map((year) => (
                  <span
                    key={year}
                    className="od-dormancy-guide"
                    style={{ left: `${dormancyX(year)}%` }}
                  />
                ))}
              </div>

              <div
                className="od-dormancy-chart"
                style={{ gridTemplateRows: `repeat(${Math.max(rows.length, 1)}, minmax(0, 1fr))` }}
              >
                {rows.map((row) => {
                  const isActive = activeSong?.song === row.song;
                  return (
                    <div
                      key={row.song}
                      className={`od-dormancy-row ${isActive ? "is-active" : ""}`}
                    >
                      <span className="od-dormancy-song">{row.song}</span>

                      <span className="od-dormancy-track">
                        <span className="od-dormancy-line" />
                        <span
                          className={`od-dormancy-span is-${row.primary.tone}`}
                          style={{
                            left: `${Math.min(row.releaseX, row.primary.x)}%`,
                            width: `${Math.abs(row.primary.x - row.releaseX)}%`,
                          }}
                        />
                        <span
                          className="od-dormancy-release"
                          style={{ left: `${row.releaseX}%` }}
                        />
                        <button
                          type="button"
                          className={`od-dormancy-dot is-${row.primary.tone} ${isActive ? "is-active" : ""}`}
                          style={{
                            left: `${row.primary.x}%`,
                            width: `${row.primary.size * 2}px`,
                            height: `${row.primary.size * 2}px`,
                            marginLeft: `${-row.primary.size}px`,
                            marginTop: `${-row.primary.size}px`,
                          }}
                          onMouseEnter={() => setSelectedSongId(row.song)}
                          onFocus={() => setSelectedSongId(row.song)}
                          onClick={() => setSelectedSongId(row.song)}
                          aria-label={`${row.song}，发行 ${row.releaseYear}，最高赞评论出现在 ${row.primary.commentYear}`}
                        />
                        {isActive && (
                          <span
                            className={`od-dormancy-delayTag is-${row.primary.tone}`}
                            style={{ left: `calc(${row.primary.x}% + 12px)` }}
                          >
                            {row.primary.yearsAfterRelease} 年
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <aside className="od-dormancy-side od-dormancy-side--right">
          {activeSong && (
            <div className="od-dormancy-card">
              <span key={activeSong.song} className={`od-dormancy-cardRipple is-${activeSong.primary.tone}`} aria-hidden="true" />
              <div key={activeSong.song} className="od-dormancy-cardSwap">
                <div className="od-dormancy-cardLabel">SELECTED SONG · DORMANCY DETAIL</div>
                <div className="od-dormancy-cardTop">
                  <div className="od-dormancy-cardMain">
                    <div className="od-dormancy-cardKicker">{dormancyToneLabel(activeSong.primary.yearsAfterRelease)} · {activeSong.album}</div>
                    <h3 className="od-dormancy-cardTitle">{activeSong.song}</h3>
                    <div className="od-dormancy-cardMetrics">
                      <div className="od-dormancy-cardMetric">
                        <span>发行年份</span>
                        <strong>{activeSong.releaseYear} → {activeSong.primary.commentYear}</strong>
                      </div>
                      <div className="od-dormancy-cardMetric">
                        <span>沉睡时间</span>
                        <strong className={`is-${activeSong.primary.tone}`}>{activeSong.primary.yearsAfterRelease} 年</strong>
                      </div>
                      <div className="od-dormancy-cardMetric">
                        <span>最高赞数</span>
                        <strong>{dormancyCount(activeSong.primary.likes)}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="od-dormancy-coverWrap">
                    {activeSong.cover ? (
                      <img className="od-dormancy-cover" src={activeSong.cover} alt={`${activeSong.song} 专辑图`} />
                    ) : (
                      <div className="od-dormancy-coverFallback">专辑图</div>
                    )}
                  </div>
                </div>

                <div className="od-dormancy-cardBody">
                  <div className="od-dormancy-cardExcerptLabel">评论摘录</div>
                  <p className="od-dormancy-cardExcerpt" style={activeCommentStyle}>
                    “{activeComment}”
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="od-dormancy-summaryBlock od-dormancy-summaryBlock--corner">
            <div className="od-dormancy-summaryLabel">INSIGHT</div>
            <div className="od-dormancy-summaryNarrative">
              <p>
                45 首歌的最高赞评论里，出现在发行
                <strong> 5 年以后 </strong>
                的，只有
                <strong> {lateCount} 首</strong>。
              </p>
              <p>
                最长的一次迟到听懂，等了
                <strong> {longestYears} 年 </strong>
                ，出现在《
                <strong>{longestSongName || "认真的雪"}</strong>
                》。
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

window.DormancyScene = DormancyScene;
