import * as Cesium from 'cesium';

// Désactivation des accès payants Ion
Cesium.Ion.defaultAccessToken = '';

/**
 * Initialisation de la scène Cesium avec ressources CDN sécurisées
 */
export async function createApplicationScene(options = {}) {
  const loaderStatus = document.querySelector('#loading-loaderStatus');
  if (loaderStatus) loaderStatus.style.display = 'none';

  // 1. Définition du conteneur
  let container = document.getElementById('cesiumContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'cesiumContainer';
    document.body.appendChild(container);
  }

  // 2. Imagerie satellite/tactique légère (OpenStreetMap)
  const imageryProvider = new Cesium.UrlTemplateImageryProvider({
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maximumLevel: 18,
  });

  // 3. Création du Viewer Cesium
  const viewer = new Cesium.Viewer('cesiumContainer', {
    imageryProvider: imageryProvider,
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
    sceneMode: Cesium.SceneMode.SCENE2D, // Démarrage 2D ultra-fluide
  });

  // 4. Configuration visuelle
  viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#020617');
  viewer.scene.globe.enableLighting = false;

  // 5. Injection du menu HUD
  injectHUD(viewer);

  // 6. Structure de retour indispensable pour application.js
  const globeSurface = viewer.scene.globe;
  viewer.surface = globeSurface;

  return {
    viewer: viewer,
    scene: viewer.scene,
    surface: globeSurface,
    globe: globeSurface,
    camera: viewer.camera,
    destroy: () => {
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
    },
    isDestroyed: () => (viewer ? viewer.isDestroyed() : true),
  };
}

// Alias d'exportation pour éviter tout conflit avec application.js
export const createScene = createApplicationScene;

/**
 * Menu Tactique HUD
 */
function injectHUD(viewer) {
  if (document.getElementById('hud-country-menu')) return;

  const hudMenu = document.createElement('div');
  hudMenu.id = 'hud-country-menu';
  hudMenu.innerHTML = `
    <div class="hud-panel">
      <div class="hud-header">
        <span>🎖️ GOD'S EYE - COMMAND</span>
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
          </select>
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
    viewer.scene.morphTo2D(0.5);
  });

  document.getElementById('btn-mode-3d')?.addEventListener('click', () => {
    viewer.scene.morphTo3D(0.5);
  });

  document.getElementById('btn-style-dark')?.addEventListener('click', () => {
    viewer.imageryLayers.removeAll();
    viewer.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
      url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    }));
  });

  document.getElementById('btn-style-topo')?.addEventListener('click', () => {
    viewer.imageryLayers.removeAll();
    viewer.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
      url: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
    }));
  });

  document.getElementById('country-select')?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (!val) return;
    const [lon, lat, alt] = val.split(',').map(Number);
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
      duration: 1.2,
    });
  });

  document.getElementById('btn-reset-view')?.addEventListener('click', () => {
    viewer.camera.flyHome(1);
  });
}