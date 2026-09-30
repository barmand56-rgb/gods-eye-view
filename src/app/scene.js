import * as Cesium from 'cesium';
import { createApplicationViewer } from './viewer.js';
import { loadPhotorealisticTileset } from './google3d.js';

/**
 * Initialise et configure la scène 3D Cesium (Version nettoyée et ultra-résistante).
 */
export async function createApplicationScene({ googleApiKey, cesiumToken } = {}) {
  const loaderStatus = document.querySelector('#loading-loaderStatus');

  // 1. Conteneur pour les crédits
  const creditContainer = document.createElement('div');
  creditContainer.className = 'cesium-credit-container-custom';
  document.body.appendChild(creditContainer);

  // 2. Création du viewer Cesium
  const viewer = createApplicationViewer({
    container: 'cesiumContainer',
    creditContainer,
  });

  // 3. Protection anti-crash du moteur de rendu
  viewer.scene.rethrowRenderErrors = false;
  viewer.useDefaultRenderLoop = true;

  if (viewer.scene.renderError) {
    viewer.scene.renderError.addEventListener((scene, error) => {
      console.warn('Erreur de texture ou de rendu ignorée par la sécurité :', error);
    });
  }

  // 4. Chargement des tuiles 3D avec Fallback automatique
  if (loaderStatus) {
    loaderStatus.textContent = 'Chargement de la scène 3D...';
  }

  try {
    let loadedTileset = null;

    if (googleApiKey || cesiumToken) {
      const photoreal = await loadPhotorealisticTileset(Cesium, {
        googleApiKey,
        cesiumToken,
      });
      if (photoreal && photoreal.tileset) {
        loadedTileset = photoreal.tileset;
      }
    }

    if (loadedTileset) {
      viewer.scene.primitives.add(loadedTileset);
      console.log('[Init] Google 3D Tiles chargé avec succès.');
    } else {
      throw new Error("Tuiles 3D indisponibles.");
    }
  } catch (error) {
    console.warn('Google 3D Tiles indisponible. Bascule automatique sur la Terre 3D par défaut :', error);
    
    // Activer le globe 3D satellite Cesium si les tuiles Google échouent
    viewer.scene.globe.show = true;
  }

  if (loaderStatus) {
    loaderStatus.style.display = 'none';
  }

  return viewer;
}