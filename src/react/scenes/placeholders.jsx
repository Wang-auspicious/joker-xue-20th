function PlaceholderScene({ index, title, kicker, blurb, active }) {
  const visible = useEnterAnimation(active, 120);
  return (
    <div className={`od-placeholder ${visible ? "is-visible" : ""}`}>
      <div className="od-placeholder-grid" />
      <div className="od-placeholder-shell">
        <div className="od-placeholder-kicker">{kicker}</div>
        <h2 className="od-placeholder-title">{title}</h2>
        <p className="od-placeholder-copy">{blurb}</p>
        <div className="od-placeholder-chip">P{String(index + 1).padStart(2, "0")} · React scene scaffold ready</div>
      </div>
    </div>
  );
}

window.PlaceholderScene = PlaceholderScene;
