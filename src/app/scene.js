import * as Cesium from 'cesium';
import { createApplicationViewer } from './viewer.js';
import { installTrackpadPinchZoom } from './trackpad.js';
import { registerDataCredits, configureCreditKeyboardAccess } from './credits.js';
import { loadPhotorealisticTileset } from './google3d.js';
import { defer } from './utils.js';

/**
 * Initialise et configure la scène 3D Cesium.
 */
export async function createApplicationScene({ googleApiKey, cesiumToken, credits } = {}) {
  const loaderStatus = document.querySelector('#loading-loaderStatus');

  // 1. Conteneur pour les crédits
  const creditContainer = document.createElement('div');
  creditContainer.className = 'cesium-credit-container-custom';
  document.body.appendChild(creditContainer);
  defer(() => creditContainer.remove());

  // 2. Création du viewer Cesium
  const viewer = createApplicationViewer({
    container: 'cesiumContainer',
    creditContainer,
  });

  // 3. Sécurisation du moteur de rendu (Anticrash)
  viewer.scene.rethrowRenderErrors = false;
  viewer.useDefaultRenderLoop = true;

  if (viewer.scene.renderError) {
    viewer.scene.renderError.addEventListener((scene, error) => {
      console.warn('Erreur de texture ou de rendu ignorée :', error);
    });
  }

  // Nettoyage au démontage
  defer(() => {
    if (!viewer.isDestroyed()) {
      viewer.destroy();
    }
  });

  // 4. Configuration des interactions et contrôles
  defer(installTrackpadPinchZoom(viewer));
  if (credits) {
    registerDataCredits(viewer, credits);
  }
  configureCreditKeyboardAccess(document);

  // 5. Chargement des tuiles 3D avec secours automatique
  if (loaderStatus) {
    loaderStatus.textContent = (googleApiKey || cesiumToken)
      ? 'Chargement de Google 3D Tiles...'
      : 'Chargement du globe de secours...';
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
      console.log('[Init] Google 3D Tiles chargé avec succès.');
      if (loaderStatus) loaderStatus.style.display = 'none';
    } else {
      throw new Error("Impossible de charger les tuiles 3D Google.");
    }
  } catch (error) {
    console.warn('Google 3D Tiles indisponible (Clé 403 ou réseau). Bascule automatique sur la Terre 3D de secours.', error);
    
    // Activer la Terre 3D par défaut en cas d'erreur
    viewer.scene.globe.show = true;
    
    if (loaderStatus) {
      loaderStatus.textContent = 'Globe 3D actif (Mode de secours).';
      setTimeout(() => {
        loaderStatus.style.display = 'none';
      }, 3000);
    }
  }

  return viewer;
}