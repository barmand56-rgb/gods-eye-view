import * as Cesium from 'cesium';
import { createApplicationViewer } from './viewer.js';

/**
 * Scène autonome multi-format (Carte 2D, Relief 2.5D, Globe 3D)
 */
export async function createApplicationScene({ googleApiKey, cesiumToken } = {}) {
  const loaderStatus = document.querySelector('#loading-loaderStatus');
  const creditContainer = document.createElement('div');
  creditContainer.className = 'cesium-credit-container-custom';
  document.body.appendChild(creditContainer);

  // Désactiver Cesium Ion pour éviter les erreurs de clés réseau
  Cesium.Ion.defaultAccessToken = cesiumToken || '';

  // Fond de carte sombre tactique ultra-léger (CartoDB / OpenStreetMap)
  const darkImagery = new Cesium.UrlTemplateImageryProvider({
    url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    maximumLevel: 19,
    credit: 'CartoDB',
  });

  // Initialisation du Viewer
  const viewer = createApplicationViewer({
    container: 'cesiumContainer',
    creditContainer,
    imageryProvider: darkImagery,
    baseLayerPicker: false,
    geocoder: false,
    timeline: false,
    animation: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    homeButton: false,
  });

  // Nettoyage des éléments célestes qui font planter le rendu d'image
  viewer.scene.skyBox = undefined;
  viewer.scene.sun = undefined;
  viewer.scene.moon = undefined;
  viewer.scene.skyAtmosphere = undefined;
  viewer.scene.backgroundColor = Cesium.Color.BLACK;

  // Anti-crash de rendu
  viewer.scene.rethrowRenderErrors = false;
  viewer.useDefaultRenderLoop = true;
  viewer.scene.globe.show = true;
  viewer.scene.globe.enableLighting = false;

  if (viewer.scene.renderError) {
    viewer.scene.renderError.addEventListener((scene, error) => {
      console.warn('Avertissement de rendu ignoré :', error);
    });
  }

  // Masquer le loader
  if (loaderStatus) loaderStatus.style.display = 'none';

  // Injecter le menu avec sélecteur 2D / 3D / Relief
  injectCountryMenu(viewer);

  // Attacher .surface et retourner l'objet complet pour application.js
  viewer.surface = viewer.scene.globe;

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
 * Menu tactile : Sélecteur 2D/3D + Navigation Pays
 */
function injectCountryMenu(viewer) {
  if (document.getElementById('hud-country-menu')) return;

  const hudMenu = document.createElement('div');
  hudMenu.id = 'hud-country-menu';
  hudMenu.innerHTML = `
    <div class="hud-panel">
      <div class="hud-header">
        <span>🌍 GOD'S EYE - CONTROL</span>
        <button id="hud-toggle-btn">☰</button>
      </div>
      <div class="hud-body" id="hud-body">
        
        <div class="hud-section">
          <label>📐 MODE D'AFFICHAGE</label>
          <div class="hud-grid">
            <button class="hud-btn highlight" id="btn-mode-2d">🗺️ Carte 2D</button>
            <button class="hud-btn" id="btn-mode-3d">🌐 Globe 3D</button>
          </div>
        </div>

        <div class="hud-section">
          <label>SELECTEUR DE PAYS</label>
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
          <button class="hud-btn highlight" id="btn-reset-view">🎯 Recentrer Vue</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(hudMenu);

  // --- ÉVÉNEMENTS DU MENU ---

  // Ouvrir / Réduire le menu
  document.getElementById('hud-toggle-btn').addEventListener('click', () => {
    document.getElementById('hud-body').classList.toggle('collapsed');
  });

  // Basculer entre Carte 2D et Globe 3D
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