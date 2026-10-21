/*
 * craftViewer front end.
 *
 * Everything the server sends is already in three.js space (right handed, Y up),
 * see cv/coords.py, so this file never has to think about Unity conventions.
 */
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';

const $ = (id) => document.getElementById(id);
const els = {
  canvas: $('view'),
  rootPath: $('root-path'),
  stats: $('stats'),
  list: $('craft-list'),
  search: $('search'),
  sideFoot: $('sidebar-foot'),
  info: $('craft-info'),
  controls: $('controls'),
  banner: $('banner'),
  progress: $('progress'),
  progressBar: $('progress-bar'),
  progressLabel: $('progress-label'),
  tooltip: $('tooltip'),
  hint: $('hint'),
  reload: $('btn-reload'),
  main: document.querySelector('main'),
};

const state = {
  info: null,
  craft: null,
  craftGroup: null,
  grid: null,
  pickables: [],
  materials: [],
  modelCache: new Map(), // url -> Promise<model>
  loadToken: 0,
  wireframe: false,
  showGrid: true,
  hovered: null,
  userAdjusted: false,
  placeholderMaterial: null,
  unknownMaterial: null,
};

/* ------------------------------------------------------------------ scene */
const renderer = new THREE.WebGLRenderer({
  canvas: els.canvas,
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true, // needed for the screenshot button
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 5000);
camera.position.set(14, 10, 18);

const controls = new OrbitControls(camera, els.canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.4;
controls.maxDistance = 2000;
controls.target.set(0, 5, 0);
controls.addEventListener('start', () => { state.userAdjusted = true; });

scene.add(new THREE.HemisphereLight(0xcfe2ff, 0x1b2433, 1.35));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
keyLight.position.set(8, 14, 10);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0x9dc0ff, 0.9);
fillLight.position.set(-10, 3, -8);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
rimLight.position.set(0, -8, 6);
scene.add(rimLight);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function resize() {
  const rect = els.main.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(resize).observe(els.main);
} else {
  window.addEventListener('resize', resize);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

/* -------------------------------------------------------------------- api */
async function api(path) {
  const res = await fetch(path, { headers: { Accept: 'application/json' } });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) throw new Error((body && body.error) || res.statusText);
  return body;
}

/* --------------------------------------------------------------- sidebar */
function renderCraftList() {
  const query = els.search.value.trim().toLowerCase();
  const crafts = (state.info && state.info.crafts) || [];
  const filtered = crafts.filter((c) => !query || c.file.toLowerCase().includes(query) || c.save.toLowerCase().includes(query));

  els.list.innerHTML = '';
  if (!filtered.length) {
    const note = document.createElement('div');
    note.className = 'empty-note';
    note.innerHTML = crafts.length
      ? 'No craft matches that search.'
      : 'No <code>.craft</code> files found under <code>saves/</code>.<br><br>Use <code>--craft &lt;file-or-folder&gt;</code> to point at a craft outside the KSP folder.';
    els.list.appendChild(note);
    return;
  }

  const groups = new Map();
  for (const craft of filtered) {
    const key = `${craft.save} / ${craft.kind}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(craft);
  }

  for (const [title, items] of groups) {
    const heading = document.createElement('div');
    heading.className = 'group-title';
    heading.textContent = title;
    els.list.appendChild(heading);
    for (const craft of items) {
      const row = document.createElement('div');
      row.className = 'craft';
      row.dataset.path = craft.path;
      row.title = craft.path;
      row.innerHTML = `
        <span class="name">${escapeHtml(craft.file.replace(/\.craft$/i, ''))}</span>
        <span class="badge">${escapeHtml(craft.kind)}</span>
        <span class="count">${craft.partCount ?? '?'}</span>`;
      row.addEventListener('click', () => selectCraft(craft.path));
      els.list.appendChild(row);
    }
  }
  markSelected();
}

function markSelected() {
  const path = state.craft ? state.craft.path : null;
  els.list.querySelectorAll('.craft').forEach((row) => {
    row.classList.toggle('selected', !!path && row.dataset.path === path);
  });
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

/* ------------------------------------------------------------------- info */
async function loadInfo(refresh = false) {
  try {
    const info = await api('/api/info' + (refresh ? '?refresh=1' : ''));
    state.info = info;
    const stats = info.stats || {};
    els.rootPath.textContent = info.root;
    els.rootPath.title = info.root;
    els.stats.innerHTML = `<b>${stats.parts ?? 0}</b> parts &middot; <b>${(info.crafts || []).length}</b> craft files`;
    els.sideFoot.textContent = `${stats.cfgFiles ?? 0} cfg files indexed` + (stats.missingModels ? ` &middot; ${stats.missingModels} missing models` : '');
    if (info.warnings && info.warnings.length) showBanner(info.warnings.join('  •  '));
    else hideBanner();
    renderCraftList();
  } catch (err) {
    showBanner('Could not reach craftViewer backend: ' + err.message);
  }
}

function showBanner(text) {
  els.banner.textContent = text;
  els.banner.classList.remove('hidden');
}

function hideBanner() {
  els.banner.classList.add('hidden');
}

/* ------------------------------------------------------------------ craft */
function selectCraft(path) {
  state.userAdjusted = false;
  location.hash = encodeURIComponent(path);
  loadCraft(path);
}

function showProgress(done, total, label) {
  els.progress.classList.remove('hidden');
  const pct = total ? Math.round((done / total) * 100) : 0;
  els.progressBar.style.width = `${pct}%`;
  els.progressLabel.textContent = label || `${done}/${total}`;
}

function hideProgress() {
  els.progress.classList.add('hidden');
}

function clearCraft() {
  if (state.craftGroup) {
    scene.remove(state.craftGroup);
    disposeTree(state.craftGroup);
  }
  state.craftGroup = null;
  state.craft = null;
  state.pickables = [];
  state.materials = [];
  state.hovered = null;
  els.info.classList.add('hidden');
  els.controls.classList.add('hidden');
  hideTooltip();
}

function disposeTree(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => { if (!m.userData.isPlaceholder) m.dispose(); });
    }
  });
}

function updateCraftInfo(craft) {
  const unknown = craft.unknownParts || [];
  const size = (craft.size || []).map((v) => v.toFixed(2)).join(' × ');
  const bits = [];
  bits.push(`${craft.partCount} parts`);
  if (craft.type) bits.push(craft.type);
  if (size && size !== '0.00 × 0.00 × 0.00') bits.push(`${size} m`);
  if (craft.version) bits.push(`v${craft.version}`);
  els.info.innerHTML = `
    <h2>${escapeHtml(craft.ship || craft.path.split(/[\\/]/).pop())}</h2>
    <div class="meta">${bits.map(escapeHtml).join(' &middot; ')}</div>
    ${unknown.length ? `<div class="warn">${unknown.length} part type${unknown.length === 1 ? '' : 's'} missing from GameData: ${escapeHtml(unknown.slice(0, 4).join(', '))}${unknown.length > 4 ? '…' : ''}</div>` : ''}
    ${craft.description ? `<div class="desc">${escapeHtml(craft.description)}</div>` : ''}`;
  els.info.classList.remove('hidden');
  els.controls.classList.remove('hidden');
}

async function loadCraft(path) {
  const token = ++state.loadToken;
  clearCraft();
  hideBanner();
  showProgress(0, 1, 'reading craft…');
  try {
    const craft = await api('/api/craft?path=' + encodeURIComponent(path));
    if (token !== state.loadToken) return;
    state.craft = craft;
    updateCraftInfo(craft);
    markSelected();
    await buildCraft(craft, token);
  } catch (err) {
    if (token === state.loadToken) {
      showBanner('Could not load craft: ' + err.message);
      hideProgress();
    }
  }
}

/* ------------------------------------------------------------- materials */
function makeMaterial(entry) {
  let color = new THREE.Color(0xb6c0cc);
  if (entry && entry.color && entry.color.length >= 3) {
    color = new THREE.Color().setRGB(entry.color[0], entry.color[1], entry.color[2], THREE.SRGBColorSpace);
    // nearly black parts look like holes; lift them a little
    const lum = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
    if (lum < 0.06) color.lerp(new THREE.Color(0x55595e), 0.7);
  }
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.63,
    metalness: 0.16,
    side: THREE.DoubleSide,
    wireframe: state.wireframe,
  });
  material.userData.baseEmissive = 0x000000;
  state.materials.push(material);
  return material;
}

function placeholderMaterial() {
  if (!state.placeholderMaterial) {
    state.placeholderMaterial = new THREE.MeshStandardMaterial({
      color: 0xd08a2a,
      roughness: 0.8,
      metalness: 0.05,
      transparent: true,
      opacity: 0.55,
      wireframe: state.wireframe,
    });
    state.placeholderMaterial.userData.isPlaceholder = true;
    state.placeholderMaterial.userData.baseEmissive = 0x000000;
  }
  return state.placeholderMaterial;
}

/* -------------------------------------------------------------- geometry */
function buildMeshObject(mesh, materials) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(mesh.v, 3));
  if (mesh.n && mesh.n.length === mesh.v.length) {
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(mesh.n, 3));
  }
  if (mesh.uv && mesh.uv.length / 2 === mesh.v.length / 3) {
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(mesh.uv, 2));
  }
  geometry.setIndex(new THREE.Uint32BufferAttribute(mesh.i, 1));

  const groups = mesh.s || [];
  if (groups.length) {
    const highest = groups.reduce((max, g) => Math.max(max, g.material | 0), 0);
    while (materials.length <= highest) materials.push(makeMaterial(null));
    geometry.clearGroups();
    for (const group of groups) geometry.addGroup(group.start, group.count, group.material | 0);
  }
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const object = new THREE.Mesh(geometry, materials);
  object.userData.pickable = true;
  state.pickables.push(object);
  return object;
}

function buildNode(node, materials) {
  const group = new THREE.Group();
  group.position.fromArray(node.pos || [0, 0, 0]);
  group.quaternion.fromArray(node.rot || [0, 0, 0, 1]);
  group.scale.fromArray(node.scale || [1, 1, 1]);
  if (node.mesh && !node.collider) group.add(buildMeshObject(node.mesh, materials));
  for (const child of node.children || []) group.add(buildNode(child, materials));
  return group;
}

function buildModel(modelData) {
  const group = new THREE.Group();
  if (!modelData || modelData.error || !modelData.root) return group;
  const entries = (modelData.materials && modelData.materials.length) ? modelData.materials : [null];
  const materials = entries.map(makeMaterial);
  group.add(buildNode(modelData.root, materials));
  return group;
}

function hasGeometry(object) {
  let found = false;
  object.traverse((child) => {
    if (child.isMesh && child.geometry && child.geometry.attributes.position) found = true;
  });
  return found;
}

function addPlaceholder(parent) {
  const geometry = new THREE.BoxGeometry(1.15, 1.15, 1.15);
  const mesh = new THREE.Mesh(geometry, placeholderMaterial());
  mesh.userData.pickable = true;
  state.pickables.push(mesh);
  parent.add(mesh);
}

function loadModel(url) {
  if (!state.modelCache.has(url)) {
    const promise = api(url).catch((err) => ({ error: err.message }));
    state.modelCache.set(url, promise);
  }
  return state.modelCache.get(url);
}

async function buildCraft(craft, token) {
  const group = new THREE.Group();
  state.craftGroup = group;
  scene.add(group);

  const modelPromises = new Map(); // url -> promise, shared by identical part types
  const jobs = [];

  for (const part of craft.parts) {
    const partGroup = new THREE.Group();
    partGroup.position.fromArray(part.pos);
    partGroup.quaternion.fromArray(part.rot);
    partGroup.scale.setScalar(part.scale || 1);
    partGroup.userData.part = part;
    group.add(partGroup);

    if (part.unknown || !part.models || !part.models.length) {
      addPlaceholder(partGroup);
      continue;
    }

    const url = part.models[0].url;
    if (!modelPromises.has(url)) modelPromises.set(url, loadModel(url));
    jobs.push(
      modelPromises
        .get(url)
        .then((response) => {
          if (token !== state.loadToken) return;
          const models = (response && response.models) || [];
          if (!models.length) {
            addPlaceholder(partGroup);
            return;
          }
          let added = 0;
          for (const entry of models) {
            const model = buildModel(entry.data);
            if (!hasGeometry(model)) continue; // model parsed but has no renderable mesh
            const holder = new THREE.Group();
            holder.position.fromArray(entry.position || [0, 0, 0]);
            holder.quaternion.fromArray(entry.rotation || [0, 0, 0, 1]);
            holder.scale.fromArray(entry.scale || [1, 1, 1]);
            holder.add(model);
            partGroup.add(holder);
            added += 1;
          }
          if (!added) addPlaceholder(partGroup);
        })
        .catch(() => {
          if (token === state.loadToken) addPlaceholder(partGroup);
        })
    );
  }

  // frame early using part origins so something sensible is on screen
  frameCraft();

  const urls = [...modelPromises.keys()];
  const total = urls.length;
  let done = 0;
  showProgress(0, Math.max(total, 1), `loading part models 0/${total}`);
  await Promise.all(
    urls.map((url) =>
      modelPromises.get(url).then(() => {
        done += 1;
        if (token === state.loadToken) showProgress(done, total, `loading part models ${done}/${total}`);
      })
    )
  );
  await Promise.all(jobs);
  if (token !== state.loadToken) return;
  hideProgress();
  if (!state.userAdjusted) frameCraft();
  applyWireframe();
  if (!craft.parts.length) showBanner('This craft has no parts.');
}

/* ------------------------------------------------------------------ view */
function frameCraft() {
  const root = state.craftGroup;
  if (!root) return;
  const box = new THREE.Box3().setFromObject(root, true);
  if (box.isEmpty() || !isFinite(box.min.x)) return;
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const center = sphere.center.clone();
  const radius = Math.max(sphere.radius, 0.5);
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const distance = (radius / Math.sin(fov / 2)) * 1.12;
  const direction = new THREE.Vector3(0.78, 0.42, 1).normalize();

  controls.target.copy(center);
  camera.position.copy(center).addScaledVector(direction, distance);
  camera.near = Math.max(0.05, distance / 800);
  camera.far = distance * 30 + radius * 20;
  camera.updateProjectionMatrix();
  controls.update();
  state.userAdjusted = false;
  placeGrid(box);
}

function placeGrid(box) {
  if (!state.showGrid) return;
  const size = Math.max(6, box.getSize(new THREE.Vector3()).length() * 1.6);
  if (state.grid) {
    scene.remove(state.grid);
    state.grid.geometry.dispose();
    state.grid.material.dispose();
  }
  const grid = new THREE.GridHelper(size, 24, 0x3d6c8f, 0x1e2a38);
  grid.position.set(0, box.min.y - 0.01, 0);
  grid.material.transparent = true;
  grid.material.opacity = 0.55;
  state.grid = grid;
  scene.add(grid);
}

function applyWireframe() {
  for (const material of state.materials) material.wireframe = state.wireframe;
  if (state.placeholderMaterial) state.placeholderMaterial.wireframe = state.wireframe;
  els.controls.querySelector('[data-action="wireframe"]').classList.toggle('active', state.wireframe);
}

/* ---------------------------------------------------------------- hover */
function partGroupFor(object) {
  let node = object;
  while (node) {
    if (node.userData && node.userData.part) return node;
    node = node.parent;
  }
  return null;
}

function setHighlight(group, on) {
  if (!group) return;
  group.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    const mats = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of mats) {
      if (!material.emissive) continue;
      if (on) {
        if (material.userData.highlighted) continue;
        material.userData.originalEmissive = material.emissive.getHex();
        material.emissive.setHex(0x1d4f6e);
        material.userData.highlighted = true;
      } else if (material.userData.highlighted) {
        material.emissive.setHex(material.userData.originalEmissive || 0x000000);
        material.userData.highlighted = false;
      }
    }
  });
}

function hideTooltip() {
  els.tooltip.classList.add('hidden');
}

function onPointerMove(event) {
  if (!state.craftGroup) return;
  const rect = els.canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(state.pickables, false);
  const hit = hits.length ? hits[0] : null;
  const group = hit ? partGroupFor(hit.object) : null;

  if (group !== state.hovered) {
    setHighlight(state.hovered, false);
    state.hovered = group;
    setHighlight(group, true);
  }

  if (!group) {
    hideTooltip();
    return;
  }

  const part = group.userData.part;
  const title = part.title || part.name;
  const missing = part.unknown ? ' <span class="sub">(no model in GameData)</span>' : '';
  els.tooltip.innerHTML = `<div>${escapeHtml(title)}${missing}</div><div class="sub">${escapeHtml(part.name)} &middot; stage ${part.stage}</div>`;
  const mainRect = els.main.getBoundingClientRect();
  els.tooltip.style.left = `${event.clientX - mainRect.left}px`;
  els.tooltip.style.top = `${event.clientY - mainRect.top}px`;
  els.tooltip.classList.remove('hidden');
}

els.canvas.addEventListener('pointermove', onPointerMove);
els.canvas.addEventListener('pointerleave', () => {
  setHighlight(state.hovered, false);
  state.hovered = null;
  hideTooltip();
});

/* --------------------------------------------------------------- actions */
function action(name) {
  if (name === 'frame') frameCraft();
  if (name === 'wireframe') {
    state.wireframe = !state.wireframe;
    applyWireframe();
  }
  if (name === 'grid') {
    state.showGrid = !state.showGrid;
    if (state.grid) state.grid.visible = state.showGrid;
    els.controls.querySelector('[data-action="grid"]').classList.toggle('active', state.showGrid);
  }
  if (name === 'shot') screenshot();
}

function screenshot() {
  renderer.render(scene, camera);
  const link = document.createElement('a');
  const name = (state.craft && state.craft.ship ? state.craft.ship : 'craft').replace(/[^\w.-]+/g, '_');
  link.download = `${name}.png`;
  link.href = els.canvas.toDataURL('image/png');
  link.click();
}

els.controls.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (button) action(button.dataset.action);
});

els.search.addEventListener('input', renderCraftList);

els.reload.addEventListener('click', async () => {
  state.modelCache.clear();
  await loadInfo(true);
  if (state.craft) loadCraft(state.craft.path);
});

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement) return;
  if (event.key === 'f' || event.key === 'F') action('frame');
  if (event.key === 'w' || event.key === 'W') action('wireframe');
  if (event.key === 'g' || event.key === 'G') action('grid');
  if (event.key === 's' || event.key === 'S') action('shot');
});

/* ------------------------------------------------------------------ boot */
async function boot() {
  resize();
  animate();
  await loadInfo();
  els.controls.querySelector('[data-action="grid"]').classList.add('active');

  let initial = (state.info.crafts || [])[0];
  const hash = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (hash) {
    const match = (state.info.crafts || []).find((c) => c.path === hash);
    if (match) initial = match;
  } else if (initial) {
    // prefer a VAB craft with the most parts: that is usually the interesting one
    const best = (state.info.crafts || []).slice().sort((a, b) => (b.partCount || 0) - (a.partCount || 0))[0];
    if (best) initial = best;
  }
  if (initial) loadCraft(initial.path);
  else hideProgress();
}

// handy for debugging in the browser console (and for the headless smoke test)
window.craftViewer = { state, scene, camera, controls, renderer, THREE, frameCraft };

boot();
