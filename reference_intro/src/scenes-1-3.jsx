// ============================================================
// Scenes 1-3
//   1. 封面 / 伪播放器加载 → 碎屏切场提示
//   2. 大数字开场（总评论数 / 时长 / 30 首）
//   3. 十年时间线（30 首发行年份 + 评论体量曲线）
// ============================================================
const { useEffect: _u1, useRef: _r1, useState: _s1, useMemo: _m1 } = React;

// ---------- Scene 1：封面 ----------
window.Scene1 = function Scene1({ active }){
  const [glitch, setGlitch] = _s1(false);
  _u1(() => {
    if(!active) return;
    const a = setTimeout(()=> setGlitch(true), 3800);
    const b = setTimeout(()=> setGlitch(false), 4250);
    return ()=> { clearTimeout(a); clearTimeout(b); };
  }, [active]);

  if(!active) return null;
  return (
    <div className="scene-1" style={{
      position:'absolute', inset:0,
      display:'flex', alignItems:'center', justifyContent:'center',
      flexDirection:'column', gap: 28,
    }}>
      {/* 背景大波形 */}
      <div style={{position:'absolute', inset:0, opacity:.55, mixBlendMode:'screen', filter:'blur(.5px)'}}>
        <window.FakeSpectrum bars={120} height={'100%'} color="#5dd6ff" style={{height:'100%'}}/>
      </div>

      <div style={{position:'absolute', inset:0,
        background:'radial-gradient(ellipse at center, transparent 35%, rgba(11,8,20,.85) 75%)'}}/>

      {/* 文案 */}
      <div style={{position:'relative', zIndex:2, textAlign:'center',
        transform: glitch ? 'translate(3px,-2px) skewX(-1.5deg)' : 'none',
        filter: glitch ? 'hue-rotate(20deg) saturate(1.4)' : 'none',
        transition:'transform .08s, filter .08s'}}>
        <div className="t-mono" style={{fontSize:12, letterSpacing:'.4em', color:'var(--ink-dim)', marginBottom:28}}>
          A · DATA · STORY · ABOUT · 薛之谦 · 2014 — 2024
        </div>
        <div className="t-display" style={{fontSize:'clamp(56px, 9vw, 144px)', letterSpacing:'-.02em'}}>
          <span className="glitch" data-text="认真听过他的人">认真听过他的人</span>
        </div>
        <div className="t-display" style={{fontSize:'clamp(20px, 2.4vw, 36px)', color:'var(--ink-dim)',
          fontWeight:400, marginTop:18, letterSpacing:'.06em'}}>
          —— 30 首歌的乐评，是一群人的私人电影
        </div>
        <div className="t-mono" style={{marginTop:48, fontSize:11, letterSpacing:'.3em', color:'var(--pink)'}}>
          点击任意位置 · 进入
        </div>
      </div>

      {/* 角落标签 */}
      <div className="chrome tl">CloudNet · No.001</div>
      <div className="chrome tr">2026 · 五月</div>
      <div className="chrome bl">作者 / 设计 · YOU</div>
      <div className="chrome br">数据 / 30 首歌 · {((window.STATS&&window.STATS.totalComments)||4691587).toLocaleString()} 条乐评</div>
    </div>
  );
};


// ---------- Scene 2：大数字开场 ----------
function Counter({ to, dur=1800, prefix='', suffix='', delay=0 }){
  const [n,setN] = _s1(0);
  _u1(()=>{
    let raf, t0;
    const id = setTimeout(()=>{
      function tick(now){
        if(!t0) t0 = now;
        const p = Math.min(1, (now - t0)/dur);
        const eased = 1 - Math.pow(1-p, 3);
        setN(Math.floor(to * eased));
        if(p<1) raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    }, delay);
    return ()=>{ clearTimeout(id); cancelAnimationFrame(raf); };
  }, [to, dur, delay]);
  return <span className="t-mono t-tabular">{prefix}{n.toLocaleString('en-US')}{suffix}</span>;
}

window.Scene2 = function Scene2({ active }){
  if(!active) return null;
  const total = (window.SONGS||[]).reduce((s,x)=>s+x.comments, 0);
  return (
    <div style={{position:'absolute', inset:0, display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', padding:'0 8vw'}}>
      <div className="t-mono" style={{fontSize:11, letterSpacing:'.4em', color:'var(--ink-dim)',
        marginBottom: 28, animation:'fadeIn 1s .2s both'}}>FIRST · LOOK</div>

      <div className="t-display" style={{fontSize:'clamp(28px, 3vw, 44px)', textAlign:'center',
        animation:'fadeUp .8s .35s both'}}>
        我们扒了他最火的 <span style={{color:'var(--cyan)'}}>30</span> 首歌
      </div>

      <div className="t-display" style={{fontSize:'clamp(56px, 11vw, 200px)',
        marginTop:40, color:'var(--pink)', textShadow:'0 0 64px rgba(255,45,111,.45)',
        animation:'fadeUp 1s .8s both'}}>
        <Counter to={total} dur={2400} delay={900}/>
      </div>
      <div className="t-display" style={{fontSize:'clamp(20px, 2vw, 32px)',
        color:'var(--ink-dim)', fontWeight:400, marginTop:8,
        animation:'fadeUp .8s 1.4s both'}}>
        条乐评 · 平均每首 28 万人留下过痕迹
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:64, marginTop:96,
        animation:'fadeUp 1s 2.2s both'}}>
        {[
          { k: '30',           t: '首歌' },
          { k: '十年',         t: '从 2014 到 2024' },
          { k: '凌晨 2:47',    t: '评论高峰时刻' },
        ].map((x,i)=> (
          <div key={i} style={{textAlign:'center', minWidth: 200}}>
            <div className="t-display" style={{fontSize:'clamp(40px,5vw,80px)', color:'var(--yellow)'}}>{x.k}</div>
            <div className="t-mono" style={{fontSize:12, letterSpacing:'.2em', color:'var(--ink-dim)', marginTop:8}}>{x.t}</div>
          </div>
        ))}
      </div>

      <div className="chrome tl">02 / 11 · OVERVIEW</div>
    </div>
  );
};


// ---------- Scene 3：十年时间线 ----------
window.Scene3 = function Scene3({ active }){
  const songs = (window.SONGS||[]).slice().sort((a,b)=>a.year-b.year);
  const minY = 2006, maxY = 2024;
  const maxC = Math.max(...songs.map(s=>s.comments));
  const [hover,setHover] = _s1(null);

  if(!active) return null;
  return (
    <div style={{position:'absolute', inset:0, padding:'8vh 6vw', display:'flex',
      flexDirection:'column', justifyContent:'center'}}>

      <div className="chrome tl">03 / 11 · TIMELINE</div>

      <div style={{display:'flex', alignItems:'baseline', gap:24, marginBottom:48}}>
        <div className="t-display" style={{fontSize:'clamp(36px,4.4vw,72px)'}}>
          十年里，<span style={{color:'var(--pink)'}}>每一年</span>都有人在他的歌下面写故事
        </div>
      </div>
      <div className="t-mono" style={{fontSize:12, color:'var(--ink-dim)', letterSpacing:'.18em', marginBottom:16}}>
        圆点大小 = 评论体量 · 颜色 = 情感倾向 · 横轴 = 发行年份
      </div>

      {/* 时间线 */}
      <div style={{position:'relative', height:'42vh', marginTop:8}}>
        {/* 基线 */}
        <div style={{position:'absolute', left:0, right:0, top:'58%', height:1,
          background:'linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent)'}}/>
        {/* 年份刻度 */}
        {Array.from({length: maxY-minY+1}, (_,i)=> minY+i).map(y=>{
          const x = (y - minY) / (maxY-minY);
          return (
            <div key={y} style={{position:'absolute', left:`${x*100}%`, top:'58%',
              transform:'translateX(-50%)'}}>
              <div style={{width:1, height: y%2===0 ? 10 : 5, background:'rgba(255,255,255,.3)'}}/>
              {y%2===0 && (
                <div className="t-mono" style={{position:'absolute', top:14, left:'50%',
                  transform:'translateX(-50%)', fontSize:10, color:'var(--ink-dim)', letterSpacing:'.1em'}}>
                  {y}
                </div>
              )}
            </div>
          );
        })}
        {/* 歌曲点 */}
        {songs.map((s,i) => {
          const x = (s.year - minY) / (maxY-minY);
          const r = 8 + (s.comments/maxC)*48;
          // sentiment 越低 越红（emo），越高 越黄
          const hue = 300 + s.sentiment*60;
          // 一些点上一些点下，避免重叠
          const yOffset = (i%5)*-30 + (i%3)*22 - 24;
          return (
            <div key={s.id}
              onMouseEnter={()=>setHover(s)} onMouseLeave={()=>setHover(null)}
              style={{position:'absolute', left:`${x*100}%`, top:`calc(58% + ${yOffset}px)`,
                transform:'translate(-50%,-50%)',
                width:r, height:r, borderRadius:'50%',
                background: s.color,
                boxShadow:`0 0 ${r*0.8}px ${s.color}80`,
                animation: `fadeIn .8s ${0.3 + i*0.04}s both, shimmer 3s ${i*.13}s ease-in-out infinite`,
                cursor:'pointer'}}/>
          );
        })}
        {/* 悬停标签 */}
        {hover && (() => {
          const x = (hover.year - minY) / (maxY-minY);
          return (
            <div style={{position:'absolute', left:`${x*100}%`, top:'58%',
              transform:'translate(-50%, -180px)', pointerEvents:'none',
              padding:'10px 14px', borderRadius:8,
              background:'rgba(20,16,42,.92)', border:'1px solid rgba(255,255,255,.15)',
              backdropFilter:'blur(8px)', whiteSpace:'nowrap'}}>
              <div className="t-display" style={{fontSize:18, fontWeight:700}}>《{hover.title}》</div>
              <div className="t-mono" style={{fontSize:11, color:'var(--ink-dim)', marginTop:4}}>
                {hover.year} · {hover.comments.toLocaleString()} 条乐评
              </div>
            </div>
          );
        })()}
      </div>

      <div style={{textAlign:'center', marginTop: 'auto', color:'var(--ink-dim)'}}>
        <div className="t-display" style={{fontSize:'clamp(18px, 1.8vw, 28px)', fontWeight:400}}>
          其中 <span style={{color:'var(--pink)'}}>2014–2017</span> 是高峰，但
          <span style={{color:'var(--cyan)'}}> 2024 </span>那首《那是你不知道我有多寂寞》——
          长评比例 <span style={{color:'var(--yellow)'}}>34%</span>，史上最高。
        </div>
      </div>
    </div>
  );
};
