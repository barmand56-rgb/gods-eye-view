import * as Cesium from 'cesium';
import { createApplicationViewer } from './viewer.js';

/**
 * Initialise et configure la scène 3D Cesium (Version autonome & ultra-stable)
 */
export async function createApplicationScene({ googleApiKey, cesiumToken } = {}) {
  const loaderStatus = document.querySelector('#loading-loaderStatus');

  // 1. Conteneur pour les crédits
  const creditContainer = document.createElement('div');
  creditContainer.className = 'cesium-credit-container-custom';
  document.body.appendChild(creditContainer);

  // 2. Définition du fond de carte OpenStreetMap (Gratuit, illimité et instantané)
  const osmImagery = new Cesium.UrlTemplateImageryProvider({
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maximumLevel: 19,
  });

  // 3. Initialisation du Viewer Cesium
  const viewer = createApplicationViewer({
    container: 'cesiumContainer',
    creditContainer,
    imageryProvider: osmImagery,
    baseLayerPicker: false,
    geocoder: false,
    timeline: false,
    animation: false,
  });

  // 4. Configuration de la sécurité anti-crash du moteur de rendu
  viewer.scene.rethrowRenderErrors = false;
  viewer.useDefaultRenderLoop = true;
  viewer.scene.globe.show = true;

  if (viewer.scene.renderError) {
    viewer.scene.renderError.addEventListener((scene, error) => {
      console.warn('Avertissement de rendu ignoré par la sécurité :', error);
    });
  }

  // 5. Attacher la propriété .surface directement au viewer (sans modifier les getters natifs)
  viewer.surface = viewer.scene.globe;

  // Masquer le message de chargement
  if (loaderStatus) {
    loaderStatus.style.display = 'none';
  }

  // 6. Injecter le menu tactile "Pays par Pays"
  injectCountryMenu(viewer);

  // 7. Renvoyer le viewer propre
  return viewer;
}

/**
 * Menu tactile interactif : Navigation Pays par Pays & Villes
 */
function injectCountryMenu(viewer) {
  if (document.getElementById('hud-country-menu')) return;

  const hudMenu = document.createElement('div');
  hudMenu.id = 'hud-country-menu';
  hudMenu.innerHTML = `
    <div class="hud-panel">
      <div class="hud-header">
        <span>🌍 GOD'S EYE - PAYS</span>
        <button id="hud-toggle-btn">☰</button>
      </div>
      <div class="hud-body" id="hud-body">
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
            <option value="25.0834,-29.0000,1800000">🇿🇦 Afrique du Sud</option>
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
          <button class="hud-btn highlight" id="btn-reset-view">🎯 Vue Globale (Terre)</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(hudMenu);

  // Événements d'interaction
  document.getElementById('hud-toggle-btn').addEventListener('click', () => {
    document.getElementById('hud-body').classList.toggle('collapsed');
  });

  const select = document.getElementById('country-select');
  select.addEventListener('change', (e) => {
    if (!e.target.value) return;
    const [lon, lat, alt] = e.target.value.split(',').map(Number);
    flyToLocation(viewer, lon, lat, alt);
  });

  document.querySelectorAll('.hud-grid .hud-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const coords = btn.getAttribute('data-coords');
      if (coords) {
        const [lon, lat, alt] = coords.split(',').map(Number);
        flyToLocation(viewer, lon, lat, alt);
      }
    });
  });

  document.getElementById('btn-reset-view').addEventListener('click', () => {
    viewer.camera.flyHome(1.5);
  });
}

function flyToLocation(viewer, lon, lat, alt) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-50),
      roll: 0,
    },
    duration: 2,
  });
}