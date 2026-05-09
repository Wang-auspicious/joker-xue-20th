const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DATA_PATH = path.join(ROOT, "generated-data.json");
const DORMANCY_PATH = path.join(ROOT, "generated-dormancy.json");
const LOCAL_OD_DATA_PATH = path.join(ROOT, "data.local.js");
const RAW_SCENE_SIGNALS_PATH = path.join(ROOT, "raw-scene-signals.json");
const OUT_PATH = path.join(ROOT, "index.html");
const UPLOADS_DIR = path.join(ROOT, "uploads");
const SOURCE_FILES = [
  path.join(ROOT, "src", "react", "core.jsx"),
  path.join(ROOT, "src", "react", "scenes", "cover-scene.jsx"),
  path.join(ROOT, "src", "react", "scenes", "number-roll-scene.jsx"),
  path.join(ROOT, "src", "react", "scenes", "timeline-constellation-scene.jsx"),
  path.join(ROOT, "src", "react", "scenes", "dormancy-scene.jsx"),
  path.join(ROOT, "src", "react", "scenes", "scenes-5-14.jsx"),
  path.join(ROOT, "src", "react", "scenes", "placeholders.jsx"),
  path.join(ROOT, "src", "react", "app.jsx"),
];
const THEME_STOP_WORDS = new Set([
  "一个",
  "真的",
  "现在",
  "因为",
  "首歌",
  "评论",
  "好听",
  "多多",
  "流泪",
  "大哭",
  "生日快乐",
  "薛之谦",
]);
const FLOAT_STOP_WORDS = new Set([
  "一个",
  "真的",
  "现在",
  "因为",
  "首歌",
  "评论",
  "好听",
  "多多",
  "流泪",
  "大哭",
  "加油",
  "永远",
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readOptionalJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readOptionalOdDataJs(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const source = fs.readFileSync(filePath, "utf8").trim();
  const match = source.match(/window\.[A-Z0-9_]+\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    return null;
  }
}

function normalizeLabel(value) {
  return String(value || "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildUploadLookup() {
  if (!fs.existsSync(UPLOADS_DIR)) return new Map();
  return new Map(
    fs.readdirSync(UPLOADS_DIR)
      .filter((file) => /\.(png|jpe?g|webp)$/i.test(file))
      .map((file) => [normalizeLabel(path.parse(file).name), `uploads/${file}`]),
  );
}

const COVER_ALIAS_MAP = {
  绅士: ["演员", "薛之谦", "帅照"],
  下雨了: ["演员", "薛之谦", "帅照"],
  顽疾: ["薛之谦", "帅照"],
  深深爱过你: ["薛之谦", "帅照"],
  "你过得好吗": ["薛之谦", "帅照"],
  "苏黎世的从前": ["薛之谦", "帅照"],
};

function resolveCover(song, uploadLookup) {
  const candidate = String(song.cover || "");
  if (candidate && !candidate.includes("??") && fs.existsSync(path.join(ROOT, candidate))) {
    return candidate;
  }
  const titleCover = uploadLookup.get(normalizeLabel(song.title));
  if (titleCover) return titleCover;
  const albumCover = uploadLookup.get(normalizeLabel(song.album));
  if (albumCover) return albumCover;
  const aliases = [
    ...(COVER_ALIAS_MAP[song.title] || []),
    ...(COVER_ALIAS_MAP[song.album] || []),
  ];
  for (const alias of aliases) {
    const aliasCover = uploadLookup.get(normalizeLabel(alias));
    if (aliasCover) return aliasCover;
  }
  const artistCover = uploadLookup.get(normalizeLabel("薛之谦"));
  if (artistCover) return artistCover;
  const portraitCover = uploadLookup.get(normalizeLabel("帅照"));
  if (portraitCover) return portraitCover;
  return "";
}

function normalizeLyrics(lines) {
  return lines
    .map((entry, index) => ({
      id: entry.id || `dust-lyric-${index + 1}`,
      text: String(entry.text || entry.content || entry || "").replace(/\s+/g, " ").trim(),
      time: Number.isFinite(Number(entry.time)) ? Number(entry.time) : (index * 5200),
    }))
    .filter((entry) => entry.text);
}

function parseLyricsText(text) {
  const source = String(text || "").replace(/\r/g, "\n");
  const lines = source
    .split(/\n+/)
    .map((rawLine, index) => {
      const cleanLine = rawLine.replace(/\[[^\]]*]/g, "").trim();
      if (!cleanLine) return null;
      const timeMatch = rawLine.match(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/);
      const minute = Number(timeMatch?.[1] || 0);
      const second = Number(timeMatch?.[2] || 0);
      const fraction = String(timeMatch?.[3] || "").padEnd(3, "0");
      const time = timeMatch
        ? ((minute * 60000) + (second * 1000) + Number(fraction || 0))
        : (index * 5200);
      return { text: cleanLine, time };
    })
    .filter(Boolean);
  return normalizeLyrics(lines);
}

function readVorbisLyrics(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const buf = fs.readFileSync(filePath);
  if (buf.slice(0, 4).toString() !== "fLaC") return [];
  let offset = 4;

  while (offset + 4 <= buf.length) {
    const header = buf[offset];
    const isLast = Boolean(header & 0x80);
    const type = header & 0x7f;
    const length = (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3];
    const bodyStart = offset + 4;
    const bodyEnd = bodyStart + length;

    if (type === 4) {
      let pointer = bodyStart;
      const vendorLength = buf.readUInt32LE(pointer);
      pointer += 4 + vendorLength;
      const commentCount = buf.readUInt32LE(pointer);
      pointer += 4;

      for (let index = 0; index < commentCount; index += 1) {
        const commentLength = buf.readUInt32LE(pointer);
        pointer += 4;
        const comment = buf.slice(pointer, pointer + commentLength).toString("utf8");
        pointer += commentLength;

        const [rawKey, ...rest] = comment.split("=");
        const key = String(rawKey || "").trim().toUpperCase();
        if (!["LYRICS", "LYRIC", "UNSYNCEDLYRICS", "UNSYNCED LYRICS", "LRC"].includes(key)) continue;
        return parseLyricsText(rest.join("="));
      }
    }

    offset = bodyEnd;
    if (isLast) break;
  }

  return [];
}

function readExternalLyrics() {
  const uploadCandidates = fs.existsSync(UPLOADS_DIR)
    ? fs.readdirSync(UPLOADS_DIR).map((name) => path.join(UPLOADS_DIR, name))
    : [];
  const candidates = [
    path.join(ROOT, "尘.lrc"),
    path.join(ROOT, "尘.txt"),
    path.join(ROOT, "dust.lrc"),
    path.join(ROOT, "dust.txt"),
    ...uploadCandidates,
  ].filter((filePath) => {
    if (!/\.(lrc|txt|json)$/i.test(filePath)) return false;
    const basename = path.basename(filePath).toLowerCase();
    return basename.includes("尘") || basename.includes("dust");
  });

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const text = fs.readFileSync(filePath, "utf8");
    if (/\.json$/i.test(filePath)) {
      try {
        const parsed = JSON.parse(text);
        const value = parsed.lyrics || parsed.lrc || parsed.content || parsed.lines || [];
        if (Array.isArray(value)) {
          const lines = normalizeLyrics(value.map((entry) => (
            typeof entry === "string" ? { text: entry } : entry
          )));
          if (lines.length) return lines;
        } else {
          const lines = parseLyricsText(String(value || ""));
          if (lines.length) return lines;
        }
      } catch (error) {
        // ignore malformed lyric JSON
      }
      continue;
    }

    const lines = parseLyricsText(text);
    if (lines.length) return lines;
  }

  return [];
}

function buildDustLyrics() {
  const flacFile = fs.readdirSync(ROOT).find((name) => name.toLowerCase().endsWith(".flac") && name.includes("尘"));
  const fromFlac = flacFile ? readVorbisLyrics(path.join(ROOT, flacFile)) : [];
  if (fromFlac.length) return fromFlac;
  return readExternalLyrics();
}

function isBlockedRecurringPhrase(value) {
  const phrase = String(value || "").trim();
  return phrase.includes("天外来物") || phrase.includes("求之不得");
}

function groupEmotionByPhase(emotionByYear) {
  const phaseDefs = [
    { id: "early", years: [2013, 2016] },
    { id: "mid", years: [2017, 2020] },
    { id: "late", years: [2021, 2026] },
  ];
  const totals = Object.fromEntries(phaseDefs.map((phase) => [phase.id, {}]));
  Object.entries(emotionByYear || {}).forEach(([yearKey, counts]) => {
    const year = Number(yearKey);
    const phase = phaseDefs.find((entry) => year >= entry.years[0] && year <= entry.years[1]);
    if (!phase) return;
    Object.entries(counts || {}).forEach(([label, count]) => {
      totals[phase.id][label] = (totals[phase.id][label] || 0) + Number(count || 0);
    });
  });
  const normalize = (bucket) => Object.entries(bucket)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));
  const labels = Array.from(new Set(Object.values(totals).flatMap((bucket) => Object.keys(bucket))));
  return {
    early: normalize(totals.early),
    mid: normalize(totals.mid),
    late: normalize(totals.late),
    flows: labels.map((label) => ({
      label,
      from: totals.early[label] || 0,
      mid: totals.mid[label] || 0,
      to: totals.late[label] || 0,
    })),
  };
}

function buildThemeJourney(songs, globalWords) {
  const rankedWords = (globalWords || [])
    .filter((entry) => {
      const word = String(entry.word || "").trim();
      return word.length >= 2 && !THEME_STOP_WORDS.has(word);
    })
    .map((entry) => {
      const word = String(entry.word || "").trim();
      const timeline = songs
        .map((song) => {
          const wordHit = (song.wordStats || []).find((item) => item.word === word);
          const count = Number(wordHit?.count || ((song.words || []).includes(word) ? 1 : 0));
          if (!count) return null;
          return {
            songId: song.id,
            title: song.title,
            year: song.year,
            count,
          };
        })
        .filter(Boolean)
        .map((song) => ({
          songId: song.id,
          title: song.title,
          year: song.year,
          count: Number(song.count || 0),
        }));
      return {
        word,
        count: Number(entry.count || 0),
        timeline,
      };
    })
    .filter((entry) => entry.timeline.length >= 2)
    .sort((a, b) => {
      if (b.timeline.length !== a.timeline.length) return b.timeline.length - a.timeline.length;
      return b.count - a.count;
    })
    .slice(0, 10);

  return rankedWords.map((entry) => ({
    word: entry.word,
    count: entry.count,
    timeline: entry.timeline,
  }));
}

function buildRecurringPhrases(raw, songs) {
  const phraseEntries = [
    raw.viral?.content ? { phrase: raw.viral.content, occurrences: Number(raw.viral.occurrences || 0) } : null,
    ...((raw.globalWords || [])
      .filter((entry) => {
        const word = String(entry.word || "").trim();
        return word.length >= 2 && !THEME_STOP_WORDS.has(word) && !isBlockedRecurringPhrase(word);
      })
      .slice(0, 12)
      .map((entry) => ({
        phrase: String(entry.word || "").trim(),
        occurrences: Number(entry.count || 0),
      }))),
  ]
    .filter(Boolean)
    .filter((entry) => !isBlockedRecurringPhrase(entry.phrase));

  return phraseEntries.map((entry) => {
    const examples = songs
      .flatMap((song) => {
        const matched = (song.topComments || [])
          .filter((comment) => String(comment.content || "").includes(entry.phrase))
          .slice(0, 1)
          .map((comment) => ({
            songId: song.id,
            title: song.title,
            content: comment.content,
            likes: comment.likes || 0,
          }));
        if (matched.length) return matched;
        if ((song.words || []).includes(entry.phrase)) {
          return [{
            songId: song.id,
            title: song.title,
            content: song.topComment?.content || entry.phrase,
            likes: song.topComment?.likes || 0,
          }];
        }
        return [];
      })
      .slice(0, 4);

    return {
      phrase: entry.phrase,
      occurrences: entry.occurrences,
      examples: examples.length ? examples : [{
        songId: "phrase",
        title: "共用句",
        content: entry.phrase,
        likes: entry.occurrences,
      }],
    };
  }).slice(0, 10);
}

function buildFloatPhrases(raw, songs) {
  const sources = [
    ...(songs || []).map((song) => song.topComment?.content || ""),
    ...(raw.peacePhrases || []).map((item) => item.content || ""),
    raw.viral?.content || "",
    ...(songs || []).flatMap((song) => (song.words || []).map((word) => String(word || "").trim())),
  ].filter(Boolean);
  const seen = new Set();
  const phrases = [];
  sources.forEach((source) => {
    const clean = String(source)
      .replace(/\[[^\]]*]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean) return;
    const parts = clean.split(/[，。！？、；：“”"'‘’（）()【】\[\],.!?;:]/).map((part) => part.trim()).filter(Boolean);
    parts.forEach((part) => {
      const piece = part.length > 14 ? part.slice(0, 14) : part;
      if (piece.length < 6 || piece.length > 14) return;
      if (FLOAT_STOP_WORDS.has(piece)) return;
      if (seen.has(piece)) return;
      seen.add(piece);
      phrases.push(piece);
    });
  });
  return phrases.slice(0, 240);
}

function buildPeacePhrases(raw, songs) {
  const samples = [];
  songs.forEach((song) => {
    const text = song.topComment?.content || "";
    if (text.includes("世界和平")) {
      samples.push({
        songId: song.id,
        title: song.title,
        content: text,
        likes: song.topComment.likes || 0,
      });
    }
  });
  if (!samples.length && raw.viral?.content) {
    samples.push({
      songId: "viral",
      title: "高频句",
      content: raw.viral.content,
      likes: 0,
    });
  }
  return samples;
}

function extractHour(date) {
  const text = String(date || "");
  const match = text.match(/\b(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  return Number.isFinite(hour) ? Math.max(0, Math.min(23, hour)) : null;
}

function buildHourlyHighlights(byHour, songs, rawSignals = null) {
  if (rawSignals?.hourlyRaw?.length) {
    return rawSignals.hourlyRaw.map((entry) => ({
      hour: Number(entry.hour),
      count: Number(entry.count || 0),
      samples: (entry.topComments || []).slice(0, 4).map((comment) => ({
        songId: `raw-hour-${entry.hour}`,
        title: comment.song,
        year: null,
        content: comment.content,
        likes: Number(comment.likes || 0),
        date: comment.date || "",
      })),
      sample: (entry.topComments || []).length
        ? {
          songId: `raw-hour-${entry.hour}`,
          title: entry.topComments[0].song,
          year: null,
          content: entry.topComments[0].content,
          likes: Number(entry.topComments[0].likes || 0),
          date: entry.topComments[0].date || "",
        }
        : null,
    }));
  }
  const groups = Array.from({ length: 24 }, () => []);
  songs.forEach((song) => {
    (song.topComments || []).forEach((comment) => {
      const hour = extractHour(comment.date);
      if (hour === null) return;
      groups[hour].push({
        songId: song.id,
        title: song.title,
        year: song.year,
        content: comment.content,
        likes: comment.likes || 0,
        date: comment.date || "",
      });
    });
  });
  return Array.from({ length: 24 }, (_, hour) => {
    const ranked = groups[hour].sort((a, b) => b.likes - a.likes);
    const sample = ranked[0] || null;
    return {
      hour,
      count: Number(byHour?.[hour]?.count || 0),
      samples: ranked.slice(0, 4),
      sample,
    };
  });
}

function buildDateAnchors(songs) {
  const ranked = songs
    .flatMap((song) => (song.topComments || []).map((comment) => {
      const date = comment?.date || "";
      if (!date) return null;
      return {
        date: String(date).slice(0, 10),
        label: String(date).slice(0, 10).replace(/-/g, "."),
        songId: song.id,
        title: song.title,
        album: song.album,
        year: song.year,
        likes: comment.likes || 0,
        content: comment.content || "",
      };
    }))
    .filter(Boolean)
    .sort((a, b) => b.likes - a.likes || a.date.localeCompare(b.date));

  const unique = [];
  const seen = new Set();
  ranked.forEach((entry) => {
    if (seen.has(entry.date)) return;
    seen.add(entry.date);
    unique.push(entry);
  });

  return unique.slice(0, 24);
}

function buildPhaseWords(songs) {
  const phases = {
    early: new Map(),
    mid: new Map(),
    late: new Map(),
  };
  const phaseForYear = (year) => (year <= 2014 ? "early" : year <= 2020 ? "mid" : "late");
  songs.forEach((song) => {
    const phase = phaseForYear(song.year);
    const stats = Array.isArray(song.wordStats) && song.wordStats.length
      ? song.wordStats
      : (song.words || []).map((word) => ({ word, count: 1 }));
    stats.forEach((entry) => {
      const word = String(entry.word || "").trim();
      if (word.length < 2 || THEME_STOP_WORDS.has(word)) return;
      phases[phase].set(word, (phases[phase].get(word) || 0) + Number(entry.count || 1));
    });
  });
  const normalize = (map) => [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([word, count]) => ({ word, count }));
  return {
    early: normalize(phases.early),
    mid: normalize(phases.mid),
    late: normalize(phases.late),
  };
}

function buildCommentWall(songs) {
  return songs
    .flatMap((song) => (song.topComments || []).map((comment, index) => ({
      songId: song.id,
      title: song.title,
      year: song.year,
      album: song.album,
      content: comment.content,
      likes: Number(comment.likes || 0),
      date: comment.date || "",
      rank: index + 1,
    })))
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 28);
}

function buildLongCommentSamples(raw) {
  return (raw.longComments?.top10_longest || [])
    .filter((entry) => {
      const content = String(entry.content || "");
      const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
      const asciiRuns = (content.match(/[A-Za-z]{12,}/g) || []).length;
      return chineseChars >= 20 && asciiRuns < 2;
    })
    .map((entry, index) => ({
    id: `long-${index + 1}`,
    song: entry.song || "未知歌曲",
    user: entry.user || "匿名用户",
    content: entry.content || "",
    likes: Number(entry.likes || 0),
    length: Number(entry.length || String(entry.content || "").length || 0),
    }));
}

function buildMentionNotes(rawSignals = null) {
  return {
    artist: (rawSignals?.artistNotes || []).slice(0, 12).map((entry, index) => ({
      id: `artist-${index + 1}`,
      target: "薛之谦",
      title: entry.song || "未知歌曲",
      content: entry.content || "",
      likes: Number(entry.likes || 0),
      date: entry.date || "",
    })),
    people: (rawSignals?.peopleNotes || []).slice(0, 18).map((entry, index) => ({
      id: `person-${index + 1}`,
      target: entry.target || "某人",
      title: entry.song || "未知歌曲",
      content: entry.content || "",
      likes: Number(entry.likes || 0),
      date: entry.date || "",
    })),
  };
}

function buildData(raw, richRaw = null, rawSignals = null) {
  const uploadLookup = buildUploadLookup();
  const richSongs = new Map(
    (richRaw?.songs || []).map((song) => [
      normalizeLabel(song.title || song.name),
      song,
    ]),
  );
  const songs = (raw.songs || []).map((song, index) => {
    const richSong = richSongs.get(normalizeLabel(song.title || song.name)) || {};
    const emotionTags = song.emotionTags || richSong.emotionTags || {};
    const emotions = Object.entries(emotionTags).sort((a, b) => b[1] - a[1]);
    const dominantEmotion = emotions[0]?.[0] || "共鸣";
    const nostalgiaScore = Number(song.year <= 2012
      ? 0.85
      : song.year <= 2018
        ? 0.55
        : 0.3);
    const topComments = (song.topComments || song.top5Comments || richSong.topComments || richSong.top5Comments || [])
      .filter((entry) => entry && entry.content)
      .slice(0, 3);
    const topComment = song.topComment || topComments[0] || richSong.topComment || null;
    const title = song.title || richSong.title || richSong.name;
    const album = song.album || richSong.album || "单曲";
    return {
      id: `song-${index + 1}`,
      title,
      year: Number(song.year),
      album,
      comments: Number(song.comments || 0),
      topComment,
      topComments,
      dominantEmotion,
      sentimentScore: Number(song.sentiment || song.avgSentiment || richSong.sentiment || richSong.avgSentiment || 0),
      sentimentColor: song.sentimentColor || song.color || richSong.sentimentColor || richSong.color || null,
      nostalgiaScore,
      words: song.words || richSong.words || [],
      wordStats: richSong.wordsTop30 || [],
      emotionTags,
      cover: resolveCover({ ...richSong, ...song, title, album }, uploadLookup),
    };
  });

  const dustSong = songs.find((song) => song.title === "尘") || songs[0];
  const dustLyrics = buildDustLyrics();

  return {
    stats: {
      totalComments: raw.stats?.totalComments || 0,
      totalLikes: raw.stats?.totalLikes || 0,
      totalUsers: raw.stats?.totalUsers || 0,
      avgLength: raw.stats?.avgCommentLength || 0,
      avgLikes: raw.stats?.avgLikes || 0,
      maxLiked: raw.stats?.maxLiked || 0,
      longCommentRate: raw.longComments?.pct || 0,
      superfans: raw.userStats?.superfans_count || 0,
    },
    songs,
    hourlyComments: raw.byHour || [],
    hourlyHighlights: buildHourlyHighlights(raw.byHour || [], songs, rawSignals),
    delayPattern: raw.lifecycle || [],
    recurringPhrases: buildRecurringPhrases(raw, songs),
    floatPhrases: buildFloatPhrases(raw, songs),
    dateAnchors: buildDateAnchors(songs),
    emotionMigration: groupEmotionByPhase(raw.emotionByYear || {}),
    themeJourney: buildThemeJourney(songs, raw.globalWords || []),
    phaseWords: buildPhaseWords(songs),
    commentWall: buildCommentWall(songs),
    mentionNotes: buildMentionNotes(rawSignals),
    longCommentSamples: buildLongCommentSamples(raw),
    peacePhrases: buildPeacePhrases(raw, songs),
    finalePhrase: {
      text: raw.viral?.content || "世界和平",
      count: Number(raw.viral?.occurrences || 0),
    },
    dust: {
      audioMp3: "moxp0x09-薛之谦---尘.mp3",
      audioFlac: "moxp0vxi-薛之谦---尘.flac",
      cover: dustSong?.cover || "",
      year: dustSong?.year || 2024,
      comments: dustSong?.comments || 0,
      topComment: dustSong?.topComment || null,
      lyrics: dustLyrics,
    },
  };
}

function readSources(files) {
  return files.map((file) => fs.readFileSync(file, "utf8")).join("\n\n");
}

function escapeScript(value) {
  return value.replace(/<\/script/gi, "<\\/script");
}

function buildHtml(data, dormancyData, source) {
  const safeData = escapeScript(JSON.stringify(data));
  const safeDormancyData = escapeScript(JSON.stringify(dormancyData || {}));
  const safeSource = escapeScript(source);
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>认真听过他的人 · React Refactor</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,700;6..96,900&family=JetBrains+Mono:wght@300;500&family=Ma+Shan+Zheng&family=Noto+Sans+SC:wght@300;400;500&family=Noto+Serif+SC:wght@700;900&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet">
  <script crossorigin src="https://unpkg.com/react@18.3.1/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js"></script>
  <style>
    :root{
      --bg:#07050d; --ink:#f5f1e6; --muted:#9b93a8;
      --pink:#ff557f; --orange:#ff9966; --gold:#ffd06b;
      --cyan:#73d6ff; --violet:#aa95ff; --green:#7dd19d;
      --paper:#f4ede1; --paper-soft:#e0d7c8;
      --serif:"Noto Serif SC", serif;
      --sans:"Noto Sans SC", sans-serif;
      --mono:"JetBrains Mono", monospace;
      --hand:"Ma Shan Zheng", cursive;
      --line:rgba(255,255,255,.1);
      --line-soft:rgba(255,255,255,.06);
      --shadow:0 30px 80px rgba(0,0,0,.34);
    }
    *{box-sizing:border-box}
    html,body,#root{height:100%;margin:0}
    html,body{background:var(--bg);color:var(--ink);font-family:var(--sans);overflow:hidden}
    button{font:inherit}
    body{
      background:
        radial-gradient(1200px 800px at 14% 12%, rgba(170,149,255,.14), transparent 60%),
        radial-gradient(900px 700px at 86% 80%, rgba(255,85,127,.12), transparent 62%),
        linear-gradient(180deg, #05030a 0%, #090711 45%, #08060f 100%);
    }
    .od-app{position:relative;height:100%;overflow:hidden}
    .od-stage{position:relative;height:100%}
    .od-scene{
      position:absolute; inset:0; opacity:0; pointer-events:none;
      transform:translateY(24px) scale(.985);
      transition:opacity .72s cubic-bezier(.22,.8,.2,1), transform .72s cubic-bezier(.22,.8,.2,1);
    }
    .od-scene.is-active{opacity:1; pointer-events:auto; transform:none}
    .od-noise,.od-scanlines,.od-vignette{position:fixed; inset:0; pointer-events:none}
    .od-noise{
      z-index:40; opacity:.05; mix-blend-mode:overlay;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.9'/%3E%3C/svg%3E");
    }
    .od-scanlines{
      z-index:41; opacity:.18;
      background:repeating-linear-gradient(to bottom, rgba(255,255,255,.035) 0 1px, transparent 1px 3px);
    }
    .od-vignette{
      z-index:42;
      background:
        radial-gradient(circle at center, transparent 40%, rgba(0,0,0,.22) 72%, rgba(0,0,0,.52) 100%);
    }
    .od-progress{
      position:fixed; left:50%; bottom:26px; transform:translateX(-50%);
      width:min(760px, calc(100vw - 96px)); z-index:60;
      display:flex; flex-direction:column; gap:12px;
    }
    .od-progress.is-disabled{pointer-events:none; opacity:.62}
    .od-progress-track{
      height:1px; background:linear-gradient(90deg, rgba(255,255,255,.08), rgba(255,255,255,.22), rgba(255,255,255,.08));
    }
    .od-progress-dots{display:grid; grid-template-columns:repeat(14,minmax(0,1fr)); gap:8px}
    .od-progress-dot{
      appearance:none; border:0; height:8px; border-radius:999px; cursor:pointer;
      background:rgba(255,255,255,.14); transition:all .28s ease;
      box-shadow:0 0 0 1px rgba(255,255,255,.06) inset;
    }
    .od-progress-dot.is-past{background:rgba(255,255,255,.32)}
    .od-progress-dot.is-active{background:var(--pink); box-shadow:0 0 24px rgba(255,85,127,.45)}
    .od-audio-fab{
      position:fixed; right:22px; bottom:86px; z-index:61;
      width:24px; height:24px; border-radius:999px;
      border:1px solid rgba(255,255,255,.16);
      background:rgba(7,5,13,.56); color:rgba(245,241,230,.72);
      display:grid; place-items:center;
      font-size:12px; line-height:1; font-family:var(--mono);
      backdrop-filter:blur(10px);
      transition:border-color .24s ease, color .24s ease, transform .24s ease, background .24s ease;
    }
    .od-audio-fab:hover{transform:translateY(-1px); border-color:rgba(255,255,255,.28)}
    .od-audio-fab.is-playing{
      color:var(--ink);
      border-color:rgba(255,85,127,.42);
      background:rgba(255,85,127,.16);
      box-shadow:0 0 18px rgba(255,85,127,.18);
      animation:spin 5.5s linear infinite;
    }
    .od-audio-fab.is-muted{
      color:rgba(245,241,230,.42);
      background:rgba(7,5,13,.34);
      border-color:rgba(255,255,255,.1);
      box-shadow:none;
      animation:none;
    }
    .od-chrome{
      position:absolute; z-index:6; opacity:0; transition:opacity .36s ease, transform .36s ease;
      color:rgba(245,241,230,.62); font-size:11px; letter-spacing:.16em; font-family:var(--mono);
      text-transform:uppercase; transform:translateY(8px);
    }
    .od-chrome.is-visible{opacity:1; transform:none}
    .od-chrome-tl{top:22px; left:26px}
    .od-chrome-tr{top:22px; right:26px; text-align:right}
    .od-chrome-bl{bottom:104px; left:26px}
    .od-chrome-br{bottom:104px; right:26px; text-align:right}
    .od-cover{
      position:relative; width:100%; height:100%; overflow:hidden;
      background:#000;
    }
    .od-cover-wave{
      position:absolute; inset:0; width:100%; height:100%; z-index:1; opacity:1;
    }
    .od-cover-wave-path{
      fill:none; stroke:url(#none); stroke:rgba(255,255,255,.96); stroke-width:1.35;
      vector-effect:non-scaling-stroke; filter:drop-shadow(0 0 12px rgba(255,255,255,.18));
    }
    .od-cover-shell{
      position:absolute; inset:0; z-index:3; display:flex; flex-direction:column;
      justify-content:center; align-items:center; padding:0 6vw;
    }
    .od-cover-topline{
      font-family:var(--mono); font-size:12px; letter-spacing:.38em; color:rgba(210,204,224,.66);
      margin-bottom:6px; opacity:0; transform:translateY(10px); transition:opacity .45s ease, transform .65s ease;
    }
    .od-cover-shell.is-revealed .od-cover-topline{opacity:1; transform:none}
    .od-cover-hero{position:relative; width:100%; height:clamp(220px, 28vw, 360px)}
    .od-cover-title{
      position:absolute; left:50%; top:50%; width:min(1180px, 94vw); height:1em; transform:translate(-50%,-50%);
    }
    .od-cover-char{
      position:absolute; left:50%; top:50%; font-family:var(--serif); font-size:clamp(96px, 14vw, 220px);
      line-height:.9; letter-spacing:-.08em; white-space:nowrap;
      opacity:0; filter:blur(12px);
      transform:translate(-50%,-50%) scale(0) rotate(var(--rot));
      transform-origin:center center;
      text-shadow:0 0 26px rgba(255,255,255,.08), 0 0 54px rgba(255,85,127,.12);
    }
    .od-cover-char::before,.od-cover-char::after{
      content:attr(data-text); position:absolute; left:0; top:0; pointer-events:none; mix-blend-mode:screen; opacity:0;
    }
    .od-cover-char::before{color:var(--cyan); transform:translate(-1px,0)}
    .od-cover-char::after{color:var(--pink); transform:translate(1px,0)}
    .od-cover-char.is-visible{animation:coverBurst .4s ease-out both; animation-delay:var(--delay)}
    .od-cover-char.is-visible::before,.od-cover-char.is-visible::after{opacity:.5}
    .od-cover-hand{
      position:absolute; left:calc(50% - min(32vw, 300px)); top:clamp(4px, 3vw, 30px);
      font-family:var(--hand); font-size:clamp(22px, 2.6vw, 40px); color:rgba(245,241,230,.9);
      transform:rotate(-30deg) translateY(14px); opacity:0;
      transition:opacity .4s ease, transform .52s cubic-bezier(.2,.8,.2,1);
    }
    .od-cover-hand.is-visible{opacity:1; transform:rotate(-30deg) translateY(0)}
    .od-cover-subtitle{
      margin-top:10px; font-family:var(--hand); font-size:clamp(20px, 2.4vw, 32px); line-height:1.6;
      color:rgba(245,241,230,.82); text-align:left; opacity:0; transform:translateY(18px);
      transition:opacity .42s ease, transform .64s ease;
    }
    .od-cover-subtitle span{display:block}
    .od-cover-subtitle.is-visible{opacity:1; transform:none}
    .od-cover-enter{
      position:absolute; left:50%; bottom:92px; transform:translateX(-50%);
      display:flex; align-items:center; gap:10px; z-index:5;
      font-family:var(--mono); font-size:10px; letter-spacing:.22em; color:rgba(255,214,180,.84);
      opacity:0; transition:opacity .38s ease;
    }
    .od-cover-enter.is-visible{opacity:1}
    .od-cover-dot{
      width:10px; height:10px; border-radius:999px; background:var(--pink);
      box-shadow:0 0 0 0 rgba(255,85,127,.5);
      animation:coverPulse 2.4s ease-in-out infinite;
    }
    .od-cover-ripple{
      position:absolute; inset:-16%; z-index:2; pointer-events:none; opacity:0;
      background:radial-gradient(circle at 50% 50%, rgba(115,214,255,.12), rgba(115,214,255,.04) 20%, transparent 56%);
      mix-blend-mode:screen;
    }
    .od-cover-ripple.is-visible{animation:coverRipple 1.2s ease-out forwards}
    .od-numberroll{
      position:relative; width:100%; height:100%; overflow:hidden;
      background:radial-gradient(ellipse at center top, #0c0a18 0%, #07050d 60%);
    }
    .od-numberroll-shell{
      position:relative; z-index:4; width:100%; height:100%;
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      padding:9vh 6vw 14vh; gap:clamp(48px, 6vh, 80px);
    }
    .od-numberroll-phrases{
      position:absolute; inset:0; z-index:2; pointer-events:none; overflow:hidden;
    }
    .od-numberroll-phrase{
      position:absolute; left:0; top:0; white-space:nowrap;
      font-family:var(--serif); font-size:18px;
      color:rgba(245,241,230,.32); letter-spacing:.01em;
      text-shadow:0 0 12px rgba(245,241,230,.06);
      will-change:transform, opacity;
    }
    /* —— 翻牌板 —— */
    .od-flap-board{
      position:relative; z-index:5;
      display:flex; align-items:center; justify-content:center;
      gap:clamp(8px, 0.95vw, 16px);
      perspective:1200px;
      filter:drop-shadow(0 30px 60px rgba(255,85,127,.15));
      transition:filter .9s ease;
    }
    .od-flap-board.is-ready{
      filter:drop-shadow(0 30px 60px rgba(255,85,127,.25)) drop-shadow(0 0 80px rgba(255,85,127,.18));
      animation:flapBreath 4.2s ease-in-out 1.2s infinite;
    }
    @keyframes flapBreath{
      0%,100%{filter:drop-shadow(0 30px 60px rgba(255,85,127,.22)) drop-shadow(0 0 80px rgba(255,85,127,.14))}
      50%   {filter:drop-shadow(0 30px 70px rgba(255,85,127,.32)) drop-shadow(0 0 110px rgba(255,85,127,.22))}
    }
    .od-flap-card{
      position:relative;
      width:clamp(64px, 9vw, 146px);
      height:clamp(94px, 13.6vw, 224px);
      border-radius:8px;
      background:linear-gradient(180deg, #1a1525 0%, #14101e 50%, #14101e 50.1%, #0e0b18 100%);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.04),
        inset 0 -1px 0 rgba(0,0,0,.6),
        0 8px 24px rgba(0,0,0,.55),
        0 0 56px rgba(255,85,127,.08);
      font-family:"Playfair Display","Bodoni Moda","Noto Serif SC",serif;
      font-weight:700;
      font-size:clamp(64px, 9vw, 152px);
      line-height:1;
      font-variant-numeric:tabular-nums;
      color:#f5f1e6;
      overflow:hidden;
      transform-style:preserve-3d;
    }
    .od-flap-card--idle{opacity:.62}
    .od-flap-half{
      position:absolute; left:0; right:0;
      overflow:hidden; user-select:none;
    }
    .od-flap-half--top{
      top:0; height:50%;
      background:linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,0));
    }
    .od-flap-half--bottom{
      bottom:0; height:50%;
      background:linear-gradient(180deg, rgba(0,0,0,.18), rgba(0,0,0,.32));
    }
    /* 每个 half 内有一个 glyph：高度 = 整张 card 高度，绝对定位让其垂直居中跨越分割线 */
    .od-flap-half-glyph{
      position:absolute; left:0; right:0;
      display:flex; align-items:center; justify-content:center;
      height:200%; line-height:1;
      font-family:inherit; font-weight:inherit; font-size:inherit;
      color:#f5f1e6;
    }
    .od-flap-half--top .od-flap-half-glyph{
      /* glyph 顶部贴 half 顶部，自身高度 200%，所以 glyph 内部数字（垂直居中）位于 half 底边——刚好显示数字上半 */
      top:0;
    }
    .od-flap-half--bottom .od-flap-half-glyph{
      /* glyph 底部贴 half 底部，自身高度 200%，所以 glyph 内部数字（垂直居中）位于 half 顶边——刚好显示数字下半 */
      bottom:0;
    }
    .od-flap-divider{
      position:absolute; left:0; right:0; top:50%; height:2px;
      background:linear-gradient(90deg, transparent, rgba(0,0,0,.55) 12%, rgba(0,0,0,.55) 88%, transparent);
      box-shadow:0 1px 0 rgba(255,255,255,.04);
      z-index:3; pointer-events:none;
      transform:translateY(-1px);
    }
    .od-flap-flip{
      position:absolute; left:0; right:0; height:50%;
      backface-visibility:hidden;
      will-change:transform, opacity;
      z-index:2;
      overflow:hidden;
    }
    .od-flap-flip--top{
      top:0;
      transform-origin:50% 100%;
      background:linear-gradient(180deg, #1d1729 0%, #14101e 100%);
      box-shadow:0 4px 12px rgba(0,0,0,.5);
      border-radius:8px 8px 0 0;
    }
    .od-flap-flip--bottom{
      bottom:0;
      transform-origin:50% 0%;
      background:linear-gradient(180deg, #14101e 0%, #0e0b18 100%);
      box-shadow:0 -4px 12px rgba(0,0,0,.5);
      border-radius:0 0 8px 8px;
    }
    .od-flap-flip-inner{
      position:absolute; left:0; right:0;
      display:flex; align-items:center; justify-content:center;
      height:200%; line-height:1;
      color:#f5f1e6;
      font-size:inherit; font-family:inherit; font-weight:inherit;
      font-variant-numeric:tabular-nums;
    }
    .od-flap-flip--top .od-flap-flip-inner{
      /* 翻盖在 card 上半区域，显示数字"上半"——内层 200% 高度从 0 开始向下延展，内部数字垂直居中，正好上半可见 */
      top:0;
    }
    .od-flap-flip--bottom .od-flap-flip-inner{
      /* 翻盖在 card 下半区域，显示数字"下半"——内层 200% 高度从底部向上延展 */
      bottom:0;
    }
    .od-flap-flip-shadow{
      position:absolute; inset:0; pointer-events:none;
      background:linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,0));
    }
    .od-flap-flip--bottom .od-flap-flip-shadow{
      background:linear-gradient(0deg, rgba(0,0,0,.55), rgba(0,0,0,0));
    }
    .od-flap-comma{
      display:inline-flex; align-items:flex-end; justify-content:center;
      font-family:"Playfair Display","Bodoni Moda","Noto Serif SC",serif;
      font-weight:700;
      font-size:clamp(64px, 9vw, 152px);
      line-height:1;
      color:rgba(245,241,230,.55);
      width:clamp(22px, 2.6vw, 40px);
      padding-bottom:clamp(8px, 1.4vw, 22px);
      user-select:none;
    }
    /* —— 文案 —— */
    .od-numberroll-copy{
      position:relative; z-index:4;
      display:flex; flex-direction:column; align-items:center; gap:22px;
      text-align:center; max-width:min(920px, 84vw);
    }
    .od-numberroll-copy-main{
      min-height:1.6em;
      font-family:var(--sans); font-size:clamp(17px, 1.55vw, 24px);
      line-height:1.5; color:rgba(245,241,230,.8);
      letter-spacing:.02em; font-weight:300;
    }
    .od-numberroll-caret{
      display:inline-block; margin-left:2px; color:rgba(255,85,127,.7);
      animation:numberCaret 0.9s steps(2) infinite;
    }
    @keyframes numberCaret{
      0%,50%{opacity:1}
      50.01%,100%{opacity:0}
    }
    .od-numberroll-copy-sub{
      font-family:var(--serif); font-size:clamp(22px, 2.2vw, 34px); font-weight:700;
      color:#f5f1e6; letter-spacing:.04em; line-height:1.4;
      opacity:0; transform:translateY(8px);
      transition:opacity .9s ease, transform .9s ease;
    }
    .od-numberroll-copy-sub.is-visible{opacity:1; transform:none}
    /* —— 卫星指标 —— */
    .od-numberroll-satellites{
      position:relative; z-index:4;
      width:min(720px, calc(100vw - 96px));
      display:flex; justify-content:space-between; align-items:flex-start;
      gap:28px;
    }
    .od-numberroll-satellite{
      flex:1 1 0; min-width:0;
      display:flex; flex-direction:column; align-items:center; gap:10px;
      opacity:0; transform:translateY(14px);
      transition:opacity .55s ease, transform .55s ease;
    }
    .od-numberroll-satellite.is-visible{opacity:1; transform:none}
    .od-numberroll-satellite-label{
      font-family:var(--mono); font-size:10px; letter-spacing:.2em;
      color:rgba(255,255,255,.58); text-transform:uppercase;
      white-space:nowrap;
    }
    .od-numberroll-satellite-value{
      font-family:var(--serif); font-size:clamp(30px, 3vw, 40px);
      font-weight:700; line-height:1;
      color:rgba(245,241,230,.88);
      font-variant-numeric:tabular-nums;
      white-space:nowrap;
      display:inline-flex; align-items:baseline; gap:2px;
    }
    .od-numberroll-satellite-suffix{
      font-size:.62em; font-weight:400;
      color:rgba(245,241,230,.55);
      letter-spacing:.02em;
    }
    .od-dormancy{
      position:relative; width:100%; height:100%; overflow:hidden;
      background:
        radial-gradient(900px 560px at 80% 14%, rgba(255,85,127,.08), transparent 62%),
        linear-gradient(180deg, #07050d 0%, #0a0812 52%, #07050d 100%);
    }
    .od-dormancy::before{
      content:""; position:absolute; inset:0; pointer-events:none;
      background:linear-gradient(180deg, rgba(255,255,255,.015), transparent 16%, transparent 84%, rgba(255,255,255,.015));
      opacity:.48;
    }
    .od-dormancy-topline{
      position:absolute; left:154px; right:420px; top:18px;
      display:flex; flex-direction:column; align-items:flex-start; gap:6px; z-index:6;
    }
    .od-dormancy-headRow{
      display:flex; align-items:baseline; gap:18px; width:100%; white-space:nowrap;
    }
    .od-dormancy-layout{
      position:absolute; inset:0;
      padding:96px 40px 86px 40px;
      display:grid; grid-template-columns:minmax(0, 1fr) 428px;
      gap:30px; align-items:stretch;
    }
    .od-dormancy-side{position:relative; z-index:4; min-width:0}
    .od-dormancy-kicker{
      flex:0 0 auto;
      font-family:var(--mono); font-size:11px; letter-spacing:.18em;
      color:rgba(245,241,230,.46); text-transform:uppercase;
    }
    .od-dormancy-title{
      margin:0;
      flex:0 0 auto;
      font-family:var(--serif); font-size:clamp(21px, 1.85vw, 28px);
      line-height:1; letter-spacing:-.03em; color:var(--ink); white-space:nowrap;
    }
    .od-dormancy-subtitle{
      margin:0;
      min-width:0;
      font-family:var(--sans); font-size:clamp(12px, .94vw, 14px);
      line-height:1.45; color:rgba(245,241,230,.72);
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    .od-dormancy-main{position:relative; z-index:5; min-width:0; display:flex; flex-direction:column; min-height:0}
    .od-dormancy-chartHeader{
      display:flex; justify-content:space-between; align-items:center; gap:18px;
      margin-bottom:6px;
    }
    .od-dormancy-question{
      font-family:var(--sans); font-size:13px; line-height:1.45;
      color:rgba(245,241,230,.74);
    }
    .od-dormancy-legend{
      display:flex; flex-wrap:wrap; gap:14px;
      font-family:var(--mono); font-size:10px; letter-spacing:.1em;
      color:rgba(245,241,230,.72); text-transform:uppercase;
    }
    .od-dormancy-legend span{display:inline-flex; align-items:center; gap:8px}
    .od-dormancy-legend i{width:10px; height:10px; border-radius:999px; display:inline-block}
    .od-dormancy-legend .is-release{background:var(--pink)}
    .od-dormancy-legend .is-instant{background:rgba(115,214,255,.96)}
    .od-dormancy-legend .is-mid{background:rgba(244,237,225,.92)}
    .od-dormancy-legend .is-late{background:rgba(255,85,127,.92)}
    .od-dormancy-chartShell{
      --label-w:84px;
      position:relative; flex:1 1 auto; height:auto; min-height:0;
      padding:26px 14px 10px 0;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(10,8,16,.22);
      box-shadow:0 20px 54px rgba(0,0,0,.16);
    }
    .od-dormancy-axisTop{
      position:absolute; top:12px; left:0; right:16px;
      display:grid; grid-template-columns:var(--label-w) 1fr; align-items:center;
    }
    .od-dormancy-axisLabels{
      position:relative; height:16px;
      font-family:var(--mono); font-size:12px; letter-spacing:.14em;
      color:rgba(245,241,230,.56);
    }
    .od-dormancy-axisLabel{
      position:absolute; top:0; transform:translateX(-50%); white-space:nowrap;
    }
    .od-dormancy-plot{position:relative; height:100%}
    .od-dormancy-guides{
      position:absolute; top:0; bottom:0; left:var(--label-w); right:16px;
      pointer-events:none;
    }
    .od-dormancy-guide{
      position:absolute; top:0; bottom:0; width:1px; background:rgba(255,255,255,.055);
    }
    .od-dormancy-chart{
      position:relative; z-index:2; height:100%; display:grid; gap:1px;
    }
    .od-dormancy-row{
      display:grid; grid-template-columns:var(--label-w) minmax(0, 1fr);
      align-items:center; min-height:0; text-align:left;
      opacity:.26; transition:opacity .22s ease;
    }
    .od-dormancy-row.is-active{opacity:1}
    .od-dormancy-song{
      display:block; padding-right:10px;
      font-family:var(--serif); font-size:clamp(11px, .74vw, 13px); line-height:1.08;
      color:rgba(245,241,230,.96); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    .od-dormancy-track{position:relative; display:block; height:100%}
    .od-dormancy-line{
      position:absolute; left:0; right:0; top:50%; height:1px;
      background:rgba(255,255,255,.08); transform:translateY(-50%);
    }
    .od-dormancy-span{
      position:absolute; top:50%; height:2px; border-radius:999px;
      transform:translateY(-50%); opacity:.8;
    }
    .od-dormancy-span.is-instant{background:rgba(115,214,255,.9)}
    .od-dormancy-span.is-mid{background:rgba(244,237,225,.84)}
    .od-dormancy-span.is-late{background:rgba(255,85,127,.86)}
    .od-dormancy-release{
      position:absolute; top:50%; width:8px; height:8px; border-radius:999px;
      background:var(--pink); transform:translate(-50%, -50%);
      box-shadow:0 0 0 1px rgba(255,255,255,.08);
    }
    .od-dormancy-dot{
      position:absolute; top:50%; border-radius:999px; transform:translate(-50%, -50%);
      border:0; padding:0; cursor:pointer;
      box-shadow:0 0 0 1px rgba(255,255,255,.08);
      transition:transform .22s ease, box-shadow .22s ease, filter .22s ease;
    }
    .od-dormancy-dot:focus-visible{outline:none}
    .od-dormancy-dot.is-instant{background:rgba(115,214,255,.96)}
    .od-dormancy-dot.is-mid{background:rgba(244,237,225,.94)}
    .od-dormancy-dot.is-late{background:rgba(255,85,127,.94)}
    .od-dormancy-row.is-active .od-dormancy-dot{
      transform:translate(-50%, -50%) scale(1.08);
      box-shadow:0 0 0 1px rgba(255,255,255,.1), 0 0 22px rgba(255,255,255,.12);
    }
    .od-dormancy-row.is-active .od-dormancy-dot.is-late{
      box-shadow:0 0 0 1px rgba(255,255,255,.1), 0 0 28px rgba(255,85,127,.26);
    }
    .od-dormancy-delayTag{
      position:absolute; top:50%; transform:translateY(-50%);
      padding:3px 7px; border-radius:999px;
      font-family:var(--mono); font-size:10px; letter-spacing:.08em;
      background:rgba(10,8,16,.86); border:1px solid rgba(255,255,255,.08);
      color:rgba(245,241,230,.82); white-space:nowrap;
    }
    .od-dormancy-delayTag.is-late{color:rgba(255,175,196,.98)}
    .od-dormancy-delayTag.is-instant{color:rgba(162,224,255,.96)}
    .od-dormancy-side--right{
      z-index:4;
      display:grid;
      grid-template-rows:minmax(0, 1fr) auto;
      gap:14px;
      min-height:0;
    }
    .od-dormancy-card{
      position:relative; overflow:hidden;
      padding:24px 28px;
      border:1px solid rgba(255,255,255,.06);
      background:rgba(12,10,18,.46);
      box-shadow:0 16px 42px rgba(0,0,0,.14);
      height:100%; min-height:0;
    }
    .od-dormancy-card::before{
      content:""; position:absolute; left:0; top:0; bottom:0; width:3px;
      background:linear-gradient(180deg, rgba(255,85,127,.98), rgba(255,85,127,.28));
      opacity:.92;
    }
    .od-dormancy-cardRipple{
      position:absolute; inset:auto; left:18%; top:18%; width:220px; height:220px; border-radius:999px;
      opacity:0; pointer-events:none; filter:blur(2px);
      animation:dormancyCardRipple .72s ease-out forwards;
    }
    .od-dormancy-cardRipple.is-instant{background:radial-gradient(circle, rgba(115,214,255,.22) 0%, rgba(115,214,255,.08) 34%, transparent 68%)}
    .od-dormancy-cardRipple.is-mid{background:radial-gradient(circle, rgba(244,237,225,.18) 0%, rgba(244,237,225,.06) 34%, transparent 68%)}
    .od-dormancy-cardRipple.is-late{background:radial-gradient(circle, rgba(255,85,127,.2) 0%, rgba(255,85,127,.08) 34%, transparent 68%)}
    .od-dormancy-cardSwap{
      position:relative; z-index:1; height:100%; display:flex; flex-direction:column; min-height:0;
      animation:dormancyDetailSwap .2s ease both;
    }
    .od-dormancy-cardLabel,
    .od-dormancy-summaryLabel{
      font-family:var(--mono); font-size:10px; letter-spacing:.16em;
      color:rgba(245,241,230,.45); text-transform:uppercase;
    }
    .od-dormancy-cardTop{
      margin-top:14px;
      display:grid; grid-template-columns:minmax(0, 1fr) 144px; gap:16px; align-items:start;
    }
    .od-dormancy-cardMain{min-width:0}
    .od-dormancy-cardKicker{
      font-family:var(--mono); font-size:10px; letter-spacing:.16em;
      color:rgba(245,241,230,.44); text-transform:uppercase;
    }
    .od-dormancy-cardTitle{
      margin:10px 0 0; font-family:var(--serif); font-size:clamp(32px, 2.65vw, 48px);
      font-weight:900; line-height:1.05; letter-spacing:-.04em; color:var(--ink);
    }
    .od-dormancy-cardYears{
      margin-top:14px;
      font-family:var(--mono); font-size:16px; line-height:1.4;
      color:rgba(245,241,230,.86); font-variant-numeric:tabular-nums;
    }
    .od-dormancy-cardMetrics{
      margin-top:16px; display:grid; gap:10px;
    }
    .od-dormancy-cardMetric{
      display:flex; justify-content:space-between; align-items:center; gap:12px;
    }
    .od-dormancy-cardMetric span{
      font-size:13px; color:rgba(245,241,230,.64);
    }
    .od-dormancy-cardMetric strong{
      margin-left:auto;
      font-family:var(--mono); font-size:18px; font-weight:500; line-height:1.3;
      color:rgba(245,241,230,.96); font-variant-numeric:tabular-nums; text-align:right;
    }
    .od-dormancy-cardMetric strong.is-instant,
    .od-dormancy-cardMetric strong.is-mid,
    .od-dormancy-cardMetric strong.is-late{
      font-size:18px;
    }
    .od-dormancy-cardMetric strong.is-instant{color:rgba(115,214,255,.98)}
    .od-dormancy-cardMetric strong.is-mid{color:rgba(244,237,225,.98)}
    .od-dormancy-cardMetric strong.is-late{color:rgba(255,125,160,.98)}
    .od-dormancy-coverWrap{
      width:144px; aspect-ratio:1 / 1; border:1px solid rgba(255,255,255,.1);
      background:rgba(255,255,255,.03); overflow:hidden; align-self:start; opacity:.9;
    }
    .od-dormancy-cover,
    .od-dormancy-coverFallback{
      width:100%; height:100%; display:block;
    }
    .od-dormancy-cover{object-fit:cover}
    .od-dormancy-coverFallback{
      display:flex; align-items:center; justify-content:center;
      font-family:var(--mono); font-size:12px; color:rgba(245,241,230,.38);
    }
    .od-dormancy-cardBody{
      margin-top:16px; padding-top:14px; border-top:1px solid rgba(255,255,255,.08);
      flex:0 0 auto; min-height:0; display:flex; flex-direction:column;
    }
    .od-dormancy-cardExcerptLabel{
      font-family:var(--mono); font-size:10px; letter-spacing:.16em;
      color:rgba(245,241,230,.42); text-transform:uppercase;
    }
    .od-dormancy-cardExcerpt{
      margin:12px 0 0; font-family:var(--serif);
      color:rgba(245,241,230,.96); white-space:pre-wrap; text-wrap:pretty; overflow-wrap:anywhere;
      font-size:17px; line-height:1.55;
    }
    .od-dormancy-summaryBlock{
      padding:16px 20px; border:1px solid rgba(255,255,255,.06);
      background:rgba(12,10,18,.46);
      min-height:0; display:flex; flex-direction:column; gap:8px;
    }
    .od-dormancy-summaryNarrative{
      display:grid; gap:6px;
    }
    .od-dormancy-summaryNarrative p{
      margin:0;
      font-family:var(--serif); font-size:clamp(19px, 1.45vw, 28px);
      line-height:1.5; color:rgba(245,241,230,.96);
    }
    .od-dormancy-summaryNarrative strong{
      color:var(--ink);
      font-weight:900;
    }
    @keyframes dormancyCardRipple{
      0%{opacity:0; transform:scale(.45)}
      24%{opacity:.9}
      100%{opacity:0; transform:scale(1.65)}
    }
    @keyframes dormancyDetailSwap{
      0%{opacity:0; transform:translateY(8px)}
      100%{opacity:1; transform:translateY(0)}
    }
    .od-constellation{
      position:relative; width:100%; height:100%; overflow:hidden;
      background:
        radial-gradient(1000px 720px at 18% 14%, rgba(127,102,255,.10), transparent 65%),
        radial-gradient(920px 680px at 82% 18%, rgba(115,214,255,.08), transparent 68%),
        radial-gradient(900px 660px at 52% 78%, rgba(255,85,127,.06), transparent 72%),
        linear-gradient(180deg, #080611 0%, #050309 56%, #040208 100%);
    }
    .od-constellation::before{
      content:""; position:absolute; inset:0; pointer-events:none;
      background:
        radial-gradient(circle at 50% 24%, rgba(255,255,255,.025), transparent 42%),
        linear-gradient(180deg, rgba(255,255,255,.02), transparent 26%, transparent 74%, rgba(255,255,255,.018));
      opacity:.8;
    }
    .od-constellation-world{
      position:relative; width:100%; height:100%;
      transition:filter .32s ease, opacity .32s ease;
    }
    .od-constellation-world.is-muted{
      filter:blur(10px) brightness(.42);
    }
    .od-constellation-lamp{
      position:absolute; left:23vw; top:0; z-index:7; pointer-events:none;
      transform:translateX(-50%);
    }
    .od-constellation-lampStem{
      width:2px; height:88px; margin:0 auto;
      background:linear-gradient(180deg, rgba(245,241,230,.08), rgba(245,241,230,.38));
    }
    .od-constellation-lampShade{
      width:92px; height:28px; margin:0 auto;
      border-radius:999px 999px 18px 18px / 100% 100% 22px 22px;
      background:linear-gradient(180deg, rgba(245,241,230,.18), rgba(245,241,230,.05));
      border:1px solid rgba(245,241,230,.14);
      box-shadow:0 8px 18px rgba(0,0,0,.24);
    }
    .od-constellation-lampGlow{
      position:absolute; left:50%; top:96px; transform:translateX(-50%);
      width:420px; height:360px;
      background:
        radial-gradient(ellipse at 50% 0%, rgba(255,235,196,.26), rgba(255,194,118,.08) 42%, transparent 72%);
      filter:blur(12px);
      opacity:0;
      transition:opacity .32s ease;
    }
    .od-constellation-lamp.is-on .od-constellation-lampGlow{opacity:1}
    .od-constellation-lampCord{
      position:absolute; left:23vw; top:88px; z-index:9;
      transform:translateX(-50%);
      width:24px; height:112px; padding:0;
      appearance:none; border:0; background:none; cursor:pointer;
    }
    .od-constellation-lampCordLine{
      position:absolute; left:50%; top:0; transform:translateX(-50%);
      width:2px; height:92px;
      background:linear-gradient(180deg, rgba(245,241,230,.08), rgba(245,241,230,.52));
    }
    .od-constellation-lampCordKnob{
      position:absolute; left:50%; top:88px; transform:translateX(-50%);
      width:14px; height:14px; border-radius:999px;
      border:1px solid rgba(245,241,230,.42);
      background:radial-gradient(circle at 35% 35%, rgba(255,255,255,.3), rgba(245,241,230,.08));
      box-shadow:0 4px 12px rgba(0,0,0,.3);
    }
    .od-constellation-lampCord.is-pulling{
      animation:constellationCordPull .52s cubic-bezier(.22,.9,.28,1) both;
    }
    .od-constellation-titleBlock{
      position:absolute; left:clamp(28px, 4vw, 64px); top:clamp(118px, 18vh, 182px);
      z-index:8; width:min(27vw, 420px);
    }
    .od-constellation-kicker{
      font-family:var(--mono); font-size:11px; letter-spacing:.18em;
      text-transform:uppercase; color:rgba(245,241,230,.48);
    }
    .od-constellation-title{
      margin:14px 0 0;
      font-family:var(--serif); font-size:clamp(42px, 4.4vw, 76px);
      line-height:.96; letter-spacing:-.05em;
      color:rgba(245,241,230,.95);
      text-shadow:0 0 28px rgba(255,255,255,.05);
    }
    .od-constellation-titleSub{
      margin:14px 0 0; max-width:18ch;
      font-family:var(--serif); font-size:clamp(14px, 1.08vw, 17px);
      line-height:1.65; color:rgba(245,241,230,.62);
    }
    .od-constellation-note{
      position:absolute; right:clamp(28px, 4vw, 64px); top:clamp(108px, 16vh, 156px);
      z-index:8; display:grid; gap:6px; justify-items:end;
      text-align:right; pointer-events:none;
      font-family:var(--serif); font-size:clamp(14px, 1.12vw, 18px);
      line-height:1.55; color:rgba(245,241,230,.62);
    }
    .od-constellation-axisWrap{
      position:absolute; left:80px; right:80px; top:78%;
      z-index:3; pointer-events:none;
    }
    .od-constellation-axisLine{
      height:1px; width:0;
      border-top:1px dashed rgba(245,241,230,.08);
      transform-origin:left center;
      transition:width 1s cubic-bezier(.22,.82,.18,1) .4s;
    }
    .od-constellation.is-entered .od-constellation-axisLine{width:100%}
    .od-constellation-years{
      position:relative; height:24px;
    }
    .od-constellation-year{
      position:absolute; top:10px; transform:translateX(-50%) translateY(6px);
      opacity:0;
      font-family:var(--mono); font-size:11px; letter-spacing:.16em;
      color:rgba(245,241,230,.4);
      transition:opacity .42s ease, transform .42s ease;
    }
    .od-constellation.is-entered .od-constellation-year{
      opacity:1; transform:translateX(-50%) translateY(0);
    }
    .od-constellation-field{
      position:absolute; inset:0;
      z-index:5;
    }
    .od-constellation-node{
      position:absolute; margin:0; padding:0; border:0; background:none;
      transform:translate(-50%, -50%); cursor:pointer;
      opacity:0;
      transition:transform .28s ease, opacity .28s ease, filter .28s ease;
    }
    .od-constellation.is-entered .od-constellation-node{
      animation:constellationNodeDrop .9s cubic-bezier(.34,1.56,.64,1) both;
      animation-delay:var(--enter-delay);
    }
    .od-constellation-node.is-dimmed{
      opacity:.2 !important;
      filter:saturate(.35) brightness(.7);
    }
    .od-constellation-node.is-active{
      z-index:9;
      transform:translate(-50%, -50%) scale(1.4);
    }
    .od-constellation-disc{
      position:relative; display:block; width:100%; height:100%;
      border-radius:999px; overflow:hidden;
      border:1px solid var(--accent);
      background-position:center; background-size:cover; background-repeat:no-repeat;
      box-shadow:0 0 0 1px rgba(255,255,255,.04) inset;
      transition:transform .28s ease, filter .28s ease, border-color .28s ease, box-shadow .32s ease;
      animation:constellationNodeBreathe 3.5s ease-in-out infinite;
      animation-delay:var(--breath-delay);
    }
    .od-constellation-disc.is-fallback{
      background:
        radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--accent) 34%, rgba(255,255,255,.08)), transparent 36%),
        radial-gradient(circle at 50% 50%, rgba(255,255,255,.08), rgba(255,255,255,.02) 46%, rgba(255,255,255,.01) 56%, transparent 58%),
        repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,.05) 0 1px, transparent 1px 4px),
        radial-gradient(circle at 30% 30%, rgba(255,255,255,.06), transparent 45%),
        color-mix(in srgb, var(--accent) 18%, rgba(245,241,230,.08));
    }
    .od-constellation-discOverlay{
      position:absolute; inset:0;
      background:rgba(0,0,0,.45);
      transition:background .28s ease;
    }
    .od-constellation-node.is-active .od-constellation-discOverlay{
      background:rgba(0,0,0,.1);
    }
    .od-constellation-node.is-active .od-constellation-disc{
      border-width:2px;
      border-color:#fff;
      box-shadow:0 0 0 1px rgba(255,255,255,.16) inset, 0 0 28px rgba(255,255,255,.12);
    }
    .od-constellation-node.is-top .od-constellation-disc{
      border-width:2px;
      border-color:var(--pink);
      box-shadow:0 0 0 1px rgba(255,85,127,.18) inset, 0 0 28px rgba(255,85,127,.14);
      animation:
        constellationNodeBreathe 3.5s ease-in-out infinite,
        constellationTopGlow 4s ease-in-out infinite;
      animation-delay:var(--breath-delay), var(--glow-delay);
    }
    .od-constellation-nodeTitle,
    .od-constellation-nodeYear{
      position:absolute; left:50%; transform:translateX(-50%);
      white-space:nowrap; pointer-events:none;
      transition:opacity .24s ease, color .24s ease, transform .24s ease, font-size .24s ease;
    }
    .od-constellation-nodeTitle{
      bottom:calc(100% + 6px);
      font-family:var(--serif); font-size:13px;
      color:rgba(245,241,230,.12);
      opacity:0;
      letter-spacing:.01em;
    }
    .od-constellation-node.show-label .od-constellation-nodeTitle{
      opacity:.92; color:rgba(245,241,230,.85);
    }
    .od-constellation-nodeYear{
      top:calc(100% + 6px);
      font-family:var(--mono); font-size:10px; letter-spacing:.08em;
      color:rgba(245,241,230,.4);
      opacity:0;
    }
    .od-constellation-node.show-label .od-constellation-nodeYear{opacity:1}
    .od-constellation-node.is-active .od-constellation-nodeTitle{
      font-size:18px; color:#fff; transform:translateX(-50%) translateY(-2px);
    }
    .od-constellation-focusLine{
      position:absolute; z-index:4; width:1px;
      transform:translateX(-50%);
      border-left:1px dashed rgba(245,241,230,.3);
      pointer-events:none;
    }
    .od-constellation-popup{
      position:absolute; z-index:11; width:280px;
      padding:18px 18px 16px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(8,6,16,.86);
      backdrop-filter:blur(18px);
      box-shadow:0 24px 60px rgba(0,0,0,.34);
      pointer-events:none;
      animation:constellationPopupFade .22s ease both;
    }
    .od-constellation-popupHead{
      display:flex; align-items:flex-end; justify-content:space-between; gap:14px;
    }
    .od-constellation-popupTitle{
      font-family:var(--serif); font-size:22px; line-height:1.18;
      letter-spacing:-.03em; color:rgba(245,241,230,.98);
    }
    .od-constellation-popupYear,
    .od-constellation-popupAlbum,
    .od-constellation-popupMeta{
      font-family:var(--mono);
    }
    .od-constellation-popupYear{
      font-size:11px; letter-spacing:.12em; color:rgba(245,241,230,.42);
    }
    .od-constellation-popupAlbum{
      margin-top:8px; font-size:11px; letter-spacing:.12em;
      color:rgba(245,241,230,.42); text-transform:uppercase;
    }
    .od-constellation-popupRule,
    .od-constellation-detailRule{
      margin-top:12px; height:1px; background:rgba(255,255,255,.1);
    }
    .od-constellation-popupQuote{
      margin-top:12px;
      font-family:var(--serif); font-size:14px; line-height:1.7;
      color:rgba(245,241,230,.88);
    }
    .od-constellation-popupMeta{
      margin-top:12px;
      display:flex; align-items:center; justify-content:space-between; gap:12px;
      font-size:10px; letter-spacing:.12em; color:rgba(245,241,230,.42);
      text-transform:uppercase;
    }
    .od-constellation-popupMeta.is-alone{justify-content:flex-start}
    .od-constellation-tool{
      position:absolute; right:32px; bottom:80px; z-index:12;
      display:flex; align-items:center; gap:10px;
      appearance:none; border:0; background:none; padding:0;
      color:rgba(245,241,230,.42); cursor:pointer;
      font-family:var(--mono); font-size:10px; letter-spacing:.12em;
      text-transform:uppercase;
      transition:color .24s ease, transform .24s ease;
    }
    .od-constellation-tool:hover{
      color:rgba(245,241,230,.76);
      transform:translateY(-1px);
    }
    .od-constellation-tool.is-active{color:rgba(245,241,230,.9)}
    .od-constellation-toolIcon{
      width:14px; height:14px; border-radius:999px; display:block;
      border:1px solid currentColor;
      box-shadow:0 0 0 1px rgba(255,255,255,.04) inset, 0 0 18px rgba(245,241,230,.08);
      background:radial-gradient(circle at 50% 50%, rgba(245,241,230,.85), rgba(245,241,230,.02) 68%, transparent 72%);
    }
    .od-constellation-toolLabel{display:block}
    .od-constellation-torchmask{
      position:absolute; inset:0; z-index:10; pointer-events:none;
    }
    .od-constellation-detailBackdrop{
      position:absolute; inset:0; z-index:18;
      display:grid; place-items:center;
      background:rgba(0,0,0,.58);
      backdrop-filter:blur(3px);
      padding:32px;
    }
    .od-constellation-detailCard{
      position:relative; width:min(540px, 90vw);
      max-height:min(82vh, 760px); overflow:auto;
      padding:28px 28px 26px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(10,8,18,.94);
      box-shadow:0 40px 90px rgba(0,0,0,.44);
    }
    .od-constellation-detailClose{
      position:absolute; right:14px; top:10px;
      appearance:none; border:0; background:none; padding:6px;
      color:rgba(245,241,230,.54); cursor:pointer;
      font-family:var(--serif); font-size:28px; line-height:1;
    }
    .od-constellation-detailHead{
      display:grid; grid-template-columns:80px minmax(0,1fr); gap:18px; align-items:center;
    }
    .od-constellation-detailCoverWrap{
      width:80px; height:80px; border-radius:4px; overflow:hidden;
      background:rgba(255,255,255,.04);
    }
    .od-constellation-detailCover,
    .od-constellation-detailFallback{
      width:100%; height:100%; display:block;
    }
    .od-constellation-detailCover{object-fit:cover}
    .od-constellation-detailFallback{
      background:
        repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,.08) 0 1px, transparent 1px 4px),
        radial-gradient(circle at 30% 30%, rgba(255,255,255,.08), transparent 45%),
        rgba(245,241,230,.04);
    }
    .od-constellation-detailTitle{
      font-family:var(--serif); font-size:clamp(28px, 3vw, 32px);
      line-height:1.08; letter-spacing:-.04em;
      color:rgba(245,241,230,.98);
    }
    .od-constellation-detailTopline,
    .od-constellation-detailStats,
    .od-constellation-detailCommentMeta{
      font-family:var(--mono); letter-spacing:.12em;
    }
    .od-constellation-detailTopline{
      margin-top:10px; display:flex; flex-wrap:wrap; gap:10px 16px;
      font-size:11px; color:rgba(245,241,230,.45); text-transform:uppercase;
    }
    .od-constellation-detailStats{
      margin-top:10px; font-size:11px; color:rgba(245,241,230,.56);
      text-transform:uppercase;
    }
    .od-constellation-detailComments{
      margin-top:18px; display:grid; gap:18px;
    }
    .od-constellation-detailComment{
      padding:14px 0 0; border-top:1px solid rgba(255,255,255,.08);
    }
    .od-constellation-detailComment:first-child{
      padding-top:0; border-top:0;
    }
    .od-constellation-detailCommentBody{
      font-family:var(--serif); font-size:15px; line-height:1.78;
      color:rgba(245,241,230,.92);
    }
    .od-constellation-detailCommentMeta{
      margin-top:10px;
      display:flex; justify-content:space-between; gap:12px;
      font-size:10px; color:rgba(245,241,230,.42); text-transform:uppercase;
    }
    @keyframes constellationNodeDrop{
      0%{opacity:0; transform:translate(-50%, calc(-50% - var(--drop-offset))) scale(.82)}
      100%{opacity:1; transform:translate(-50%, -50%) scale(1)}
    }
    @keyframes constellationNodeBreathe{
      0%,100%{transform:scale(1)}
      50%{transform:scale(1.04)}
    }
    @keyframes constellationTopGlow{
      0%,100%{box-shadow:0 0 0 1px rgba(255,85,127,.18) inset, 0 0 22px rgba(255,85,127,.12)}
      50%{box-shadow:0 0 0 1px rgba(255,85,127,.26) inset, 0 0 34px rgba(255,85,127,.24)}
    }
    @keyframes constellationCordPull{
      0%{transform:translateX(-50%) translateY(0)}
      32%{transform:translateX(-50%) translateY(16px)}
      68%{transform:translateX(-50%) translateY(4px)}
      100%{transform:translateX(-50%) translateY(0)}
    }
    @keyframes constellationPopupFade{
      0%{opacity:0; transform:translateY(8px)}
      100%{opacity:1; transform:translateY(0)}
    }
    .od-sceneHead{
      position:absolute; left:clamp(28px, 4vw, 64px); top:clamp(90px, 12vh, 136px);
      z-index:8; width:min(34vw, 470px);
    }
    .od-sceneKicker{
      font-family:var(--mono); font-size:11px; letter-spacing:.18em;
      text-transform:uppercase; color:rgba(245,241,230,.46);
    }
    .od-sceneTitle{
      margin:14px 0 0;
      font-family:var(--serif); font-size:clamp(36px, 4vw, 64px);
      line-height:.98; letter-spacing:-.05em;
      color:rgba(245,241,230,.96);
    }
    .od-sceneCopy{
      margin:14px 0 0;
      font-family:var(--serif); font-size:clamp(15px, 1.1vw, 18px);
      line-height:1.75; color:rgba(245,241,230,.62);
    }
    .od-hourly,.od-recurring,.od-evidence,.od-language,.od-longcomment,.od-emigration,.od-themejourney,.od-datewall,.od-dustscene,.od-finale{
      position:relative; width:100%; height:100%; overflow:hidden;
      background:
        radial-gradient(1000px 700px at 15% 20%, rgba(170,149,255,.09), transparent 62%),
        radial-gradient(980px 740px at 82% 78%, rgba(255,85,127,.08), transparent 68%),
        linear-gradient(180deg, rgba(10,8,18,.92), rgba(5,3,9,.98));
    }
    .od-hourly::before,.od-recurring::before,.od-evidence::before,.od-language::before,.od-longcomment::before,.od-emigration::before,.od-themejourney::before,.od-datewall::before,.od-dustscene::before,.od-finale::before{
      content:""; position:absolute; inset:0; pointer-events:none;
      background:linear-gradient(180deg, rgba(255,255,255,.02), transparent 28%, transparent 72%, rgba(255,255,255,.018));
    }
    .od-hourlyDial{
      position:absolute; left:16%; top:52%; transform:translate(-50%, -50%);
      width:300px; height:300px; border-radius:50%;
      border:1px solid rgba(255,255,255,.08);
      background:radial-gradient(circle at 50% 50%, rgba(245,241,230,.04), rgba(255,255,255,.01));
      box-shadow:0 0 0 1px rgba(255,255,255,.03) inset, 0 24px 60px rgba(0,0,0,.28);
    }
    .od-hourlyDialFace,.od-hourlyDialCenter,.od-hourlyDialHand{position:absolute}
    .od-hourlyDialFace{inset:16px; border-radius:50%; border:1px dashed rgba(245,241,230,.12)}
    .od-hourlyDialHand{
      left:50%; top:50%; width:2px; height:112px; transform-origin:bottom center;
      background:linear-gradient(180deg, rgba(255,85,127,.92), rgba(255,85,127,.12));
      box-shadow:0 0 16px rgba(255,85,127,.22);
    }
    .od-hourlyDialCenter{
      left:50%; top:50%; width:14px; height:14px; transform:translate(-50%, -50%);
      border-radius:50%; background:var(--pink);
      box-shadow:0 0 18px rgba(255,85,127,.28);
    }
    .od-hourlyDialHour,.od-hourlyDialCount{
      position:absolute; left:50%; transform:translateX(-50%); text-align:center;
    }
    .od-hourlyDialHour{
      bottom:98px; font-family:var(--serif); font-size:42px; letter-spacing:-.04em;
    }
    .od-hourlyDialCount{
      bottom:62px; font-family:var(--mono); font-size:11px; letter-spacing:.14em; color:rgba(245,241,230,.45);
    }
    .od-hourlySample{
      position:absolute; right:clamp(38px, 5vw, 78px); top:16vh; width:min(40vw, 600px);
      max-height:calc(100vh - 300px); overflow:hidden; padding:24px 24px 22px; z-index:7;
      border:1px solid rgba(255,255,255,.08); background:rgba(8,6,16,.7); backdrop-filter:blur(16px);
    }
    .od-hourlySampleLabel,.od-hourlySampleSong{
      font-family:var(--mono); letter-spacing:.14em; text-transform:uppercase;
    }
    .od-hourlySampleLabel{font-size:10px; color:rgba(245,241,230,.42)}
    .od-hourlySampleSong{margin-top:14px; font-size:11px; color:rgba(245,241,230,.52)}
    .od-hourlySample p{
      margin:14px 0 0; font-family:var(--serif); font-size:18px; line-height:1.8; color:rgba(245,241,230,.92);
    }
    .od-hourlyBars{
      position:absolute; left:25%; right:60px; bottom:82px; height:170px;
      display:grid; grid-template-columns:repeat(24,1fr); gap:10px; align-items:end;
    }
    .od-hourlyBar{
      appearance:none; border:0; background:none; padding:0; display:grid; gap:10px; align-items:end;
      color:rgba(245,241,230,.42); cursor:pointer;
    }
    .od-hourlyBarValue{
      display:block; width:100%; border-radius:999px 999px 0 0;
      background:linear-gradient(180deg, rgba(255,85,127,.85), rgba(115,214,255,.22));
      opacity:.28; transition:opacity .24s ease, transform .24s ease;
    }
    .od-hourlyBar.is-active .od-hourlyBarValue{opacity:1; transform:translateY(-6px)}
    .od-hourlyBarTick{font-family:var(--mono); font-size:10px; letter-spacing:.08em}
    .od-recurringHero{
      position:absolute; left:50%; top:32%; transform:translate(-50%, -50%);
      text-align:center; z-index:6;
    }
    .od-recurringCount{
      font-family:var(--mono); font-size:12px; letter-spacing:.2em; color:rgba(245,241,230,.42);
    }
    .od-recurringWord{
      margin-top:12px; font-family:var(--serif); font-size:clamp(40px, 5vw, 78px); letter-spacing:-.06em;
    }
    .od-recurringExamples{
      position:absolute; left:20%; right:20%; top:42%; display:flex; justify-content:center; gap:18px; z-index:5;
    }
    .od-recurringExample{
      width:min(18vw, 260px); padding:18px 18px 16px;
      border:1px solid rgba(255,255,255,.08); background:rgba(10,8,18,.68);
      backdrop-filter:blur(14px); box-shadow:0 16px 44px rgba(0,0,0,.24);
    }
    .od-recurringExampleSong{
      font-family:var(--mono); font-size:10px; letter-spacing:.14em; color:rgba(245,241,230,.42); text-transform:uppercase;
    }
    .od-recurringExample p{
      margin:12px 0 0; font-family:var(--serif); font-size:15px; line-height:1.7; color:rgba(245,241,230,.9);
    }
    .od-recurringRail{
      position:absolute; left:50%; bottom:96px; transform:translateX(-50%);
      width:min(1100px, calc(100vw - 120px)); display:flex; gap:10px; flex-wrap:wrap; justify-content:center;
    }
    .od-recurringChip{
      appearance:none; border:1px solid rgba(255,255,255,.08); background:rgba(8,6,16,.56);
      color:rgba(245,241,230,.58); padding:10px 14px; border-radius:999px;
      display:flex; gap:10px; align-items:center;
      font-family:var(--mono); font-size:10px; letter-spacing:.12em; text-transform:uppercase;
    }
    .od-recurringChip strong{color:rgba(245,241,230,.94)}
    .od-recurringChip.is-active{background:rgba(255,85,127,.14); border-color:rgba(255,85,127,.24)}
    .od-evidenceWall{
      position:absolute; left:0; right:34%; top:0; bottom:0; z-index:4;
    }
    .od-evidenceCard{
      position:absolute; width:min(210px, 14vw); min-height:132px;
      appearance:none; border:1px solid rgba(255,255,255,.08); background:rgba(244,237,225,.92);
      color:#231f2b; padding:14px 14px 12px; text-align:left; box-shadow:0 16px 40px rgba(0,0,0,.24);
      transition:transform .24s ease, box-shadow .24s ease;
    }
    .od-evidenceCard.is-active{transform:scale(1.05) !important; box-shadow:0 22px 48px rgba(0,0,0,.32)}
    .od-evidenceCardSong,.od-evidenceCardMeta{
      font-family:var(--mono); font-size:10px; letter-spacing:.12em; text-transform:uppercase;
    }
    .od-evidenceCard p{
      margin:12px 0; font-family:var(--serif); font-size:14px; line-height:1.6;
    }
    .od-evidenceFocus{
      position:absolute; right:48px; top:24vh; width:min(30vw, 420px); z-index:7;
      padding:26px 24px 22px; border:1px solid rgba(255,255,255,.08);
      background:rgba(8,6,16,.76); backdrop-filter:blur(16px);
    }
    .od-evidenceFocusSong{font-family:var(--serif); font-size:28px; line-height:1.12}
    .od-evidenceFocusAlbum{margin-top:10px; font-family:var(--mono); font-size:10px; letter-spacing:.14em; color:rgba(245,241,230,.42)}
    .od-evidenceFocus p{margin:16px 0 0; font-family:var(--serif); font-size:17px; line-height:1.85; color:rgba(245,241,230,.9)}
    .od-evidenceFocusMeta{margin-top:14px; display:flex; justify-content:space-between; font-family:var(--mono); font-size:10px; letter-spacing:.12em; color:rgba(245,241,230,.42)}
    .od-languageColumns{
      position:absolute; left:6%; right:34%; top:28%; bottom:14%; display:grid; grid-template-columns:repeat(3,1fr); gap:18px;
    }
    .od-languageColumn{
      border:1px solid rgba(255,255,255,.06); background:rgba(8,6,16,.42); padding:18px 16px 20px;
    }
    .od-languageColumnHead{
      font-family:var(--mono); font-size:11px; letter-spacing:.18em; color:rgba(245,241,230,.42); text-transform:uppercase;
    }
    .od-languageCloud{margin-top:18px; display:flex; flex-wrap:wrap; gap:12px 10px; align-content:flex-start}
    .od-languageWord{
      appearance:none; border:0; background:none; padding:0; text-align:left; color:rgba(245,241,230,.58); cursor:pointer; font-family:var(--serif);
    }
    .od-languageWord.is-active{color:#fff; text-shadow:0 0 18px rgba(255,255,255,.14)}
    .od-languageFocus{
      position:absolute; right:48px; top:28%; width:min(28vw, 380px);
      padding:24px 24px 22px; border:1px solid rgba(255,255,255,.08); background:rgba(8,6,16,.76); backdrop-filter:blur(16px);
    }
    .od-languageFocusWord{font-family:var(--serif); font-size:42px; letter-spacing:-.05em}
    .od-languageFocusLabel{margin-top:10px; font-family:var(--mono); font-size:10px; letter-spacing:.14em; color:rgba(245,241,230,.42); text-transform:uppercase}
    .od-languageFocusList{margin-top:18px; display:grid; gap:10px}
    .od-languageFocusItem{display:flex; justify-content:space-between; gap:14px; font-family:var(--serif); font-size:16px}
    .od-languageFocusItem span:last-child{font-family:var(--mono); font-size:10px; color:rgba(245,241,230,.42); letter-spacing:.12em}
    .od-longcommentWall{
      position:absolute; inset:0; opacity:.12; pointer-events:none;
      font-family:var(--serif); font-size:12px; line-height:1.35;
    }
    .od-longcommentWall span{
      position:absolute; color:rgba(245,241,230,.72); max-width:160px; white-space:nowrap; overflow:hidden;
    }
    .od-longcommentCard{
      position:absolute; left:50%; top:54%; transform:translate(-50%, -50%);
      width:min(55vw, 780px); min-height:420px; padding:42px 46px 30px;
      background:rgba(244,237,225,.94); color:#241f2c; z-index:7; box-shadow:0 32px 80px rgba(0,0,0,.34);
    }
    .od-longcommentCardText{font-family:var(--serif); font-size:18px; line-height:1.9; white-space:pre-wrap}
    .od-longcommentCardSign{margin-top:22px; font-family:var(--hand); font-size:24px; color:#4b4058}
    .od-longcommentCardLine{margin-top:14px; font-family:var(--hand); font-size:28px; color:#705d73}
    .od-longcommentActions{position:absolute; right:24px; bottom:20px; display:flex; gap:10px}
    .od-longcommentActions button{
      appearance:none; border:1px solid rgba(36,31,44,.14); background:rgba(255,255,255,.54);
      padding:9px 12px; font-family:var(--mono); font-size:10px; letter-spacing:.12em; text-transform:uppercase;
    }
    .od-longcommentCardMetaTitle{font-family:var(--serif); font-size:32px}
    .od-longcommentStats{margin-top:24px; display:grid; grid-template-columns:repeat(3,1fr); gap:18px}
    .od-longcommentStats div{display:grid; gap:8px}
    .od-longcommentStats strong{font-family:var(--serif); font-size:28px}
    .od-longcommentStats span{font-family:var(--mono); font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:#6f6476}
    .od-longcommentCardBackCopy{margin-top:24px; font-family:var(--serif); font-size:18px; line-height:1.7}
    .od-emigrationStage{
      position:absolute; left:8%; right:32%; top:28%; bottom:12%;
    }
    .od-emigrationSvg{position:absolute; inset:0; width:100%; height:100%}
    .od-emigrationPath{fill:none; stroke:rgba(245,241,230,.26); transition:opacity .24s ease, stroke .24s ease}
    .od-emigrationPath.is-active{stroke:rgba(255,85,127,.86)}
    .od-emigrationPath.is-dimmed{opacity:.14}
    .od-emigrationColumn{
      position:absolute; top:0; transform:translateX(-50%); width:24%;
      display:grid; gap:10px;
    }
    .od-emigrationColumnLabel{
      margin-bottom:8px; font-family:var(--mono); font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:rgba(245,241,230,.42);
    }
    .od-emigrationTag{
      appearance:none; border:1px solid rgba(255,255,255,.08); background:rgba(8,6,16,.62);
      color:rgba(245,241,230,.72); padding:10px 12px; display:flex; justify-content:space-between; gap:10px;
      font-family:var(--mono); font-size:10px; letter-spacing:.12em; text-transform:uppercase;
    }
    .od-emigrationTag strong{color:#fff}
    .od-emigrationTag.is-active{border-color:rgba(255,85,127,.24); background:rgba(255,85,127,.12)}
    .od-emigrationPanel{
      position:absolute; right:48px; top:32%; width:min(26vw, 360px); padding:24px;
      border:1px solid rgba(255,255,255,.08); background:rgba(8,6,16,.76); backdrop-filter:blur(16px);
    }
    .od-emigrationPanelTitle{font-family:var(--serif); font-size:34px}
    .od-emigrationPanelFlow{margin-top:12px; font-family:var(--mono); font-size:11px; letter-spacing:.12em; color:rgba(245,241,230,.46); text-transform:uppercase}
    .od-emigrationPanel p{margin:16px 0 0; font-family:var(--serif); font-size:17px; line-height:1.8}
    .od-themePicker{
      position:absolute; left:50%; top:22%; transform:translateX(-50%);
      display:flex; gap:10px; flex-wrap:wrap; justify-content:center; width:min(960px, calc(100vw - 120px));
    }
    .od-themeChip{
      appearance:none; border:1px solid rgba(255,255,255,.08); background:rgba(8,6,16,.58);
      color:rgba(245,241,230,.62); padding:10px 14px; border-radius:999px; font-family:var(--mono); font-size:10px; letter-spacing:.12em; text-transform:uppercase;
    }
    .od-themeChip.is-active{background:rgba(115,214,255,.14); border-color:rgba(115,214,255,.24); color:#fff}
    .od-themeStage{
      position:absolute; left:8%; right:8%; top:34%; height:320px;
    }
    .od-themeSvg{width:100%; height:100%}
    .od-themeAxis{stroke:rgba(245,241,230,.14); stroke-width:1}
    .od-themePath{fill:none; stroke:rgba(115,214,255,.86); stroke-width:1.7; stroke-dasharray:1; stroke-dashoffset:1; animation:themePathDraw 1.1s ease forwards}
    .od-themePoint{fill:rgba(255,85,127,.92)}
    .od-themeSongRow{
      position:absolute; left:0; right:0; bottom:0; height:52px;
    }
    .od-themeSong{
      position:absolute; transform:translateX(-50%); width:72px; text-align:center; color:rgba(245,241,230,.28);
    }
    .od-themeSong span{display:block; font-family:var(--serif); font-size:12px; line-height:1.15}
    .od-themeSong em{display:block; margin-top:4px; font-style:normal; font-family:var(--mono); font-size:10px; color:rgba(245,241,230,.34)}
    .od-themeSong.is-active{color:#fff}
    .od-themeStory{
      position:absolute; left:50%; bottom:76px; transform:translateX(-50%); width:min(760px, calc(100vw - 120px)); text-align:center;
    }
    .od-themeStoryWord{font-family:var(--serif); font-size:34px}
    .od-themeStory p{margin:10px auto 0; max-width:34ch; font-family:var(--serif); font-size:18px; line-height:1.7; color:rgba(245,241,230,.76)}
    .od-dateWall{
      position:absolute; left:0; right:0; top:0; bottom:0; z-index:5;
    }
    .od-dateCard{
      position:absolute; width:min(230px, 15vw); appearance:none; border:1px solid rgba(255,255,255,.08);
      background:rgba(244,237,225,.94); color:#241f2c; text-align:left; padding:16px 16px 14px; box-shadow:0 18px 44px rgba(0,0,0,.26);
      opacity:0; transition:opacity .32s ease, transform .24s ease, box-shadow .24s ease;
    }
    .od-datewall.is-visible .od-dateCard{opacity:1}
    .od-dateCard:hover,
    .od-dateCard.is-active{
      transform:scale(1.04) rotate(0deg) !important; box-shadow:0 22px 50px rgba(0,0,0,.32);
    }
    .od-dateCardDate{font-family:var(--hand); font-size:30px; color:#6b5067}
    .od-dateCard p{margin:10px 0 12px; font-family:var(--serif); font-size:14px; line-height:1.65}
    .od-dateCardMeta{font-family:var(--mono); font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:#6f6476}
    .od-dustscene{background:linear-gradient(180deg, #040208, #090711 68%, #040208)}
    .od-dustsceneTopline{
      position:absolute; left:28px; top:84px; z-index:7; display:flex; align-items:center; gap:14px;
    }
    .od-dustsceneProgress{width:90px; height:1px; background:rgba(245,241,230,.16)}
    .od-dustsceneProgress span{display:block; height:100%; background:rgba(255,85,127,.82)}
    .od-dustsceneTime{font-family:var(--mono); font-size:10px; letter-spacing:.14em; color:rgba(245,241,230,.46)}
    .od-dustsceneCenter{
      position:absolute; left:50%; top:48%; transform:translate(-50%, -50%);
      width:420px; height:420px; display:grid; place-items:center;
    }
    .od-dustsceneHalo{position:absolute; inset:0; animation:dustSlowSpin 30s linear infinite}
    .od-dustsceneRay{
      position:absolute; left:50%; top:50%; width:2px; transform-origin:bottom center;
      background:linear-gradient(180deg, rgba(255,85,127,.06), rgba(255,85,127,.72), rgba(255,208,107,.18));
      border-radius:999px;
    }
    .od-dustsceneCoverWrap{
      position:relative; width:280px; height:280px; border-radius:12px; overflow:hidden;
      box-shadow:0 32px 90px rgba(0,0,0,.4); animation:dustSlowSpin 36s linear infinite reverse;
    }
    .od-dustsceneCover,.od-dustsceneCoverFallback{width:100%; height:100%; display:block}
    .od-dustsceneCover{object-fit:cover}
    .od-dustsceneCoverFallback{
      background:repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,.08) 0 1px, transparent 1px 5px), rgba(255,255,255,.04);
    }
    .od-dustsceneTitle{
      position:absolute; top:-14px; left:50%; transform:translateX(-50%);
      font-family:var(--hand); font-size:68px; color:rgba(245,241,230,.92);
    }
    .od-dustsceneSpectrum{
      position:absolute; left:28px; right:28px; bottom:90px; height:110px; display:flex; align-items:flex-end; gap:6px;
    }
    .od-dustsceneSpectrum span{
      flex:1; display:block; border-radius:999px 999px 0 0;
      background:linear-gradient(180deg, rgba(255,85,127,.92), rgba(255,153,102,.28));
    }
    .od-dustsceneControls{
      position:absolute; right:28px; top:82px; z-index:8;
    }
    .od-dustsceneControls button{
      appearance:none; width:38px; height:38px; border-radius:50%; border:1px solid rgba(255,255,255,.12);
      background:rgba(8,6,16,.58); color:#fff; font-size:15px;
    }
    .od-finale{
      background:#050309;
      cursor:default;
    }
    .od-finale::before{display:none}
    .od-finaleField{position:absolute; inset:0; z-index:4; overflow:hidden}
    .od-finalePhrase{
      position:absolute;
      left:var(--x);
      top:var(--y);
      width:var(--w);
      height:var(--h);
      display:flex;
      align-items:center;
      justify-content:center;
      font-family:var(--hand);
      font-size:var(--fs);
      line-height:1;
      white-space:nowrap;
      color:var(--phrase-color);
      opacity:0;
      transform:rotate(var(--rotate)) scale(.01);
      transform-origin:50% 50%;
      will-change:transform, opacity;
      animation:finalePhraseWrite 1.2s cubic-bezier(.2,.7,.2,1) forwards;
      transition:
        transform 3.2s cubic-bezier(.7,0,.3,1),
        opacity 3.2s cubic-bezier(.7,0,.3,1);
    }
    .od-finale.is-converge .od-finalePhrase,
    .od-finale.is-rest .od-finalePhrase{
      animation:none;
      opacity:0 !important;
      transform:translate(var(--dx), var(--dy)) rotate(0deg) scale(.18) !important;
    }
    .od-finaleCounter{
      position:absolute;
      left:50%;
      bottom:60px;
      transform:translateX(-50%);
      z-index:12;
      font-family:var(--mono);
      font-size:13px;
      letter-spacing:.04em;
      color:rgba(245,241,230,.4);
      font-variant-numeric:tabular-nums;
      opacity:0;
      transition:opacity .6s ease;
      pointer-events:none;
    }
    .od-finale.is-accumulate .od-finaleCounter{opacity:1}
    .od-finaleCore{
      position:absolute;
      left:50%;
      top:43%;
      transform:translate(-50%, -50%);
      width:min(980px, calc(100vw - 120px));
      text-align:center;
      z-index:10;
      pointer-events:none;
    }
    .od-finaleTitle{
      font-family:var(--serif);
      font-size:clamp(120px, 18vw, 320px);
      font-weight:900;
      line-height:.92;
      letter-spacing:-.08em;
      color:#f5f1e6;
      opacity:0;
      filter:blur(60px);
      transform:scale(.4);
      transition:
        opacity 2.4s cubic-bezier(.2,.7,.2,1) .8s,
        filter 2.4s cubic-bezier(.2,.7,.2,1) .8s,
        transform 2.4s cubic-bezier(.2,.7,.2,1) .8s;
    }
    .od-finale.is-converge .od-finaleTitle,
    .od-finale.is-rest .od-finaleTitle{
      opacity:1;
      filter:blur(0);
      transform:scale(1);
    }
    .od-finaleStats,
    .od-finalePoem div,
    .od-finaleReplay{
      opacity:0;
      transform:translateY(10px);
    }
    .od-finaleStats{
      margin:32px auto 0;
      font-family:var(--sans);
      font-size:14px;
      line-height:1.7;
      color:rgba(245,241,230,.6);
      font-weight:300;
    }
    .od-finaleStats span{
      font-size:16px;
      color:rgba(245,241,230,.85);
      font-variant-numeric:tabular-nums;
    }
    .od-finalePoem{
      margin:24px auto 0;
      font-family:var(--sans);
      font-size:13px;
      line-height:1.9;
      color:rgba(245,241,230,.4);
      font-weight:300;
    }
    .od-finale.is-converge .od-finaleStats,
    .od-finale.is-rest .od-finaleStats{
      animation:finaleTextRise 1.2s ease 3.5s forwards;
    }
    .od-finale.is-converge .od-finalePoem div:nth-child(1),
    .od-finale.is-rest .od-finalePoem div:nth-child(1){animation:finaleTextRise 1.1s ease 5s forwards}
    .od-finale.is-converge .od-finalePoem div:nth-child(2),
    .od-finale.is-rest .od-finalePoem div:nth-child(2){animation:finaleTextRise 1.1s ease 5.6s forwards}
    .od-finale.is-converge .od-finalePoem div:nth-child(3),
    .od-finale.is-rest .od-finalePoem div:nth-child(3){animation:finaleTextRise 1.1s ease 6.2s forwards}
    .od-finaleFlash{
      position:absolute;
      inset:0;
      z-index:16;
      pointer-events:none;
      background:#fff;
      opacity:0;
    }
    .od-finale.is-converge .od-finaleFlash{animation:finaleWhiteFlash .42s ease 3.2s forwards}
    .od-finaleReplay{
      position:absolute;
      left:50%;
      bottom:100px;
      transform:translateX(-50%) translateY(10px);
      z-index:18;
      appearance:none;
      border:0;
      background:transparent;
      color:rgba(245,241,230,.35);
      padding:10px 0;
      font-family:var(--mono);
      font-size:11px;
      letter-spacing:.25em;
      text-transform:uppercase;
      pointer-events:none;
      transition:color .25s ease;
    }
    .od-finale.is-rest .od-finaleReplay{
      animation:finaleReplayRise .8s ease .2s forwards;
      pointer-events:auto;
      cursor:pointer;
    }
    .od-finaleReplay:hover,
    .od-finaleReplay:focus-visible{color:rgba(255,85,127,.85); outline:none}
    @keyframes themePathDraw{
      0%{stroke-dashoffset:1}
      100%{stroke-dashoffset:0}
    }
    @keyframes dustSlowSpin{
      0%{transform:rotate(0deg)}
      100%{transform:rotate(360deg)}
    }
    @keyframes spin{
      0%{transform:rotate(0deg)}
      100%{transform:rotate(360deg)}
    }
    @keyframes finalePhraseWrite{
      0%{opacity:.08; transform:rotate(var(--rotate)) scale(.01)}
      100%{opacity:var(--final-opacity); transform:rotate(var(--rotate)) scale(1)}
    }
    @keyframes finaleTextRise{
      0%{opacity:0; transform:translateY(10px)}
      100%{opacity:1; transform:translateY(0)}
    }
    @keyframes finaleReplayRise{
      0%{opacity:0; transform:translateX(-50%) translateY(10px)}
      100%{opacity:1; transform:translateX(-50%) translateY(0)}
    }
    @keyframes finaleWhiteFlash{
      0%{opacity:0}
      45%{opacity:.08}
      100%{opacity:0}
    }
    .od-hourlyDial{
      border-color:rgba(255,255,255,.12);
      background:rgba(255,255,255,.04);
    }
    .od-hourlyDial.is-night{
      background:radial-gradient(circle at 50% 50%, rgba(0,0,0,.9), rgba(20,16,32,.92));
      box-shadow:0 24px 60px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.06) inset;
    }
    .od-hourlyDial.is-night .od-hourlyDialFace{
      border-color:rgba(255,255,255,.18);
    }
    .od-hourlyDial.is-day{
      background:radial-gradient(circle at 50% 50%, rgba(255,255,255,.96), rgba(233,230,224,.82));
      color:#17131f;
    }
    .od-hourlyDial.is-day .od-hourlyDialCount{color:rgba(23,19,31,.54)}
    .od-hourlySelector{
      position:absolute; left:7%; top:72%; width:18%;
      display:grid; grid-template-columns:repeat(5, minmax(0,1fr)); gap:10px 8px;
    }
    .od-hourlyAnchor{
      appearance:none; border:0; background:none; color:rgba(245,241,230,.42); padding:0;
      display:grid; gap:7px; justify-items:center; font-family:var(--mono); font-size:10px; letter-spacing:.1em; cursor:pointer;
    }
    .od-hourlyAnchorDot{
      width:12px; height:12px; border-radius:50%; background:rgba(255,255,255,.16); display:block;
      box-shadow:0 0 0 1px rgba(255,255,255,.04) inset;
    }
    .od-hourlyAnchor.is-active{color:#fff}
    .od-hourlyAnchor.is-active .od-hourlyAnchorDot{background:var(--pink); box-shadow:0 0 16px rgba(255,85,127,.24)}
    .od-hourlySample{
      width:min(40vw, 560px);
    }
    .od-hourlySampleStack{
      margin-top:16px; display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:14px;
    }
    .od-hourlySampleCard{
      min-height:174px; padding:18px 18px 16px; border:1px solid rgba(255,255,255,.08); background:rgba(12,9,20,.52);
    }
    .od-hourlySampleCard p{
      margin:10px 0 0; font-family:var(--serif); font-size:17px; line-height:1.72; color:rgba(245,241,230,.96);
    }
    .od-hourlySampleLikes{
      margin-top:10px; font-family:var(--mono); font-size:10px; letter-spacing:.12em; color:rgba(245,241,230,.42);
    }
    .od-hourlyMiniBars{
      position:absolute; left:28%; right:58px; bottom:86px; height:54px; display:flex; gap:6px; align-items:flex-end;
    }
    .od-hourlyMiniBar{
      flex:1; display:block; background:rgba(245,241,230,.16); border-radius:999px 999px 0 0;
      transition:background .24s ease, transform .24s ease;
    }
    .od-hourlyMiniBar.is-active{background:rgba(255,85,127,.86); transform:translateY(-4px)}
    .od-recurringHero{top:40%}
    .od-evidenceWall{
      left:8%; right:26%; top:24%; bottom:10%;
    }
    .od-evidenceFocus{
      top:30vh;
    }
    .od-longcommentWall{
      font-size:14px; line-height:1.5;
    }
    .od-longcommentWall span{
      max-width:280px; white-space:normal; overflow:visible; color:rgba(245,241,230,.88);
    }
    .od-datewall .od-sceneHead{
      top:64px;
    }
    .od-dateWallStage--left{
      position:absolute; left:4%; width:42%; top:18%; bottom:10%;
    }
    .od-datePeopleStage{
      position:absolute; right:4%; width:48%; top:22%; bottom:10%; z-index:5;
    }
    .od-datePeopleColumnLabel{
      position:absolute; left:0; top:0; font-family:var(--mono); font-size:10px; letter-spacing:.14em; color:rgba(245,241,230,.42); text-transform:uppercase;
    }
    .od-datePeopleColumnLabel--other{
      left:52%;
    }
    .od-peopleCard{
      position:absolute; width:min(220px, 14vw); appearance:none; border:1px solid rgba(255,255,255,.08);
      background:rgba(244,237,225,.94); color:#241f2c; text-align:left; padding:14px 14px 12px; box-shadow:0 18px 40px rgba(0,0,0,.22);
    }
    .od-peopleCardTarget{
      font-family:var(--hand); font-size:24px; color:#6b5067;
    }
    .od-peopleCard p{
      margin:10px 0; font-family:var(--serif); font-size:14px; line-height:1.65;
    }
    .od-peopleCardMeta{
      font-family:var(--mono); font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:#6f6476;
    }
    .od-dustsceneLayout{
      position:absolute; inset:15% 6.5% 14%;
      display:grid; grid-template-columns:minmax(340px, 36vw) minmax(460px, 1fr);
      gap:min(7vw, 92px); align-items:center;
    }
    .od-dustsceneCenter{
      position:relative; left:auto; top:auto; transform:none; width:100%; height:580px;
    }
    .od-dustsceneCoverWrap{
      width:320px; height:320px; border-radius:50%; border:1px solid rgba(255,255,255,.12);
      margin:0 auto; overflow:hidden;
    }
    .od-dustsceneTitle{
      position:absolute; top:18px; left:50%; transform:translateX(-50%);
      font-family:var(--hand); font-size:72px; color:rgba(245,241,230,.94);
      text-shadow:0 12px 36px rgba(0,0,0,.38); letter-spacing:.02em;
    }
    .od-dustsceneMeta{
      position:absolute; bottom:102px; left:50%; transform:translateX(-50%);
      font-family:var(--mono); font-size:10px; letter-spacing:.14em; color:rgba(245,241,230,.42); text-transform:uppercase;
    }
    .od-dustscenePlayerBar{
      position:absolute; left:50%; bottom:24px; transform:translateX(-50%);
      width:min(360px, 82%); display:grid; gap:10px;
    }
    .od-dustscenePlayerTimes{
      display:flex; justify-content:space-between; align-items:center;
      font-family:var(--mono); font-size:11px; letter-spacing:.14em;
      color:rgba(245,241,230,.58); text-transform:uppercase;
    }
    .od-dustscenePlayerTrack{
      position:relative; height:4px; border-radius:999px; overflow:visible;
      background:rgba(245,241,230,.14);
      box-shadow:0 0 0 1px rgba(255,255,255,.04) inset;
    }
    .od-dustscenePlayerTrack span{
      position:relative; display:block; height:100%; border-radius:inherit;
      background:linear-gradient(90deg, rgba(255,255,255,.92), rgba(255,85,127,.96));
      box-shadow:0 0 14px rgba(255,85,127,.32);
    }
    .od-dustscenePlayerTrack span::after{
      content:""; position:absolute; right:-7px; top:50%; width:12px; height:12px; border-radius:50%;
      transform:translateY(-50%);
      background:#fff; box-shadow:0 0 0 3px rgba(255,255,255,.08), 0 0 16px rgba(255,255,255,.32);
    }
    .od-dustsceneLyrics{
      min-width:0; padding-left:0; padding-right:2vw;
      display:grid; gap:18px; align-content:center;
    }
    .od-dustsceneLyricsKicker{
      font-family:var(--mono); font-size:10px; letter-spacing:.16em; color:rgba(245,241,230,.42); text-transform:uppercase;
    }
    .od-dustsceneLyricsViewport{
      position:relative; height:470px; overflow:hidden;
      mask-image:linear-gradient(180deg, transparent, #000 10%, #000 88%, transparent);
      -webkit-mask-image:linear-gradient(180deg, transparent, #000 10%, #000 88%, transparent);
    }
    .od-dustsceneLyricsRail{
      position:absolute; left:0; right:0; top:0; transition:transform .56s cubic-bezier(.22,.61,.36,1);
    }
    .od-dustsceneLyricLine{
      min-height:84px; display:flex; align-items:center;
      font-family:var(--serif); font-size:clamp(24px, 2.3vw, 34px); line-height:1.58;
      color:rgba(245,241,230,.32); opacity:.64;
      transition:color .24s ease, transform .24s ease, opacity .24s ease, text-shadow .24s ease, filter .24s ease;
    }
    .od-dustsceneLyricLine.is-active{
      color:#fff; opacity:1; transform:translateX(12px) scale(1.08);
      text-shadow:0 10px 30px rgba(255,255,255,.12);
    }
    .od-dustsceneLyricLine.is-past{opacity:.46}
    .od-dustsceneLyricLine.is-future{opacity:.72}
    .od-dustsceneLyricLine.is-far{opacity:.16; filter:blur(.2px)}
    .od-dustsceneCommentMeta{
      margin-top:4px; font-family:var(--mono); font-size:10px; letter-spacing:.12em; color:rgba(245,241,230,.42);
    }
    .od-dustsceneSides{display:none}
    .od-placeholder{
      position:relative; width:100%; height:100%; display:grid; place-items:center; overflow:hidden;
      padding:0 7vw;
    }
    .od-placeholder-grid{
      position:absolute; inset:0; opacity:.12;
      background-image:
        linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px);
      background-size:42px 42px;
      mask-image:radial-gradient(circle at center, rgba(0,0,0,1), transparent 76%);
    }
    .od-placeholder-shell{
      position:relative; z-index:2; width:min(820px, 86vw); padding:34px 34px 30px;
      border:1px solid rgba(255,255,255,.08); background:rgba(10,8,18,.64); box-shadow:var(--shadow);
      backdrop-filter:blur(18px); opacity:0; transform:translateY(20px); transition:opacity .42s ease, transform .6s ease;
    }
    .od-placeholder.is-visible .od-placeholder-shell{opacity:1; transform:none}
    .od-placeholder-kicker{
      font-family:var(--mono); font-size:11px; color:rgba(245,241,230,.52); letter-spacing:.2em; text-transform:uppercase;
    }
    .od-placeholder-title{
      margin:16px 0 0; font-family:var(--serif); font-size:clamp(42px, 5vw, 82px); line-height:1.02; letter-spacing:-.04em;
    }
    .od-placeholder-copy{
      margin:18px 0 0; max-width:48ch; font-size:16px; line-height:1.9; color:rgba(245,241,230,.72);
    }
    .od-placeholder-chip{
      margin-top:28px; display:inline-flex; padding:10px 14px; border:1px solid rgba(255,255,255,.12);
      font-family:var(--mono); font-size:10px; letter-spacing:.12em; color:var(--gold);
    }
    @keyframes coverPulse{
      0%,100%{transform:scale(.92); box-shadow:0 0 0 0 rgba(255,85,127,.16)}
      50%{transform:scale(1.08); box-shadow:0 0 0 10px rgba(255,85,127,0)}
    }
    @keyframes coverRipple{
      0%{opacity:.08; transform:scale(.6)}
      100%{opacity:0; transform:scale(1.44)}
    }
    @keyframes coverBurst{
      0%{
        opacity:0; filter:blur(12px);
        transform:translate(-50%,-50%) scale(0) rotate(var(--rot));
      }
      100%{
        opacity:1; filter:none;
        transform:translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1) rotate(var(--rot));
      }
    }
    @media (max-width: 960px){
      .od-progress{width:calc(100vw - 48px)}
      .od-audio-fab{right:16px; bottom:78px}
      .od-chrome-bl,.od-chrome-br{bottom:138px}
      .od-cover-subtitle{font-size:clamp(18px, 4vw, 24px)}
      .od-cover-hand{left:calc(50% - min(30vw, 160px)); top:8px}
      .od-numberroll-shell{
        padding:7vh 4vw 12vh; gap:36px;
      }
      .od-flap-board{gap:5px}
      .od-flap-card{
        width:clamp(40px, 10vw, 68px);
        height:clamp(60px, 14.8vw, 102px);
        font-size:clamp(40px, 10vw, 68px);
        border-radius:6px;
      }
      .od-flap-comma{
        width:clamp(14px, 3.2vw, 20px);
        font-size:clamp(40px, 10vw, 68px);
        padding-bottom:clamp(4px, 1.4vw, 10px);
      }
      .od-numberroll-copy-main{font-size:17px}
      .od-numberroll-copy-sub{font-size:22px}
      .od-numberroll-satellites{
        width:min(92vw, 480px);
        gap:18px;
      }
      .od-numberroll-satellite-label{font-size:11px}
      .od-numberroll-satellite-value{font-size:26px}
      .od-dormancy-topline{
        left:20px; right:20px; top:18px;
        display:flex; flex-direction:column; gap:6px; width:min(88vw, 820px);
      }
      .od-dormancy-headRow{
        display:block; white-space:normal;
      }
      .od-dormancy-title{
        margin-top:0;
        font-size:clamp(20px, 6.4vw, 30px);
        max-width:none; white-space:normal;
      }
      .od-dormancy-subtitle{
        margin-top:6px;
        max-width:none;
        font-size:12px;
        white-space:normal;
      }
      .od-dormancy-layout{
        padding:100px 18px 102px;
        grid-template-columns:1fr;
        gap:18px;
      }
      .od-dormancy-chartHeader{
        flex-direction:column;
        align-items:flex-start;
        gap:10px;
      }
      .od-dormancy-chartShell{
        --label-w:86px;
        height:auto; min-height:0;
        padding-right:10px;
      }
      .od-dormancy-axisTop{
        right:10px;
      }
      .od-dormancy-guides{
        right:10px;
      }
      .od-dormancy-song{
        font-size:10px;
        padding-right:8px;
      }
      .od-dormancy-delayTag{
        display:none;
      }
      .od-dormancy-side--right{
        display:grid;
        grid-template-rows:minmax(0, 1fr) auto;
      }
      .od-dormancy-card{
        padding:18px;
      }
      .od-dormancy-cardTop{
        grid-template-columns:1fr 108px;
        gap:12px;
      }
      .od-dormancy-cardTitle{
        font-size:28px;
      }
      .od-dormancy-cardMetric strong{
        font-size:14px;
      }
      .od-dormancy-cardMetric strong.is-instant,
      .od-dormancy-cardMetric strong.is-mid,
      .od-dormancy-cardMetric strong.is-late{
        font-size:14px;
      }
      .od-dormancy-coverWrap{
        width:108px;
      }
      .od-dormancy-cardExcerpt{
        font-size:14px !important;
        line-height:1.55 !important;
      }
      .od-dormancy-summaryBlock{
        padding:14px 16px;
      }
      .od-dormancy-summaryNarrative p{
        font-size:17px;
      }
      .od-constellation-lamp,
      .od-constellation-lampCord{
        left:25vw;
      }
      .od-constellation-lampGlow{
        width:280px; height:220px;
      }
      .od-constellation-titleBlock{
        left:20px; top:132px; width:min(56vw, 320px);
      }
      .od-constellation-kicker{
        font-size:10px;
      }
      .od-constellation-title{
        font-size:clamp(32px, 9vw, 46px);
      }
      .od-constellation-titleSub{
        margin-top:10px; font-size:13px; max-width:16ch;
      }
      .od-constellation-note{
        right:20px; top:96px; font-size:13px; max-width:34vw;
      }
      .od-sceneHead{
        left:20px; top:92px; width:min(70vw, 340px);
      }
      .od-sceneTitle{
        font-size:clamp(28px, 8vw, 42px);
      }
      .od-sceneCopy{
        font-size:13px;
      }
      .od-hourlyDial{
        left:50%; top:34%; width:220px; height:220px; transform:translate(-50%, -50%);
      }
      .od-hourlySelector{
        left:18px; top:58%; width:calc(100vw - 36px); grid-template-columns:repeat(10, minmax(0,1fr));
      }
      .od-hourlySample{
        left:20px; right:20px; top:46vh; bottom:auto; width:auto; max-height:calc(100vh - 340px);
      }
      .od-hourlySampleStack{
        grid-template-columns:1fr;
      }
      .od-hourlySampleCard p{
        font-size:18px;
      }
      .od-hourlyMiniBars{
        left:18px; right:18px; bottom:88px; height:42px;
      }
      .od-hourlyBars{
        left:18px; right:18px; bottom:88px; height:96px; gap:6px;
      }
      .od-recurringExamples{
        left:18px; right:18px; top:42%; gap:10px;
      }
      .od-recurringExample{
        width:calc(50% - 6px);
      }
      .od-evidenceWall{
        right:0; top:24%; bottom:28%;
      }
      .od-evidenceCard{
        width:120px;
      }
      .od-evidenceFocus{
        left:18px; right:18px; top:auto; width:auto; bottom:88px;
      }
      .od-languageColumns{
        left:18px; right:18px; top:30%; bottom:auto; grid-template-columns:1fr; height:42vh;
      }
      .od-languageFocus{
        left:18px; right:18px; top:auto; width:auto; bottom:88px;
      }
      .od-longcommentCard{
        width:90vw; min-height:360px; padding:28px 24px 24px;
      }
      .od-emigrationStage{
        left:18px; right:18px; top:30%;
      }
      .od-emigrationPanel{
        left:18px; right:18px; top:auto; width:auto; bottom:88px;
      }
      .od-themePicker{
        width:calc(100vw - 36px); top:24%;
      }
      .od-themeStage{
        left:12px; right:12px; top:36%;
      }
      .od-themeStory{
        width:calc(100vw - 36px); bottom:88px;
      }
      .od-dateCard{
        width:132px;
      }
      .od-dateWall{
        top:6%;
      }
      .od-dustsceneLayout{
        inset:14% 0 16%; grid-template-columns:1fr; gap:16px;
      }
      .od-dustsceneCenter{
        width:300px; height:360px; top:40%;
      }
      .od-dustsceneCoverWrap{
        width:200px; height:200px;
      }
      .od-dustsceneTitle{
        top:0; font-size:52px;
      }
      .od-dustsceneMeta{
        bottom:78px;
      }
      .od-dustscenePlayerBar{
        bottom:18px; width:min(240px, 84vw); gap:8px;
      }
      .od-dustscenePlayerTimes{
        font-size:10px;
      }
      .od-dustsceneLyrics{
        padding:0 18px; margin-top:-6px;
      }
      .od-dustsceneLyricsViewport{
        height:300px;
      }
      .od-dustsceneLyricLine{
        min-height:72px; font-size:clamp(18px, 5vw, 24px);
      }
      .od-dustsceneSpectrum{
        left:18px; right:18px; bottom:86px; gap:4px;
      }
      .od-finaleCore{
        top:42%;
        width:calc(100vw - 36px);
      }
      .od-finaleTitle{
        font-size:clamp(72px, 16vw, 140px);
        letter-spacing:-.04em;
        white-space:normal;
      }
      .od-finaleStats{font-size:12px; margin-top:24px}
      .od-finaleStats span{font-size:13px}
      .od-finalePoem{font-size:11px; margin-top:20px}
      .od-finaleCounter{bottom:54px; font-size:12px}
      .od-finaleReplay{bottom:84px}
      .od-constellation-axisWrap{
        left:36px; right:36px;
      }
      .od-constellation-nodeTitle,
      .od-constellation-nodeYear{
        display:none;
      }
      .od-constellation-node.is-active .od-constellation-nodeTitle,
      .od-constellation-node.is-active .od-constellation-nodeYear{
        display:block;
      }
      .od-constellation-popup{
        width:min(280px, calc(100vw - 36px));
      }
      .od-constellation-tool{
        right:22px; bottom:72px;
      }
      .od-constellation-toolLabel{
        font-size:9px;
      }
      .od-constellation-detailCard{
        width:90vw;
        padding:24px 20px 22px;
      }
      .od-constellation-detailHead{
        grid-template-columns:64px minmax(0,1fr);
        gap:14px;
      }
      .od-constellation-detailCoverWrap{
        width:64px; height:64px;
      }
      .od-constellation-detailTitle{
        font-size:26px;
      }
      .od-placeholder-shell{padding:28px 24px}
    }
    .reduced-motion .od-scene,
    .reduced-motion .od-cover-topline,
    .reduced-motion .od-cover-hand,
    .reduced-motion .od-cover-subtitle,
    .reduced-motion .od-constellation-popup,
    .reduced-motion .od-constellation-world,
    .reduced-motion .od-placeholder-shell{
      transition-duration:.01ms !important;
    }
    .reduced-motion .od-cover-char.is-visible,
    .reduced-motion .od-cover-dot,
    .reduced-motion .od-cover-ripple.is-visible,
    .reduced-motion .od-constellation-node,
    .reduced-motion .od-constellation-disc{
      animation:none !important;
    }
    .reduced-motion .od-cover-char{
      opacity:1;
      filter:none;
      transform:translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1) rotate(var(--rot));
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>window.DATA = ${safeData};</script>
  <script>window.DORMANCY_DATA = ${safeDormancyData};</script>
  <script type="text/babel" data-presets="react">
${safeSource}
  </script>
</body>
</html>`;
}

function main() {
  const rawData = readJson(DATA_PATH);
  const dormancyData = fs.existsSync(DORMANCY_PATH) ? readJson(DORMANCY_PATH) : {};
  const richData = readOptionalOdDataJs(LOCAL_OD_DATA_PATH);
  const rawSignals = readOptionalJson(RAW_SCENE_SIGNALS_PATH);
  const data = buildData(rawData, richData, rawSignals);
  const source = readSources(SOURCE_FILES);
  const html = buildHtml(data, dormancyData, source);
  fs.writeFileSync(OUT_PATH, html, "utf8");
  console.log(`Wrote ${path.basename(OUT_PATH)}`);
}

main();
