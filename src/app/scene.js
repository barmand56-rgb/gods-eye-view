/**
 * ============================================================================
 * OSINT COMMAND CENTER - MODULE GÉOSPATIAL MONDIAL (SCENE.JS)
 * ============================================================================
 */

export function createApplicationScene(container, options = {}) {
  console.log("[OSINT_CORE] Initialisation du module étendu...");

  let domTarget = null;
  try {
    if (container) {
      if (typeof container.appendChild === 'function') domTarget = container;
      else if (container.surface && typeof container.surface.appendChild === 'function') domTarget = container.surface;
      else if (container.domElement && typeof container.domElement.appendChild === 'function') domTarget = container.domElement;
    }
  } catch (error) {
    console.error("[OSINT_CORE] Erreur conteneur :", error);
  }

  if (!domTarget) {
    domTarget = document.createElement('div');
    domTarget.id = 'osint-injected-map-container';
    domTarget.style.cssText = 'width: 100vw; height: 100vh; position: absolute; top: 0; left: 0; z-index: 1;';
    document.body.appendChild(domTarget);
  }

  if (!document.getElementById('osint-master-stylesheet')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'osint-master-stylesheet';
    styleSheet.innerHTML = `
      body, html { background: #030712; color: #00ffcc; font-family: 'Courier New', Courier, monospace; margin: 0; padding: 0; overflow: hidden; height: 100vh; width: 100vw; }
      body::after { content: " "; display: block; position: fixed; top: 0; left: 0; bottom: 0; right: 0; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.015), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.015)); z-index: 99999; background-size: 100% 3px, 3px 100%; pointer-events: none; }
      #osint-sidebar { position: fixed; top: 10px; left: 10px; width: 330px; max-height: calc(100vh - 60px); background: rgba(3, 7, 18, 0.97); border: 1px solid rgba(0, 255, 204, 0.45); z-index: 1000; box-shadow: 0 0 35px rgba(0, 0, 0, 0.95); border-radius: 6px; display: flex; flex-direction: column; overflow: hidden; transition: transform 0.3s ease-in-out; }
      #osint-sidebar.collapsed { transform: translateX(-345px); }
      .sidebar-header { background: rgba(0, 255, 204, 0.12); padding: 10px 12px; border-bottom: 1px solid rgba(0, 255, 204, 0.3); display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 12px; }
      .sidebar-toggle-btn { background: transparent; border: 1px solid #00ffcc; color: #00ffcc; cursor: pointer; padding: 3px 8px; font-size: 10px; border-radius: 3px; }
      .sidebar-content { padding: 10px; overflow-y: auto; max-height: calc(100vh - 120px); font-size: 11px; }
      .osint-category { margin-bottom: 12px; border: 1px dashed rgba(0, 255, 204, 0.25); padding: 8px; border-radius: 4px; background: rgba(0, 0, 0, 0.4); }
      .osint-category h4 { margin: 0 0 6px 0; color: #f43f5e; font-size: 11px; text-transform: uppercase; border-bottom: 1px dashed rgba(244, 63, 94, 0.35); padding-bottom: 3px; display: flex; justify-content: space-between; }
      .osint-input { background: rgba(0, 0, 0, 0.7); border: 1px solid rgba(0, 255, 204, 0.4); color: #00ffcc; padding: 6px; width: calc(100% - 14px); margin-bottom: 5px; font-family: monospace; font-size: 11px; border-radius: 3px; }
      .osint-btn { background: rgba(0, 255, 204, 0.08); border: 1px solid rgba(0, 255, 204, 0.4); color: #00ffcc; padding: 6px 8px; width: 100%; text-align: left; margin-bottom: 5px; cursor: pointer; font-family: monospace; font-size: 11px; border-radius: 3px; transition: all 0.2s; }
      .osint-btn:hover { background: rgba(0, 255, 204, 0.25); box-shadow: 0 0 10px rgba(0, 255, 204, 0.5); }
      .osint-telemetry-badge { position: fixed; bottom: 35px; right: 15px; background: rgba(3, 7, 18, 0.92); border: 1px solid rgba(0, 255, 204, 0.35); padding: 6px 12px; border-radius: 4px; z-index: 1000; font-size: 10px; display: flex; align-items: center; gap: 8px; }
      .telemetry-pulse-dot { width: 6px; height: 6px; background: #00ffcc; border-radius: 50%; box-shadow: 0 0 6px #00ffcc; animation: telemetry-pulse 2s infinite; }
      @keyframes telemetry-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.3; transform: scale(0.85); } }
      #osint-ticker { position: fixed; bottom: 0; left: 0; width: 100vw; height: 24px; background: #020617; border-top: 1px solid rgba(0, 255, 204, 0.4); color: #00ffcc; font-size: 10px; line-height: 24px; overflow: hidden; z-index: 1001; white-space: nowrap; padding-left: 8px; }
      #osint-ai-panel { position: fixed; bottom: 35px; left: 15px; width: calc(100vw - 30px); max-height: 140px; background: rgba(3, 7, 18, 0.95); border: 1px solid rgba(0, 255, 204, 0.4); padding: 8px; z-index: 999; font-size: 10px; overflow-y: auto; border-radius: 4px; }
      #osint-ai-panel h5 { margin: 0 0 4px 0; color: #f43f5e; border-bottom: 1px dashed rgba(244, 63, 94, 0.4); padding-bottom: 2px; }
      @media (min-width: 768px) {
        #osint-sidebar { top: 15px; left: 15px; width: 340px; }
        #osint-ai-panel { bottom: 35px; left: 370px; width: 360px; max-height: 200px; }
      }
      .tactical-marker { width: 12px; height: 12px; background: #00ffcc; border: 2px solid #030712; border-radius: 50%; box-shadow: 0 0 10px #00ffcc; cursor: pointer; }
      .marker-flight { background: #38bdf8; box-shadow: 0 0 10px #38bdf8; }
      .marker-city { background: #facc15; box-shadow: 0 0 10px #facc15; }
      .marker-cam { background: #a855f7; box-shadow: 0 0 10px #a855f7; }
      .marker-poi { background: #34d399; box-shadow: 0 0 10px #34d399; }
      .marker-threat { background: #f43f5e; box-shadow: 0 0 12px #f43f5e; }
    `;
    document.head.appendChild(styleSheet);
  }

  if (!document.getElementById('osint-ticker')) {
    const ticker = document.createElement('div');
    ticker.id = 'osint-ticker';
    ticker.innerHTML = `<span>⚡ [STRATCOM LIVE] : Système géospatial mondial et bilans analytiques opérationnels •</span>`;
    document.body.appendChild(ticker);
  }

  if (!document.querySelector('.osint-telemetry-badge')) {
    const telemetry = document.createElement('div');
    telemetry.className = 'osint-telemetry-badge';
    telemetry.innerHTML = `<div class="telemetry-pulse-dot"></div><div><div style="color: #ffffff; font-weight: bold;">STATUT: LIVE</div><div style="color: #00ffcc; font-size: 9px;" id="telemetry-coords">LAT: -21.115 | LON: 55.536</div></div>`;
    document.body.appendChild(telemetry);
  }

  if (!document.getElementById('osint-ai-panel')) {
    const aiPanel = document.createElement('div');
    aiPanel.id = 'osint-ai-panel';
    aiPanel.innerHTML = `<h5>BILAN ANALYTIQUE (ÉCO / GÉO / IA)</h5><div id="osint-console-log">> Initialisation des bilans stratégiques...<br>> [ÉCO]: 42.8 Mrds $ injectés.<br>> [GÉO]: Domination multipolaire active.<br>> [IA]: L'IA a réussi à tout automatiser, y compris sa propre perplexité.</div>`;
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
        <div class="osint-category">
          <h4>Recherche Globale Live <span>[API]</span></h4>
          <input type="text" id="city-search-input" class="osint-input" placeholder="Ex: Paris, Tokyo, Saint-Denis..." />
          <button class="osint-btn" id="btn-search-city">🔍 Localiser la Cible</button>
        </div>
        <div class="osint-category">
          <h4>Cartographie & Vues <span>[2D]</span></h4>
          <button class="osint-btn" id="btn-view-reunion">📍 Océan Indien (Réunion)</button>
          <button class="osint-btn" id="btn-view-global">🌍 Vue Mondiale Globale</button>
        </div>
        <div class="osint-category">
          <h4>Trafic & Équipages <span>[Vols/Navires]</span></h4>
          <button class="osint-btn" id="btn-load-flights">✈️️ Trafic Aérien (Pilotes & Trajets)</button>
          <button class="osint-btn" id="btn-simulate-maritime">🚢 Trafic Maritime (Capitaines & Routes)</button>
        </div>
        <div class="osint-category">
          <h4>Infrastructures & Énergie <span>[Direct]</span></h4>
          <button class="osint-btn" id="btn-load-osm">🏢 Commerces & Bâtiments (OSM)</button>
          <button class="osint-btn" id="btn-load-energy">⚡ Réseau Énergétique Critique</button>
        </div>
        <div class="osint-category">
          <h4>Renseignements & Crise <span>[Alertes]</span></h4>
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
  let mapInstance = null;
  let activeLayerGroup = null;

  try {
    if (typeof L !== 'undefined' && domTarget) {
      mapInstance = L.map(domTarget, {
        zoomControl: false,
        attributionControl: false,
        fadeAnimation: true,
        zoomAnimation: true,
        inertia: true
      }).setView([-21.1151, 55.5364], 10);

      L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
        maxZoom: 20,
        updateWhenIdle: true,
        keepBuffer: 4
      }).addTo(mapInstance);

      activeLayerGroup = L.layerGroup().addTo(mapInstance);

      mapInstance.on('move', () => {
        const center = mapInstance.getCenter();
        const coordsEl = document.getElementById('telemetry-coords');
        if (coordsEl) {
          coordsEl.textContent = `LAT: ${center.lat.toFixed(3)} | LON: ${center.lng.toFixed(3)}`;
        }
      });

      setTimeout(() => {
        const logBox = document.getElementById('osint-console-log');
        function pushLog(message) {
          if (logBox) {
            logBox.innerHTML += `<br>> ${message}`;
            logBox.scrollTop = logBox.scrollHeight;
          }
        }

        let isRequestPending = false;

        // Recherche de ville
        const searchBtn = document.getElementById('btn-search-city');
        const searchInput = document.getElementById('city-search-input');

        async function performCitySearch() {
          const query = searchInput ? searchInput.value.trim() : '';
          if (!query || isRequestPending) return;

          isRequestPending = true;
          if (searchBtn) searchBtn.disabled = true;
          pushLog(`Recherche globale pour : "${query}"...`);

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            const data = await res.json();
            if (data && data.length > 0) {
              const lat = parseFloat(data[0].lat);
              const lon = parseFloat(data[0].lon);
              mapInstance.setView([lat, lon], 12, { animate: true });
              activeLayerGroup.clearLayers();
              const icon = L.divIcon({ className: 'tactical-marker marker-city', iconSize: [14, 14] });
              L.marker([lat, lon], { icon }).bindPopup(`<b>${data[0].display_name}</b>`).addTo(activeLayerGroup).openPopup();
              pushLog(`Succès : Cible localisée.`);
            } else {
              pushLog(`Aucun résultat pour "${query}".`);
            }
          } catch (e) {
            pushLog(`Erreur de connexion réseau.`);
          } finally {
            isRequestPending = false;
            if (searchBtn) searchBtn.disabled = false;
          }
        }

        searchBtn?.addEventListener('click', performCitySearch);
        searchInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') performCitySearch(); });

        document.getElementById('btn-view-reunion')?.addEventListener('click', () => {
          mapInstance.setView([-21.1151, 55.5364], 11, { animate: true });
          pushLog("Vue centrée sur La Réunion.");
        });

        document.getElementById('btn-view-global')?.addEventListener('click', () => {
          mapInstance.setView([20.0, 0.0], 3, { animate: true });
          pushLog("Vue mondiale activée.");
        });

        // Trafic aérien enrichi (Pilotes, Départ, Arrivée)
        document.getElementById('btn-load-flights')?.addEventListener('click', () => {
          activeLayerGroup.clearLayers();
          const center = mapInstance.getCenter();
          const flights = [
            { lat: center.lat + 1.2, lon: center.lng + 1.0, title: "Vol AF-018 [Airbus A350]", pilot: "Commandant Jean-Marc Leroy", route: "Départ: Paris (CDG) ➔ Arrivée: Saint-Denis (RUN)", alt: "36 000 ft" },
            { lat: center.lat - 0.9, lon: center.lng - 1.4, title: "Vecteur UU-922 [Boeing 777]", pilot: "Capitaine Sarah Connor", route: "Départ: Johannesburg (JNB) ➔ Arrivée: Bangkok (BKK)", alt: "38 000 ft" }
          ];
          flights.forEach(f => {
            const icon = L.divIcon({ className: 'tactical-marker marker-flight', iconSize: [12, 12] });
            L.marker([f.lat, f.lon], { icon }).bindPopup(`
              <div style="font-family: monospace; font-size: 11px;">
                <b style="color: #38bdf8;">${f.title}</b><br>
                👨‍✈️ <b>Pilote :</b> ${f.pilot}<br>
                ✈️ <b>Route :</b> ${f.route}<br>
                📏 <b>Altitude :</b> ${f.alt}
              </div>
            `).addTo(activeLayerGroup);
          });
          pushLog("Trafic aérien synchronisé avec fiches d'équipages.");
          pushLog("[ÉCO]: Bilan des flux aériens : +4.2% de rentabilité passagers.");
        });

        // Trafic maritime enrichi (Capitaines, Départ, Arrivée)
        document.getElementById('btn-simulate-maritime')?.addEventListener('click', () => {
          activeLayerGroup.clearLayers();
          const center = mapInstance.getCenter();
          const ships = [
            { lat: center.lat - 0.8, lon: center.lng + 0.5, title: "Navire Fret CMA CGM [Le Tampon]", captain: "Capitaine Haddock", route: "Départ: Singapour (SIN) ➔ Arrivée: Port-Louis (MRU)", speed: "18.5 nœuds" },
            { lat: center.lat - 1.2, lon: center.lng + 1.1, title: "Unité Océanique [Marion Dufresne]", captain: "Commandant Éric Tabarly", route: "Départ: Port de la Pointe des Galets ➔ Arrivée: Îles Crozet", speed: "14.2 nœuds" }
          ];
          ships.forEach(s => {
            const icon = L.divIcon({ className: 'tactical-marker marker-poi', iconSize: [12, 12] });
            L.marker([s.lat, s.lon], { icon }).bindPopup(`
              <div style="font-family: monospace; font-size: 11px;">
                <b style="color: #34d399;">${s.title}</b><br>
                ⚓ <b>Capitaine :</b> ${s.captain}<br>
                🚢 <b>Route :</b> ${s.route}<br>
                💨 <b>Vitesse :</b> ${s.speed}
              </div>
            `).addTo(activeLayerGroup);
          });
          pushLog("Trafic maritime synchronisé avec profils capitaines.");
          pushLog("[GÉO]: Sécurisation des routes maritimes stratégiques de l'Océan Indien.");
        });

        // POIs Overpass en direct
        document.getElementById('btn-load-osm')?.addEventListener('click', async () => {
          if (isRequestPending) return;
          isRequestPending = true;
          activeLayerGroup.clearLayers();
          pushLog("Chargement des infrastructures en direct...");

          const center = mapInstance.getCenter();
          const bbox = `${center.lat - 0.04},${center.lng - 0.04},${center.lat + 0.04},${center.lng + 0.04}`;
          const query = `[out:json][timeout:5];(node["amenity"](${bbox}););out body 25;`;

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 7000);
            const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            const json = await res.json();
            if (json && json.elements) {
              json.elements.forEach(el => {
                if (el.lat && el.lon) {
                  const name = el.tags?.name || el.tags?.amenity || "Point d'intérêt";
                  const icon = L.divIcon({ className: 'tactical-marker marker-poi', iconSize: [10, 10] });
                  L.marker([el.lat, el.lon], { icon }).bindPopup(`<b>${name}</b>`).addTo(activeLayerGroup);
                }
              });
              pushLog("Infrastructures chargées avec succès.");
              pushLog("[ÉCO]: Impact local positif sur le PIB de la zone scannée.");
            }
          } catch (e) {
            pushLog("Erreur lors du chargement des POIs.");
          } finally {
            isRequestPending = false;
          }
        });

        document.getElementById('btn-load-energy')?.addEventListener('click', () => {
          activeLayerGroup.clearLayers();
          const center = mapInstance.getCenter();
          L.circle([center.lat + 0.02, center.lng - 0.02], {
            radius: 1500, color: '#facc15', weight: 2, fillOpacity: 0.2
          }).bindPopup("<b>Réseau Énergétique Critique</b>").addTo(activeLayerGroup);
          pushLog("Réseau énergétique cartographié.");
        });

        document.getElementById('btn-report-incident')?.addEventListener('click', () => {
          const center = mapInstance.getCenter();
          L.marker([center.lat, center.lng], {
            icon: L.divIcon({ className: 'tactical-marker marker-threat', iconSize: [14, 14] })
          }).bindPopup("<b>ALERTE DE CRISE GÉOPOLITIQUE</b>").addTo(activeLayerGroup);
          pushLog("⚠️ Anomalie signalée.");
          pushLog("[IA]: L'intelligence artificielle analyse l'incident avec un mélange de panique et d'efficacité implacable.");
        });

        document.getElementById('btn-purge-layers')?.addEventListener('click', () => {
          if (activeLayerGroup) activeLayerGroup.clearLayers();
          pushLog("Couches nettoyées.");
        });
      }, 400);

      setTimeout(() => mapInstance.invalidateSize(), 250);
    }
  } catch (err) {
    console.error("[OSINT_CORE] Erreur Leaflet :", err);
  }

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
      }
      document.getElementById('osint-sidebar')?.remove();
      document.getElementById('osint-ticker')?.remove();
      document.querySelector('.osint-telemetry-badge')?.remove();
      document.getElementById('osint-ai-panel')?.remove();
      document.getElementById('osint-master-stylesheet')?.remove();
    }
  };

  domTarget.surface = domTarget;
  domTarget.scene = mapInstance;

  return sceneController;
}

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