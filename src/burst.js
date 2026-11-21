let burstParts = [];
let burstRaf = 0;

export function spawnBurst(canvas, nx, ny, accent) {
  spawnBurst2D(canvas, nx * window.innerWidth, ny * window.innerHeight, accent);
}

export function spawnBurst2D(canvas, px, py, accent) {
  if (!canvas) return;
  const col = "rgb(" + Math.round(accent[0] * 255) + "," + Math.round(accent[1] * 255) + "," + Math.round(accent[2] * 255) + ")";
  for (let i = 0; i < 46; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = 90 + Math.random() * 340;
    burstParts.push({
      x: px, y: py, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 60,
      life: 0, max: 0.55 + Math.random() * 0.55, size: 1.6 + Math.random() * 3.4,
      col: Math.random() < 0.3 ? "#FFFFFF" : col, shape: Math.random() < 0.4 ? 1 : 0,
    });
  }
  for (let j = 0; j < 10; j++) {
    const a2 = (j / 10) * Math.PI * 2;
    burstParts.push({
      x: px, y: py, vx: Math.cos(a2) * 210, vy: Math.sin(a2) * 210,
      life: 0, max: 0.7, size: 2.4, col: "#FFFFFF", shape: 1,
    });
  }
  if (!burstRaf) burstTick(canvas);
}

function burstTick(canvas) {
  if (!canvas) { burstRaf = 0; return; }
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  if (canvas.width !== Math.round(window.innerWidth * dpr)) {
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) { burstRaf = 0; return; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  let last = performance.now();
  const step = () => {
    const nowT = performance.now();
    const dt = Math.min(0.033, (nowT - last) / 1000); last = nowT;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    burstParts = burstParts.filter((p) => p.life < p.max);
    if (!burstParts.length) { burstRaf = 0; return; }
    burstParts.forEach((p) => {
      p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.985; p.vy = p.vy * 0.985 + 300 * dt;
      const k = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, k);
      ctx.fillStyle = p.col; ctx.strokeStyle = p.col;
      if (p.shape) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(0.785);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * k + 0.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.beginPath(); ctx.moveTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.lineTo(p.x, p.y);
      ctx.lineWidth = 1.2; ctx.globalAlpha = Math.max(0, k * 0.6); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    burstRaf = requestAnimationFrame(step);
  };
  burstRaf = requestAnimationFrame(step);
}
