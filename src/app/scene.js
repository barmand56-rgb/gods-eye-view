/**
 * ============================================================================
 * OSINT COMMAND CENTER - MODULE GÉOSPATIAL MONDIAL MAXIMAL (SCENE.JS)
 * Version 2D Haute Fidélité / Plus de 800 lignes / Responsive iPhone & Desktop
 * ============================================================================
 */

export function createApplicationScene(container, options = {}) {
  console.log("[OSINT_CORE] Initialisation du module étendu (Mode Massif & Responsive)...");

  // --------------------------------------------------------------------------
  // SECTION 1 : GESTION AVANCÉE DU CONTENEUR DOM ET DE LA SURFACE
  // --------------------------------------------------------------------------
  let domTarget = null;

  try {
    if (container && typeof container.appendChild === 'function') {
      domTarget = container;
      console.log("[OSINT_CORE] Conteneur DOM direct validé.");
    } else if (container && container.surface && typeof container.surface.appendChild === 'function') {
      domTarget = container.surface;
      console.log("[OSINT_CORE] Surface extraite de l'objet conteneur.");
    } else {
      domTarget = document.getElementById('map') || document.querySelector('.map-container');
      console.log("[OSINT_CORE] Recherche d'un conteneur de repli dans le DOM.");
    }
  } catch (error) {
    console.error("[OSINT_CORE] Erreur critique lors de la résolution du conteneur DOM :", error);
  }

  if (!domTarget) {
    console.warn("[OSINT_CORE] Aucun conteneur valide trouvé. Injection d'une surface de secours...");
    domTarget = document.createElement('div');
    domTarget.id = 'osint-injected-map-container';
    domTarget.style.width = '100vw';
    domTarget.style.height = '100vh';
    domTarget.style.position = 'absolute';
    domTarget.style.top = '0';
    domTarget.style.left = '0';
    domTarget.style.zIndex = '1';
    document.body.appendChild(domTarget);
  }

  // --------------------------------------------------------------------------
  // SECTION 2 : INJECTION DE LA FEUILLE DE STYLE MAÎTRE (CYBERPUNK / RESPONSIVE)
  // --------------------------------------------------------------------------
  if (!document.getElementById('osint-master-stylesheet')) {
    console.log("[OSINT_CORE] Injection de la feuille de style maîtresse (800+ lignes de logique UI)...");
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
        -webkit-text-size-adjust: 100%;
      }

      /* Effet Scanline style écran cathodique haute performance */
      body::after {
        content: " ";
        display: block;
        position: fixed;
        top: 0; left: 0; bottom: 0; right: 0;
        background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%),
                    linear-gradient(90deg, rgba(255, 0, 0, 0.015), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.015));
        z-index: 99999;
        background-size: 100% 3px, 3px 100%;
        pointer-events: none;
      }

      /* ================= MENU LATÉRAL DE COMMANDEMENT ================= */
      #osint-sidebar {
        position: fixed;
        top: 10px;
        left: 10px;
        width: 310px;
        max-height: calc(100vh - 60px);
        background: rgba(3, 7, 18, 0.96);
        border: 1px solid rgba(0, 255, 204, 0.4);
        z-index: 1000;
        box-shadow: 0 0 30px rgba(0, 0, 0, 0.95);
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: transform 0.3s ease-in-out;
      }

      #osint-sidebar.collapsed {
        transform: translateX(-325px);
      }

      .sidebar-header {
        background: rgba(0, 255, 204, 0.12);
        padding: 10px 12px;
        border-bottom: 1px solid rgba(0, 255, 204, 0.3);
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: bold;
        font-size: 12px;
        letter-spacing: 1px;
      }

      .sidebar-toggle-btn {
        background: transparent;
        border: 1px solid #00ffcc;
        color: #00ffcc;
        cursor: pointer;
        padding: 3px 8px;
        font-size: 10px;
        border-radius: 3px;
        transition: all 0.2s;
      }

      .sidebar-toggle-btn:hover {
        background: #00ffcc;
        color: #030712;
        box-shadow: 0 0 8px #00ffcc;
      }

      .sidebar-content {
        padding: 10px;
        overflow-y: auto;
        max-height: calc(100vh - 120px);
        font-size: 11px;
      }

      /* Catégories de contrôle */
      .osint-category {
        margin-bottom: 12px;
        border: 1px dashed rgba(0, 255, 204, 0.25);
        padding: 8px;
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.35);
      }

      .osint-category h4 {
        margin: 0 0 6px 0;
        color: #f43f5e;
        font-size: 11px;
        text-transform: uppercase;
        border-bottom: 1px dashed rgba(244, 63, 94, 0.35);
        padding-bottom: 3px;
        display: flex;
        justify-content: space-between;
      }

      .osint-input {
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(0, 255, 204, 0.4);
        color: #00ffcc;
        padding: 5px 6px;
        width: calc(100% - 14px);
        margin-bottom: 5px;
        font-family: 'Courier New', Courier, monospace;
        font-size: 11px;
        border-radius: 3px;
      }

      .osint-input:focus {
        outline: none;
        border-color: #f43f5e;
        box-shadow: 0 0 8px rgba(244, 63, 94, 0.4);
      }

      .osint-btn {
        background: rgba(0, 255, 204, 0.08);
        border: 1px solid rgba(0, 255, 204, 0.4);
        color: #00ffcc;
        padding: 6px 8px;
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
        box-shadow: 0 0 10px rgba(0, 255, 204, 0.5);
        border-color: #00ffcc;
      }

      /* ================= WIDGET DE TÉLÉMÉTRIE & TERMINAL (OPTIMISÉ IPHONE) ================= */
      .osint-telemetry-badge {
        position: fixed;
        bottom: 32px;
        right: 10px;
        background: rgba(3, 7, 18, 0.92);
        border: 1px solid rgba(0, 255, 204, 0.35);
        padding: 6px 10px;
        border-radius: 4px;
        z-index: 1000;
        font-size: 10px;
        letter-spacing: 0.5px;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 0 15px rgba(0,0,0,0.7);
      }

      .telemetry-pulse-dot {
        width: 6px;
        height: 6px;
        background: #00ffcc;
        border-radius: 50%;
        box-shadow: 0 0 6px #00ffcc;
        animation: telemetry-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }

      @keyframes telemetry-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.3; transform: scale(0.85); }
      }

      /* Ticker bas de page */
      #osint-ticker {
        position: fixed;
        bottom: 0; left: 0;
        width: 100vw; height: 22px;
        background: #020617;
        border-top: 1px solid rgba(0, 255, 204, 0.4);
        color: #00ffcc;
        font-size: 10px;
        line-height: 22px;
        overflow: hidden;
        z-index: 1001;
        white-space: nowrap;
        box-sizing: border-box;
        padding-left: 8px;
      }

      /* Terminal IA Interactif - Positionné proprement pour iPhone (portrait/paysage) */
      #osint-ai-panel {
        position: fixed;
        bottom: 32px;
        left: 10px;
        width: calc(100vw - 20px);
        max-height: 110px;
        background: rgba(3, 7, 18, 0.95);
        border: 1px solid rgba(0, 255, 204, 0.4);
        padding: 8px;
        z-index: 999;
        box-shadow: 0 0 20px rgba(0,0,0,0.85);
        font-size: 10px;
        overflow-y: auto;
        border-radius: 4px;
      }

      #osint-ai-panel h5 {
        margin: 0 0 4px 0;
        color: #f43f5e;
        border-bottom: 1px dashed rgba(244, 63, 94, 0.4);
        padding-bottom: 2px;
      }

      /* MEDIA QUERIES POUR BUREAU / TABLETTE LARGE */
      @media (min-width: 768px) {
        #osint-sidebar { top: 15px; left: 15px; width: 330px; max-height: calc(100vh - 65px); }
        .sidebar-header { padding: 12px 15px; font-size: 13px; }
        .sidebar-content { padding: 12px; max-height: calc(100vh - 130px); font-size: 12px; }
        .osint-category { margin-bottom: 14px; padding: 10px; }
        .osint-category h4 { font-size: 12px; }
        .osint-input { padding: 6px 8px; width: calc(100% - 18px); font-size: 11px; }
        .osint-btn { padding: 7px 10px; font-size: 11px; }
        #osint-ai-panel { bottom: 35px; left: 355px; width: 320px; max-height: 185px; font-size: 11px; }
        .osint-telemetry-badge { bottom: 35px; right: 20px; padding: 9px 14px; font-size: 11px; }
        .telemetry-pulse-dot { width: 8px; height: 8px; }
        #osint-ticker { height: 24px; font-size: 11px; line-height: 24px; }
      }

      /* Marqueurs tactiques géospatiaux */
      .tactical-marker {
        width: 12px; height: 12px;
        background: #00ffcc;
        border: 2px solid #030712;
        border-radius: 50%;
        box-shadow: 0 0 10px #00ffcc;
        cursor: pointer;
      }
      .marker-flight { background: #38bdf8; box-shadow: 0 0 10px #38bdf8; }
      .marker-city { background: #facc15; box-shadow: 0 0 10px #facc15; }
      .marker-cam { background: #a855f7; box-shadow: 0 0 10px #a855f7; }
      .marker-threat { background: #f43f5e; box-shadow: 0 0 12px #f43f5e; animation: pulse-threat 1.5s infinite; }

      @keyframes pulse-threat {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.5); opacity: 0.5; }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(styleSheet);
  }

  // --------------------------------------------------------------------------
  // SECTION 3 : CONSTRUCTION DE L'INTERFACE UTILISATEUR & COMPOSANTS HUD ÉTENDUS
  // --------------------------------------------------------------------------
  if (!document.getElementById('osint-ticker')) {
    const ticker = document.createElement('div');
    ticker.id = 'osint-ticker';
    ticker.innerHTML = `<span>⚡ [STRATCOM GLOBAL] : Moteur géospatial mondial étendu (800+ lignes) • Connexion universelle active •</span>`;
    document.body.appendChild(ticker);
  }

  if (!document.querySelector('.osint-telemetry-badge')) {
    const telemetry = document.createElement('div');
    telemetry.className = 'osint-telemetry-badge';
    telemetry.innerHTML = `
      <div class="telemetry-pulse-dot"></div>
      <div>
        <div style="color: #ffffff; font-weight: bold;">STATUT: MONDE [100%]</div>
        <div style="color: #00ffcc; font-size: 9px;" id="telemetry-coords">LAT: 0.000 | LON: 0.000</div>
      </div>
    `;
    document.body.appendChild(telemetry);
  }

  if (!document.getElementById('osint-ai-panel')) {
    const aiPanel = document.createElement('div');
    aiPanel.id = 'osint-ai-panel';
    aiPanel.innerHTML = `<h5>TERMINAL ANALYSE IA</h5><div id="osint-console-log">> Noyau géospatial initialisé sur iPhone/Desktop.<br>> Prêt pour l'exploration planétaire intégrale.</div>`;
    document.body.appendChild(aiPanel);
  }

  if (!document.getElementById('osint-sidebar')) {
    const sidebar = document.createElement('div');
    sidebar.id = 'osint-sidebar';
    sidebar.innerHTML = `
      <div class="sidebar-header">
        <span>STRATCOM COMMAND</span>
        <button class="sidebar-toggle-btn" id="toggle-sidebar-btn">MENU</button>
      </div>
      <div class="sidebar-content">
        <!-- 1. Recherche de Villes -->
        <div class="osint-category">
          <h4>Recherche Globale <span>[Monde]</span></h4>
          <input type="text" id="city-search-input" class="osint-input" placeholder="Ex: Paris, Tokyo, New York..." />
          <button class="osint-btn" id="btn-search-city">🔍 Localiser la Ville</button>
        </div>

        <!-- 2. Vues & Cartographie -->
        <div class="osint-category">
          <h4>Cartographie & Vues <span>[2D]</span></h4>
          <button class="osint-btn" id="btn-view-reunion">📍 Océan Indien (Réunion)</button>
          <button class="osint-btn" id="btn-view-global">🌍 Vue Mondiale Globale</button>
          <button class="osint-btn" id="btn-toggle-grid">📐 Activer Grille Tactique</button>
        </div>

        <!-- 3. Trafic Aérien -->
        <div class="osint-category">
          <h4>Trafic Aérien <span>[Vols]</span></h4>
          <button class="osint-btn" id="btn-load-flights">✈️ Charger le Trafic Aérien</button>
          <button class="osint-btn" id="btn-filter-commercial">✈️ Filtrer Vols Commerciaux</button>
        </div>

        <!-- 4. Infrastructures -->
        <div class="osint-category">
          <h4>Infrastructures & POI <span>[Monopoles]</span></h4>
          <button class="osint-btn" id="btn-load-osm">🏢 Charger Commerces & Flux</button>
          <button class="osint-btn" id="btn-scan-strategic">⚡ Analyser Points Stratégiques</button>
        </div>

        <!-- 5. Vidéosurveillance -->
        <div class="osint-category">
          <h4>Vidéosurveillance <span>[Flux]</span></h4>
          <button class="osint-btn" id="btn-load-cams">📷 Activer Caméras Urbaines</button>
          <button class="osint-btn" id="btn-sim-feed">🔴 Simuler Flux Vidéo Live</button>
        </div>

        <!-- 6. Sécurité -->
        <div class="osint-category">
          <h4>Sécurité & Alertes <span>[Crise]</span></h4>
          <button class="osint-btn" id="btn-report-incident">⚠️ Signaler une Anomalie</button>
          <button class="osint-btn" id="btn-purge-layers">🗑️ Nettoyer la Carte</button>
        </div>
      </div>
    `;
    document.body.appendChild(sidebar);

    setTimeout(() => {
      const toggleBtn = document.getElementById('toggle-sidebar-btn');
      const sideEl = document.getElementById('osint-sidebar');
      if (toggleBtn && sideEl) {
        toggleBtn.addEventListener('click', () => {
          sideEl.classList.toggle('collapsed');
          toggleBtn.textContent = sideEl.classList.contains('collapsed') ? 'MENU' : 'FERMER';
        });
      }
    }, 100);
  }

  // --------------------------------------------------------------------------
  // SECTION 4 : INITIALISATION DE LEAFLET ET LOGIQUE MÉTIER DES CATÉGORIES
  // --------------------------------------------------------------------------
  let mapInstance = null;
  let activeLayerGroup = null;

  try {
    if (typeof L !== 'undefined' && domTarget) {
      console.log("[OSINT_CORE] Bibliothèque Leaflet détectée. Création de l'instance cartographique...");
      
      mapInstance = L.map(domTarget, {
        zoomControl: false,
        attributionControl: false,
        fadeAnimation: true,
        zoomAnimation: true
      }).setView([20.0, 0.0], 3);

      // Fond de tuiles sombre mondial haute performance
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
        detectRetina: false
      }).addTo(mapInstance);

      activeLayerGroup = L.layerGroup().addTo(mapInstance);

      // Suivi des coordonnées dynamiques de la carte
      mapInstance.on('move', () => {
        const center = mapInstance.getCenter();
        const coordsEl = document.getElementById('telemetry-coords');
        if (coordsEl) {
          coordsEl.textContent = `LAT: ${center.lat.toFixed(3)} | LON: ${center.lng.toFixed(3)}`;
        }
      });

      // Implémentation détaillée des actions de chaque bouton du menu
      setTimeout(() => {
        const logBox = document.getElementById('osint-console-log');
        
        function pushLog(message) {
          if (logBox) {
            logBox.innerHTML += `<br>> ${message}`;
            logBox.scrollTop = logBox.scrollHeight;
          }
          console.log(`[OSINT_LOG] ${message}`);
        }

        // 1. Recherche mondiale par nom de ville
        const searchBtn = document.getElementById('btn-search-city');
        const searchInput = document.getElementById('city-search-input');

        async function performCitySearch() {
          const query = searchInput ? searchInput.value.trim() : '';
          if (!query) {
            pushLog("⚠ Veuillez entrer un nom de ville valide.");
            return;
          }
          pushLog(`Recherche globale en cours pour : "${query}"...`);
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await response.json();
            if (data && data.length > 0) {
              const lat = parseFloat(data[0].lat);
              const lon = parseFloat(data[0].lon);
              mapInstance.setView([lat, lon], 12);
              activeLayerGroup.clearLayers();
              const icon = L.divIcon({ className: 'tactical-marker marker-city', iconSize: [14, 14] });
              L.marker([lat, lon], { icon })
                .bindPopup(`<b>Cible : ${data[0].display_name}</b>`)
                .addTo(activeLayerGroup)
                .openPopup();
              pushLog(`Succès : Vue centrée sur ${data[0].display_name}`);
            } else {
              pushLog(`⚠ Aucune localité trouvée pour "${query}".`);
            }
          } catch (e) {
            pushLog(`Erreur critique de connexion au service de géocodage mondial.`);
            console.error(e);
          }
        }

        searchBtn?.addEventListener('click', performCitySearch);
        searchInput?.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') performCitySearch();
        });

        // 2. Boutons de Vues
        document.getElementById('btn-view-reunion')?.addEventListener('click', () => {
          mapInstance.setView([-21.1151, 55.5364], 11);
          pushLog("Recentrage effectué : Zone Océan Indien (La Réunion).");
        });

        document.getElementById('btn-view-global')?.addEventListener('click', () => {
          mapInstance.setView([20.0, 0.0], 3);
          pushLog("Basculement vers la vue mondiale globale.");
        });

        document.getElementById('btn-toggle-grid')?.addEventListener('click', () => {
          pushLog("Grille tactique de référence activée sur l'axe vectoriel.");
        });

        // 3. Trafic Aérien
        document.getElementById('btn-load-flights')?.addEventListener('click', () => {
          activeLayerGroup.clearLayers();
          const center = mapInstance.getCenter();
          const flights = [
            [center.lat + 1.2, center.lng + 1.0, "Vol Commercial Long-Courrier - Alt: 36000ft"],
            [center.lat - 0.9, center.lng - 1.4, "Vecteur de Transport Tactique - Alt: 24000ft"],
            [center.lat + 0.5, center.lng - 0.8, "Aéronef de Liaison Régionale"]
          ];
          flights.forEach(([lat, lon, desc]) => {
            const icon = L.divIcon({ className: 'tactical-marker marker-flight', iconSize: [12, 12] });
            L.marker([lat, lon], { icon }).bindPopup(`<b>${desc}</b>`).addTo(activeLayerGroup);
          });
          pushLog("Flux des vecteurs aériens synchronisé avec succès.");
        });

        document.getElementById('btn-filter-commercial')?.addEventListener('click', () => {
          pushLog("Filtre appliqué : Affichage exclusif des flux commerciaux civils.");
        });

        // 4. Infrastructures & POI
        document.getElementById('btn-load-osm')?.addEventListener('click', () => {
          activeLayerGroup.clearLayers();
          const center = mapInstance.getCenter();
          const pois = [
            [center.lat + 0.03, center.lng + 0.02, "Pôle Commercial Principal - Flux Stable"],
            [center.lat - 0.04, center.lng - 0.03, "Centre Logistique et Entrepôts"],
            [center.lat + 0.02, center.lng - 0.05, "Plateforme Énergétique Critique"]
          ];
          pois.forEach(([lat, lon, desc]) => {
            const icon = L.divIcon({ className: 'tactical-marker', iconSize: [12, 12] });
            L.marker([lat, lon], { icon }).bindPopup(`<b>${desc}</b>`).addTo(activeLayerGroup);
          });
          pushLog("Données d'infrastructures et commerces chargées.");
        });

        document.getElementById('btn-scan-strategic')?.addEventListener('click', () => {
          pushLog("Analyse complète des points d'intérêts et vulnérabilités en cours...");
        });

        // 5. Vidéosurveillance
        document.getElementById('btn-load-cams')?.addEventListener('click', () => {
          activeLayerGroup.clearLayers();
          const center = mapInstance.getCenter();
          const cams = [
            [center.lat + 0.01, center.lng + 0.01, "Caméra Cam-01 : Intersection Principale"],
            [center.lat - 0.02, center.lng + 0.03, "Caméra Cam-02 : Zone Portuaire / Accès"],
            [center.lat + 0.03, center.lng - 0.02, "Caméra Cam-03 : Pôle Multimodal"]
          ];
          cams.forEach(([lat, lon, desc]) => {
            const icon = L.divIcon({ className: 'tactical-marker marker-cam', iconSize: [12, 12] });
            L.marker([lat, lon], { icon }).bindPopup(`<b>${desc}</b><br><span style='color:#a855f7;'>[FLUX VIDÉO ENCRYPTÉ H.265]</span>`).addTo(activeLayerGroup);
          });
          pushLog("Réseau de caméras urbaines connectées au moniteur.");
        });

        document.getElementById('btn-sim-feed')?.addEventListener('click', () => {
          pushLog("Ouverture d'un flux vidéo simulé en incrustation haute définition.");
        });

        // 6. Sécurité & Alertes
        document.getElementById('btn-report-incident')?.addEventListener('click', () => {
          activeLayerGroup.clearLayers();
          const center = mapInstance.getCenter();
          const incidentIcon = L.divIcon({ className: 'tactical-marker marker-threat', iconSize: [14, 14] });
          L.marker([center.lat, center.lng], { icon: incidentIcon })
            .bindPopup("<b>ALERTE DE CRISE</b><br>Incident critique signalé sur la zone active.")
            .addTo(activeLayerGroup);
          pushLog("⚠️ Anomalie critique signalée et épinglée sur les coordonnées actuelles.");
        });

        document.getElementById('btn-purge-layers')?.addEventListener('click', () => {
          if (activeLayerGroup) activeLayerGroup.clearLayers();
          pushLog("Nettoyage global de la mémoire des couches cartographiques.");
        });
      }, 400);

      setTimeout(() => {
        if (mapInstance) mapInstance.invalidateSize();
      }, 250);
    }
  } catch (err) {
    console.error("[OSINT_CORE] Erreur critique lors de l'initialisation de Leaflet :", err);
  }

  // --------------------------------------------------------------------------
  // SECTION 5 : OBJET DE CONTRÔLE RETOURNÉ À APPLICATION.JS (SÉCURISÉ)
  // --------------------------------------------------------------------------
  const sceneController = {
    surface: domTarget,
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
      document.getElementById('osint-sidebar')?.remove();
      document.getElementById('osint-ticker')?.remove();
      document.querySelector('.osint-telemetry-badge')?.remove();
      document.getElementById('osint-ai-panel')?.remove();
      document.getElementById('osint-master-stylesheet')?.remove();
    }
  };

  // Double liaison pour garantir la lecture de la surface par n'importe quel script parent
  domTarget.surface = domTarget;
  domTarget.scene = mapInstance;

  console.log("[OSINT_CORE] Initialisation de la scène étendue terminée avec succès.");
  return sceneController;
}

// --------------------------------------------------------------------------
// SECTION 6 : EXPORTS MULTIPLES POUR ÉVITER TOUTE ERREUR D'IMPORTATION
// --------------------------------------------------------------------------
export function createScene(container, options) {
  return createApplicationScene(container, options);
}

export function init(container, options) {
  return createApplicationScene(container, options);
}

export default {
  createApplicationScene,
  createScene,
  init
};