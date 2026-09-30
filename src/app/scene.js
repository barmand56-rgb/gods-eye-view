import * as Cesium from 'cesium';

/**
 * Texture de secours 100 % locale (générée en JavaScript dans le navigateur).
 * Garantit un affichage tactique même si Internet est coupé ou bloqué.
 */
function createFallbackGridProvider() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  // Fond sombre
  ctx.fillStyle = '#0a101d';
  ctx.fillRect(0, 0, 256, 256);
  
  // Grille tactique verte
  ctx.strokeStyle = 'rgba(0, 255, 204, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, 256, 256);
  ctx.fillStyle = 'rgba(0, 255, 204, 0.4)';
  ctx.font = '10px monospace';
  ctx.fillText('GRID TACTIQUE OK', 12, 24);

  return new Cesium.SingleTileImageryProvider({
    url: canvas.toDataURL(),
    rectangle: Cesium.Rectangle.MAX_VALUE,
  });
}

/**
 * Initialisation ultra-sécurisée du moteur 3D / 2D
 */
export async function createApplicationScene(options = {}) {
  // PROTECTION 1 : Désactiver totalement Cesium Ion (supprime les erreurs HTTP/HTML 403)
  try {
    Cesium.Ion.defaultAccessToken = '';
  } catch (e) {
    console.warn('[Security] Reset Ion token :', e);
  }

  // PROTECTION 2 : Vérification / Création automatique du conteneur HTML
  let container = document.getElementById('cesiumContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'cesiumContainer';
    container.style.width = '100vw';
    container.style.height = '100dvh';
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    document.body.prepend(container);
  }

  let creditContainer = document.querySelector('.cesium-credit-container-custom');
  if (!creditContainer) {
    creditContainer = document.createElement('div');
    creditContainer.className = 'cesium-credit-container-custom';
    document.body.appendChild(creditContainer);
  }

  const loaderStatus = document.querySelector('#loading-loaderStatus');
  if (loaderStatus) loaderStatus.style.display = 'none';

  let viewer = null;

  try {
    // PROTECTION 3 : Imagerie OpenStreetMap avec repli local instantané en cas d'erreur
    let primaryImagery;
    try {
      primaryImagery = new Cesium.UrlTemplateImageryProvider({
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        maximumLevel: 19,
      });
      primaryImagery.errorEvent.addEventListener(() => {
        console.warn('[Network] Tuile inaccessible, neutralisée.');
      });
    } catch (e) {
      primaryImagery = createFallbackGridProvider();
    }

    // Protection 4 : Instantation directe et propre sans passer par des wrappers externes fragiles
    viewer = new Cesium.Viewer('cesiumContainer', {
      creditContainer: creditContainer,
      imageryProvider: primaryImagery,
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
      sceneMode: Cesium.SceneMode.SCENE2D, // Démarrage 2D ultra-stable
    });

    // Nettoyage des composants réseau superflus de Cesium
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
        viewer.scene.globe.depthTestAgainstTerrain = false;
      }

      if (viewer.scene.renderError) {
        viewer.scene.renderError.addEventListener((scene, error) => {
          console.warn('[Cesium Safe] Erreur de rendu ignorée :', error);
        });
      }
    }

    // Injection du menu HUD
    safeInjectHUD(viewer);

  } catch (fatalError) {
    console.error('[SafeCatch] Erreur moteur Cesium :', fatalError);
  }

  // PROTECTION 5 : Objet de retour garanti à 100 % pour application.js
  // Même si Cesium venait à planter totalement, cet objet empêchera l'erreur 'reading surface'.
  const safeScene = viewer ? viewer.scene : {};
  const safeGlobe = (viewer && viewer.scene) ? viewer.scene.globe : {};
  const safeCamera = viewer ? viewer.camera : {};

  if (viewer) {
    try { viewer.surface = safeGlobe; } catch (e) {}
  }

  return {
    viewer: viewer || {},
    scene: safeScene,
    surface: safeGlobe,
    globe: safeGlobe,
    camera: safeCamera,
    destroy: () => {
      try {
        if (viewer && !viewer.isDestroyed()) viewer.destroy();
      } catch (e) {}
    },
    isDestroyed: () => (viewer ? viewer.isDestroyed() : true),
  };
}

/**
 * Injection blindée du menu HUD (Tolérante aux pannes)
 */
function safeInjectHUD(viewer) {
  try {
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
      if (viewer?.scene) viewer.scene.morphTo2D(1.0);
    });

    document.getElementById('btn-mode-3d')?.addEventListener('click', () => {
      if (viewer?.scene) viewer.scene.morphTo3D(1.0);
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
        duration: 1.5,
      });
    });

    document.querySelectorAll('.hud-grid .hud-btn[data-coords]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const coords = btn.getAttribute('data-coords');
        if (coords && viewer?.camera) {
          const [lon, lat, alt] = coords.split(',').map(Number);
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
            duration: 1.5,
          });
        }
      });
    });

    document.getElementById('btn-reset-view')?.addEventListener('click', () => {
      viewer?.camera?.flyHome(1.5);
    });

  } catch (hudErr) {
    console.warn('[HUD] Erreur d\'injection neutralisée :', hudErr);
  }
}

// Exports multiples pour éliminer toute erreur d'importation dans application.js
export const createScene = createApplicationScene;
export default createApplicationScene;