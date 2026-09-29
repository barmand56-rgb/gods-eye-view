/**
 * Charge le tileset 3D photoréaliste de Google avec protection anti-crash 403.
 */
export async function loadPhotorealisticTileset(Cesium, { googleApiKey, cesiumToken }) {
  if (!googleApiKey && !cesiumToken) {
    console.warn("[Google3D] Aucune clé API fournie.");
    return null;
  }

  try {
    if (googleApiKey) {
      // Définir la clé globale Google
      Cesium.GoogleMaps.defaultApiKey = googleApiKey;
      
      const tileset = await Cesium.createGooglePhotorealistic3DTileset();
      return { tileset };
    }
  } catch (error) {
    console.warn("[Google3D] Échec du chargement des tuiles Google 3D (Clé invalide ou 403) :", error);
    return null;
  }

  return null;
}