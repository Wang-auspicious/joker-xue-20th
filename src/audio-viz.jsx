// ============================================================
// 假音频可视化（频谱条 / 波形）— 后期可塞真音频
//   用法： <FakeSpectrum bars={48} active /> / <Waveform />
//   真音频接口：window.__attachAudio(<HTMLAudioElement>) 后会切到真分析器
// ============================================================
const { useEffect, useRef, useState } = React;

// 真音频分析器单例
window.__audio = window.__audio || { ctx: null, analyser: null, src: null, attached: false, paused: true };

window.__attachAudio = function(audioEl){
  try{
    const A = window.__audio;
    if(!A.ctx){ A.ctx = new (window.AudioContext||window.webkitAudioContext)(); }
    A.analyser = A.ctx.createAnalyser();
    A.analyser.fftSize = 256;
    A.src = A.ctx.createMediaElementSource(audioEl);
    A.src.connect(A.analyser);
    A.analyser.connect(A.ctx.destination);
    A.attached = true;
    A.paused = audioEl.paused;
    audioEl.addEventListener('play',  () => A.paused = false);
    audioEl.addEventListener('pause', () => A.paused = true);
    return true;
  }catch(e){ console.warn('音频接入失败', e); return false; }
};

// ----- 假数据生成器：基于时间和正弦合成，看上去像真的 -----
function fakeSpectrum(bars, t){
  const out = new Float32Array(bars);
  for(let i=0;i<bars;i++){
    const f = i / bars;
    // 低频鼓 + 中频人声 + 高频镲
    const kick = Math.max(0, Math.sin(t*5.3) * 0.6 + 0.4) * Math.exp(-f*3.5);
    const mid  = (Math.sin(t*2.1 + i*0.4) * .5 + .5) * (1 - Math.abs(f-0.35)) * 0.9;
    const hi   = (Math.sin(t*7.7 + i*1.2) * .5 + .5) * Math.pow(f, 2.5) * 0.8;
    const j    = (Math.random()-.5) * 0.08;
    out[i] = Math.max(0, Math.min(1, kick + mid + hi + j));
  }
  return out;
}

// ----- 频谱条 -----
window.FakeSpectrum = function FakeSpectrum({ bars=48, height=160, color="var(--pink)", style={} }){
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if(!c) return;
    const ctx = c.getContext('2d');
    let raf, t0 = performance.now();
    const buf = new Uint8Array(128);
    function tick(now){
      const t = (now - t0)/1000;
      const w = c.width = c.clientWidth * devicePixelRatio;
      const h = c.height = c.clientHeight * devicePixelRatio;
      ctx.clearRect(0,0,w,h);
      let data;
      const A = window.__audio;
      if(A.attached && A.analyser && !A.paused){
        A.analyser.getByteFrequencyData(buf);
        data = Array.from(buf.slice(0,bars)).map(v => v/255);
      } else {
        data = Array.from(fakeSpectrum(bars, t));
      }
      const bw = w / bars;
      for(let i=0;i<bars;i++){
        const v = data[i];
        const bh = Math.max(2*devicePixelRatio, v * h * 0.95);
        ctx.fillStyle = color.startsWith('var(') ? getComputedStyle(c).getPropertyValue(color.slice(4,-1)) || '#ff2d6f' : color;
        const x = i * bw;
        const y = h - bh;
        ctx.fillRect(x + bw*0.18, y, bw*0.64, bh);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [bars, color]);
  return <canvas ref={ref} style={{width:'100%', height, display:'block', ...style}} />;
};

// ----- 波形圆环 -----
window.WaveRing = function WaveRing({ size=260, color="var(--pink)", style={} }){
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if(!c) return;
    const ctx = c.getContext('2d');
    let raf, t0 = performance.now();
    function tick(now){
      const t = (now-t0)/1000;
      const w = c.width = size * devicePixelRatio;
      const h = c.height = size * devicePixelRatio;
      ctx.clearRect(0,0,w,h);
      const cx = w/2, cy = h/2;
      const baseR = Math.min(w,h)*0.32;
      const col = color.startsWith('var(') ? getComputedStyle(c).getPropertyValue(color.slice(4,-1)) || '#ff2d6f' : color;
      // 多层光环
      for(let layer=0; layer<3; layer++){
        ctx.beginPath();
        const N = 180;
        for(let i=0;i<=N;i++){
          const a = (i/N) * Math.PI*2;
          const r = baseR + Math.sin(a*6 + t*2 + layer)*6 + Math.sin(a*11 + t*3.3)*4 + layer*8;
          const x = cx + Math.cos(a)*r, y = cy + Math.sin(a)*r;
          if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.closePath();
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.55 - layer*0.15;
        ctx.lineWidth = (2 - layer*0.4) * devicePixelRatio;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [size, color]);
  return <canvas ref={ref} style={{width:size, height:size, ...style}} />;
};

// ----- 暴露给所有 scene -----
Object.assign(window, { fakeSpectrum });
