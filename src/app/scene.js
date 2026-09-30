/**
 * ============================================================================
 * OSINT COMMAND CENTER - FULL STACK CRISIS MANAGEMENT MODULE (SCENE.JS)
 * Version ultra-robuste avec menu latéral, catégories développées et Leaflet 2D
 * ============================================================================
 */

export function createApplicationScene(container, options = {}) {
  console.log("[OSINT_CORE] Initialisation de la scène opérationnelle...");

  // 1. GESTION SÉCURISÉE DU CONTENEUR DOM POUR ÉVITER LE CRASH LEAFLET
  let domTarget = null;

  if (container && typeof container.appendChild === 'function') {
    domTarget = container;
  } else if (container && container.surface && typeof container.surface.appendChild === 'function') {
    domTarget = container.surface;
  } else {
    domTarget = document.getElementById('map') || document.querySelector('.map-container');
  }

  if (!domTarget) {
    domTarget = document.createElement('div');
    domTarget.id = 'osint-injected-map-container';
    domTarget.style.width = '100vw';
    domTarget.style.height = '100vh';
    domTarget.style.position = 'absolute';
    domTarget.style.top = '0';
    domTarget.style.left = '0';
    document.body.appendChild(domTarget);
  }

  // 2. INJECTION DES STYLES CSS COMPLETS (UI, HUD, Menu Latéral, Scanlines)
  if (!document.getElementById('osint-master-stylesheet')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'osint-master-stylesheet';
    styleSheet.innerHTML = `
      body, html {
        background: #030712;
        color: #00ffcc;
        font-family: 'Courier New', Courier, monospace;
        margin: 0;
        padding: 0;
        overflow: hidden;
        height: 100vh;
        width: 100vw;
      }

      /* Effet Scanline style écran cathodique militaire */
      body::after {
        content: " ";
        display: block;
        position: fixed;
        top: 0; left: 0; bottom: 0; right: 0;
        background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.3) 50%), 
                    linear-gradient(90deg, rgba(255, 0, 0, 0.02), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.02));
        z-index: 99999;
        background-size: 100% 3px, 3px 100%;
        pointer-events: none;
      }

      /* Conteneur global de la carte */
      #osint-map-view {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1;
      }

      /* ================= MENU LATÉRAL DÉROULANT ================= */
      #osint-sidebar {
        position: fixed;
        top: 15px;
        left: 15px;
        width: 320px;
        max-height: calc(100vh - 70px);
        background: rgba(3, 7, 18, 0.94);
        border: 1px solid rgba(0, 255, 204, 0.4);
        z-index: 1000;
        box-shadow: 0 0 25px rgba(0, 0, 0, 0.9);
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: transform 0.3s ease-in-out;
      }

      #osint-sidebar.collapsed {
        transform: translateX(-335px);
      }

      .sidebar-header {
        background: rgba(0, 255, 204, 0.1);
        padding: 10px 15px;
        border-bottom: 1px solid rgba(0, 255, 204, 0.3);
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: bold;
        font-size: 13px;
        letter-spacing: 1px;
      }

      .sidebar-toggle-btn {
        background: transparent;
        border: 1px solid #00ffcc;
        color: #00ffcc;
        cursor: pointer;
        padding: 2px 6px;
        font-size: 11px;
        border-radius: 3px;
      }

      .sidebar-toggle-btn:hover {
        background: #00ffcc;
        color: #030712;
      }

      .sidebar-content {
        padding: 12px;
        overflow-y: auto;
        max-height: calc(100vh - 120px);
        font-size: 12px;
      }

      /* Sections & Catégories du Menu */
      .osint-category {
        margin-bottom: 15px;
        border: 1px dashed rgba(0, 255, 204, 0.2);
        padding: 8px;
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.3);
      }

      .osint-category h4 {
        margin: 0 0 8px 0;
        color: #f43f5e;
        font-size: 12px;
        text-transform: uppercase;
        border-bottom: 1px dashed rgba(244, 63, 94, 0.3);
        padding-bottom: 3px;
        display: flex;
        justify-content: space-between;
      }

      .osint-btn {
        background: rgba(0, 255, 204, 0.08);
        border: 1px solid rgba(0, 255, 204, 0.4);
        color: #00ffcc;
        padding: 6px 10px;
        width: 100%;
        text-align: left;
        margin-bottom: 5px;
        cursor: pointer;
        font-family: 'Courier New', Courier, monospace;
        font-size: 11px;
        border-radius: 3px;
        transition: all 0.2s;
      }

      .osint-btn:hover {
        background: rgba(0, 255, 204, 0.25);
        box-shadow: 0 0 8px rgba(0, 255, 204, 0.5);
      }

      /* ================= HUD & ÉLÉMENTS VISUELS ================= */
      .osint-radar-sweep {
        position: fixed;
        bottom: 35px;
        right: 20px;
        width: 140px;
        height: 140px;
        border-radius: 50%;
        border: 1px dashed rgba(0, 255, 204, 0.4);
        pointer-events: none;
        z-index: 1000;
        background: radial-gradient(circle, rgba(0,255,204,0.08) 0%, rgba(0,0,0,0) 70%);
      }

      .osint-radar-sweep::after {
        content: '';
        position: absolute;
        top: 50%; left: 50%;
        width: 70px; height: 70px;
        border-right: 2px solid rgba(0, 255, 204, 0.9);
        transform-origin: top left;
        animation: radar-spin 4s linear infinite;
      }

      @keyframes radar-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      #osint-ticker {
        position: fixed;
        bottom: 0; left: 0;
        width: 100vw; height: 24px;
        background: #020617;
        border-top: 1px solid rgba(0, 255, 204, 0.4);
        color: #00ffcc;
        font-size: 11px;
        line-height: 24px;
        overflow: hidden;
        z-index: 1001;
        white-space: nowrap;
        box-sizing: border-box;
        padding-left: 10px;
      }

      /* Terminal IA Intégré */
      #osint-ai-panel {
        position: fixed;
        bottom: 35px;
        left: 345px;
        width: 320px;
        max-height: 180px;
        background: rgba(3, 7, 18, 0.92);
        border: 1px solid rgba(0, 255, 204, 0.4);
        padding: 10px;
        z-index: 1000;
        box-shadow: 0 0 15px rgba(0,0,0,0.8);
        font-size: 11px;
        overflow-y: auto;
        border-radius: 4px;
      }

      #osint-ai-panel h5 {
        margin: 0 0 5px 0;
        color: #f43f5e;
        border-bottom: 1px dashed rgba(244, 63, 94, 0.4);
        padding-bottom: 3px;
      }

      /* Points et marqueurs tactiques de la carte */
      .tactical-marker {
        width: 12px;
        height: 12px;
        background: #00ffcc;
        border: 2px solid #030712;
        border-radius: 50%;
        box-shadow: 0 0 10px #00ffcc;
        cursor: pointer;
      }
      .marker-flight { background: #38bdf8; box-shadow: 0 0 10px #38bdf8; }
      .marker-cam { background: #facc15; box-shadow: 0 0 10px #facc15; }
      .marker-threat { background: #f43f5e; box-shadow: 0 0 10px #f43f5e; animation: pulse-threat 1.5s infinite; }

      @keyframes pulse-threat {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.4); opacity: 0.6; }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(styleSheet);
  }

  // 3. CRÉATION DES ÉLÉMENTS DE L'INTERFACE UTILISATEUR (UI)
  if (!document.getElementById('osint-ticker')) {
    const ticker = document.createElement('div');
    ticker.id = 'osint-ticker';
    ticker.innerHTML = `<span>⚡ [STRATCOM GLOBAL] : Flux de surveillance multidimensionnel actif • Systèmes de cartes 2D synchronisés •</span>`;
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
    aiPanel.innerHTML = `<h5>TERMINAL ANALYSE IA</h5><div id="ai-console-log">> Noyau initialisé avec succès.<br>> Prêt pour l'investigation.</div>`;
    document.body.appendChild(aiPanel);
  }

  // Création du Menu Latéral Déroulant complet et de ses catégories
  if (!document.getElementById('osint-sidebar')) {
    const sidebar = document.createElement('div');
    sidebar.id = 'osint-sidebar';
    sidebar.innerHTML = `
      <div class="sidebar-header">
        <span>STRATCOM COMMAND</span>
        <button class="sidebar-toggle-btn" id="toggle-sidebar-btn">RÉDUIRE</button>
      </div>
      <div class="sidebar-content">
        <!-- Catégorie 1 : Navigation & Vues -->
        <div class="osint-category">
          <h4>Cartographie & Vues <span>[2D]</span></h4>
          <button class="osint-btn" id="btn-view-reunion">📍 Centrer : Zone Océan Indien</button>
          <button class="osint-btn" id="btn-view-global">🌍 Vue Globale Mondiale</button>
          <button class="osint-btn" id="btn-toggle-tiles">🌓 Basculer Thème Cartographique</button>
        </div>

        <!-- Catégorie 2 : Traçage des Vols (OpenSky) -->
        <div class="osint-category">
          <h4>Trafic Aérien <span>[Vols]</span></h4>
          <button class="osint-btn" id="btn-load-flights">✈️ Charger les Vols Actifs</button>
          <button class="osint-btn" id="btn-filter-commercial">✈️ Filtrer Vols Commerciaux</button>
        </div>

        <!-- Catégorie 3 : Infrastructures & Commerces -->
        <div class="osint-category">
          <h4>Infrastructures & POI <span>[Monopoles]</span></h4>
          <button class="osint-btn" id="btn-load-osm">🏢 Charger Commerces & Flux</button>
          <button class="osint-btn" id="btn-scan-strategic">⚡ Analyser les Points Stratégiques</button>
        </div>

        <!-- Catégorie 4 : Caméras & Surveillance Vidéo -->
        <div class="osint-category">
          <h4>Vidéosurveillance <span>[Flux]</span></h4>
          <button class="osint-btn" id="btn-load-cams">📷 Activer les Caméras Urbaines</button>
          <button class="osint-btn" id="btn-sim-feed">🔴 Simuler Flux Vidéo Live</button>
        </div>

        <!-- Catégorie 5 : Sécurité & Incidents -->
        <div class="osint-category">
          <h4>Sécurité & Alertes <span>[Crise]</span></h4>
          <button class="osint-btn" id="btn-report-incident">⚠️ Signaler une Anomalie</button>
          <button class="osint-btn" id="btn-purge-layers">🗑️ Nettoyer la Carte</button>
        </div>
      </div>
    `;
    document.body.appendChild(sidebar);

    // Gestion du comportement de repli du menu
    setTimeout(() => {
      const toggleBtn = document.getElementById('toggle-sidebar-btn');
      const sideEl = document.getElementById('osint-sidebar');
      if (toggleBtn && sideEl) {
        toggleBtn.addEventListener('click', () => {
          sideEl.classList.toggle('collapsed');
          toggleBtn.textContent = sideEl.classList.contains('collapsed') ? 'MENU' : 'RÉDUIRE';
        });
      }
    }, 100);
  }

  // 4. INITIALISATION DE LA CARTE LEAFLET DE MANIÈRE FLUIDE ET SÉCURISÉE
  let mapInstance = null;
  let activeLayerGroup = null;

  try {
    if (typeof L !== 'undefined' && domTarget) {
      // S'assurer que l'élément cible a une dimension active
      domTarget.id = domTarget.id || 'osint-map-canvas';
      
      mapInstance = L.map(domTarget, {
        zoomControl: false,
        attributionControl: false,
        fadeAnimation: true,
        zoomAnimation: true,
        markerZoomAnimation: true
      }).setView([-21.1151, 55.5364], 11); // Centré sur La Réunion par défaut

      // Couche de tuiles optimisée haute performance (CartoDB Dark Matter avec Retina)
      const baseTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
        detectRetina: true,
        updateWhenIdle: true,
        keepBuffer: 4
      });

      baseTileLayer.addTo(mapInstance);
      activeLayerGroup = L.layerGroup().addTo(mapInstance);

      // Actions interactive des boutons du menu latéral
      setTimeout(() => {
        const logBox = document.getElementById('osint-console-log');
        
        function logAction(msg) {
          if (logBox) {
            logBox.innerHTML += `<br>> ${msg}`;
            logBox.scrollTop = logBox.scrollHeight;
          }
        }

        document.getElementById('btn-view-reunion')?.addEventListener('click', () => {
          mapInstance.setView([-21.1151, 55.5364], 11);
          logAction("Recentrage : Zone Île de La Réunion.");
        });

        document.getElementById('btn-view-global')?.addEventListener('click', () => {
          mapInstance.setView([20.0, 0.0], 3);
          logAction("Recentrage : Vue Globale Mondiale.");
        });

        document.getElementById('btn-load-flights')?.addEventListener('click', () => {
          activeLayerGroup.clearLayers();
          // Simulation de points de vols fluides
          const sampleFlights = [
            [-21.2, 55.4, "Vol UU971 (Paris)"],
            [-20.9, 55.3, "Vol SS770 (Lyon)"],
            [-21.3, 55.7, "Drone de Reconnaissance R-04"]
          ];
          sampleFlights.forEach(([lat, lon, title]) => {
            const icon = L.divIcon({ className: 'tactical-marker marker-flight', iconSize: [12, 12] });
            L.marker([lat, lon], { icon }).bindPopup(`<b>${title}</b>`).addTo(activeLayerGroup);
          });
          logAction("Trafic aérien synchronisé.");
        });

        document.getElementById('btn-load-osm')?.addEventListener('click', () => {
          activeLayerGroup.clearLayers();
          const samplePOIs = [
            [-21.125, 55.531, "Centre Commercial Principal"],
            [-21.100, 55.500, "Infrastructure Logistique"],
            [-21.340, 55.470, "Plateforme Énergétique"]
          ];
          samplePOIs.forEach(([lat, lon, title]) => {
            const icon = L.divIcon({ className: 'tactical-marker', iconSize: [12, 12] });
            L.marker([lat, lon], { icon }).bindPopup(`<b>${title}</b>`).addTo(activeLayerGroup);
          });
          logAction("Infrastructures et commerces affichés.");
        });

        document.getElementById('btn-load-cams')?.addEventListener('click', () => {
          activeLayerGroup.clearLayers();
          const sampleCams = [
            [-21.110, 55.520, "Caméra Cam-01 : Carrefour Stratégique"],
            [-21.130, 55.550, "Caméra Cam-02 : Zone Portuaire"]
          ];
          sampleCams.forEach(([lat, lon, title]) => {
            const icon = L.divIcon({ className: 'tactical-marker marker-cam', iconSize: [12, 12] });
            L.marker([lat, lon], { icon }).bindPopup(`<b>${title}</b>`).addTo(activeLayerGroup);
          });
          logAction("Flux de vidéosurveillance connectés.");
        });

        document.getElementById('btn-purge-layers')?.addEventListener('click', () => {
          if (activeLayerGroup) activeLayerGroup.clearLayers();
          logAction("Nettoyage des couches cartographiques effectué.");
        });
      }, 300);

      // Forcer le rafraîchissement de la taille pour éliminer les bugs de rendu gris
      setTimeout(() => {
        if (mapInstance) mapInstance.invalidateSize();
      }, 250);
    }
  } catch (err) {
    console.warn("[OSINT_CORE] Erreur lors de l'initialisation de Leaflet :", err);
  }

  console.log("[OSINT_CORE] Module complet chargé et prêt.");

  // 5. OBJET DE RETOUR STRICT ATTENDU PAR APPLICATION.JS
  return {
    surface: domTarget,     // Fournit l'élément HTML racine valide requis par le framework
    scene: mapInstance,     // Objet de la carte Leaflet
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
      document.getElementById('osint-sidebar')?.remove();
      document.getElementById('osint-ticker')?.remove();
      document.querySelector('.osint-radar-sweep')?.remove();
      document.getElementById('osint-ai-panel')?.remove();
      document.getElementById('osint-master-stylesheet')?.remove();
    }
  };
}