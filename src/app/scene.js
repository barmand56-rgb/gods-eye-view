import * as Cesium from 'cesium';
import { createApplicationViewer } from './viewer.js';

/**
 * Scène 2D Carte Tactique & Relief Militaire
 * - 100% Autonome (Désactivation totale des requêtes Ion)
 * - Compatibilité garantie avec application.js (export createScene + createApplicationScene)
 */
async function initScene({ googleApiKey, cesiumToken } = {}) {
  const loaderStatus = document.querySelector('#loading-loaderStatus');
  const creditContainer = document.createElement('div');
  creditContainer.className = 'cesium-credit-container-custom';
  document.body.appendChild(creditContainer);

  // 1. Désactiver totalement les jetons Ion pour bloquer les requêtes réseau invalides
  Cesium.Ion.defaultAccessToken = '';

  // 2. Fond de carte 2D Topographique / Relief Militaire gratuit (OpenTopoMap)
  const militaryReliefImagery = new Cesium.UrlTemplateImageryProvider({
    url: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
    maximumLevel: 17,
    credit: 'OpenTopoMap',
  });

  // 3. Initialisation forcée en Carte 2D sans relief 3D lourd
  const viewer = createApplicationViewer({
    container: 'cesiumContainer',
    creditContainer,
    imageryProvider: militaryReliefImagery,
    terrainProvider: new Cesium.EllipsoidTerrainProvider(), // Désactive le relief 3D Ion
    sceneMode: Cesium.SceneMode.SCENE2D, // Démarrage immédiat en 2D Carte Tactique
    baseLayerPicker: false,
    geocoder: false,
    timeline: false,
    animation: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    homeButton: false,
  });

  // 4. Masquer le fond de ciel et étoiles pour accélérer le rendu 2D
  viewer.scene.skyBox = undefined;
  viewer.scene.sun = undefined;
  viewer.scene.moon = undefined;
  viewer.scene.skyAtmosphere = undefined;
  viewer.scene.backgroundColor = Cesium.Color.BLACK;

  // 5. Protections anti-crash du moteur de rendu
  viewer.scene.rethrowRenderErrors = false;
  viewer.useDefaultRenderLoop = true;
  viewer.scene.globe.show = true;
  viewer.scene.globe.enableLighting = false;

  if (viewer.scene.renderError) {
    viewer.scene.renderError.addEventListener((scene, error) => {
      console.warn('Rendu 2D (avertissement ignoré) :', error);
    });
  }

  // Masquer le message de chargement
  if (loaderStatus) loaderStatus.style.display = 'none';

  // 6. Injecter le menu tactile "God's Eye Control"
  injectCountryMenu(viewer);

  // 7. Attacher les propriétés directement sur le viewer
  viewer.surface = viewer.scene.globe;
  viewer.globe = viewer.scene.globe;

  // 8. Objet de retour complet exigé par application.js
  return {
    viewer: viewer,
    scene: viewer.scene,
    surface: viewer.scene.globe,
    globe: viewer.scene.globe,
    camera: viewer.camera,
    destroy: () => {
      if (!viewer.isDestroyed()) viewer.destroy();
    },
    isDestroyed: () => viewer.isDestroyed(),
  };
}

/**
 * Menu tactile : Styles de Cartes (Relief / Sombre) + Navigation
 */
function injectCountryMenu(viewer) {
  if (document.getElementById('hud-country-menu')) return;

  const hudMenu = document.createElement('div');
  hudMenu.id = 'hud-country-menu';
  hudMenu.innerHTML = `
    <div class="hud-panel">
      <div class="hud-header">
        <span>🎖️ GOD'S EYE - CARTE TACTIQUE</span>
        <button id="hud-toggle-btn">☰</button>
      </div>
      <div class="hud-body" id="hud-body">
        
        <div class="hud-section">
          <label>🎨 STYLE DE CARTE</label>
          <div class="hud-grid">
            <button class="hud-btn highlight" id="btn-style-topo">🏔️ Relief / Topo</button>
            <button class="hud-btn" id="btn-style-dark">🕶️ Sombre Tactique</button>
          </div>
        </div>

        <div class="hud-section">
          <label>🌐 MODE VUE</label>
          <div class="hud-grid">
            <button class="hud-btn highlight" id="btn-mode-2d">🗺️ Carte 2D</button>
            <button class="hud-btn" id="btn-mode-3d">🌐 Globe 3D</button>
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
            <option value="78.9629,20.5937,2500000">🇮🇳 Inde</option>
            <option value="12.4964,41.9028,1200000">🇮🇹 Italie</option>
            <option value="-3.7038,40.4167,1200000">🇪🇸 Espagne</option>
            <option value="37.6173,55.7558,2000000">🇷🇺 Russie</option>
          </select>
        </div>

        <div class="hud-section">
          <label>📍 VILLES CLÉS</label>
          <div class="hud-grid">
            <button class="hud-btn" data-coords="2.3522,48.8566,8000">Paris</button>
            <button class="hud-btn" data-coords="-74.006,40.7128,8000">New York</button>
            <button class="hud-btn" data-coords="139.6917,35.6895,8000">Tokyo</button>
            <button class="hud-btn" data-coords="55.2708,25.2048,8000">Dubaï</button>
          </div>
        </div>

        <div class="hud-section">
          <label>⚙️ CONTRÔLES</label>
          <button class="hud-btn highlight" id="btn-reset-view">🎯 Vue Globale</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(hudMenu);

  // --- ÉVÉNEMENTS ---

  document.getElementById('hud-toggle-btn').addEventListener('click', () => {
    document.getElementById('hud-body').classList.toggle('collapsed');
  });

  // Basculer le style de carte (Relief vs Sombre)
  document.getElementById('btn-style-topo').addEventListener('click', (e) => {
    viewer.imageryLayers.removeAll();
    viewer.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
      url: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
      maximumLevel: 17,
    }));
    document.getElementById('btn-style-topo').classList.add('highlight');
    document.getElementById('btn-style-dark').classList.remove('highlight');
  });

  document.getElementById('btn-style-dark').addEventListener('click', (e) => {
    viewer.imageryLayers.removeAll();
    viewer.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
      url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      maximumLevel: 19,
    }));
    document.getElementById('btn-style-dark').classList.add('highlight');
    document.getElementById('btn-style-topo').classList.remove('highlight');
  });

  // Basculer 2D / 3D
  document.getElementById('btn-mode-2d').addEventListener('click', () => {
    viewer.scene.morphTo2D(1.0);
  });

  document.getElementById('btn-mode-3d').addEventListener('click', () => {
    viewer.scene.morphTo3D(1.0);
  });

  // Sélection de pays
  const select = document.getElementById('country-select');
  select.addEventListener('change', (e) => {
    if (!e.target.value) return;
    const [lon, lat, alt] = e.target.value.split(',').map(Number);
    flyToLocation(viewer, lon, lat, alt);
  });

  // Villes clés
  document.querySelectorAll('.hud-grid .hud-btn[data-coords]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const coords = btn.getAttribute('data-coords');
      if (coords) {
        const [lon, lat, alt] = coords.split(',').map(Number);
        flyToLocation(viewer, lon, lat, alt);
      }
    });
  });

  // Recentrer la vue
  document.getElementById('btn-reset-view').addEventListener('click', () => {
    viewer.camera.flyHome(1.5);
  });
}

function flyToLocation(viewer, lon, lat, alt) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
    duration: 2,
  });
}

// Exports multiples pour éliminer les erreurs de nom dans application.js
export const createApplicationScene = initScene;
export const createScene = initScene;
export default initScene;