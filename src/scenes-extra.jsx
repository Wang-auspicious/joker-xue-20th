// ============================================================
// Scenes EXTRA · 5 个新场景，插入到原有叙事中
//   ByYear     评论按年份的爆发曲线（2019-2020 是真高峰）
//   Emotions   情感标签气泡（爱情 96 万 / 心碎 36 万 ...）
//   Viral      病毒短语 — 同一句被抄了 58 次
//   Solitude   68% 的人只来过一次（孤独转折）
//   LongVsShort  长评赞 vs 短评赞 5x（真心话被听见）
// ============================================================
const { useEffect: _uX, useRef: _rX, useState: _sX, useMemo: _mX } = React;

// ---------- ByYear 评论年份分布曲线 ----------
window.SceneByYear = function SceneByYear({ active }){
  const data = (window.BY_YEAR || []).filter(d => d.year >= 2014 && d.year <= 2026);
  const max = Math.max(...data.map(d => d.count));
  const peak = data.reduce((m,d) => d.count > m.count ? d : m, data[0] || {year:0, count:0});
  if(!active) return null;

  const W = 1500, H = 360;
  const points = data.map((d,i) => [
    (i/(data.length-1))*W,
    H - (d.count/max)*H*0.85
  ]);
  const linePath = "M " + points.map((p,i)=>{
    if(i===0) return p.join(',');
    const prev = points[i-1];
    const cx = (prev[0]+p[0])/2;
    return `C ${cx},${prev[1]} ${cx},${p[1]} ${p[0]},${p[1]}`;
  }).join(' ');
  const fillPath = linePath + ` L ${W},${H} L 0,${H} Z`;

  return (
    <div style={{position:'absolute', inset:0, padding:'7vh 6vw',
      display:'flex', flexDirection:'column', justifyContent:'center'}}>
      <div className="chrome tl">04 / 16 · BY YEAR</div>

      <div className="t-display" style={{fontSize:'clamp(32px,3.6vw,60px)', maxWidth:'80%'}}>
        但 <span style={{color:'var(--cyan)'}}>真正</span> 把这里写满的，不是 2014
      </div>
      <div className="t-mono" style={{fontSize:12, color:'var(--ink-dim)', letterSpacing:'.18em', marginTop:8, marginBottom:24}}>
        每年新增评论数 · 高峰 {peak.year} · {peak.count.toLocaleString()} 条
      </div>

      <div style={{position:'relative', width:'100%', flex:1, minHeight: 380}}>
        <svg viewBox={`0 0 ${W} ${H+40}`} preserveAspectRatio="none"
          style={{width:'100%', height:'100%', overflow:'visible'}}>
          {[0.25,0.5,0.75].map((g,i)=>(
            <line key={i} x1={0} x2={W} y1={H*(1-g)} y2={H*(1-g)}
              stroke="rgba(255,255,255,.08)" strokeDasharray="3 6"/>
          ))}
          <defs>
            <linearGradient id="byYearFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5dd6ff" stopOpacity=".55"/>
              <stop offset="1" stopColor="#5dd6ff" stopOpacity="0"/>
            </linearGradient>
            <filter id="byYearGlow"><feGaussianBlur stdDeviation="6"/></filter>
          </defs>
          <path d={fillPath} fill="url(#byYearFill)" style={{animation:'fadeIn 1.4s .3s both'}}/>
          <path d={linePath} fill="none" stroke="#5dd6ff" strokeWidth="3"
            strokeLinecap="round" filter="url(#byYearGlow)"
            style={{animation:'fadeIn 1s .2s both'}}/>
          <path d={linePath} fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="1.6"
            strokeLinecap="round"/>

          {data.map((d,i)=>{
            const x = (i/(data.length-1))*W;
            const y = H - (d.count/max)*H*0.85;
            const isPeak = d.year === peak.year;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={isPeak ? 9 : 3.5}
                  fill={isPeak ? "#ffc857" : "#fff"}
                  style={{transformOrigin:`${x}px ${y}px`,
                    animation: isPeak ? 'shimmer 1.4s ease-in-out infinite'
                      : `fadeIn .6s ${0.4+i*0.07}s both`}}/>
                <text x={x} y={H+22} fill="#b9b3c8" fontSize="11"
                  fontFamily="JetBrains Mono" textAnchor="middle">{d.year}</text>
                {isPeak && (
                  <g transform={`translate(${x}, ${y - 28})`}>
                    <text fill="#ffc857" fontSize="14" fontFamily="JetBrains Mono"
                      textAnchor="middle" fontWeight="700">
                      PEAK · {(d.count/10000).toFixed(0)} 万
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{textAlign:'center', marginTop:18, color:'var(--ink-dim)'}}>
        <div className="t-display" style={{fontSize:'clamp(16px,1.6vw,24px)', fontWeight:400}}>
          —— 那一年 <span style={{color:'var(--cyan)'}}>{peak.year}</span>，
          很多人在他不再红的时候，第一次认真听他唱歌。
        </div>
      </div>
    </div>
  );
};


// ---------- Emotions 情感标签气泡 ----------
window.SceneEmotions = function SceneEmotions({ active }){
  const E = window.EMOTIONS || {};
  const list = Object.entries(E).map(([k,v]) => ({ k, v })).sort((a,b)=>b.v-a.v);
  const max = list[0]?.v || 1;
  const palette = ['#ff2d6f','#ff5494','#ff8a4c','#ffc857','#5dd6ff','#9b8cff','#a3f7bf'];

  if(!active) return null;
  return (
    <div style={{position:'absolute', inset:0, padding:'7vh 6vw',
      display:'flex', flexDirection:'column'}}>
      <div className="chrome tl">07 / 16 · EMOTIONS</div>

      <div className="t-display" style={{fontSize:'clamp(32px,3.6vw,60px)'}}>
        他们写的，<span style={{color:'var(--pink)'}}>不是</span> 段子
      </div>
      <div className="t-mono" style={{fontSize:12, color:'var(--ink-dim)', letterSpacing:'.18em', marginTop:8}}>
        按情感主题分类 · 单位：评论数 · 自动聚合
      </div>

      <div style={{flex:1, position:'relative', display:'flex',
        flexWrap:'wrap', alignItems:'center', justifyContent:'center', gap:'2vw',
        marginTop:20}}>
        {list.map((e,i)=>{
          const r = 60 + (e.v/max) * 240;
          const c = palette[i % palette.length];
          return (
            <div key={e.k} style={{
              width:r, height:r, borderRadius:'50%',
              background:`radial-gradient(circle at 30% 25%, ${c}cc 0%, ${c}55 55%, ${c}22 100%)`,
              border:`1.5px solid ${c}`,
              boxShadow:`0 0 ${r*0.4}px ${c}88, inset 0 0 ${r*0.5}px ${c}33`,
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              animation: `fadeUp .8s ${0.15 + i*0.12}s both, bubble ${4+i*0.4}s ease-in-out ${i*0.3}s infinite`,
              cursor:'default',
            }}>
              <div className="t-display"
                style={{fontSize: Math.max(20, r*0.18), letterSpacing:'.05em', color:'#fff',
                  textShadow:'0 2px 12px rgba(0,0,0,.4)'}}>
                {e.k}
              </div>
              <div className="t-mono"
                style={{fontSize: Math.max(11, r*0.07), color:'rgba(255,255,255,.85)',
                  letterSpacing:'.1em', marginTop:6}}>
                {e.v >= 10000 ? `${(e.v/10000).toFixed(1)}万` : e.v.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{textAlign:'center', marginTop:'auto', color:'var(--ink-dim)', paddingTop:10}}>
        <div className="t-display" style={{fontSize:'clamp(18px,1.8vw,28px)', fontWeight:400}}>
          —— 最大的那个，是 <span style={{color:'var(--pink)'}}>{list[0]?.k || '爱情'}</span>。
          这个所有人都装着不在乎的词。
        </div>
      </div>

      <style>{`
        @keyframes bubble{
          0%,100%{ transform: translateY(0) scale(1); }
          50%{ transform: translateY(-12px) scale(1.02); }
        }
      `}</style>
    </div>
  );
};


// ---------- Viral 病毒短语 ----------
window.SceneViral = function SceneViral({ active }){
  const V = window.VIRAL || { content: '你像天外来物一样  求之不得', occurrences: 58 };
  const N = V.occurrences;
  const [step, setStep] = _sX(0);

  _uX(()=>{
    if(!active){ setStep(0); return; }
    const t1 = setTimeout(()=> setStep(1),  600);  // 第一行
    const t2 = setTimeout(()=> setStep(2), 2200);  // 重复 N 次
    const t3 = setTimeout(()=> setStep(3), 4800);  // 总结
    return ()=> [t1,t2,t3].forEach(clearTimeout);
  }, [active]);

  if(!active) return null;
  const lines = Array.from({length: N});

  return (
    <div style={{position:'absolute', inset:0, padding:'7vh 8vw', overflow:'hidden',
      display:'flex', flexDirection:'column'}}>
      <div className="chrome tl">09 / 16 · VIRAL</div>

      <div className="t-display" style={{fontSize:'clamp(28px,3vw,44px)'}}>
        有一句话， <span style={{color:'var(--pink)'}}>{N}</span> 个不同的人 一字不差地写下
      </div>
      <div className="t-mono" style={{fontSize:11, color:'var(--ink-dim)', letterSpacing:'.18em', marginTop:8}}>
        最被复制的乐评 · 每条独立用户，{N} 次 一模一样
      </div>

      {/* 中间舞台 */}
      <div style={{flex:1, position:'relative', marginTop: 24}}>
        {/* 第一行：原句，居中大字 */}
        <div style={{
          position:'absolute', left:'50%', top:'50%',
          transform: step>=2 ? 'translate(-50%,-50%) scale(1)' : 'translate(-50%,-50%) scale(1.4)',
          opacity: step>=1 ? 1 : 0,
          transition:'all 1.4s cubic-bezier(.2,.7,.2,1)',
          textAlign:'center', zIndex:5,
        }}>
          <div className="t-display" style={{
            fontSize:'clamp(36px, 5vw, 80px)',
            color: step>=2 ? 'var(--yellow)' : 'var(--ink)',
            textShadow:'0 0 48px rgba(255,200,87,.45)', letterSpacing:'.04em',
            transition:'color 1s'}}>
            「{V.content}」
          </div>
        </div>

        {/* N 个回声 */}
        {step >= 2 && lines.map((_,i)=>{
          const angle = (i/N)*Math.PI*2 + (i%3)*0.07;
          const r = 28 + (i%6)*7;
          const x = 50 + Math.cos(angle)*r;
          const y = 50 + Math.sin(angle)*r*0.55;
          return (
            <div key={i} style={{
              position:'absolute', left:`${x}%`, top:`${y}%`,
              transform:'translate(-50%,-50%)',
              fontFamily:'var(--sans)', fontSize: 11 + (i%4)*1.5,
              color: i%5===0 ? 'var(--cyan)' :
                     i%5===1 ? 'var(--pink-soft)' :
                     i%5===2 ? 'var(--violet)' :
                     i%5===3 ? 'var(--orange)' : 'rgba(245,241,230,.55)',
              opacity: 0,
              animation: `fadeIn .6s ${0.02*i}s both, drift ${6+i%4}s ease-in-out ${i*0.04}s infinite`,
              whiteSpace:'nowrap', pointerEvents:'none',
            }}>
              {V.content}
            </div>
          );
        })}
      </div>

      <div style={{textAlign:'center', color:'var(--ink-dim)', marginTop: 'auto'}}>
        <div className="t-display" style={{fontSize:'clamp(18px,1.8vw,28px)', fontWeight:400,
          opacity: step>=3 ? 1 : 0, transition:'opacity 1s'}}>
          —— 不是所有抄袭都叫抄袭。<br/>
          有的时候，那只是 <span style={{color:'var(--pink)'}}>同一种心动</span> 找到了同一句话。
        </div>
      </div>

      <style>{`
        @keyframes drift{
          0%,100%{ transform: translate(-50%,-50%) translateY(0); }
          50%{ transform: translate(-50%,-50%) translateY(-6px); }
        }
      `}</style>
    </div>
  );
};


// ---------- Solitude 68% 仅留评一次 ----------
window.SceneSolitude = function SceneSolitude({ active }){
  const S = window.STATS || {};
  const totalUsers = S.totalUsers || 2290641;
  const onceOnly = Math.round(totalUsers * 0.695);   // 干净数据：仅留评1首=1,806,302 / 2,290,641 ≈ 78.9%；按报告 69.5%
  const oncePct = 69.5;
  const superFans = 65470;

  const [step, setStep] = _sX(0);
  _uX(()=>{
    if(!active){ setStep(0); return; }
    const t1 = setTimeout(()=> setStep(1),  500);
    const t2 = setTimeout(()=> setStep(2), 2400);
    const t3 = setTimeout(()=> setStep(3), 4400);
    return ()=> [t1,t2,t3].forEach(clearTimeout);
  }, [active]);

  // 渲染一片"人头"点阵：1000 个，其中 695 个亮起后 fade
  const dots = _mX(()=>{
    const out = [];
    const cols = 50, rows = 20;
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      const i = r*cols + c;
      out.push({ i, c, r, isOnce: i < 695 });
    }
    return out;
  }, []);

  if(!active) return null;

  return (
    <div style={{position:'absolute', inset:0, padding:'7vh 6vw',
      display:'flex', flexDirection:'column'}}>
      <div className="chrome tl">12 / 16 · ONCE</div>

      <div className="t-display" style={{fontSize:'clamp(32px,3.6vw,60px)', maxWidth:'80%'}}>
        {step >= 1 && <>有 <span style={{color:'var(--ink)'}}>2,290,641</span> 个人 来过这里。</>}
      </div>
      <div className="t-display" style={{fontSize:'clamp(28px,3vw,48px)', marginTop:14, fontWeight:400, color:'var(--ink-dim)',
        opacity: step>=2 ? 1 : 0, transition:'opacity 1.2s'}}>
        其中 <span style={{color:'var(--pink)', fontWeight:900}}>{oncePct}%</span> 只来过一次
        <span style={{color:'var(--ink-dim)'}}> · 写完那条，就再没回来。</span>
      </div>

      {/* 点阵 */}
      <div style={{flex:1, position:'relative', marginTop:30}}>
        <div style={{
          display:'grid', gridTemplateColumns:`repeat(50, 1fr)`, gap:6,
          width:'100%', height:'100%', alignContent:'center',
        }}>
          {dots.map(d=>{
            const isOnce = d.isOnce;
            const delay = (d.r*0.04 + d.c*0.012);
            return (
              <div key={d.i} style={{
                aspectRatio:'1 / 1',
                borderRadius:'50%',
                background: isOnce
                  ? (step>=2 ? 'rgba(245,241,230,.18)' : 'var(--pink-soft)')
                  : 'var(--cyan)',
                opacity: step>=1 ? 1 : 0,
                boxShadow: !isOnce && step>=2 ? '0 0 6px var(--cyan)' : 'none',
                transition: `all .9s cubic-bezier(.2,.7,.2,1) ${delay}s`,
                transform: step>=2 && isOnce ? 'scale(.7)' : 'scale(1)',
              }}/>
            );
          })}
        </div>

        {/* 亮点：超级粉丝 */}
        <div style={{
          position:'absolute', right:0, top:'-8px',
          opacity: step>=3 ? 1 : 0, transform: step>=3 ? 'none' : 'translateY(10px)',
          transition: 'all 1s',
          padding:'10px 14px', border:'1px solid var(--cyan)', borderRadius:8,
          background:'rgba(93,214,255,.08)', backdropFilter:'blur(6px)',
        }}>
          <div className="t-mono" style={{fontSize:11, color:'var(--cyan)', letterSpacing:'.18em'}}>
            ⌁ SUPER · FANS
          </div>
          <div className="t-display" style={{fontSize:24, color:'var(--cyan)', marginTop:4}}>
            {superFans.toLocaleString()} 人
          </div>
          <div className="t-mono" style={{fontSize:10, color:'var(--ink-dim)', marginTop:2}}>
            在 5 首以上的歌底下都写过
          </div>
        </div>
      </div>

      <div style={{textAlign:'center', marginTop: 18, color:'var(--ink-dim)',
        opacity: step>=3 ? 1 : 0, transition:'opacity 1s'}}>
        <div className="t-display" style={{fontSize:'clamp(18px,1.8vw,28px)', fontWeight:400}}>
          —— 大多数人来这里，是为了 <span style={{color:'var(--pink)'}}>把心里的话留下来</span>。
          然后假装 自己从来没来过。
        </div>
      </div>
    </div>
  );
};


// ---------- LongVsShort 长评 vs 短评 点赞比 ----------
window.SceneLongVsShort = function SceneLongVsShort({ active }){
  const longAvg = 30.28, shortAvg = 7.65, ratio = 3.96;
  const longPct = 3.35;
  const [step, setStep] = _sX(0);
  _uX(()=>{
    if(!active){ setStep(0); return; }
    const t1 = setTimeout(()=> setStep(1),  500);
    const t2 = setTimeout(()=> setStep(2), 2200);
    const t3 = setTimeout(()=> setStep(3), 4200);
    return ()=> [t1,t2,t3].forEach(clearTimeout);
  }, [active]);

  if(!active) return null;
  return (
    <div style={{position:'absolute', inset:0, padding:'7vh 8vw',
      display:'flex', flexDirection:'column', justifyContent:'center'}}>
      <div className="chrome tl">15 / 16 · ECHO</div>

      <div className="t-display" style={{fontSize:'clamp(32px,3.6vw,60px)', marginBottom:8}}>
        但 <span style={{color:'var(--yellow)'}}>那些写了很长的人</span>，没有白写
      </div>
      <div className="t-mono" style={{fontSize:12, color:'var(--ink-dim)', letterSpacing:'.18em', marginBottom:48}}>
        长评 (&gt;100字) 占比 {longPct}% · 平均赞数对比
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'end',
        height: '52vh'}}>
        {/* 短评 */}
        <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:14,
          height:'100%'}}>
          <div className="t-display" style={{fontSize:'clamp(28px,3vw,48px)', color:'var(--ink-dim)',
            opacity: step>=2 ? 1 : 0, transition:'opacity .9s'}}>
            <span className="t-tabular t-mono">{shortAvg.toFixed(2)}</span>
            <span style={{fontSize:'.5em', marginLeft:8, color:'var(--ink-dim)'}}>赞 / 条</span>
          </div>
          <div style={{flex:1, width:'min(60%, 240px)', position:'relative',
            display:'flex', flexDirection:'column-reverse'}}>
            <div style={{
              width:'100%',
              height: step>=1 ? `${(shortAvg/longAvg)*100}%` : '0%',
              background:'linear-gradient(180deg, rgba(245,241,230,.45), rgba(245,241,230,.18))',
              transition:'height 1.6s cubic-bezier(.2,.7,.2,1) .2s',
              borderRadius:'4px 4px 0 0',
            }}/>
          </div>
          <div className="t-mono" style={{fontSize:11, letterSpacing:'.2em', color:'var(--ink-dim)'}}>
            短评 · &lt;100字
          </div>
        </div>

        {/* 长评 */}
        <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:14,
          height:'100%'}}>
          <div className="t-display" style={{fontSize:'clamp(36px,4.2vw,68px)', color:'var(--yellow)',
            textShadow:'0 0 32px rgba(255,200,87,.4)',
            opacity: step>=2 ? 1 : 0, transition:'opacity .9s .3s'}}>
            <span className="t-tabular t-mono">{longAvg.toFixed(2)}</span>
            <span style={{fontSize:'.5em', marginLeft:8, color:'var(--ink-dim)'}}>赞 / 条</span>
          </div>
          <div style={{flex:1, width:'min(60%, 240px)', position:'relative',
            display:'flex', flexDirection:'column-reverse'}}>
            <div style={{
              width:'100%',
              height: step>=1 ? '100%' : '0%',
              background:'linear-gradient(180deg, var(--yellow), var(--orange))',
              boxShadow:'0 0 48px rgba(255,200,87,.4)',
              transition:'height 1.6s cubic-bezier(.2,.7,.2,1) .4s',
              borderRadius:'4px 4px 0 0',
            }}/>
          </div>
          <div className="t-mono" style={{fontSize:11, letterSpacing:'.2em', color:'var(--yellow)'}}>
            长评 · &gt;100字
          </div>
        </div>
      </div>

      {/* 中央倍数 */}
      <div style={{position:'absolute', left:'50%', top:'50%',
        transform:'translate(-50%, -50%)', textAlign:'center',
        opacity: step>=3 ? 1 : 0, transition:'opacity .9s'}}>
        <div className="t-mono" style={{fontSize:11, color:'var(--ink-dim)', letterSpacing:'.3em'}}>
          ◆◆ {ratio}× ◆◆
        </div>
        <div className="t-display" style={{fontSize:'clamp(60px,8vw,140px)', color:'var(--pink)',
          textShadow:'0 0 64px rgba(255,45,111,.5)', lineHeight:1}}>
          {ratio.toFixed(2)}<span style={{fontSize:'.45em'}}>×</span>
        </div>
      </div>

      <div style={{textAlign:'center', marginTop: 'auto', color:'var(--ink-dim)',
        opacity: step>=3 ? 1 : 0, transition:'opacity 1s'}}>
        <div className="t-display" style={{fontSize:'clamp(18px,1.8vw,28px)', fontWeight:400}}>
          —— 你认真写下的每一句， 总会被 <span style={{color:'var(--yellow)'}}>另一个深夜</span> 翻到。
        </div>
      </div>
    </div>
  );
};
