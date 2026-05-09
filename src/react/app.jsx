function AppShell({ reducedMotion }) {
  const audio = useAudio();
  const [coverEntered, setCoverEntered] = useState(false);
  const [finaleChromeReady, setFinaleChromeReady] = useState(false);
  const coverTransitRef = useRef(false);
  const { sceneIdx, jumpTo } = useScene({
    total: 13,
    initialIndex: 0,
    isLocked: (index) => index === 0 && !coverEntered,
  });

  useEffect(() => {
    if (!coverEntered) return undefined;
    const syncBackgroundAudio = (event) => {
      if (event?.target?.closest?.(".od-audio-fab")) return;
      audio.ensureStarted();
    };
    document.addEventListener("pointerdown", syncBackgroundAudio, { passive: true });
    document.addEventListener("keydown", syncBackgroundAudio);
    return () => {
      document.removeEventListener("pointerdown", syncBackgroundAudio);
      document.removeEventListener("keydown", syncBackgroundAudio);
    };
  }, [audio, coverEntered]);

  const sceneDefs = useMemo(() => ([
    {
      id: "cover",
      label: "Cover",
      render: ({ active }) => (
        <CoverScene
          active={active}
          entered={coverEntered}
          reducedMotion={reducedMotion}
          onEnter={async () => {
            if (coverTransitRef.current) return;
            coverTransitRef.current = true;
            setCoverEntered(true);
            await audio.fadeInAndPlay(1200);
            jumpTo(1, true);
          }}
        />
      ),
    },
    {
      id: "dust-listening",
      label: "Dust",
      render: ({ active }) => (
        <DustListeningScene
          active={active}
          reducedMotion={reducedMotion}
          data={window.DATA}
        />
      ),
    },
    {
      id: "number-roll",
      label: "Dataset Overview",
      render: ({ active }) => (
        <NumberRollScene
          active={active}
          reducedMotion={reducedMotion}
          data={window.DATA}
        />
      ),
    },
    {
      id: "timeline-constellation",
      label: "Timeline Constellation",
      render: ({ active }) => (
        <TimelineConstellationScene
          active={active}
          reducedMotion={reducedMotion}
          data={window.DATA}
        />
      ),
    },
    {
      id: "dormancy",
      label: "Dormancy",
      render: ({ active }) => (
        <DormancyScene
          active={active}
          reducedMotion={reducedMotion}
          data={window.DATA}
        />
      ),
    },
    {
      id: "hourly-comments",
      label: "Hourly Comments",
      render: ({ active }) => (
        <HourlyCommentsScene
          active={active}
          reducedMotion={reducedMotion}
          data={window.DATA}
        />
      ),
    },
    {
      id: "recurring-phrases",
      label: "Recurring Phrases",
      render: ({ active }) => (
        <RecurringPhrasesScene
          active={active}
          reducedMotion={reducedMotion}
          data={window.DATA}
        />
      ),
    },
    {
      id: "comment-wall",
      label: "Comment Wall",
      render: ({ active }) => (
        <CommentWallScene
          active={active}
          reducedMotion={reducedMotion}
          data={window.DATA}
        />
      ),
    },
    {
      id: "date-anchors",
      label: "Date Anchors",
      render: ({ active }) => (
        <DateAnchorWallScene
          active={active}
          reducedMotion={reducedMotion}
          data={window.DATA}
        />
      ),
    },
    {
      id: "language-shift",
      label: "Language Shift",
      render: ({ active }) => (
        <LanguageShiftScene
          active={active}
          reducedMotion={reducedMotion}
          data={window.DATA}
        />
      ),
    },
    {
      id: "long-comments",
      label: "Long Comments",
      render: ({ active }) => (
        <LongCommentScene
          active={active}
          reducedMotion={reducedMotion}
          data={window.DATA}
        />
      ),
    },
    {
      id: "emotion-migration",
      label: "Emotion Migration",
      render: ({ active }) => (
        <EmotionMigrationScene
          active={active}
          reducedMotion={reducedMotion}
          data={window.DATA}
        />
      ),
    },
    {
      id: "peace-finale",
      label: "Finale",
      render: ({ active }) => (
        <PeaceFinaleScene
          active={active}
          reducedMotion={reducedMotion}
          data={window.DATA}
          onReplay={() => {
            audio.pause();
            jumpTo(0, true);
            window.setTimeout(() => audio.fadeInAndPlay(1200), 120);
          }}
          onChromeReadyChange={setFinaleChromeReady}
        />
      ),
    },
  ]), [audio, coverEntered, jumpTo, reducedMotion, setFinaleChromeReady]);

  const coverLocked = sceneIdx === 0 && !coverEntered;
  const finaleActive = sceneDefs[sceneIdx]?.id === "peace-finale";
  const showGlobalChrome = !coverLocked && (!finaleActive || finaleChromeReady);

  return (
    <div className={`od-app ${reducedMotion ? "reduced-motion" : ""}`}>
      <NoiseLayer />
      <ScanlinesLayer />
      <VignetteLayer />
      <Stage scenes={sceneDefs} activeIndex={sceneIdx} />
      {showGlobalChrome && (
        <>
          <ProgressBar
            total={sceneDefs.length}
            active={sceneIdx}
            onJump={(index) => jumpTo(index)}
            disabled={coverLocked}
          />
          <button
            type="button"
            className={`od-audio-fab ${audio.isPlaying && !audio.isMuted ? "is-playing" : ""} ${audio.isMuted ? "is-muted" : ""}`}
            onClick={() => audio.toggleMute()}
            aria-label={!audio.isRunning ? "开启背景音乐" : audio.isMuted ? "取消静音背景音乐" : "静音背景音乐"}
            title={!audio.isRunning ? "Start Dust" : audio.isMuted ? "Unmute Dust" : "Mute Dust"}
          >
            ♪
          </button>
        </>
      )}
    </div>
  );
}

function Bootstrap() {
  const reducedMotion = useReducedMotion();
  return (
    <AudioProvider dust={window.DATA.dust} reducedMotion={reducedMotion}>
      <AppShell reducedMotion={reducedMotion} />
    </AudioProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Bootstrap />);
