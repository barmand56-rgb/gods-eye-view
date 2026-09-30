/**
 * Intégration Leaflet Tactique - 100% Gratuit, Zéro Clé API
 */
export async function createApplicationScene(options = {}) {
  // Masquage du loader
  const loaderStatus = document.querySelector('#loading-loaderStatus');
  if (loaderStatus) loaderStatus.style.display = 'none';

  // Conteneur de carte
  let container = document.getElementById('cesiumContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'cesiumContainer';
    document.body.appendChild(container);
  }
  container.style.width = '100vw';
  container.style.height = '100dvh';
  container.style.backgroundColor = '#020617';

  const L = window.L;

  // Initialisation Leaflet
  const map = L.map('cesiumContainer', {
    center: [20, 0],
    zoom: 3,
    zoomControl: false,
    attributionControl: false
  });

  // Layer 1 : Carte ESRI Dark Canvas (100% Gratuite, Sans clé API, Ultra-fluidité)
  const darkLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 16 }
  ).addTo(map);

  // Layer 2 : Vue Satellite ESRI (Gratuite)
  const satelliteLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 18 }
  );

  // Layer 3 : OpenStreetMap Standard (Gratuite)
  const osmLayer = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    { maxZoom: 18 }
  );

  // Injection du HUD
  injectHUDControls(map, darkLayer, satelliteLayer, osmLayer);

  // --- MOCK COMPLET POUR ÉVITER TOUT CRASH SUR APPLICATION.JS ---
  const dummySurface = {
    globe: {},
    enableLighting: false,
    show: true
  };

  const dummyCamera = {
    flyTo: ({ destination, duration }) => {},
    flyHome: () => map.flyTo([20, 0], 3)
  };

  const dummyScene = {
    surface: dummySurface,
    globe: dummySurface,
    camera: dummyCamera,
    morphTo2D: () => {},
    morphTo3D: () => {}
  };

  return {
    viewer: map,
    scene: dummyScene,
    surface: dummySurface,
    globe: dummySurface,
    camera: dummyCamera,
    map: map,
    destroy: () => map.remove(),
    isDestroyed: () => false
  };
}

/**
 * HUD Tactique
 */
function injectHUDControls(map, darkLayer, satelliteLayer, osmLayer) {
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
          <label>🎨 STYLE TACTIQUE</label>
          <div class="hud-grid">
            <button class="hud-btn highlight" id="btn-style-dark">🕶️ Sombre</button>
            <button class="hud-btn" id="btn-style-sat">🛰️ Satellite</button>
            <button class="hud-btn" id="btn-style-osm">🗺️ Plan</button>
          </div>
        </div>

        <div class="hud-section">
          <label>SÉLECTEUR DE PAYS</label>
          <select id="country-select" class="hud-select">
            <option value="">-- Choisir un pays --</option>
            <option value="48.8566,2.3522,6">🇫🇷 France</option>
            <option value="37.0902,-95.7129,4">🇺🇸 États-Unis</option>
            <option value="36.2048,138.2529,5">🇯🇵 Japon</option>
            <option value="-14.2350,-51.9253,4">🇧🇷 Brésil</option>
            <option value="26.8206,30.8025,5">🇪🇬 Égypte</option>
            <option value="-25.2744,133.7751,4">🇦🇺 Australie</option>
            <option value="35.8617,104.1954,4">🇨🇳 Chine</option>
          </select>
        </div>

        <div class="hud-section">
          <label>📍 VILLES CLÉS</label>
          <div class="hud-grid">
            <button class="hud-btn" data-coords="48.8566,2.3522,12">Paris</button>
            <button class="hud-btn" data-coords="40.7128,-74.006,12">New York</button>
            <button class="hud-btn" data-coords="35.6895,139.6917,12">Tokyo</button>
            <button class="hud-btn" data-coords="25.2048,55.2708,12">Dubaï</button>
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

  const setActive = (activeId) => {
    ['btn-style-dark', 'btn-style-sat', 'btn-style-osm'].forEach(id => {
      document.getElementById(id)?.classList.remove('highlight');
    });
    document.getElementById(activeId)?.classList.add('highlight');
  };

  document.getElementById('btn-style-dark')?.addEventListener('click', () => {
    if (map.hasLayer(satelliteLayer)) map.removeLayer(satelliteLayer);
    if (map.hasLayer(osmLayer)) map.removeLayer(osmLayer);
    map.addLayer(darkLayer);
    setActive('btn-style-dark');
  });

  document.getElementById('btn-style-sat')?.addEventListener('click', () => {
    if (map.hasLayer(darkLayer)) map.removeLayer(darkLayer);
    if (map.hasLayer(osmLayer)) map.removeLayer(osmLayer);
    map.addLayer(satelliteLayer);
    setActive('btn-style-sat');
  });

  document.getElementById('btn-style-osm')?.addEventListener('click', () => {
    if (map.hasLayer(darkLayer)) map.removeLayer(darkLayer);
    if (map.hasLayer(satelliteLayer)) map.removeLayer(satelliteLayer);
    map.addLayer(osmLayer);
    setActive('btn-style-osm');
  });

  document.getElementById('country-select')?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (!val) return;
    const [lat, lon, zoom] = val.split(',').map(Number);
    map.flyTo([lat, lon], zoom, { duration: 1.5 });
  });

  document.querySelectorAll('.hud-grid .hud-btn[data-coords]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const coords = btn.getAttribute('data-coords');
      if (coords) {
        const [lat, lon, zoom] = coords.split(',').map(Number);
        map.flyTo([lat, lon], zoom, { duration: 1.5 });
      }
    });
  });

  document.getElementById('btn-reset-view')?.addEventListener('click', () => {
    map.flyTo([20, 0], 3, { duration: 1 });
  });
}

export const createScene = createApplicationScene;
export default createApplicationScene;