// ============================================================
// Main shell：场景切换 / 点击推进 / Tweaks 面板 / 真音频接口
// ============================================================
const { useEffect, useState, useMemo, useRef } = React;

const SCENES = [
  window.Scene1,  window.Scene2,  window.Scene3,
  window.Scene4,  window.Scene5,  window.Scene6,
  window.Scene7,  window.Scene8,
  window.Scene9,  window.Scene10, window.Scene11,
];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "autoplay": false,
  "autoplaySec": 9,
  "showGrain": true,
  "showScanlines": true,
  "showVignette": true,
  "primaryColor": "#ff2d6f"
}/*EDITMODE-END*/;

function App(){
  const [idx, setIdx] = useState(0);
  const [t, setTweak] = window.useTweaks
    ? window.useTweaks(TWEAK_DEFAULTS)
    : [TWEAK_DEFAULTS, ()=>{}];

  // 主色变量
  useEffect(()=>{
    document.documentElement.style.setProperty('--pink', t.primaryColor);
  }, [t.primaryColor]);

  // 点击推进（任何空白处）
  useEffect(()=>{
    const onClick = (e)=>{
      // 排除点在 progress dots / tweak-panel / interactive scene 元素 上
      const el = e.target;
      if(el.closest('[data-no-advance]')) return;
      if(el.closest('button')) return;
      if(el.closest('input, select, textarea')) return;
      next();
    };
    window.addEventListener('click', onClick);
    return ()=> window.removeEventListener('click', onClick);
  });

  // 键盘：← → / 空格
  useEffect(()=>{
    const onKey = (e)=>{
      if(e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
      else if(e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if(/^[0-9]$/.test(e.key)){
        const n = parseInt(e.key,10);
        const target = n===0 ? 9 : n-1;
        if(target < SCENES.length) setIdx(target);
      }
    };
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  });

  function next(){ setIdx(i => (i+1) % SCENES.length); }
  function prev(){ setIdx(i => (i-1+SCENES.length) % SCENES.length); }

  // 自动播放
  useEffect(()=>{
    if(!t.autoplay) return;
    const id = setTimeout(()=> next(), (t.autoplaySec||9)*1000);
    return ()=> clearTimeout(id);
  }, [idx, t.autoplay, t.autoplaySec]);

  // 真音频接口（用户上传）
  const audioRef = useRef(null);
  function onAudioFile(file){
    if(!file) return;
    const url = URL.createObjectURL(file);
    if(audioRef.current){
      audioRef.current.pause();
      audioRef.current.src = url;
    } else {
      const a = new Audio(url);
      a.loop = true;
      a.crossOrigin = "anonymous";
      audioRef.current = a;
    }
    audioRef.current.play().then(()=>{
      window.__attachAudio(audioRef.current);
    }).catch(e => console.warn(e));
  }
  function toggleAudio(){
    if(!audioRef.current) return;
    if(audioRef.current.paused) audioRef.current.play();
    else audioRef.current.pause();
  }

  return (
    <div className="stage" data-screen-label={`${String(idx+1).padStart(2,'0')} ${[
      'Cover','Overview','Timeline','Top15','Barrage','WordCloud','Hours','Sentiment','Karaoke','LongStory','Wish'
    ][idx]}`}>

      {/* 各幕（保留 active class 让退场也能 fade） */}
      {SCENES.map((Scene, i)=>(
        <div key={i} className={'scene' + (i===idx ? ' active' : '')}>
          {Scene && <Scene active={i===idx}/>}
        </div>
      ))}

      {/* 点击提示（只在 cover 显示） */}
      {idx === 0 && <div className="tap-hint">CLICK&nbsp;·&nbsp;ANYWHERE&nbsp;·&nbsp;TO&nbsp;ENTER</div>}

      {/* 进度点 */}
      <div className="progress" data-no-advance>
        {SCENES.map((_,i)=>(
          <button key={i}
            className={'dot' + (i===idx ? ' active' : i<idx ? ' passed' : '')}
            onClick={(e)=>{ e.stopPropagation(); setIdx(i); }}
            aria-label={`Scene ${i+1}`}/>
        ))}
      </div>

      {/* 角落小工具：上一页 / 下一页 */}
      <div style={{position:'absolute', bottom:24, left:24, display:'flex', gap:10, zIndex:60}}
        data-no-advance>
        <button onClick={(e)=>{ e.stopPropagation(); prev(); }}
          style={{padding:'6px 10px', fontFamily:'var(--mono)', fontSize:11,
            color:'var(--ink-dim)', border:'1px solid rgba(255,255,255,.15)',
            borderRadius: 6, background:'rgba(20,16,42,.5)', backdropFilter:'blur(6px)'}}>← PREV</button>
        <button onClick={(e)=>{ e.stopPropagation(); next(); }}
          style={{padding:'6px 10px', fontFamily:'var(--mono)', fontSize:11,
            color:'var(--ink)', border:'1px solid rgba(255,255,255,.15)',
            borderRadius: 6, background:'rgba(255,45,111,.18)', backdropFilter:'blur(6px)'}}>NEXT →</button>
      </div>

      {/* 全局视觉滤镜 */}
      {t.showGrain      && <div className="grain"/>}
      {t.showScanlines  && <div className="scanlines"/>}
      {t.showVignette   && <div className="vignette"/>}

      {/* Tweaks 面板 */}
      {window.TweaksPanel && (
        <window.TweaksPanel title="Tweaks">
          <window.TweakSection title="播放">
            <window.TweakToggle label="自动播放" value={t.autoplay} onChange={v=>setTweak({autoplay:v})}/>
            <window.TweakSlider label="单页停留 (秒)" min={4} max={30} step={1}
              value={t.autoplaySec} onChange={v=>setTweak({autoplaySec:v})}/>
          </window.TweakSection>

          <window.TweakSection title="跳转">
            <div style={{display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:6}}>
              {SCENES.map((_,i)=>(
                <button key={i} onClick={(e)=>{e.stopPropagation(); setIdx(i);}}
                  style={{padding:'8px 0', fontFamily:'var(--mono)', fontSize:11,
                    border:'1px solid rgba(255,255,255,.15)', borderRadius:4,
                    background: i===idx ? 'var(--pink)' : 'rgba(255,255,255,.05)',
                    color: i===idx ? '#0b0814' : 'var(--ink)'}}>
                  {String(i+1).padStart(2,'0')}
                </button>
              ))}
            </div>
          </window.TweakSection>

          <window.TweakSection title="音频接口（真音频）">
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              <label style={{fontSize:11, color:'var(--ink-dim)', fontFamily:'var(--mono)',
                letterSpacing:'.1em'}}>上传 mp3 / wav</label>
              <input type="file" accept="audio/*"
                onClick={e=>e.stopPropagation()}
                onChange={e=>onAudioFile(e.target.files[0])}
                style={{fontSize:11, color:'var(--ink-dim)'}}/>
              <button onClick={(e)=>{e.stopPropagation(); toggleAudio();}}
                style={{padding:'6px 10px', fontFamily:'var(--mono)', fontSize:11,
                  border:'1px solid rgba(255,255,255,.15)', borderRadius:4,
                  background:'rgba(255,255,255,.04)', color:'var(--ink)'}}>
                ▶ / ⏸ 播放·暂停
              </button>
              <div style={{fontSize:10, color:'var(--ink-dim)', fontFamily:'var(--mono)'}}>
                {window.__audio?.attached ? '✓ 已接入真分析器' : '当前为伪频谱（合成）'}
              </div>
            </div>
          </window.TweakSection>

          <window.TweakSection title="视觉">
            <window.TweakColor label="主色" value={t.primaryColor}
              options={['#ff2d6f','#ff8a4c','#ffc857','#5dd6ff','#9b8cff']}
              onChange={v=>setTweak({primaryColor:v})}/>
            <window.TweakToggle label="颗粒"     value={t.showGrain}     onChange={v=>setTweak({showGrain:v})}/>
            <window.TweakToggle label="扫描线"   value={t.showScanlines} onChange={v=>setTweak({showScanlines:v})}/>
            <window.TweakToggle label="暗角"     value={t.showVignette}  onChange={v=>setTweak({showVignette:v})}/>
          </window.TweakSection>

          <div style={{fontSize:10, color:'var(--ink-dim)', fontFamily:'var(--mono)',
            letterSpacing:'.15em', marginTop:8}}>
            ← / → 翻页 · 空格下一幕 · 0–9 跳转
          </div>
        </window.TweaksPanel>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
