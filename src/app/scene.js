import * as Cesium from 'cesium';
import { createApplicationViewer } from './viewer.js';

/**
 * Scène 3D ultra-légère avec menu HUD tactile (Caméras, Radars, Modes)
 */
export async function createApplicationScene({ googleApiKey, cesiumToken } = {}) {
  const creditContainer = document.createElement('div');
  creditContainer.className = 'cesium-credit-container-custom';
  document.body.appendChild(creditContainer);

  // 1. Initialiser le viewer avec une imagerie OpenStreetMap / Satellite légère
  const viewer = createApplicationViewer({
    container: 'cesiumContainer',
    creditContainer,
  });

  // Sécurité anti-crash
  viewer.scene.rethrowRenderErrors = false;
  viewer.useDefaultRenderLoop = true;
  viewer.scene.globe.show = true;

  // Masquer le loader s'il existe
  const loaderStatus = document.querySelector('#loading-loaderStatus');
  if (loaderStatus) loaderStatus.style.display = 'none';

  // 2. Injecter le Menu Tactile HUD
  injectHUDMenu(viewer);

  return viewer;
}

/**
 * Création et injection du menu interactif (Caméras, Radars, etc.)
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

  // --- ÉVÉNEMENTS DU MENU ---

  // Ouvrir / Réduire le menu
  const toggleBtn = document.getElementById('hud-toggle-btn');
  const hudBody = document.getElementById('hud-body');
  toggleBtn.addEventListener('click', () => {
    hudBody.classList.toggle('collapsed');
  });

  // Presets Caméras (FlyTo)
  document.getElementById('btn-cam-paris').addEventListener('click', () => {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(2.3522, 48.8566, 1500),
      orientation: { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-35) }
    });
  });

  document.getElementById('btn-cam-ny').addEventListener('click', () => {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-74.006, 40.7128, 1500),
      orientation: { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-35) }
    });
  });

  document.getElementById('btn-cam-tokyo').addEventListener('click', () => {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(139.6917, 35.6895, 1500),
      orientation: { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-35) }
    });
  });

  // Recentrer la vue globale
  document.getElementById('btn-reset-view').addEventListener('click', () => {
    viewer.camera.flyHome(1.5);
  });

  // Basculer la grille tactile
  let wireframe = false;
  document.getElementById('btn-wireframe-toggle').addEventListener('click', (e) => {
    wireframe = !wireframe;
    viewer.scene.globe.wireframe = wireframe;
    e.target.textContent = wireframe ? '🌐 Grille: ACTIVE' : '🌐 Grille Tactique';
  });

  // Toggle Radar (Simulation de couche radar)
  let radarActive = false;
  document.getElementById('btn-radar-toggle').addEventListener('click', (e) => {
    radarActive = !radarActive;
    e.target.textContent = radarActive ? '🟢 Radar: ACTIF' : '🔴 Activer Radar Météo';
  });
}