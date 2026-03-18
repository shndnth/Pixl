(function () {
  // ==========================================
  // DOM Elements
  // ==========================================
  const stagePanel = document.getElementById('stagePanel');
  const canvasWrap = document.querySelector('.canvas-wrap');
  const countChip = document.getElementById('countChip');
  const modeChip = document.getElementById('modeChip');
  const canvas = document.getElementById('mainCanvas');
  const ctx = canvas.getContext('2d');
  
  const gridSelect = document.getElementById('gridSelect');
  const styleSelect = document.getElementById('styleSelect');
  const paletteSelect = document.getElementById('paletteSelect');
  const mirrorSelect = document.getElementById('mirrorSelect');
  const effectSelect = document.getElementById('effectSelect');
  const backgroundSelect = document.getElementById('backgroundSelect');
  const densityRange = document.getElementById('densityRange');
  const densityValue = document.getElementById('densityValue');
  const seedInput = document.getElementById('seedInput');
  const chaosToggle = document.getElementById('chaosToggle');
  const lockSeedToggle = document.getElementById('lockSeedToggle');
  const autoToggle = document.getElementById('autoToggle');
  const speedSelect = document.getElementById('speedSelect');
  
  const generateBtn = document.getElementById('generateBtn');
  const remixBtn = document.getElementById('remixBtn');
  const surpriseBtn = document.getElementById('surpriseBtn');
  const batchBtn = document.getElementById('batchBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const copySeedBtn = document.getElementById('copySeedBtn');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const prevHistoryBtn = document.getElementById('prevHistoryBtn');
  const nextHistoryBtn = document.getElementById('nextHistoryBtn');
  const historyStrip = document.getElementById('historyStrip');
  const metaInfo = document.getElementById('metaInfo');

  // ==========================================
  // Global State & Constants
  // ==========================================
  const CANVAS_SIZE = 420;
  const HISTORY_LIMIT = 5;
  const history = [];
  const customSelectUIs = [];
  
  let selectedHistoryIndex = -1;
  let generationCount = 0;
  let autoTimer = null;

  ctx.imageSmoothingEnabled = false;

  // ==========================================
  // Utilities & Math
  // ==========================================
  const generateSeed = () => 'pixl-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36);
  
  const hashString = (str) => {
    let x = 2166136261;
    for (let i = 0; i < str.length; i++) {
      x ^= str.charCodeAt(i);
      x = Math.imul(x, 16777619);
    }
    return x >>> 0;
  };

  const createRNG = (seedInt) => () => {
    seedInt += 0x6d2b79f5;
    let r = Math.imul(seedInt ^ (seedInt >>> 15), 1 | seedInt);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };

  const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
  const randomInt = (rng, min, max) => Math.floor(rng() * (max - min + 1)) + min;
  const pickRandom = (rng, list) => list[Math.floor(rng() * list.length)];
  const toHSL = (h, s, l) => `hsl(${h}, ${s}%, ${l}%)`;

  // ==========================================
  // UI Responsiveness & Custom Elements
  // ==========================================
  function fitCanvas() {
    const panelW = Math.max(160, stagePanel.clientWidth - 28);
    const panelH = Math.max(160, stagePanel.clientHeight - 74);
    const isPhone = window.innerWidth <= 760;
    
    const viewportCap = isPhone
      ? Math.min(window.innerWidth * 0.88, window.innerHeight * 0.5)
      : window.innerWidth <= 1100
        ? window.innerWidth * 0.5
        : window.innerWidth * 0.34;
        
    const minSize = 160;
    const size = clamp(Math.floor(Math.min(panelW, panelH, viewportCap, 430)), minSize, 430);
    
    document.documentElement.style.setProperty('--canvas-size', size + 'px');
  }

  function pulseCanvas() {
    canvasWrap.classList.remove('pulse');
    void canvasWrap.offsetWidth;
    canvasWrap.classList.add('pulse');
  }

  function closeCustomSelects(except) {
    for (const ui of customSelectUIs) {
      if (except && ui.host === except) continue;
      ui.host.classList.remove('open');
    }
  }

  function enhanceSelect(selectElement) {
    const host = document.createElement('div');
    host.className = 'custom-select';
    selectElement.parentNode.insertBefore(host, selectElement);
    host.appendChild(selectElement);
    selectElement.classList.add('native-select-hidden');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'custom-select-trigger';
    host.appendChild(trigger);

    const menu = document.createElement('div');
    menu.className = 'custom-select-menu';
    host.appendChild(menu);

    const buildMenu = () => {
      menu.innerHTML = '';
      for (const opt of selectElement.options) {
        const optionBtn = document.createElement('button');
        optionBtn.type = 'button';
        optionBtn.className = 'custom-select-option';
        optionBtn.textContent = opt.textContent;
        optionBtn.dataset.value = opt.value;
        optionBtn.disabled = opt.disabled;
        
        optionBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (opt.disabled) return;
          selectElement.value = opt.value;
          selectElement.dispatchEvent(new Event('change', { bubbles: true }));
          closeCustomSelects();
        });
        menu.appendChild(optionBtn);
      }
    };

    const sync = () => {
      const active = selectElement.options[selectElement.selectedIndex];
      trigger.textContent = active ? active.textContent : '';
      for (const btn of menu.querySelectorAll('.custom-select-option')) {
        btn.classList.toggle('is-selected', btn.dataset.value === selectElement.value);
      }
    };

    buildMenu();
    sync();
    
    selectElement.addEventListener('change', sync);
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const opening = !host.classList.contains('open');
      closeCustomSelects();
      if (opening) host.classList.add('open');
    });
    
    menu.addEventListener('click', (e) => e.stopPropagation());

    return { host, select: selectElement, sync, buildMenu };
  }

  function initCustomSelects() {
    const selects = document.querySelectorAll('.row select');
    for (const select of selects) {
      customSelectUIs.push(enhanceSelect(select));
    }
    document.addEventListener('click', () => closeCustomSelects());
  }

  function syncCustomSelects() {
    for (const ui of customSelectUIs) ui.sync();
  }

  // ==========================================
  // Core Drawing Logic
  // ==========================================
  function generatePalette(mode, rng) {
    if (mode === 'retro') {
      const sets = [
        ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
        ['#1d2b53', '#7e2553', '#008751', '#ab5236'],
        ['#2e1f27', '#624c66', '#c76b98', '#f6c6a8'],
        ['#051f39', '#2a6f97', '#61a5c2', '#a9d6e5']
      ];
      return pickRandom(rng, sets);
    }
    if (mode === 'sunset') {
      const hue = randomInt(rng, 10, 38);
      return [
        toHSL(hue, 70, 18),
        toHSL(hue + 14, 80, 35),
        toHSL(hue + 24, 88, 54),
        toHSL(hue + 34, 92, 70)
      ];
    }
    if (mode === 'mono') {
      const brightness = randomInt(rng, 28, 54);
      return [
        toHSL(0, 0, clamp(brightness - 24, 6, 80)),
        toHSL(0, 0, clamp(brightness - 10, 6, 80)),
        toHSL(0, 0, clamp(brightness + 6, 6, 90)),
        toHSL(0, 0, clamp(brightness + 22, 6, 96))
      ];
    }
    if (mode === 'neon') {
      const hue = randomInt(rng, 160, 320);
      return [
        toHSL(hue, 94, 14),
        toHSL(hue, 92, 35),
        toHSL((hue + 18) % 360, 100, 54),
        toHSL((hue + 44) % 360, 100, 70)
      ];
    }
    
    const h = randomInt(rng, 0, 359);
    const s = randomInt(rng, 52, 85);
    const l = randomInt(rng, 34, 58);
    
    return [
      toHSL(h, s, clamp(l - 24, 10, 82)),
      toHSL((h + 8) % 360, s, clamp(l - 6, 12, 86)),
      toHSL((h + 20) % 360, clamp(s + 8, 0, 96), clamp(l + 8, 14, 92)),
      toHSL((h + 34) % 360, clamp(s + 14, 0, 100), clamp(l + 20, 16, 96))
    ];
  }

  const makeEmptyGrid = (n) => Array.from({ length: n }, () => Array(n).fill(-1));
  
  const setPixel = (grid, x, y, val) => {
    if (y < 0 || y >= grid.length || x < 0 || x >= grid.length) return;
    grid[y][x] = val;
  };
  
  const colorIndex = (rng) => {
    const r = rng();
    if (r < 0.32) return 0;
    if (r < 0.62) return 1;
    if (r < 0.86) return 2;
    return 3;
  };
  
  const countNeighbors = (matrix, x, y) => {
    let count = 0;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (ox === 0 && oy === 0) continue;
        const ny = y + oy;
        const nx = x + ox;
        if (ny < 0 || ny >= matrix.length || nx < 0 || nx >= matrix.length) continue;
        if (matrix[ny][nx]) count++;
      }
    }
    return count;
  };
  
  function styleSprite(grid, density, chaos, rng) {
    const size = grid.length;
    const mid = chaos ? size : Math.ceil(size / 2);
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < mid; x++) {
        if (rng() > density * (0.82 + (y / size) * 0.16)) continue;
        const c = colorIndex(rng);
        setPixel(grid, x, y, c);
        if (!chaos) setPixel(grid, size - x - 1, y, c);
      }
    }
  }

  function styleQuilt(grid, density, chaos, rng) {
    const size = grid.length;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const checker = ((x >> 1) + (y >> 1)) % 2;
        const wave = Math.sin((x + rng() * 0.4) * 1.06) + Math.cos((y + rng() * 0.4) * 0.9);
        const chance = density * (checker ? 0.9 : 0.58) + (wave > 0 ? 0.12 : -0.05);
        
        if (rng() < chance) {
          setPixel(grid, x, y, (x + y + Math.floor(rng() * 4)) % 4);
        }
      }
    }
  }

  function styleRings(grid, density, chaos, rng) {
    const size = grid.length;
    const center = (size - 1) / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dist = Math.hypot(x - center, y - center);
        const probability = 0.33 + 0.67 * Math.abs(Math.sin(dist * 0.95));
        const chance = density * probability * (chaos ? 1 : 0.9);
        
        if (rng() < chance) {
          setPixel(grid, x, y, (Math.floor(dist + rng() * 2.2)) % 4);
        }
      }
    }
  }

  function styleMaze(grid, density, chaos, rng) {
    const size = grid.length;
    const walkers = Math.max(3, Math.floor(size / 3));
    const steps = Math.floor(size * size * (chaos ? 1.8 : 1.4));
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    
    for (let i = 0; i < walkers; i++) {
      let x = randomInt(rng, 0, size - 1);
      let y = randomInt(rng, 0, size - 1);
      let dir = pickRandom(rng, directions);
      let c = randomInt(rng, 0, 3);
      
      for (let s = 0; s < steps; s++) {
        if (rng() <= density + 0.1) {
          setPixel(grid, x, y, c);
          if (!chaos) setPixel(grid, size - x - 1, y, c);
        }
        if (rng() < 0.26) c = (c + 1) % 4;
        if (rng() < 0.33) dir = pickRandom(rng, directions);
        
        x = clamp(x + dir[0], 0, size - 1);
        y = clamp(y + dir[1], 0, size - 1);
      }
    }
  }

  function styleIslands(grid, density, chaos, rng) {
    const size = grid.length;
    let map = Array.from({ length: size }, () => 
      Array.from({ length: size }, () => rng() < density * (chaos ? 0.84 : 0.76))
    );
    
    for (let t = 0; t < 4; t++) {
      const nextMap = Array.from({ length: size }, () => Array(size).fill(false));
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const neighbors = countNeighbors(map, x, y);
          const isAlive = map[y][x];
          nextMap[y][x] = neighbors >= 5 || (isAlive && neighbors >= 4);
        }
      }
      map = nextMap;
    }
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!map[y][x]) continue;
        const neighbors = countNeighbors(map, x, y);
        const bias = y / size;
        let c = neighbors >= 6 ? 0 : neighbors >= 4 ? 1 : 2;
        
        if (rng() < 0.2 + bias * 0.18) c = 3;
        setPixel(grid, x, y, c);
      }
    }
  }

  function styleTotem(grid, density, chaos, rng) {
    const size = grid.length;
    const segments = randomInt(rng, 3, 6);
    const height = Math.max(2, Math.floor(size / segments));
    const mid = Math.floor(size / 2);
    
    for (let s = 0; s < segments; s++) {
      const top = s * height;
      const bot = Math.min(size - 1, top + height - 1);
      const w = clamp(
        Math.floor((size * (0.18 + rng() * 0.32)) * (1 - s * 0.06)),
        1,
        Math.floor(size / 2)
      );
      const c = randomInt(rng, 0, 3);
      
      for (let y = top; y <= bot; y++) {
        for (let x = -w; x <= w; x++) {
          if (rng() > density + 0.1) continue;
          setPixel(grid, mid + x, y, (c + Math.abs(x) % 2) % 4);
          if (!chaos && rng() < 0.35) setPixel(grid, mid - x, y, (c + 1) % 4);
        }
      }
    }
    
    if (chaos) {
      const spots = Math.floor(size * size * 0.1);
      for (let i = 0; i < spots; i++) {
        setPixel(grid, randomInt(rng, 0, size - 1), randomInt(rng, 0, size - 1), randomInt(rng, 0, 3));
      }
    }
  }

  function generateArt(style, size, density, chaos, rng) {
    const grid = makeEmptyGrid(size);
    if (style === 'quilt') styleQuilt(grid, density, chaos, rng);
    else if (style === 'rings') styleRings(grid, density, chaos, rng);
    else if (style === 'maze') styleMaze(grid, density, chaos, rng);
    else if (style === 'islands') styleIslands(grid, density, chaos, rng);
    else if (style === 'totem') styleTotem(grid, density, chaos, rng);
    else styleSprite(grid, density, chaos, rng);
    return grid;
  }

  function applyMirror(grid, mode) {
    const size = grid.length;
    if (mode === 'vertical' || mode === 'quad') {
      const half = Math.floor(size / 2);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < half; x++) {
          const p = grid[y][x];
          if (p !== -1) grid[y][size - x - 1] = p;
        }
      }
    }
    if (mode === 'horizontal' || mode === 'quad') {
      const half = Math.floor(size / 2);
      for (let y = 0; y < half; y++) {
        for (let x = 0; x < size; x++) {
          const p = grid[y][x];
          if (p !== -1) grid[size - y - 1][x] = p;
        }
      }
    }
  }

  function applyEffect(grid, effectType, rng) {
    const size = grid.length;
    
    if (effectType === 'invert') {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (grid[y][x] >= 0) grid[y][x] = 3 - grid[y][x];
        }
      }
      return;
    }
    
    if (effectType === 'dither') {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const p = grid[y][x];
          if (p < 0) continue;
          if ((x + y) % 2 === 0 && rng() < 0.22) grid[y][x] = Math.max(0, p - 1);
          if ((x + y) % 2 === 1 && rng() < 0.08) grid[y][x] = Math.min(3, p + 1);
        }
      }
      return;
    }
    
    if (effectType === 'outline') {
      const copy = grid.map(row => row.slice());
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (copy[y][x] >= 0) continue;
          const touchesSolid = 
            (y > 0 && copy[y - 1][x] >= 0) ||
            (y < size - 1 && copy[y + 1][x] >= 0) ||
            (x > 0 && copy[y][x - 1] >= 0) ||
            (x < size - 1 && copy[y][x + 1] >= 0);
            
          if (touchesSolid && rng() < 0.74) grid[y][x] = 0;
        }
      }
    }
  }

  // ==========================================
  // Rendering
  // ==========================================
  function drawGridToCanvas(grid, paletteColors, targetCtx) {
    const size = grid.length;
    targetCtx.clearRect(0, 0, size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const p = grid[y][x];
        if (p < 0) continue;
        targetCtx.fillStyle = paletteColors[p];
        targetCtx.fillRect(x, y, 1, 1);
      }
    }
  }

  function paintBackground(mode) {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    if (mode === 'gradient') {
      const g = ctx.createRadialGradient(
        CANVAS_SIZE * 0.35, CANVAS_SIZE * 0.3, CANVAS_SIZE * 0.08,
        CANVAS_SIZE * 0.6, CANVAS_SIZE * 0.62, CANVAS_SIZE * 0.8
      );
      g.addColorStop(0, '#1b2f32');
      g.addColorStop(0.55, '#12171a');
      g.addColorStop(1, '#0f1012');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      return;
    }
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  function renderMain(pixelCanvas, bgMode) {
    paintBackground(bgMode);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pixelCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  function drawDataUrlToCanvas(url, callback) {
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      if (callback) callback();
    };
    img.src = url;
  }

  // ==========================================
  // Application Logic & Flow
  // ==========================================
  const labels = {
    style: { sprite: 'Sprite', quilt: 'Quilt', rings: 'Rings', maze: 'Maze', islands: 'Islands', totem: 'Totem' },
    pal: { random: 'Random', neon: 'Neon', retro: 'Retro', sunset: 'Sunset', mono: 'Mono' },
    mir: { vertical: 'Vertical', horizontal: 'Horizontal', quad: 'Quad', none: 'None' },
    fx: { none: 'None', outline: 'Outline', invert: 'Invert', dither: 'Dither' }
  };
  
  const getLabel = (map, val) => map[val] || val;
  
  const getMetaString = (m) => 
    `Art: ${m.styleLabel} | Mirror: ${m.mirrorLabel} | Palette: ${m.paletteLabel} | Effect: ${m.effectLabel} | Grid: ${m.gridSize}x${m.gridSize} | Density: ${Math.round(m.density * 100)}% | Seed: ${m.baseSeed}`;

  function updateHistoryUI() {
    historyStrip.innerHTML = '';
    for (let i = 0; i < HISTORY_LIMIT; i++) {
      const entry = history[i] || null;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'thumb';
      
      if (!entry) {
        btn.classList.add('empty');
        btn.disabled = true;
      } else {
        if (i === selectedHistoryIndex) btn.classList.add('active');
        const img = document.createElement('img');
        img.src = entry.dataUrl;
        img.alt = 'Art ' + (i + 1);
        btn.title = entry.meta.styleLabel + ' | ' + entry.meta.paletteLabel;
        btn.appendChild(img);
        
        btn.addEventListener('click', () => {
          selectedHistoryIndex = i;
          drawDataUrlToCanvas(entry.dataUrl, () => {
            metaInfo.textContent = getMetaString(entry.meta);
            updateHistoryUI();
          });
        });
      }
      historyStrip.appendChild(btn);
    }
  }

  function saveToHistory(entry) {
    history.unshift(entry);
    if (history.length > HISTORY_LIMIT) history.length = HISTORY_LIMIT;
    selectedHistoryIndex = 0;
    updateHistoryUI();
  }

  function updateStats() {
    countChip.textContent = String(generationCount);
    modeChip.textContent = autoToggle.checked ? 'Auto' : 'Manual';
  }

  function gatherSettings(options) {
    const isRemix = options && options.remixSeed;
    generationCount++;
    
    let baseSeed = seedInput.value.trim();
    if (!baseSeed || isRemix) {
      baseSeed = generateSeed();
      seedInput.value = baseSeed;
    }
    
    const config = {
      gridSize: Number(gridSelect.value),
      style: styleSelect.value,
      paletteMode: paletteSelect.value,
      mirrorMode: mirrorSelect.value,
      effectMode: effectSelect.value,
      backgroundMode: backgroundSelect.value,
      density: Number(densityRange.value) / 100,
      chaos: chaosToggle.checked
    };
    
    const entropyString = lockSeedToggle.checked 
      ? '' 
      : `|${generationCount}|${Math.floor(Math.random() * 1e9).toString(36)}`;
      
    const effectiveSeed = `${baseSeed}|${config.style}|${config.paletteMode}|${config.mirrorMode}|${config.effectMode}|${config.backgroundMode}|${config.gridSize}|${config.density}|chaos:${config.chaos}${entropyString}`;
    
    return {
      baseSeed,
      effectiveSeed,
      ...config,
      styleLabel: getLabel(labels.style, config.style),
      paletteLabel: getLabel(labels.pal, config.paletteMode),
      mirrorLabel: getLabel(labels.mir, config.mirrorMode),
      effectLabel: getLabel(labels.fx, config.effectMode),
      timestamp: Date.now()
    };
  }

  function generate(options) {
    const settings = gatherSettings(options || {});
    const rng = createRNG(hashString(settings.effectiveSeed));
    const pal = generatePalette(settings.paletteMode, rng);
    
    const localChaos = settings.chaos || settings.mirrorMode !== 'vertical';
    
    const grid = generateArt(settings.style, settings.gridSize, settings.density, localChaos, rng);
    
    if (!settings.chaos && settings.mirrorMode !== 'none') {
      applyMirror(grid, settings.mirrorMode);
    }
    if (settings.effectMode !== 'none') {
      applyEffect(grid, settings.effectMode, rng);
    }
    
    const offscreen = document.createElement('canvas');
    offscreen.width = settings.gridSize;
    offscreen.height = settings.gridSize;
    const offCtx = offscreen.getContext('2d');
    offCtx.imageSmoothingEnabled = false;
    
    drawGridToCanvas(grid, pal, offCtx);
    renderMain(offscreen, settings.backgroundMode);
    pulseCanvas();
    
    saveToHistory({ dataUrl: canvas.toDataURL('image/png'), meta: settings });
    metaInfo.textContent = getMetaString(settings);
    updateStats();
  }

  // ==========================================
  // Actions & Event Listeners
  // ==========================================
  function triggerDownload() {
    const entry = history[selectedHistoryIndex];
    if (!entry) return;
    const safeName = entry.meta.style.replace(/[^a-z0-9-]/gi, '').toLowerCase();
    const fileName = `pixl-${safeName}-${entry.meta.timestamp}.png`;
    
    const a = document.createElement('a');
    a.href = entry.dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function triggerCopySeed() {
    const text = seedInput.value.trim();
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => metaInfo.textContent = 'Seed copied: ' + text)
        .catch(() => metaInfo.textContent = 'Copy failed (browser blocked clipboard).');
      return;
    }
    metaInfo.textContent = 'Clipboard API unavailable in this browser context.';
  }

  function triggerClearHistory() {
    history.length = 0;
    selectedHistoryIndex = -1;
    updateHistoryUI();
    metaInfo.textContent = 'History cleared.';
  }

  function toggleAutoMode() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
    if (!autoToggle.checked) {
      updateStats();
      return;
    }
    const speed = Number(speedSelect.value);
    autoTimer = setInterval(() => generate(), speed);
    updateStats();
  }

  function triggerRandomizeAll() {
    const grids = ['8', '12', '16', '24'];
    const styles = ['sprite', 'quilt', 'rings', 'maze', 'islands', 'totem'];
    const pals = ['random', 'neon', 'retro', 'sunset', 'mono'];
    const mirs = ['vertical', 'horizontal', 'quad', 'none'];
    const fxs = ['none', 'outline', 'invert', 'dither'];
    const bgs = ['void', 'gradient'];
    
    gridSelect.value = pickRandom(Math.random, grids);
    styleSelect.value = pickRandom(Math.random, styles);
    paletteSelect.value = pickRandom(Math.random, pals);
    mirrorSelect.value = pickRandom(Math.random, mirs);
    effectSelect.value = pickRandom(Math.random, fxs);
    backgroundSelect.value = pickRandom(Math.random, bgs);
    
    syncCustomSelects();
    
    densityRange.value = String(35 + Math.floor(Math.random() * 56));
    densityValue.textContent = densityRange.value + '%';
    chaosToggle.checked = Math.random() < 0.45;
  }

  function generateBatch(count, remixSeed) {
    for (let i = 0; i < count; i++) {
      generate({ remixSeed });
    }
  }

  function historyStep(direction) {
    if (!history.length) return;
    if (selectedHistoryIndex < 0) {
      selectedHistoryIndex = 0;
    } else {
      selectedHistoryIndex = (selectedHistoryIndex + direction + history.length) % history.length;
    }
    
    const entry = history[selectedHistoryIndex];
    if (!entry) return;
    
    drawDataUrlToCanvas(entry.dataUrl, () => {
      metaInfo.textContent = getMetaString(entry.meta);
      updateHistoryUI();
    });
  }

  densityRange.addEventListener('input', () => { densityValue.textContent = densityRange.value + '%'; });
  generateBtn.addEventListener('click', () => generate());
  remixBtn.addEventListener('click', () => generate({ remixSeed: true }));
  surpriseBtn.addEventListener('click', () => { triggerRandomizeAll(); seedInput.value = generateSeed(); generate(); });
  batchBtn.addEventListener('click', () => generateBatch(5, true));
  downloadBtn.addEventListener('click', triggerDownload);
  copySeedBtn.addEventListener('click', triggerCopySeed);
  clearHistoryBtn.addEventListener('click', triggerClearHistory);
  prevHistoryBtn.addEventListener('click', () => historyStep(1));
  nextHistoryBtn.addEventListener('click', () => historyStep(-1));
  autoToggle.addEventListener('change', toggleAutoMode);
  speedSelect.addEventListener('change', toggleAutoMode);

  window.addEventListener('resize', fitCanvas);
  window.addEventListener('orientationchange', fitCanvas);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', fitCanvas);
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCustomSelects();
      return;
    }
    
    const t = e.target;
    const tag = t && t.tagName ? t.tagName.toLowerCase() : '';
    const isTyping = tag === 'input' || tag === 'select' || tag === 'textarea' || tag === 'button' || 
                     (t && t.isContentEditable) || !!(t && t.closest && t.closest('.custom-select'));
                     
    if (isTyping) return;
    
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      generate();
      return;
    }
    if (e.code === 'KeyR') {
      e.preventDefault();
      seedInput.value = generateSeed();
      generate();
      return;
    }
    if (e.code === 'KeyB') {
      e.preventDefault();
      generateBatch(5, true);
    }
  });

  // ==========================================
  // Initialization
  // ==========================================
  densityValue.textContent = densityRange.value + '%';
  seedInput.value = generateSeed();
  initCustomSelects();
  fitCanvas();
  generate();
  
  setTimeout(() => { fitCanvas(); }, 80);
})();