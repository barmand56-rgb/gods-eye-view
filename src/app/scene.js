import * as Cesium from 'cesium';
import { createApplicationViewer } from './viewer.js';

/**
 * Scène 3D ultra-légère avec OpenStreetMap (sans dépendance Ion/Google)
 */
export async function createApplicationScene({ googleApiKey, cesiumToken } = {}) {
  const creditContainer = document.createElement('div');
  creditContainer.className = 'cesium-credit-container-custom';
  document.body.appendChild(creditContainer);

  // 1. Définir un fond de carte gratuit et illimité (OpenStreetMap)
  const osmProvider = new Cesium.UrlTemplateImageryProvider({
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maximumLevel: 19,
  });

  // 2. Initialiser le viewer Cesium
  const viewer = createApplicationViewer({
    container: 'cesiumContainer',
    creditContainer,
    imageryProvider: osmProvider,
    baseLayerPicker: false,
    geocoder: false,
  });

  // S'assurer que la couche d'imagerie est bien présente
  if (viewer.imageryLayers.length === 0) {
    viewer.imageryLayers.addImageryProvider(osmProvider);
  }

  // 3. Sécurité anti-crash
  viewer.scene.rethrowRenderErrors = false;
  viewer.useDefaultRenderLoop = true;
  viewer.scene.globe.show = true;

  // 4. Correctif pour application.js (évite l'erreur "reading surface")
  viewer.surface = viewer.scene.globe;
  viewer.scene.surface = viewer.scene.globe;

  // Masquer le message de chargement
  const loaderStatus = document.querySelector('#loading-loaderStatus');
  if (loaderStatus) loaderStatus.style.display = 'none';

  // 5. Injecter le Menu Tactique HUD
  injectHUDMenu(viewer);

  // Renvoyer l'objet compatible avec application.js
  return Object.assign(viewer, {
    viewer: viewer,
    scene: viewer.scene,
    surface: viewer.scene.globe,
  });
}

/**
 * Création et injection du menu interactif
 */
function injectHUDMenu(viewer) {
  if (document.getElementById('hud-tactical-menu')) return;

  const hudMenu = document.createElement('div');
  hudMenu.id = 'hud-tactical-menu';
  hudMenu.innerHTML = `
    <div class="hud-panel">
      <div class="hud-header">
        <span>GOD'S EYE - CONTROL</span>
        <button id="hud-toggle-btn">☰</button>
      </div>
      <div class="hud-body" id="hud-body">
        <div class="hud-section">
          <label>📷 CAMÉRAS / PRESETS</label>
          <button class="hud-btn" id="btn-cam-paris">🇫🇷 Paris</button>
          <button class="hud-btn" id="btn-cam-ny">🇺🇸 New York</button>
          <button class="hud-btn" id="btn-cam-tokyo">🇯🇵 Tokyo</button>
        </div>

        <div class="hud-section">
          <label>📡 RADARS & CALQUES</label>
          <button class="hud-btn" id="btn-radar-toggle">🔴 Activer Radar Météo</button>
          <button class="hud-btn" id="btn-wireframe-toggle">🌐 Grille Tactique</button>
        </div>

        <div class="hud-section">
          <label>⚙️ MODE GLOBE</label>
          <button class="hud-btn highlight" id="btn-reset-view">🎯 Recentrer Vue</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(hudMenu);

  // Événements des boutons
  document.getElementById('hud-toggle-btn').addEventListener('click', () => {
    document.getElementById('hud-body').classList.toggle('collapsed');
  });

  document.getElementById('btn-cam-paris').addEventListener('click', () => {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(2.3522, 48.8566, 3000),
      orientation: { pitch: Cesium.Math.toRadians(-45) }
    });
  });

  document.getElementById('btn-cam-ny').addEventListener('click', () => {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-74.006, 40.7128, 3000),
      orientation: { pitch: Cesium.Math.toRadians(-45) }
    });
  });

  document.getElementById('btn-cam-tokyo').addEventListener('click', () => {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(139.6917, 35.6895, 3000),
      orientation: { pitch: Cesium.Math.toRadians(-45) }
    });
  });

  document.getElementById('btn-reset-view').addEventListener('click', () => {
    viewer.camera.flyHome(1.5);
  });

  let wireframe = false;
  document.getElementById('btn-wireframe-toggle').addEventListener('click', (e) => {
    wireframe = !wireframe;
    viewer.scene.globe.wireframe = wireframe;
    e.target.textContent = wireframe ? '🌐 Grille: ACTIVE' : '🌐 Grille Tactique';
  });

  let radarActive = false;
  document.getElementById('btn-radar-toggle').addEventListener('click', (e) => {
    radarActive = !radarActive;
    e.target.textContent = radarActive ? '🟢 Radar: ACTIF' : '🔴 Activer Radar Météo';
  });
}