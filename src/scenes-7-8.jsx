// ============================================================
// Scenes 7-8
//   7. 24h emo 曲线（凌晨峰值）
//   8. 情感正负反转 — 看似对半，其实差很多
// ============================================================
const { useEffect: _u7, useRef: _r7, useState: _s7, useMemo: _m7 } = React;

// ---------- Scene 7：24h emo 曲线 ----------
window.Scene7 = function Scene7({ active }){
  const hours = window.HOURS || [];
  const max = Math.max(...hours);
  const peakHour = hours.indexOf(max);
  const [t, setT] = _s7(0);

  _u7(()=>{
    if(!active) return;
    let raf, t0=performance.now();
    const tick = (now)=>{ setT((now-t0)/1000); raf=requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return ()=> cancelAnimationFrame(raf);
  }, [active]);

  // 平滑曲线 path
  const W = 1600, H = 380;
  const points = hours.map((v,i)=> [
    (i/(hours.length-1))*W,
    H - (v/max)*H*0.85
  ]);
  const linePath = "M " + points.map((p,i)=>{
    if(i===0) return p.join(',');
    const prev = points[i-1];
    const cx = (prev[0]+p[0])/2;
    return `C ${cx},${prev[1]} ${cx},${p[1]} ${p[0]},${p[1]}`;
  }).join(' ');
  const fillPath = linePath + ` L ${W},${H} L 0,${H} Z`;

  if(!active) return null;
  return (
    <div style={{position:'absolute', inset:0, padding:'7vh 6vw',
      display:'flex', flexDirection:'column', justifyContent:'center'}}>
      <div className="chrome tl">07 / 11 · LATE NIGHT</div>

      <div className="t-display" style={{fontSize:'clamp(32px,3.6vw,60px)', maxWidth:'70%'}}>
        他们都在 <span style={{color:'var(--pink)'}}>凌晨</span> 写下这些话
      </div>
      <div className="t-mono" style={{fontSize:12, color:'var(--ink-dim)', letterSpacing:'.18em', marginTop:8, marginBottom:24}}>
        24 小时评论分布 · 单位：% · 最高峰 {String(peakHour).padStart(2,'0')}:00 — {String((peakHour+1)%24).padStart(2,'0')}:00
      </div>

      <div style={{position:'relative', width:'100%', flex:1, minHeight:380}}>
        <svg viewBox={`0 0 ${W} ${H+40}`} preserveAspectRatio="none"
          style={{width:'100%', height:'100%', overflow:'visible'}}>
          {/* 网格 */}
          {[0.25, 0.5, 0.75].map((g,i)=>(
            <line key={i} x1={0} x2={W} y1={H*(1-g)} y2={H*(1-g)}
              stroke="rgba(255,255,255,.08)" strokeDasharray="3 6"/>
          ))}
          {/* 填充 */}
          <defs>
            <linearGradient id="emoFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ff2d6f" stopOpacity=".6"/>
              <stop offset="1" stopColor="#ff2d6f" stopOpacity="0"/>
            </linearGradient>
            <filter id="glow"><feGaussianBlur stdDeviation="6"/></filter>
          </defs>
          <path d={fillPath} fill="url(#emoFill)" style={{
            transform: 'scaleY(1)', transformOrigin: 'bottom',
            animation: 'fadeIn 1.4s .4s both' }}/>
          <path d={linePath} fill="none" stroke="#ff2d6f" strokeWidth="3"
            strokeLinecap="round" strokeLinejoin="round"
            filter="url(#glow)" style={{animation: 'fadeIn 1s .2s both'}}/>
          <path d={linePath} fill="none" stroke="#ff5494" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>

          {/* 24 小时刻度 */}
          {hours.map((v,i)=>{
            const x = (i/(hours.length-1))*W;
            const isPeak = i===peakHour;
            return (
              <g key={i}>
                <circle cx={x} cy={H - (v/max)*H*0.85} r={isPeak ? 8 : 3}
                  fill={isPeak ? "#ffc857" : "#ff5494"}
                  style={{
                    transformOrigin: `${x}px ${H - (v/max)*H*0.85}px`,
                    animation: isPeak ? 'shimmer 1.4s ease-in-out infinite' : 'none',
                  }}/>
                {(i%3===0 || isPeak) && (
                  <text x={x} y={H+22} fill="#b9b3c8" fontSize="11" fontFamily="JetBrains Mono"
                    textAnchor="middle">{String(i).padStart(2,'0')}:00</text>
                )}
                {isPeak && (
                  <g transform={`translate(${x}, ${H - (v/max)*H*0.85 - 24})`}>
                    <text fill="#ffc857" fontSize="14" fontFamily="JetBrains Mono"
                      textAnchor="middle" fontWeight="700">PEAK · 02:47</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{textAlign:'center', marginTop:16, color:'var(--ink-dim)'}}>
        <div className="t-display" style={{fontSize:'clamp(16px, 1.6vw, 24px)', fontWeight:400}}>
          —— 不是他们爱写，是夜深的时候，<span style={{color:'var(--cyan)'}}>什么人都没有可以说</span>。
        </div>
      </div>
    </div>
  );
};


// ---------- Scene 8：情感正负反转 ----------
window.Scene8 = function Scene8({ active }){
  const S = window.SENTIMENT || { positive:.34, neutral:.18, negative:.48 };
  const [step, setStep] = _s7(0);

  _u7(()=>{
    if(!active){ setStep(0); return; }
    const t1 = setTimeout(()=> setStep(1), 700);
    const t2 = setTimeout(()=> setStep(2), 2200);
    const t3 = setTimeout(()=> setStep(3), 3800);
    return ()=> [t1,t2,t3].forEach(clearTimeout);
  }, [active]);

  if(!active) return null;
  const total = S.positive + S.neutral + S.negative;
  const segs = [
    { k:'positive', label:'积极 · 治愈',  v:S.positive, c:'var(--cyan)' },
    { k:'neutral',  label:'中性 · 路过',  v:S.neutral,  c:'var(--ink-dim)' },
    { k:'negative', label:'emo · 难过',  v:S.negative, c:'var(--pink)' },
  ];

  return (
    <div style={{position:'absolute', inset:0, padding:'8vh 8vw',
      display:'flex', flexDirection:'column', justifyContent:'center'}}>
      <div className="chrome tl">08 / 11 · SENTIMENT</div>

      <div className="t-display" style={{fontSize:'clamp(32px,3.6vw,60px)', marginBottom: 56}}>
        你以为大家是来 <span style={{color:'var(--cyan)'}}>夸他</span> 的？
      </div>

      {/* 大堆叠条 */}
      <div style={{display:'flex', height:90, borderRadius:12, overflow:'hidden',
        boxShadow:'0 30px 80px rgba(0,0,0,.45)'}}>
        {segs.map((s,i)=>(
          <div key={s.k} style={{
            width: step>=1 ? `${(s.v/total)*100}%` : '33.33%',
            background: s.c, position:'relative',
            transition:'width 1.6s cubic-bezier(.2,.7,.2,1)',
            transitionDelay: `${i*0.15}s`,
            display:'flex', alignItems:'center', justifyContent:'center',
            color: s.k==='neutral' ? 'var(--ink)' : '#0b0814', fontWeight:900,
          }}>
            <span className="t-display" style={{fontSize:'clamp(20px, 2.4vw, 36px)'}}>
              {step>=1 ? `${Math.round((s.v/total)*100)}%` : '...'}
            </span>
          </div>
        ))}
      </div>
      <div style={{display:'flex', marginTop:14}}>
        {segs.map((s,i)=>(
          <div key={s.k} style={{ width:`${(s.v/total)*100}%`, padding:'0 12px',
            opacity: step>=2 ? 1 : 0, transition:'opacity .8s', transitionDelay:`${i*0.1}s`}}>
            <div className="t-mono" style={{fontSize:11, letterSpacing:'.18em', color:s.c}}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{marginTop: 56, display:'grid', gap:18,
        opacity: step>=3 ? 1 : 0, transform: step>=3 ? 'none' : 'translateY(20px)',
        transition:'all .9s'}}>
        <div className="t-display" style={{fontSize:'clamp(28px,3vw,48px)'}}>
          —— <span style={{color:'var(--pink)'}}>{Math.round(S.negative*100)}%</span>
          的人，是来 <span style={{color:'var(--pink)', textDecoration:'underline', textDecorationStyle:'wavy'}}>哭</span>的。
        </div>
        <div className="t-display" style={{fontSize:'clamp(18px, 1.8vw, 26px)', fontWeight:400, color:'var(--ink-dim)'}}>
          一个本来被叫做"段子手"的人，他的歌底下，是一片黑夜。
        </div>
      </div>
    </div>
  );
};
