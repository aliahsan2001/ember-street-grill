/* Deals: a wooden lazy Susan carrying the platters. Drag to spin with momentum; it settles
   with the nearest platter facing you and reports which one landed. */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

function woodTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(512, 512, 20, 512, 512, 512);
  grd.addColorStop(0, '#8a5530');
  grd.addColorStop(1, '#5a3218');
  g.fillStyle = grd;
  g.fillRect(0, 0, 1024, 1024);
  // growth rings with a little wobble, then fine grain
  for (let r = 12; r < 520; r += 6 + Math.random() * 9) {
    g.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.05) {
      const rr = r + Math.sin(a * 3 + r) * 2.4 + Math.sin(a * 7) * 1.2;
      const x = 512 + Math.cos(a) * rr, y = 512 + Math.sin(a) * rr;
      a === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.strokeStyle = `rgba(40,18,6,${0.12 + Math.random() * 0.18})`;
    g.lineWidth = 1 + Math.random() * 2;
    g.stroke();
  }
  for (let i = 0; i < 1400; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 510;
    g.fillStyle = `rgba(${Math.random() > 0.5 ? '255,220,180' : '30,12,4'},${Math.random() * 0.06})`;
    g.fillRect(512 + Math.cos(a) * r, 512 + Math.sin(a) * r, 1 + Math.random() * 3, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function platterTexture(src, onReady) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  // hammered brass thaal rim
  const rim = g.createRadialGradient(256, 256, 180, 256, 256, 256);
  rim.addColorStop(0, '#7a5524');
  rim.addColorStop(0.5, '#e2b56a');
  rim.addColorStop(1, '#8c6128');
  g.fillStyle = rim;
  g.beginPath(); g.arc(256, 256, 256, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 260; i++) {
    const a = Math.random() * Math.PI * 2, r = 210 + Math.random() * 44;
    g.fillStyle = `rgba(255,240,200,${Math.random() * 0.25})`;
    g.beginPath(); g.arc(256 + Math.cos(a) * r, 256 + Math.sin(a) * r, 2 + Math.random() * 3, 0, Math.PI * 2); g.fill();
  }
  const img = new Image();
  img.onload = () => {
    g.save();
    g.beginPath(); g.arc(256, 256, 206, 0, Math.PI * 2); g.clip();
    const s = Math.min(img.width, img.height);
    g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 50, 50, 412, 412);
    g.restore();
    t.needsUpdate = true;
    onReady?.();
  };
  img.src = src;
  return t;
}

export function mountSusan(canvas, { images, onLand }) {
  const wrap = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);

  scene.add(new THREE.HemisphereLight(0xffe8d0, 0x1a0e08, 0.55));
  const spot = new THREE.SpotLight(0xffd2a0, 60, 20, 0.7, 0.6, 1.6);
  spot.position.set(1.5, 8, 3);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -0.0004;
  const ember = new THREE.PointLight(0xff6a1f, 12, 12, 1.6);
  ember.position.set(-4, 1.5, 2);
  scene.add(spot, spot.target, ember);

  // soft contact shadow on the table
  const shadowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(128, 128, 30, 128, 128, 128);
    grd.addColorStop(0, 'rgba(0,0,0,.75)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = -0.42;
  scene.add(contact);

  const spinner = new THREE.Group();
  scene.add(spinner);
  const wood = woodTexture();
  const board = new THREE.Mesh(
    new THREE.CylinderGeometry(3.3, 3.3, 0.2, 128),
    [new THREE.MeshStandardMaterial({ color: '#4a2812', roughness: 0.6 }), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.42, metalness: 0.02 }), new THREE.MeshStandardMaterial({ color: '#2a160a' })]
  );
  board.receiveShadow = true;
  spinner.add(board);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.06, 12, 128), new THREE.MeshStandardMaterial({ color: '#c9944c', metalness: 1, roughness: 0.25 }));
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 0.1;
  spinner.add(lip);
  const bearing = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.3, 64), new THREE.MeshStandardMaterial({ color: '#1c1715', metalness: 0.9, roughness: 0.35 }));
  bearing.position.y = -0.26;
  scene.add(bearing);

  const N = images.length, R = 2.15, step = (Math.PI * 2) / N;
  const plates = images.map((src, i) => {
    const top = new THREE.MeshStandardMaterial({ map: platterTexture(src, render), roughness: 0.38, metalness: 0.25 });
    const side = new THREE.MeshStandardMaterial({ color: '#b98a45', metalness: 1, roughness: 0.28 });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.8, 0.12, 64), [side, top, side]);
    const a = i * step;
    m.position.set(Math.sin(a) * R, 0.17, Math.cos(a) * R);
    m.rotation.y = a;
    m.castShadow = true;
    spinner.add(m);
    return m;
  });

  /* ---------- spin physics ---------- */
  let angle = 0, vel = 0, target = 0, dragging = false, lastX = 0, lastT = 0, landed = -1, raf = 0, running = false;
  const activeIndex = () => ((Math.round(-angle / step) % N) + N) % N;

  function goTo(i) {
    // shortest way round to platter i
    const cur = -angle / step;
    let diff = ((i - cur) % N + N) % N;
    if (diff > N / 2) diff -= N;
    target = -(cur + diff) * step;
    vel = 0;
    kick();
  }

  const onDown = (e) => {
    dragging = true;
    lastX = e.clientX;
    lastT = performance.now();
    vel = 0;
    canvas.setPointerCapture(e.pointerId);
    wrap.classList.add('is-dragging');
    kick();
  };
  const onMove = (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    const d = (dx / wrap.clientWidth) * 4.2;
    angle += d;
    vel = d / Math.max(8, now - lastT) * 16;
    lastX = e.clientX;
    lastT = now;
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    wrap.classList.remove('is-dragging');
    // where the spin will coast to, rounded to the nearest platter
    const coast = angle + vel * 9;
    target = Math.round(coast / step) * step;
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  function layout() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const small = w < 560;
    camera.fov = small ? 42 : 33;
    camera.position.set(0, small ? 6.6 : 5.6, small ? 9.4 : 9.4);
    camera.lookAt(0, -0.35, 0.5);
    camera.updateProjectionMatrix();
    render();
  }
  const ro = new ResizeObserver(layout);
  ro.observe(wrap);

  function render() {
    renderer.render(scene, camera);
  }

  let t = 0;
  function frame() {
    t += 1 / 60;
    if (!dragging) {
      // spring toward the target with a little overshoot, like a heavy board on a bearing
      vel += (target - angle) * 0.045;
      vel *= 0.82;
      angle += vel;
    }
    spinner.rotation.y = angle;
    plates.forEach((p, i) => { p.position.y = 0.17 + Math.sin(t * 2 + i) * 0.006; });
    render();
    const settled = !dragging && Math.abs(target - angle) < 0.002 && Math.abs(vel) < 0.0005;
    const idx = activeIndex();
    if (settled && idx !== landed) { landed = idx; onLand(idx); }
    if (!settled || dragging) raf = requestAnimationFrame(frame);
    else running = false;
  }
  function kick() {
    if (!running) { running = true; raf = requestAnimationFrame(frame); }
  }

  layout();
  onLand(0);
  landed = 0;

  return {
    goTo,
    next: () => goTo((activeIndex() + 1) % N),
    prev: () => goTo((activeIndex() - 1 + N) % N),
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse((o) => { o.geometry?.dispose(); [].concat(o.material || []).forEach((m) => { m.map?.dispose(); m.dispose?.(); }); });
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
