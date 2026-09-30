import * as Cesium from 'cesium';

// Désactivation totale des requêtes vers les serveurs Cesium Ion
try {
  Cesium.Ion.defaultAccessToken = '';
} catch (e) {}

/**
 * Générateur de carte 2D tactique ultra-fluide (0 appel réseau externe)
 */
function createTacticalCanvasProvider() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Fond sombre militaire
  ctx.fillStyle = '#060d17';
  ctx.fillRect(0, 0, 512, 512);

  // Grille tactique
  ctx.strokeStyle = 'rgba(0, 255, 204, 0.2)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0); ctx.lineTo(i, 512);
    ctx.moveTo(0, i); ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Marqueurs tactiques
  ctx.fillStyle = '#00ffcc';
  ctx.font = '12px monospace';
  ctx.fillText('GODS EYE - SYSTEM ACTIVE', 20, 30);

  return new Cesium.SingleTileImageryProvider({
    url: canvas.toDataURL(),
    rectangle: Cesium.Rectangle.MAX_VALUE,
  });
}

/**
 * Initialisation de la scène sans crash
 */
async function initApplicationScene(options = {}) {
  const loaderStatus = document.querySelector('#loading-loaderStatus');
  if (loaderStatus) loaderStatus.style.display = 'none';

  let container = document.getElementById('cesiumContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'cesiumContainer';
    document.body.appendChild(container);
  }

  let creditContainer = document.querySelector('.cesium-credit-container-custom');
  if (!creditContainer) {
    creditContainer = document.createElement('div');
    creditContainer.className = 'cesium-credit-container-custom';
    document.body.appendChild(creditContainer);
  }

  // Fournisseur d'imagerie léger OpenStreetMap
  let imageryProvider;
  try {
    imageryProvider = new Cesium.UrlTemplateImageryProvider({
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      maximumLevel: 18,
    });
  } catch (e) {
    imageryProvider = createTacticalCanvasProvider();
  }

  let viewer = null;

  try {
    viewer = new Cesium.Viewer('cesiumContainer', {
      creditContainer: creditContainer,
      imageryProvider: imageryProvider,
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
      baseLayerPicker: false,
      geocoder: false,
      timeline: false,
      animation: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      homeButton: false,
      infoBox: false,
      selectionIndicator: false,
      fullscreenButton: false,
      vrButton: false,
      sceneMode: Cesium.SceneMode.SCENE2D, // Mode 2D ultra-fluide
    });

    if (viewer.scene) {
      viewer.scene.rethrowRenderErrors = false;
      viewer.useDefaultRenderLoop = true;
      viewer.scene.skyBox = undefined;
      viewer.scene.sun = undefined;
      viewer.scene.moon = undefined;
      viewer.scene.skyAtmosphere = undefined;
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#020617');

      if (viewer.scene.globe) {
        viewer.scene.globe.show = true;
        viewer.scene.globe.enableLighting = false;
      }
    }
  } catch (err) {
    console.warn('[Cesium SafeInit] Secours activé :', err);
  }

  // Injection du menu HUD
  injectHUDControls(viewer);

  // Objet de retour garanti pour application.js
  const safeGlobe = (viewer && viewer.scene) ? viewer.scene.globe : {};
  const safeScene = viewer ? viewer.scene : {};
  const safeCamera = viewer ? viewer.camera : {};

  if (viewer) viewer.surface = safeGlobe;

  return {
    viewer: viewer || {},
    scene: safeScene,
    surface: safeGlobe,
    globe: safeGlobe,
    camera: safeCamera,
    destroy: () => {
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
    },
    isDestroyed: () => (viewer ? viewer.isDestroyed() : true),
  };
}

/**
 * Menu tactile interactif
 */
function injectHUDControls(viewer) {
  if (document.getElementById('hud-country-menu')) return;

  const hudMenu = document.createElement('div');
  hudMenu.id = 'hud-country-menu';
  hudMenu.innerHTML = `
    <div class="hud-panel">
      <div class="hud-header">
        <span>🎖️ GOD'S EYE - CONTROL</span>
        <button id="hud-toggle-btn">☰</button>
      </div>
      <div class="hud-body" id="hud-body">
        <div class="hud-section">
          <label>🌐 MODE DE VUE</label>
          <div class="hud-grid">
            <button class="hud-btn highlight" id="btn-mode-2d">🗺️ Carte 2D</button>
            <button class="hud-btn" id="btn-mode-3d">🌐 Globe 3D</button>
          </div>
        </div>

        <div class="hud-section">
          <label>🎨 STYLE TACTIQUE</label>
          <div class="hud-grid">
            <button class="hud-btn highlight" id="btn-style-dark">🕶️ Sombre</button>
            <button class="hud-btn" id="btn-style-topo">🏔️ Topo</button>
          </div>
        </div>

        <div class="hud-section">
          <label>SÉLECTEUR DE PAYS</label>
          <select id="country-select" class="hud-select">
            <option value="">-- Choisir un pays --</option>
            <option value="2.3522,48.8566,1200000">🇫🇷 France</option>
            <option value="-95.7129,37.0902,2500000">🇺🇸 États-Unis</option>
            <option value="138.2529,36.2048,1500000">🇯🇵 Japon</option>
            <option value="-51.9253,-14.2350,2500000">🇧🇷 Brésil</option>
            <option value="30.8025,26.8206,1500000">🇪🇬 Égypte</option>
            <option value="133.7751,-25.2744,2500000">🇦🇺 Australie</option>
            <option value="104.1954,35.8617,2500000">🇨🇳 Chine</option>
          </select>
        </div>

        <div class="hud-section">
          <label>📍 VILLES CLÉS</label>
          <div class="hud-grid">
            <button class="hud-btn" data-coords="2.3522,48.8566,15000">Paris</button>
            <button class="hud-btn" data-coords="-74.006,40.7128,15000">New York</button>
            <button class="hud-btn" data-coords="139.6917,35.6895,15000">Tokyo</button>
            <button class="hud-btn" data-coords="55.2708,25.2048,15000">Dubaï</button>
          </div>
        </div>

        <div class="hud-section">
          <button class="hud-btn highlight" id="btn-reset-view">🎯 Vue Globale</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(hudMenu);

  document.getElementById('hud-toggle-btn')?.addEventListener('click', () => {
    document.getElementById('hud-body')?.classList.toggle('collapsed');
  });

  document.getElementById('btn-mode-2d')?.addEventListener('click', () => {
    if (viewer?.scene) viewer.scene.morphTo2D(0.5);
  });

  document.getElementById('btn-mode-3d')?.addEventListener('click', () => {
    if (viewer?.scene) viewer.scene.morphTo3D(0.5);
  });

  document.getElementById('btn-style-dark')?.addEventListener('click', () => {
    if (!viewer?.imageryLayers) return;
    try {
      viewer.imageryLayers.removeAll();
      viewer.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
        url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      }));
    } catch (e) {}
  });

  document.getElementById('btn-style-topo')?.addEventListener('click', () => {
    if (!viewer?.imageryLayers) return;
    try {
      viewer.imageryLayers.removeAll();
      viewer.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
        url: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
      }));
    } catch (e) {}
  });

  document.getElementById('country-select')?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (!val || !viewer?.camera) return;
    const [lon, lat, alt] = val.split(',').map(Number);
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
      duration: 1,
    });
  });

  document.querySelectorAll('.hud-grid .hud-btn[data-coords]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const coords = btn.getAttribute('data-coords');
      if (coords && viewer?.camera) {
        const [lon, lat, alt] = coords.split(',').map(Number);
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
          duration: 1,
        });
      }
    });
  });

  document.getElementById('btn-reset-view')?.addEventListener('click', () => {
    viewer?.camera?.flyHome(1);
  });
}

// Exports compatibles avec toutes les variantes d'importation dans application.js
export const createApplicationScene = initApplicationScene;
export const createScene = initApplicationScene;
export default initApplicationScene;