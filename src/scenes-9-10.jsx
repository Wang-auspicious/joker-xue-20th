// ============================================================
// Scenes 9-10
//   9. 伪歌词卡拉OK：把多条乐评剪成一首"歌"，逐句高亮 + 频谱条
//  10. 长评原文 + 鼠标光斑追随（聚光阅读）
// ============================================================
const { useEffect: _u9, useRef: _r9, useState: _s9, useMemo: _m9 } = React;

// ---------- Scene 9：伪歌词卡拉OK ----------
window.Scene9 = function Scene9({ active }){
  // 用 QUOTES 拼成"伪歌词"——把长评切到第一个句号/换行前的短句
  const lyrics = _m9(()=>{
    const Q = window.QUOTES || [];
    const total = (window.STATS && window.STATS.totalComments) || 4691587;
    const cutLine = (txt, max=30) => {
      if(!txt) return '';
      let t = txt.replace(/^\s*#[^#\n]*#?\s*/, '').replace(/\n+/g, ' ').trim();
      // 取到第一个标点
      const m = t.match(/^([^。！？!?\n]{6,30})[。！？!?，,]/);
      if (m) return m[1];
      return t.length > max ? t.slice(0, max) + '…' : t;
    };
    const fallbacks = [
      '雪还在下，他还在唱',
      '我把所有意料之中的离别，都说成意外',
      '前任结婚那天，我从头哭到尾',
      '我妈走的那天，我循环这首到天亮',
      '听完，我把那条没发出去的消息删了',
      '如果连机器都开始有感情，是不是只有我还假装没有',
      '他在 2024 写出了 2014 年那个我心里的声音',
    ];
    const lines = fallbacks.map((fb, i) => cutLine(Q[i]?.text) || fb);
    const tail = `—— 这不是歌词。这是 ${total.toLocaleString()} 个人的副歌。`;
    const stamps = [
      { t: 0.0, dur: 3.5 }, { t: 3.5, dur: 4.0 }, { t: 7.5, dur: 4.5 },
      { t:12.0, dur: 3.5 }, { t:15.5, dur: 3.5 }, { t:19.0, dur: 3.5 },
      { t:22.5, dur: 4.0 }, { t:26.5, dur: 4.0 },
    ];
    return stamps.map((s, i) => ({ ...s, line: i < lines.length ? lines[i] : tail }));
  }, []);
  const total = lyrics[lyrics.length-1].t + lyrics[lyrics.length-1].dur;

  const [t, setT] = _s9(0);
  _u9(()=>{
    if(!active){ setT(0); return; }
    let raf, t0=performance.now();
    const tick = (now)=>{
      const cur = ((now-t0)/1000) % (total + 1.5);
      setT(cur);
      raf=requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return ()=> cancelAnimationFrame(raf);
  }, [active, total]);

  if(!active) return null;
  return (
    <div style={{position:'absolute', inset:0, padding:'7vh 8vw',
      display:'flex', flexDirection:'column'}}>
      <div className="chrome tl">09 / 11 · KARAOKE</div>
      <div className="t-display" style={{fontSize:'clamp(28px,3vw,44px)', marginBottom:8}}>
        把这些评论 <span style={{color:'var(--pink)'}}>剪</span> 一下，
        像不像一首没有人写过的歌？
      </div>
      <div className="t-mono" style={{fontSize:11, color:'var(--ink-dim)', letterSpacing:'.18em', marginBottom: 32}}>
        伪歌词 · 卡拉OK 同步高亮 · {Math.floor(t)}'' / {Math.ceil(total)}''
      </div>

      <div style={{flex:1, display:'flex', flexDirection:'column', justifyContent:'center', gap:18}}>
        {lyrics.map((L, i) => {
          const isActive = t >= L.t && t < L.t + L.dur;
          const isPassed = t >= L.t + L.dur;
          const cls = 'lyric-line' + (isActive ? ' active' : isPassed ? ' passed' : '');
          // 卡拉OK逐字进度
          const localP = isActive ? Math.min(1, (t - L.t) / L.dur) : (isPassed ? 1 : 0);
          return (
            <div key={i} className={cls} style={{position:'relative'}}>
              <span style={{position:'relative', display:'inline-block'}}>
                <span style={{color:'inherit'}}>{L.line}</span>
                {/* 高亮覆盖层 */}
                <span style={{
                  position:'absolute', left:0, top:0, height:'100%',
                  width:`${localP*100}%`, overflow:'hidden', whiteSpace:'pre-wrap',
                  color:'var(--pink)',
                  textShadow:'0 0 28px rgba(255,45,111,.6)',
                }}>
                  {L.line}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {/* 底部频谱条 */}
      <div style={{height:120, marginTop:24, position:'relative'}}>
        <window.FakeSpectrum bars={64} height={120} color="#ff2d6f"/>
        {/* 进度条 */}
        <div style={{position:'absolute', left:0, right:0, bottom:-8, height:2,
          background:'rgba(255,255,255,.1)'}}>
          <div style={{height:'100%', width:`${(t/total)*100}%`, background:'var(--pink)',
            boxShadow:'0 0 12px var(--pink)'}}/>
        </div>
      </div>
    </div>
  );
};


// ---------- Scene 10：长评光斑 ----------
window.Scene10 = function Scene10({ active }){
  const L = window.LONG_REVIEW || { text:'', author:'', song:'', likes:0, date:'' };
  const ref = _r9(null);
  const [pos, setPos] = _s9({ x: 50, y: 50, on: false });

  _u9(()=>{
    if(!active) return;
    const el = ref.current; if(!el) return;
    const onMove = (e)=>{
      const r = el.getBoundingClientRect();
      setPos({ x: ((e.clientX - r.left)/r.width)*100,
               y: ((e.clientY - r.top)/r.height)*100, on:true });
    };
    const onLeave = ()=> setPos(p => ({...p, on:false}));
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return ()=> {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [active]);

  if(!active) return null;
  return (
    <div ref={ref} style={{position:'absolute', inset:0, padding:'7vh 10vw',
      cursor:'none', overflow:'hidden'}}>
      <div className="chrome tl">10 / 11 · ONE STORY</div>
      <div className="chrome tr">悬停于文字上 · 点亮一个故事</div>

      <div className="t-display" style={{fontSize:'clamp(28px,3vw,44px)', marginBottom:6}}>
        在这 <span style={{color:'var(--pink)'}}>{(((window.STATS&&window.STATS.totalComments)||4691587)/10000).toFixed(0)} 万条</span> 里，挑了一条最长的
      </div>
      <div className="t-mono" style={{fontSize:11, color:'var(--ink-dim)', letterSpacing:'.18em', marginBottom: 36}}>
        《{L.song}》· {L.author}{L.date?` · ${L.date}`:''} · ♥ {(L.likes||0).toLocaleString()}
      </div>

      {/* 长评内容（默认很暗，光斑下被点亮） */}
      <div className="t-display" style={{
        fontSize:'clamp(20px, 2vw, 32px)',
        lineHeight: 1.85, fontWeight:400, color:'rgba(245,241,230,.18)',
        whiteSpace:'pre-line', maxWidth: 1100,
      }}>
        {L.text}
      </div>

      {/* 鼠标光斑（话筒形 + 圆形 spotlight） */}
      <div style={{
        pointerEvents:'none', position:'absolute', left:`${pos.x}%`, top:`${pos.y}%`,
        transform:'translate(-50%,-50%)',
        width: 360, height: 360, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(255,200,87,.30) 0%, rgba(255,45,111,.08) 35%, transparent 65%)',
        opacity: pos.on ? 1 : 0, transition:'opacity .35s', mixBlendMode:'screen',
      }}/>
      {/* 用 mask 把光斑下的文字"显出来" */}
      <div style={{
        pointerEvents:'none', position:'absolute', inset:'7vh 10vw 0 10vw',
        WebkitMaskImage: `radial-gradient(circle 220px at ${pos.x}% ${pos.y}%, #000 0%, rgba(0,0,0,.4) 60%, transparent 90%)`,
                maskImage: `radial-gradient(circle 220px at ${pos.x}% ${pos.y}%, #000 0%, rgba(0,0,0,.4) 60%, transparent 90%)`,
        opacity: pos.on ? 1 : 0, transition:'opacity .25s',
      }}>
        <div style={{height: 'calc(100% - 0px)'}}/>
        <div className="t-display" style={{
          fontSize:'clamp(20px, 2vw, 32px)',
          lineHeight: 1.85, fontWeight:400, color:'var(--ink)',
          whiteSpace:'pre-line', maxWidth: 1100,
          marginTop: -1 * (window.innerHeight*0.07 + 36 + 60),
          paddingTop: window.innerHeight*0.07 + 36 + 60,
          textShadow: '0 0 20px rgba(255,200,87,.35)',
        }}>
          {L.text}
        </div>
      </div>

      {/* 自定义光标点 */}
      <div style={{
        pointerEvents:'none', position:'absolute', left:`${pos.x}%`, top:`${pos.y}%`,
        transform:'translate(-50%,-50%)',
        width:14, height:14, borderRadius:'50%',
        background:'var(--yellow)', boxShadow:'0 0 24px var(--yellow)',
        opacity: pos.on ? 1 : 0,
      }}/>
    </div>
  );
};
