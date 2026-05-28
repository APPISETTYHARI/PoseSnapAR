import { PLACES, CONN } from './poses.js';

/* ═══════════════════════════════════════════
   APP STATE
═══════════════════════════════════════════ */
let detector = null, stream = null;
let place = null, poseIdx = 0;
let facingMode = 'user';
let raf = null;
let smoothScore = 0, burstShown = false;
let wakeLock = null;

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

/* ═══════════════════════════════════════════
   LOADING
═══════════════════════════════════════════ */
function setLoad(msg, pct) {
  document.getElementById('ldMsg').textContent = msg;
  document.getElementById('ldFill').style.width = pct + '%';
}

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
async function init() {
  setLoad('Loading TensorFlow.js…', 20);
  try {
    await tf.setBackend('webgl');
    await tf.ready();
  } catch (e) {
    try {
      await tf.setBackend('wasm');
      await tf.ready();
    } catch (e2) {
      await tf.setBackend('cpu');
      await tf.ready();
    }
  }

  setLoad('Loading MoveNet model…', 55);
  try {
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
    );
    setLoad('Ready!', 100);
  } catch (e) {
    setLoad('Model unavailable — guide only', 100);
    console.warn('Pose detection unavailable:', e);
  }

  setTimeout(() => {
    document.getElementById('loadScreen').classList.add('gone');
    buildHome();
    document.getElementById('homeScreen').style.display = 'block';
  }, 600);
}

/* ═══════════════════════════════════════════
   HOME SCREEN
═══════════════════════════════════════════ */
function buildHome() {
  const grid = document.getElementById('placeGrid');
  grid.innerHTML = '';
  PLACES.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'pcard';
    const em = p.label.split(' ')[0];
    const nm = p.label.slice(p.label.indexOf(' ') + 1);
    btn.innerHTML = `
      <div class="pcard-emoji">${em}</div>
      <div class="pcard-name">${nm}</div>
      <div class="pcard-count">${p.poses.length} poses</div>
      <div class="pcard-glow" style="background:radial-gradient(circle at bottom right,${p.color}28,transparent 70%)"></div>`;
    btn.addEventListener('click', () => enterCamera(p));
    grid.appendChild(btn);
  });
}

/* ═══════════════════════════════════════════
   CAMERA FLOW
═══════════════════════════════════════════ */
async function enterCamera(p) {
  place = p;
  poseIdx = 0;
  smoothScore = 0;
  burstShown = false;
  document.getElementById('homeScreen').style.display = 'none';
  document.getElementById('camScreen').style.display = 'block';
  document.getElementById('placeChip').textContent = p.label;
  buildDots();
  updateCard();
  await openCam();
  fitCanvas();
  requestWakeLock();
  raf = requestAnimationFrame(loop);
}

async function openCam() {
  if (stream) stream.getTracks().forEach(t => t.stop());
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    video.srcObject = stream;
    await new Promise(r => { video.onloadedmetadata = r; });
    video.play();
  } catch (e) {
    alert('Camera permission is required. Please allow camera access and reload.');
  }
}

function fitCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', fitCanvas);

/* ═══════════════════════════════════════════
   WAKE LOCK (prevent screen dimming)
═══════════════════════════════════════════ */
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch (e) {
    console.log('Wake lock not available');
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
}

/* ═══════════════════════════════════════════
   HAPTIC FEEDBACK
═══════════════════════════════════════════ */
function vibrate(pattern) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

/* ═══════════════════════════════════════════
   MAIN LOOP
═══════════════════════════════════════════ */
async function loop() {
  if (!place) return;
  fitCanvas();
  const W = canvas.width, H = canvas.height;

  /* ─ draw video (cover + mirror for selfie) ─ */
  const vW = video.videoWidth || 1, vH = video.videoHeight || 1;
  const vRatio = vW / vH, cRatio = W / H;
  let sx = 0, sy = 0, sw = vW, sh = vH;
  if (vRatio > cRatio) { sw = vH * cRatio; sx = (vW - sw) / 2; }
  else { sh = vW / cRatio; sy = (vH - sh) / 2; }

  ctx.save();
  if (facingMode === 'user') { ctx.translate(W, 0); ctx.scale(-1, 1); }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, W, H);
  ctx.restore();

  /* ─ subtle dark vignette ─ */
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * .28, W / 2, H / 2, H * .72);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  /* ─ build target skeleton in canvas px ─ */
  const tPose = place.poses[poseIdx];
  const tKps = tPose.kp.map(([nx, ny]) => ({ x: nx * W, y: ny * H, score: 1 }));

  /* ─ detect user skeleton ─ */
  let uKps = null;
  if (detector && video.readyState >= 2) {
    try {
      const poses = await detector.estimatePoses(video, { flipHorizontal: false });
      if (poses.length > 0) {
        uKps = poses[0].keypoints.map(kp => {
          const rawX = kp.x / vW, rawY = kp.y / vH;
          const cx = facingMode === 'user' ? (1 - rawX) * W : rawX * W;
          const cy = rawY * H;
          return { x: cx, y: cy, score: kp.score ?? 0 };
        });
      }
    } catch (e) { /* ignore detection errors */ }
  }

  /* ─ draw target skeleton (glowing orange dashes) ─ */
  drawSkel(tKps, 'rgba(255,140,60,0.5)', 'rgba(255,140,60,0.9)', 4.5, true);

  /* ─ draw user skeleton (solid white/lime) ─ */
  if (uKps) drawSkel(uKps, 'rgba(255,255,255,0.35)', 'rgba(200,255,200,0.92)', 3, false);

  /* ─ match score ─ */
  if (uKps) {
    const raw = calcMatch(uKps, tKps);
    smoothScore = smoothScore * 0.72 + raw * 0.28;
  } else {
    smoothScore = smoothScore * 0.95;
  }
  updateMatchUI(smoothScore);

  /* ─ match burst ─ */
  const burst = document.getElementById('matchBurst');
  if (smoothScore > 82 && !burstShown) {
    burstShown = true;
    burst.classList.add('show');
    vibrate([50, 30, 100]); // haptic on match!
  } else if (smoothScore < 70) {
    burstShown = false;
    burst.classList.remove('show');
  }

  raf = requestAnimationFrame(loop);
}

/* ═══════════════════════════════════════════
   SKELETON DRAWING
═══════════════════════════════════════════ */
function drawSkel(kps, lineCol, dotCol, lw, isTarget) {
  if (!kps || kps.length < 17) return;
  const thresh = isTarget ? -1 : 0.25;

  ctx.save();
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';

  CONN.forEach(([a, b]) => {
    const ka = kps[a], kb = kps[b];
    if (!ka || !kb) return;
    if (!isTarget && (ka.score < thresh || kb.score < thresh)) return;

    ctx.strokeStyle = lineCol;
    ctx.shadowColor = isTarget ? 'rgba(255,120,50,.7)' : 'rgba(180,255,180,.4)';
    ctx.shadowBlur = isTarget ? 14 : 8;

    if (isTarget) { ctx.setLineDash([9, 7]); }
    else { ctx.setLineDash([]); }

    ctx.beginPath();
    ctx.moveTo(ka.x, ka.y);
    ctx.lineTo(kb.x, kb.y);
    ctx.stroke();
  });

  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  /* joints */
  kps.forEach((kp, i) => {
    if (!kp) return;
    if (!isTarget && kp.score < thresh) return;
    const r = isTarget ? 5.5 : 4;
    ctx.fillStyle = dotCol;
    ctx.shadowColor = dotCol;
    ctx.shadowBlur = isTarget ? 16 : 10;
    ctx.beginPath();
    ctx.arc(kp.x, kp.y, r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.shadowBlur = 0;
  ctx.restore();
}

/* ═══════════════════════════════════════════
   MATCH CALCULATION
═══════════════════════════════════════════ */
function calcMatch(user, target) {
  const bodyIdx = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

  const uVis = bodyIdx.map(i => user[i]).filter(k => k && k.score > 0.28);
  if (uVis.length < 4) return smoothScore * 0.9;

  const bbox = pts => {
    const xs = pts.map(k => k.x), ys = pts.map(k => k.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    return { minX, minY, w: maxX - minX || 1, h: maxY - minY || 1 };
  };

  const uPts = bodyIdx.map(i => user[i]).filter(k => k && k.score > 0.28);
  const tPts = bodyIdx.map(i => target[i]);
  const uB = bbox(uPts), tB = bbox(tPts);

  let totalD = 0, count = 0;
  bodyIdx.forEach(i => {
    const uk = user[i], tk = target[i];
    if (!uk || uk.score < 0.28 || !tk) return;
    const unx = (uk.x - uB.minX) / uB.w, uny = (uk.y - uB.minY) / uB.h;
    const tnx = (tk.x - tB.minX) / tB.w, tny = (tk.y - tB.minY) / tB.h;
    totalD += Math.sqrt((unx - tnx) ** 2 + (uny - tny) ** 2);
    count++;
  });

  if (count === 0) return smoothScore * 0.9;
  const score = Math.max(0, Math.min(100, (1 - totalD / count * 1.8) * 100));
  return score;
}

/* ─ Update match UI ─ */
function updateMatchUI(sc) {
  const pct = Math.round(sc);
  const color = pct > 78 ? '#4CAF50' : pct > 50 ? '#FFB347' : '#FF6B35';
  document.getElementById('matchPct').textContent = pct + '%';
  document.getElementById('matchPct').style.color = color;
  document.getElementById('mBarFill').style.width = pct + '%';
  document.getElementById('mBarFill').style.background = color;
}

/* ═══════════════════════════════════════════
   POSE CARD UI
═══════════════════════════════════════════ */
function buildDots() {
  const c = document.getElementById('pdots');
  c.innerHTML = '';
  place.poses.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'pdot';
    d.style.width = i === poseIdx ? '22px' : '6px';
    d.style.background = i === poseIdx ? (place.color || '#FF6B35') : 'rgba(255,255,255,.18)';
    d.addEventListener('click', () => goPose(i));
    c.appendChild(d);
  });
}

function updateCard() {
  const p = place.poses[poseIdx];
  document.getElementById('poseEmoji').textContent = p.emoji;
  document.getElementById('poseName').textContent = p.name;
  document.getElementById('poseHint').textContent = p.hint;
  buildDots();
}

function goPose(i) {
  poseIdx = i;
  smoothScore = 0;
  burstShown = false;
  document.getElementById('matchBurst').classList.remove('show');
  updateCard();
  vibrate(15); // light tap
}

/* ═══════════════════════════════════════════
   CAPTURE / SCREENSHOT
═══════════════════════════════════════════ */
function capturePhoto() {
  // Flash effect
  const flash = document.getElementById('flashOverlay');
  flash.classList.add('flash');
  setTimeout(() => flash.classList.remove('flash'), 200);

  // Haptic
  vibrate(30);

  // Create a temporary canvas with the current frame
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(canvas, 0, 0);

  // Convert to blob and download
  tempCanvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PoseSnap_${place.id}_${place.poses[poseIdx].name.replace(/\s/g, '_')}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Show toast
    showToast('📸 Photo saved!');
  }, 'image/png');
}

/* ═══════════════════════════════════════════
   TOAST NOTIFICATION
═══════════════════════════════════════════ */
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

/* ═══════════════════════════════════════════
   SWIPE GESTURES (on pose card)
═══════════════════════════════════════════ */
function setupSwipeGestures() {
  const card = document.getElementById('poseCard');
  let startX = 0, startY = 0, swiping = false;

  card.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    swiping = true;
  }, { passive: true });

  card.addEventListener('touchend', e => {
    if (!swiping || !place) return;
    swiping = false;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;

    // Only trigger if horizontal swipe is dominant and > 50px
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) {
        // Swipe left → next pose
        goPose((poseIdx + 1) % place.poses.length);
      } else {
        // Swipe right → prev pose
        goPose((poseIdx - 1 + place.poses.length) % place.poses.length);
      }
    }
  }, { passive: true });
}

/* ═══════════════════════════════════════════
   EVENT HANDLERS
═══════════════════════════════════════════ */
document.getElementById('nextBtn').addEventListener('click', () => {
  if (place) goPose((poseIdx + 1) % place.poses.length);
});

document.getElementById('prevBtn').addEventListener('click', () => {
  if (place) goPose((poseIdx - 1 + place.poses.length) % place.poses.length);
});

document.getElementById('backBtn').addEventListener('click', () => {
  cancelAnimationFrame(raf);
  if (stream) stream.getTracks().forEach(t => t.stop());
  releaseWakeLock();
  place = null;
  smoothScore = 0;
  document.getElementById('camScreen').style.display = 'none';
  document.getElementById('homeScreen').style.display = 'block';
});

document.getElementById('flipBtn').addEventListener('click', async () => {
  facingMode = facingMode === 'user' ? 'environment' : 'user';
  await openCam();
});

document.getElementById('captureBtn').addEventListener('click', capturePhoto);

// Bottom sheet collapse/expand
let cardCollapsed = false;
document.getElementById('hdl').addEventListener('click', () => {
  cardCollapsed = !cardCollapsed;
  document.getElementById('poseCard').style.transform =
    cardCollapsed ? 'translateY(calc(100% - 28px))' : 'translateY(0)';
});

// Android back button (for Capacitor)
document.addEventListener('backbutton', () => {
  if (document.getElementById('camScreen').style.display === 'block') {
    document.getElementById('backBtn').click();
  }
});

// Setup swipe gestures
setupSwipeGestures();

/* ─ Kick off ─ */
init();
