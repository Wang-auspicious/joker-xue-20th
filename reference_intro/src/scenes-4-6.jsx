// ============================================================
// Scenes 4-6
//   4. Top 30 跳动条形图（跟着假 BPM 唱）
//   5. 弹幕飞过（金句版）— hover 定格
//   6. 词云粒子聚合 → 头像剪影
// ============================================================
const { useEffect: _u4, useRef: _r4, useState: _s4, useMemo: _m4 } = React;

// ---------- Scene 4：Top 30 ----------
window.Scene4 = function Scene4({ active }){
  const top = _m4(()=> (window.SONGS||[]).slice().sort((a,b)=>b.comments-a.comments).slice(0,15), []);
  const max = top[0]?.comments || 1;
  const [t, setT] = _s4(0);
  _u4(()=>{
    if(!active) return;
    let raf, t0=performance.now();
    const tick = (now)=>{ setT((now-t0)/1000); raf=requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return ()=> cancelAnimationFrame(raf);
  }, [active]);

  if(!active) return null;
  return (
    <div style={{position:'absolute', inset:0, padding:'7vh 6vw'}}>
      <div className="chrome tl">04 / 11 · TOP 15</div>
      <div className="t-display" style={{fontSize:'clamp(32px,3.6vw,60px)', marginBottom:8}}>
        最被反复听的，是这 <span style={{color:'var(--pink)'}}>15 首</span>
      </div>
      <div className="t-mono" style={{fontSize:12, color:'var(--ink-dim)', letterSpacing:'.18em', marginBottom:24}}>
        条形长度 = 评论数 · 抖动 = 假装 BPM 跳动 (留真音频接口)
      </div>

      <div style={{display:'flex', flexDirection:'column', gap:10, height:'70vh', overflow:'hidden'}}>
        {top.map((s, i) => {
          const w = (s.comments/max)*100;
          const beat = Math.sin(t*5 + i*0.7)*1.5 + Math.sin(t*2.3 + i*1.1)*1.2;
          return (
            <div key={s.id} style={{display:'flex', alignItems:'center', gap:14,
              animation:`fadeUp .5s ${0.04*i}s both`}}>
              <div className="t-mono" style={{width:32, color:'var(--ink-dim)', fontSize:12,
                textAlign:'right'}}>#{String(i+1).padStart(2,'0')}</div>
              <div style={{width:'18ch'}}>
                <div className="t-display" style={{fontSize:18, fontWeight:700}}>《{s.title}》</div>
                <div className="t-mono" style={{fontSize:10, color:'var(--ink-dim)'}}>{s.year}</div>
              </div>
              <div style={{flex:1, position:'relative', height:24}}>
                <div style={{position:'absolute', left:0, top:0, height:'100%',
                  width:`calc(${w + beat}%)`,
                  background:`linear-gradient(90deg, ${s.color}, ${s.color}99)`,
                  boxShadow:`0 0 18px ${s.color}88`,
                  borderRadius: 3, transition:'width .12s linear'}}/>
              </div>
              <div className="t-mono t-tabular" style={{width:'10ch', textAlign:'right', color:'var(--ink)'}}>
                {(s.comments/10000).toFixed(1)}<span style={{color:'var(--ink-dim)', fontSize:10}}>万</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


// ---------- Scene 5：弹幕飞过 ----------
window.Scene5 = function Scene5({ active }){
  const quotes = window.QUOTES || [];
  const [paused, setPaused] = _s4(false);
  const [hovered, setHovered] = _s4(null);
  // 准备很多弹幕实例（重复使用 + 不同 lane / delay / speed）
  const items = _m4(()=>{
    const arr = [];
    const lanes = 9;
    for(let i=0; i<48; i++){
      const q = quotes[i % quotes.length];
      arr.push({
        ...q, key:i,
        lane: i % lanes,
        delay: -(Math.random()*30 + i*0.6),  // 错峰
        dur: 18 + Math.random()*14,
        scale: 0.85 + Math.random()*0.5,
        opacity: 0.7 + Math.random()*0.3,
      });
    }
    return arr;
  }, []);

  if(!active) return null;
  return (
    <div style={{position:'absolute', inset:0, overflow:'hidden'}}
         onClick={(e)=>{ if(e.target===e.currentTarget) {/* 让点击穿透 */}}}>
      <div className="chrome tl">05 / 11 · BARRAGE</div>
      <div style={{position:'absolute', top:'7vh', left:'6vw', right:'6vw', zIndex:10}}>
        <div className="t-display" style={{fontSize:'clamp(28px,3.2vw,52px)'}}>
          这些是 <span style={{color:'var(--pink)'}}>被点赞最多</span>的句子
        </div>
        <div className="t-mono" style={{fontSize:12, color:'var(--ink-dim)', letterSpacing:'.18em', marginTop:8}}>
          鼠标悬停可定格 · {paused ? '已定格' : '播放中'} · {hovered ? `『${hovered.song}』 · ${hovered.likes.toLocaleString()} 赞` : '\u00A0'}
        </div>
      </div>

      {/* 弹幕区 */}
      <div style={{position:'absolute', top:'22vh', bottom:'8vh', left:0, right:0,
        animationPlayState: paused ? 'paused' : 'running'}}>
        {items.map(it => (
          <div key={it.key}
            className="bullet"
            onMouseEnter={()=>{ setPaused(true); setHovered(it); }}
            onMouseLeave={()=>{ setPaused(false); setHovered(null); }}
            style={{
              top: `${(it.lane / 9)*100}%`,
              right: '-50%',
              fontSize: 14 * it.scale,
              opacity: it.opacity,
              animation: `bulletFly ${it.dur}s linear ${it.delay}s infinite`,
              animationPlayState: paused ? 'paused' : 'running',
            }}>
            {it.text}
            <span style={{marginLeft:10, color:'var(--pink)', fontFamily:'var(--mono)', fontSize:11}}>
              ♥ {(it.likes/1000).toFixed(0)}k
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes bulletFly{
          from{ transform: translateX(0) }
          to  { transform: translateX(-220vw) }
        }
      `}</style>
    </div>
  );
};


// ---------- Scene 6：词云粒子聚合 ----------
window.Scene6 = function Scene6({ active }){
  const words = (window.WORDS || []).slice(0, 32);
  const [phase, setPhase] = _s4(0); // 0 散开, 1 聚合
  _u4(()=>{
    if(!active) { setPhase(0); return; }
    const a = setTimeout(()=> setPhase(1), 1200);
    return ()=> clearTimeout(a);
  }, [active]);

  // 给每个词一个目标位置（靠 count 排布在椭圆区域）
  const placed = _m4(()=>{
    const out = [];
    const W=80, H=40;
    words.forEach((w, i) => {
      const angle = (i * 137.5) * Math.PI/180;  // 黄金角
      const r = Math.sqrt(i+1) * 6;
      out.push({
        ...w,
        tx: 50 + Math.cos(angle)*r,
        ty: 50 + Math.sin(angle)*r * 0.55,
        sx: 20 + Math.random()*60,
        sy: 20 + Math.random()*60,
        size: 14 + Math.sqrt(w.count) * 0.18,
        delay: i * 0.04,
      });
    });
    return out;
  }, []);

  if(!active) return null;
  return (
    <div style={{position:'absolute', inset:0, padding:'7vh 6vw'}}>
      <div className="chrome tl">06 / 11 · WORD CLOUD</div>
      <div className="t-display" style={{fontSize:'clamp(28px,3.2vw,52px)'}}>
        如果把所有评论 <span style={{color:'var(--pink)'}}>嚼碎</span>，掉出来的是这些词
      </div>
      <div className="t-mono" style={{fontSize:12, color:'var(--ink-dim)', letterSpacing:'.18em', marginTop:8}}>
        高频词 · 字号 = 出现频次 · 数据自动聚合
      </div>

      <div style={{position:'absolute', inset:'18vh 6vw 8vh 6vw'}}>
        {placed.map((w,i)=>{
          const x = phase ? w.tx : w.sx;
          const y = phase ? w.ty : w.sy;
          return (
            <span key={i} className="t-display"
              style={{
                position:'absolute', left:`${x}%`, top:`${y}%`,
                transform:'translate(-50%,-50%)',
                fontSize: w.size, fontWeight: 700 + Math.min(2, w.count/10000)*100,
                color: i%5===0 ? 'var(--pink)' :
                       i%5===1 ? 'var(--cyan)' :
                       i%5===2 ? 'var(--yellow)' :
                       i%5===3 ? 'var(--violet)' : 'var(--ink)',
                opacity: phase ? 0.95 : 0,
                textShadow:`0 0 18px currentColor`,
                transition: `all 1.4s cubic-bezier(.2,.7,.2,1) ${w.delay}s`,
                whiteSpace:'nowrap', userSelect:'none',
              }}>
              {w.word}
            </span>
          );
        })}
      </div>

      <div style={{position:'absolute', bottom:'4vh', left:'6vw', right:'6vw',
        textAlign:'center', color:'var(--ink-dim)'}}>
        <div className="t-display" style={{fontSize:'clamp(18px, 1.8vw, 28px)', fontWeight:400}}>
          —— 没有一个字是 "薛之谦"。 都是 <span style={{color:'var(--pink)'}}>每个人自己的故事</span>。
        </div>
      </div>
    </div>
  );
};
