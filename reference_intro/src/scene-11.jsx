// ============================================================
// Scene 11 · 终章：碎屏 → 心愿卡 "世界和平"
// ============================================================
const { useEffect: _u11, useRef: _r11, useState: _s11, useMemo: _m11 } = React;

window.Scene11 = function Scene11({ active }){
  const [phase, setPhase] = _s11(0); // 0 黑屏 / 1 碎屏 / 2 心愿卡 / 3 签名
  _u11(()=>{
    if(!active){ setPhase(0); return; }
    const t1 = setTimeout(()=> setPhase(1),  600);
    const t2 = setTimeout(()=> setPhase(2), 1700);
    const t3 = setTimeout(()=> setPhase(3), 4200);
    return ()=> [t1,t2,t3].forEach(clearTimeout);
  }, [active]);

  // 碎片
  const shards = _m11(()=>{
    const out = [];
    const cols = 8, rows = 5;
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      out.push({
        c, r,
        tx: (Math.random()-.5)*180,
        ty: (Math.random()-.5)*120 + r*8,
        rot: (Math.random()-.5)*30,
        delay: (r+c)*0.03 + Math.random()*0.1,
      });
    }
    return out;
  }, []);

  if(!active) return null;
  return (
    <div style={{position:'absolute', inset:0, overflow:'hidden',
      display:'flex', alignItems:'center', justifyContent:'center',
      background: phase>=2 ? 'radial-gradient(ellipse at center, #1a0e2e 0%, #0a0712 100%)' : 'transparent',
      transition:'background 1.4s ease'}}>

      <div className="chrome tl">11 / 11 · WISH</div>

      {/* 碎屏阶段 */}
      {phase < 2 && (
        <div style={{position:'absolute', inset:0, display:'grid',
          gridTemplateColumns:'repeat(8, 1fr)', gridTemplateRows:'repeat(5, 1fr)'}}>
          {shards.map((s,i)=>(
            <div key={i} style={{
              position:'relative', overflow:'hidden',
              transform: phase>=1
                ? `translate(${s.tx}px, ${s.ty}px) rotate(${s.rot}deg) scale(.92)`
                : 'none',
              opacity: phase>=1 ? 0 : 1,
              transition: `transform 1.6s cubic-bezier(.5,0,.7,.2) ${s.delay}s, opacity 1.4s ${s.delay+0.4}s`,
              borderRight: '1px solid rgba(255,255,255,.04)',
              borderBottom:'1px solid rgba(255,255,255,.04)',
            }}>
              {/* 用相同字图，再用 transform 错位，看上去像玻璃裂 */}
              <div style={{
                position:'absolute',
                left: `${-s.c*100}%`, top:`${-s.r*100}%`,
                width:`${8*100}%`, height:`${5*100}%`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:'var(--serif)', fontWeight:900,
                fontSize:'18vw', color:'var(--ink)',
                textShadow:'0 0 40px rgba(255,45,111,.35)',
              }}>
                听完了
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 心愿卡 */}
      {phase >= 2 && (
        <div style={{
          position:'relative', textAlign:'center', zIndex:5,
          animation:'fadeUp 1.2s cubic-bezier(.2,.7,.2,1) both',
        }}>
          <div className="t-mono" style={{fontSize:11, letterSpacing:'.4em',
            color:'var(--ink-dim)', marginBottom:24}}>
            HE · ONCE · SAID · HIS · WISH · IS
          </div>

          <div style={{position:'relative', display:'inline-block'}}>
            {/* 光环 */}
            <div style={{position:'absolute', inset:'-80px -80px -80px -80px', zIndex:-1,
              background:'radial-gradient(ellipse, rgba(255,200,87,.25), transparent 65%)',
              animation:'shimmer 3.5s ease-in-out infinite'}}/>
            <div className="t-hand" style={{
              fontSize:'clamp(120px, 18vw, 280px)',
              color:'var(--yellow)',
              letterSpacing:'.08em',
              textShadow:'0 0 48px rgba(255,200,87,.45), 0 0 8px rgba(255,255,255,.2)',
            }}>
              世&nbsp;界&nbsp;和&nbsp;平
            </div>
          </div>

          <div className="t-display" style={{fontSize:'clamp(18px,1.8vw,28px)', fontWeight:400,
            color:'var(--ink-dim)', marginTop:36, maxWidth:'70ch', marginLeft:'auto', marginRight:'auto'}}>
            —— 一个写"段子"的人，最常说的一句话。
            <br/>也是 800 万条评论里，唯一所有人都点赞的那条。
          </div>

          {/* 签名区 */}
          <div style={{
            opacity: phase>=3 ? 1 : 0, transform: phase>=3 ? 'none' : 'translateY(16px)',
            transition:'all 1.2s ease', marginTop: 64,
            display:'flex', alignItems:'center', justifyContent:'center', gap:24,
            color:'var(--ink-dim)',
          }}>
            <div style={{height:1, width:60, background:'rgba(255,255,255,.3)'}}/>
            <span className="t-mono" style={{fontSize:11, letterSpacing:'.3em'}}>
              CLOUDNET · DATA STORY · NO.001
            </span>
            <div style={{height:1, width:60, background:'rgba(255,255,255,.3)'}}/>
          </div>

          <div style={{
            opacity: phase>=3 ? 1 : 0, transition:'opacity 1s 0.4s', marginTop: 28,
          }}>
            <div className="t-mono" style={{fontSize:10, color:'var(--ink-dim)', letterSpacing:'.2em'}}>
              数据 · 网易云音乐公开乐评 · 30 首薛之谦代表作 · 2014–2024
            </div>
            <div className="t-mono" style={{fontSize:10, color:'var(--ink-dim)',
              letterSpacing:'.2em', marginTop:6}}>
              点击 · 重听 一次
            </div>
          </div>
        </div>
      )}

      {/* 余烬粒子 */}
      {phase >= 2 && (
        <div style={{position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden'}}>
          {Array.from({length: 24}).map((_,i)=>{
            const left = Math.random()*100, dur = 6+Math.random()*8, delay = -Math.random()*8;
            const size = 2+Math.random()*3;
            return (
              <div key={i} style={{
                position:'absolute', bottom:'-20px', left:`${left}%`,
                width:size, height:size, borderRadius:'50%',
                background: i%3===0 ? 'var(--yellow)' : i%3===1 ? 'var(--pink)' : 'var(--cyan)',
                boxShadow: '0 0 8px currentColor',
                animation: `ember ${dur}s linear ${delay}s infinite`,
                opacity:.7,
              }}/>
            );
          })}
          <style>{`
            @keyframes ember{
              0%{ transform: translateY(0) translateX(0); opacity:0; }
              10%{ opacity:.85; }
              100%{ transform: translateY(-110vh) translateX(${(Math.random()-.5)*40}px); opacity:0; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};
