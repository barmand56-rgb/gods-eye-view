/**
 * OSINT COMMAND CENTER - MODULE AVEC GESTION D'AFFICHAGE & CARTE
 * Intègre les protections, le rendu visuel et la gestion de l'image/conteneur de la carte.
 */

export function createApplicationScene(container, options = {}) {
  // 1. Sécurisation absolue du conteneur
  const targetContainer = container || document.getElementById('map') || document.body;

  if (targetContainer && targetContainer.style) {
    try {
      targetContainer.style.width = targetContainer.style.width || '100%';
      targetContainer.style.height = targetContainer.style.height || '100%';
      targetContainer.style.position = targetContainer.style.position || 'relative';
    } catch (e) {}
  }

  // 2. Injection des styles CSS de la salle de crise
  if (!document.getElementById('osint-crisis-styles')) {
    const style = document.createElement('style');
    style.id = 'osint-crisis-styles';
    style.innerHTML = `
      body, html { background: #050508; color: #00ffcc; font-family: 'Courier New', Courier, monospace; margin: 0; padding: 0; overflow: hidden; height: 100vh; }
      
      /* Effet Scanline écran cathodique */
      body::after {
        content: " "; display: block; position: fixed; top: 0; left: 0; bottom: 0; right: 0;
        background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 255, 255, 0.03));
        z-index: 99999; background-size: 100% 3px, 3px 100%; pointer-events: none;
      }

      /* Radar rotatif d'ambiance */
      .osint-radar-sweep {
        position: fixed; bottom: 40px; right: 20px; width: 160px; height: 160px;
        border-radius: 50%; border: 1px dashed rgba(0, 255, 204, 0.3);
        pointer-events: none; z-index: 1000; background: radial-gradient(circle, rgba(0,255,204,0.05) 0%, rgba(0,0,0,0) 70%);
      }
      .osint-radar-sweep::after {
        content: ''; position: absolute; top: 50%; left: 50%; width: 80px; height: 80px;
        border-right: 2px solid rgba(0, 255, 204, 0.8); transform-origin: top left;
        animation: radar-spin 4s linear infinite;
      }
      @keyframes radar-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

      /* Ticker d'alerte en bas de page */
      #osint-ticker {
        position: fixed; bottom: 0; left: 0; width: 100vw; height: 24px;
        background: #020617; border-top: 1px solid rgba(0, 255, 204, 0.4);
        color: #00ffcc; font-size: 11px; line-height: 24px;
        overflow: hidden; z-index: 1001; white-space: nowrap; box-sizing: border-box; padding-left: 10px;
      }

      /* Terminal d'analyse IA (Bas gauche) */
      #osint-ai-panel {
        position: fixed; bottom: 35px; left: 15px; width: 360px; max-height: 280px;
        background: rgba(2, 6, 23, 0.92); border: 1px solid rgba(0, 255, 204, 0.4);
        padding: 12px; z-index: 1000; box-shadow: 0 0 15px rgba(0,0,0,0.8); font-size: 12px;
        overflow-y: auto; border-radius: 4px; color: #00ffcc;
      }
      #osint-ai-panel h3 { margin: 0 0 8px 0; font-size: 13px; color: #f43f5e; border-bottom: 1px dashed rgba(244, 63, 94, 0.4); padding-bottom: 4px; }
      .ai-log-entry { margin-bottom: 6px; border-left: 2px solid #00ffcc; padding-left: 6px; }

      /* Style des points sur la carte */
      .osint-dot { width: 10px; height: 10px; background: #00ffcc; border: 2px solid #020617; border-radius: 50%; box-shadow: 0 0 8px #00ffcc; cursor: pointer; transition: transform 0.2s; }
      .osint-dot:hover { transform: scale(1.5); }
    `;
    document.head.appendChild(style);
  }

  // 3. Création des éléments visuels de l'interface (HUD)
  if (!document.getElementById('osint-ticker')) {
    const ticker = document.createElement('div');
    ticker.id = 'osint-ticker';
    ticker.innerHTML = `<span>⚡ [STRATCOM] : Surveillance globale et insulaire active • Rendu cartographique synchronisé •</span>`;
    document.body.appendChild(ticker);
  }

  if (!document.querySelector('.osint-radar-sweep')) {
    const radar = document.createElement('div');
    radar.className = 'osint-radar-sweep';
    document.body.appendChild(radar);
  }

  if (!document.getElementById('osint-ai-panel')) {
    const aiPanel = document.createElement('div');
    aiPanel.id = 'osint-ai-panel';
    aiPanel.innerHTML = `<h3>TERMINAL ANALYSE IA</h3><div id="ai-log">Moteur graphique et imagerie opérationnels.</div>`;
    document.body.appendChild(aiPanel);
  }

  // ==========================================
  // 4. SECTION DÉDIÉE À L'AFFICHAGE ET L'IMAGERIE DE LA CARTE
  // ==========================================
  let mapInstance = null;

  function initMapDisplay() {
    try {
      if (typeof L !== 'undefined' && targetContainer) {
        // Nettoyage préalable si une instance existe déjà sur ce conteneur
        if (targetContainer._leaflet_id) {
          targetContainer._leaflet_id = null;
        }

        mapInstance = L.map(targetContainer, {
          zoomControl: false,
          attributionControl: false,
          fadeAnimation: true,
          zoomAnimation: true
        }).setView([-21.1151, 55.5364], 11); // Centré sur La Réunion par défaut

        // Couche de tuiles sombres optimisée pour l'imagerie tactique
        const darkTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd',
          detectRetina: true
        });

        darkTileLayer.addTo(mapInstance);

        // Forcer le rafraîchissement de l'affichage de l'image/tuiles après un court délai
        setTimeout(() => {
          if (mapInstance) {
            mapInstance.invalidateSize();
          }
        }, 250);

        console.log("Imagerie de la carte affichée avec succès.");
      }
    } catch (e) {
      console.warn("Erreur lors de l'initialisation de l'affichage de la carte :", e);
    }
  }

  // Lancement de l'affichage
  initMapDisplay();

  // 5. Objet de retour complet et structuré pour l'application parente
  return {
    surface: targetContainer,
    scene: mapInstance,
    camera: null,
    renderer: null,
    resize() {
      if (mapInstance && typeof mapInstance.invalidateSize === 'function') {
        mapInstance.invalidateSize();
      }
    },
    destroy() {
      if (mapInstance && typeof mapInstance.remove === 'function') {
        mapInstance.remove();
        mapInstance = null;
      }
      document.getElementById('osint-ticker')?.remove();
      document.querySelector('.osint-radar-sweep')?.remove();
      document.getElementById('osint-ai-panel')?.remove();
      document.getElementById('osint-crisis-styles')?.remove();
    }
  };
}