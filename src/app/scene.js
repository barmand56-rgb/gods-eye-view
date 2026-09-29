import * as Cesium from 'cesium';
import { createApplicationViewer } from './viewer.js';
import { installTrackpadPinchZoom } from './trackpad.js';
import { registerDataCredits, configureCreditKeyboardAccess } from './credits.js';
import { loadPhotorealisticTileset } from './google3d.js';
import { defer } from './utils.js';

export async function createApplicationScene({ googleApiKey, cesiumToken, credits } = {}) {
  const loaderStatus = document.querySelector('#loading-loaderStatus');

  const creditContainer = document.createElement('div');
  creditContainer.className = 'cesium-credit-container-custom';
  document.body.appendChild(creditContainer);
  defer(() => creditContainer.remove());

  // Initialisation du viewer
  const viewer = createApplicationViewer({
    container: 'cesiumContainer',
    creditContainer,
  });

  // Sécurité anti-crash du moteur de rendu
  viewer.scene.rethrowRenderErrors = false;
  viewer.useDefaultRenderLoop = true;

  if (viewer.scene.renderError) {
    viewer.scene.renderError.addEventListener((scene, error) => {
      console.warn("Erreur de rendu ignorée par la sécurité :", error);
    });
  }

  defer(() => {
    if (!viewer.isDestroyed()) {
      viewer.destroy();
    }
  });

  defer(installTrackpadPinchZoom(viewer));
  if (credits) {
    registerDataCredits(viewer, credits);
  }
  configureCreditKeyboardAccess(document);

  // Tentative de chargement des tuiles Google 3D avec Fallback
  try {
    const photoreal = await loadPhotorealisticTileset(Cesium, {
      googleApiKey,
      cesiumToken,
    });

    if (photoreal && photoreal.tileset) {
      viewer.scene.primitives.add(photoreal.tileset);
      console.log('[Init] Google 3D Tiles chargé.');
    } else {
      throw new Error("Tuiles 3D indisponibles.");
    }
  } catch (err) {
    console.warn('[Fallback] Bascule sur la Terre 3D satellite par défaut.');
    // Activer la Terre 3D native Cesium si Google 403
    viewer.scene.globe.show = true;
  }

  if (loaderStatus) {
    loaderStatus.style.display = 'none';
  }

  return viewer;
}