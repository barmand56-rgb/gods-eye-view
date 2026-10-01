/**
 * ============================================================================
 * OSINT COMMAND CENTER - MODULE GÉOSPATIAL MONDIAL MAXIMAL (SCENE.JS)
 * Version Finale Blindée : Compatibilité Totale Application Parent (Surface Services)
 * ============================================================================
 */

export function createApplicationScene(container, options = {}) {
  console.log("[OSINT_CORE] Initialisation du module OSINT (Compatibilité Application Parent)...");

  const OPENAI_API_KEY = options.openaiKey || localStorage.getItem('openai_api_key') || '';

  // --------------------------------------------------------------------------
  // SECTION 1 : GESTION AVANCÉE ET SÉCURISÉE DU CONTENEUR DOM ET DE LA SURFACE
  // --------------------------------------------------------------------------
  let domTarget = null;
  try {
    if (container) {
      if (typeof container.appendChild === 'function') domTarget = container;
      else if (container.surface && typeof container.surface.appendChild === 'function') domTarget = container.surface;
      else if (container.domElement && typeof container.domElement.appendChild === 'function') domTarget = container.domElement;
      else if (typeof container.getSurface === 'function') domTarget = container.getSurface();
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

  // --------------------------------------------------------------------------
  // SECTION 2 : FEUILLE DE STYLE MAÎTRE (CYBERPUNK & POPUPS FLUIDES)
  // --------------------------------------------------------------------------
  if (!document.getElementById('osint-master-stylesheet')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'osint-master-stylesheet';
    styleSheet.innerHTML = `
      body, html { background: #030712; color: #00ffcc; font-family: 'Courier New', Courier, monospace; margin: 0; padding: 0; overflow: hidden; height: 100vh; width: 100vw; -webkit-text-size-adjust: 100%; }
      body::after { content: " "; display: block; position: fixed; top: 0; left: 0; bottom: 0; right: 0; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.015), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.015)); z-index: 99999; background-size: 100% 3px, 3px 100%; pointer-events: none; }
      
      #osint-floating-toggle {
        position: fixed; top: 15px; left: 15px; z-index: 1002;
        background: rgba(3, 7, 18, 0.95); border: 1px solid #00ffcc; color: #00ffcc;
        padding: 8px 12px; font-family: 'Courier New', Courier, monospace; font-size: 11px;
        cursor: pointer; border-radius: 4px; box-shadow: 0 0 15px rgba(0,255,204,0.3);
        display: none; transition: all 0.2s;
      }
      #osint-floating-toggle:hover { background: #00ffcc; color: #030712; }

      #osint-sidebar { position: fixed; top: 15px; left: 15px; width: 340px; max-height: calc(100vh - 60px); background: rgba(3, 7, 18, 0.97); border: 1px solid rgba(0, 255, 204, 0.45); z-index: 1000; box-shadow: 0 0 35px rgba(0, 0, 0, 0.95); border-radius: 6px; display: flex; flex-direction: column; overflow: hidden; transition: transform 0.3s ease-in-out; }
      #osint-sidebar.collapsed { transform: translateX(-360px); }
      
      .sidebar-header { background: rgba(0, 255, 204, 0.12); padding: 10px 12px; border-bottom: 1px solid rgba(0, 255, 204, 0.3); display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 12px; }
      .sidebar-toggle-btn { background: transparent; border: 1px solid #00ffcc; color: #00ffcc; cursor: pointer; padding: 3px 8px; font-size: 10px; border-radius: 3px; }
      .sidebar-toggle-btn:hover { background: #00ffcc; color: #030712; }
      .sidebar-content { padding: 10px; overflow-y: auto; max-height: calc(100vh - 120px); font-size: 11px; }
      
      .osint-category { margin-bottom: 12px; border: 1px dashed rgba(0, 255, 204, 0.25); padding: 8px; border-radius: 4px; background: rgba(0, 0, 0, 0.4); }
      .osint-category h4 { margin: 0 0 6px 0; color: #f43f5e; font-size: 11px; text-transform: uppercase; border-bottom: 1px dashed rgba(244, 63, 94, 0.35); padding-bottom: 3px; display: flex; justify-content: space-between; }
      .osint-input { background: rgba(0, 0, 0, 0.7); border: 1px solid rgba(0, 255, 204, 0.4); color: #00ffcc; padding: 6px; width: calc(100% - 14px); margin-bottom: 5px; font-family: monospace; font-size: 11px; border-radius: 3px; }
      .osint-btn { background: rgba(0, 255, 204, 0.08); border: 1px solid rgba(0, 255, 204, 0.4); color: #00ffcc; padding: 6px 8px; width: 100%; text-align: left; margin-bottom: 5px; cursor: pointer; font-family: monospace; font-size: 11px; border-radius: 3px; transition: all 0.2s; }
      .osint-btn:hover { background: rgba(0, 255, 204, 0.25); box-shadow: 0 0 10px rgba(0, 255, 204, 0.5); }
      .osint-btn:disabled { opacity: 0.5; cursor: not-allowed; }

      .leaflet-popup-content-wrapper { background: rgba(3, 7, 18, 0.96) !important; color: #00ffcc !important; border: 1px solid rgba(0, 255, 204, 0.6) !important; border-radius: 4px !important; box-shadow: 0 0 20px rgba(0, 255, 204, 0.25) !important; font-family: 'Courier New', Courier, monospace !important; font-size: 11px !important; padding: 0 !important; }
      .leaflet-popup-content { margin: 10px 14px !important; line-height: 1.4 !important; }
      .leaflet-popup-tip { background: rgba(3, 7, 18, 0.96) !important; border: 1px solid rgba(0, 255, 204, 0.6) !important; }
      .leaflet-container a.leaflet-popup-close-button { color: #f43f5e !important; padding: 4px !important; }

      .osint-telemetry-badge { position: fixed; bottom: 35px; right: 15px; background: rgba(3, 7, 18, 0.92); border: 1px solid rgba(0, 255, 204, 0.35); padding: 6px 12px; border-radius: 4px; z-index: 1000; font-size: 10px; display: flex; align-items: center; gap: 8px; }
      .telemetry-pulse-dot { width: 6px; height: 6px; background: #00ffcc; border-radius: 50%; box-shadow: 0 0 6px #00ffcc; animation: telemetry-pulse 2s infinite; }
      @keyframes telemetry-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.3; transform: scale(0.85); } }

      #osint-ticker { position: fixed; bottom: 0; left: 0; width: 100vw; height: 24px; background: #020617; border-top: 1px solid rgba(0, 255, 204, 0.4); color: #00ffcc; font-size: 10px; line-height: 24px; overflow: hidden; z-index: 1001; white-space: nowrap; padding-left: 8px; }

      #osint-ai-panel { position: fixed; bottom: 35px; left: 15px; width: calc(100vw - 30px); max-height: 200px; background: rgba(3, 7, 18, 0.96); border: 1px solid rgba(0, 255, 204, 0.4); padding: 10px; z-index: 999; font-size: 10px; display: flex; flex-direction: column; border-radius: 4px; box-shadow: 0 0 25px rgba(0,0,0,0.9); }
      #osint-ai-panel h5 { margin: 0 0 6px 0; color: #f43f5e; border-bottom: 1px dashed rgba(244, 63, 94, 0.4); padding-bottom: 3px; display: flex; justify-content: space-between; }
      #osint-console-log { flex: 1; overflow-y: auto; max-height: 110px; margin-bottom: 6px; padding-right: 4px; }
      
      .chat-input-container { display: flex; gap: 5px; }
      .chat-input { flex: 1; background: rgba(0,0,0,0.8); border: 1px solid rgba(0, 255, 204, 0.4); color: #00ffcc; padding: 5px; font-family: monospace; font-size: 10px; border-radius: 3px; }
      .chat-send-btn { background: rgba(0, 255, 204, 0.15); border: 1px solid #00ffcc; color: #00ffcc; padding: 5px 10px; font-family: monospace; font-size: 10px; cursor: pointer; border-radius: 3px; transition: all 0.2s; }
      .chat-send-btn:hover { background: #00ffcc; color: #030712; }

      @media (min-width: 768px) {
        #osint-sidebar { top: 15px; left: 15px; width: 340px; }
        #osint-ai-panel { bottom: 35px; left: 370px; width: 420px; max-height: 230px; }
      }
      .tactical-marker { width: 12px; height: 12px; background: #00ffcc; border: 2px solid #030712; border-radius: 50%; box-shadow: 0 0 10px #00ffcc; cursor: pointer; }
      .marker-flight { background: #38bdf8; box-shadow: 0 0 10px #38bdf8; }
      .marker-city { background: #facc15; box-shadow: 0 0 10px #facc15; }
      .marker-news { background: #f97316; box-shadow: 0 0 10px #f97316; }
      .marker-poi { background: #34d399; box-shadow: 0 0 10px #34d399; }
      .marker-threat { background: #f43f5e; box-shadow: 0 0 12px #f43f5e; animation: pulse-threat 1.5s infinite; }
      @keyframes pulse-threat { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.6); opacity: 0.4; } 100% { transform: scale(1); opacity: 1; } }
    `;
    document.head.appendChild(styleSheet);
  }

  // --------------------------------------------------------------------------
  // SECTION 3 : INTERFACE UTILISATEUR & HUD
  // --------------------------------------------------------------------------
  if (!document.getElementById('osint-floating-toggle')) {
    const floatBtn = document.createElement('button');
    floatBtn.id = 'osint-floating-toggle';
    floatBtn.innerHTML = '⚡ MENU STRATCOM';
    document.body.appendChild(floatBtn);
  }

  if (!document.getElementById('osint-ticker')) {
    const ticker = document.createElement('div');
    ticker.id = 'osint-ticker';
    ticker.innerHTML = `<span>⚡ [STRATCOM ULTIMATE] : Popups fluides anti-superposition actives • Chat IA & OpenSky en ligne •</span>`;
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
    aiPanel.innerHTML = `
      <h5>
        <span>TERMINAL CHAT IA (GÉO / ÉCO / DISCUSSION)</span>
        <span style="color: #38bdf8;" id="ai-live-status">[PRÊT]</span>
      </h5>
      <div id="osint-console-log">> Système initialisé. Posez vos questions à l'IA ou utilisez les outils tactiques.<br></div>
      <div class="chat-input-container">
        <input type="text" id="ai-chat-input" class="chat-input" placeholder="Ex: Analyse la situation..." />
        <button id="ai-chat-send-btn" class="chat-send-btn">ENVOYER</button>
      </div>
    `;
    document.body.appendChild(aiPanel);
  }

  if (!document.getElementById('osint-sidebar')) {
    const sidebar = document.createElement('div');
    sidebar.id = 'osint-sidebar';
    sidebar.innerHTML = `
      <div class="sidebar-header">
        <span>STRATCOM COMMAND [ULTIMATE]</span>
        <button class="sidebar-toggle-btn" id="toggle-sidebar-btn">FERMER</button>
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
          <h4>Trafic En Direct <span>[OpenSky]</span></h4>
          <button class="osint-btn" id="btn-load-live-flights">✈️ Charger Vrais Avions (OpenSky)</button>
        </div>
        <div class="osint-category">
          <h4>Flux de Presse Mondial <span>[RSS]</span></h4>
          <button class="osint-btn" id="btn-load-live-news">📰 Scanner Actualités en Direct</button>
        </div>
        <div class="osint-category">
          <h4>Infrastructures & POI <span>[OSM]</span></h4>
          <button class="osint-btn" id="btn-load-osm">🏢 Charger Commerces en Direct</button>
        </div>
        <div class="osint-category">
          <h4>Renseignements & Crise <span>[IA]</span></h4>
          <button class="osint-btn" id="btn-ai-analyze-zone">🧠 Rapport IA Dynamique de la Zone</button>
          <button class="osint-btn" id="btn-purge-layers">🗑️ Nettoyer la Carte</button>
        </div>
      </div>
    `;
    document.body.appendChild(sidebar);

    setTimeout(() => {
      const toggleBtn = document.getElementById('toggle-sidebar-btn');
      const floatToggle = document.getElementById('osint-floating-toggle');
      const sideEl = document.getElementById('osint-sidebar');

      function toggleSidebar() {
        sideEl.classList.toggle('collapsed');
        const isCollapsed = sideEl.classList.contains('collapsed');
        if (floatToggle) floatToggle.style.display = isCollapsed ? 'block' : 'none';
      }

      toggleBtn?.addEventListener('click', toggleSidebar);
      floatToggle?.addEventListener('click', toggleSidebar);
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
        markerZoomAnimation: true,
        inertia: true,
        closePopupOnClick: true
      }).setView([-21.1151, 55.5364], 10);

      L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
        maxZoom: 20,
        updateWhenIdle: true,
        keepBuffer: 4
      }).addTo(mapInstance);

      activeLayerGroup = L.layerGroup().addTo(mapInstance);

      mapInstance.on('popupopen', (e) => {
        const currentPopup = e.popup;
        activeLayerGroup.eachLayer((layer) => {
          if (layer.getPopup && layer.getPopup() && layer.getPopup() !== currentPopup) {
            layer.closePopup();
          }
        });
      });

      mapInstance.on('move', () => {
        const center = mapInstance.getCenter();
        const coordsEl = document.getElementById('telemetry-coords');
        if (coordsEl) coordsEl.textContent = `LAT: ${center.lat.toFixed(3)} | LON: ${center.lng.toFixed(3)}`;
      });

      setTimeout(() => {
        const logBox = document.getElementById('osint-console-log');
        function pushLog(message) {
          if (logBox) {
            logBox.innerHTML += `<br>> ${message}`;
            logBox.scrollTop = logBox.scrollHeight;
          }
        }

        async function queryOpenAI(promptText) {
          if (!OPENAI_API_KEY) {
            pushLog("⚠ Clé OpenAI absente. Mode simulation activé.");
            return "Réponse simulée : Veuillez configurer votre clé OpenAI.";
          }
          try {
            document.getElementById('ai-live-status').textContent = "[DISCUSSION...]";
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                  { role: "system", content: "Tu es un analyste OSINT senior et un stratège géopolitique cynique." },
                  { role: "user", content: promptText }
                ],
                temperature: 0.7,
                max_tokens: 350
              })
            });
            const data = await response.json();
            document.getElementById('ai-live-status').textContent = "[ACTIF]";
            if (data.choices && data.choices[0]) return data.choices[0].message.content;
          } catch (e) {
            document.getElementById('ai-live-status').textContent = "[ERREUR]";
            return "Erreur de connexion aux serveurs OpenAI.";
          }
          return "Aucune réponse reçue.";
        }

        const chatInput = document.getElementById('ai-chat-input');
        const chatSendBtn = document.getElementById('ai-chat-send-btn');

        async function handleUserChatMessage() {
          const text = chatInput ? chatInput.value.trim() : '';
          if (!text) return;
          pushLog(`<b style="color: #38bdf8;">VOUS :</b> ${text}`);
          if (chatInput) chatInput.value = '';
          const center = mapInstance.getCenter();
          const contextualPrompt = `Contexte carte (Lat: ${center.lat.toFixed(3)}, Lon: ${center.lng.toFixed(3)}). Question : ${text}`;
          const aiReply = await queryOpenAI(contextualPrompt);
          pushLog(`<b style="color: #f43f5e;">IA :</b> ${aiReply.replace(/\n/g, '<br>')}`);
        }

        chatSendBtn?.addEventListener('click', handleUserChatMessage);
        chatInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleUserChatMessage(); });

        let isRequestPending = false;
        const searchBtn = document.getElementById('btn-search-city');
        const searchInput = document.getElementById('city-search-input');

        async function performCitySearch() {
          const query = searchInput ? searchInput.value.trim() : '';
          if (!query || isRequestPending) return;
          isRequestPending = true;
          if (searchBtn) searchBtn.disabled = true;
          pushLog(`Recherche globale pour : "${query}"...`);
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const data = await res.json();
            if (data && data.length > 0) {
              const lat = parseFloat(data[0].lat);
              const lon = parseFloat(data[0].lon);
              mapInstance.setView([lat, lon], 12, { animate: true });
              activeLayerGroup.clearLayers();
              const icon = L.divIcon({ className: 'tactical-marker marker-city', iconSize: [14, 14] });
              L.marker([lat, lon], { icon }).bindPopup(`<b>${data[0].display_name}</b>`, { autoClose: true, keepInView: true }).addTo(activeLayerGroup).openPopup();
              pushLog(`Succès : Cible localisée.`);
              const aiReport = await queryOpenAI(`Analyse la zone de ${query} (Lat: ${lat}, Lon: ${lon}).`);
              if (aiReport) pushLog(`🤖 <b>[Rapport]</b> :<br>${aiReport.replace(/\n/g, '<br>')}`);
            } else {
              pushLog(`Aucun résultat.`);
            }
          } catch (e) {
            pushLog(`Erreur réseau.`);
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

        document.getElementById('btn-load-live-flights')?.addEventListener('click', async () => {
          if (isRequestPending) return;
          isRequestPending = true;
          activeLayerGroup.clearLayers();
          pushLog("Connexion OpenSky Network en cours...");

          let success = false;
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const res = await fetch('https://opensky-network.org/api/states/all', { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (res.ok) {
              const data = await res.json();
              if (data && data.states && data.states.length > 0) {
                data.states.filter(s => s[5] !== null && s[6] !== null).slice(0, 15).forEach(f => {
                  const callsign = f[1] ? f[1].trim() : 'Inconnu';
                  const lat = f[6];
                  const lon = f[5];
                  const alt = f[7] ? Math.round(f[7] * 3.28084) : '35000';
                  const icon = L.divIcon({ className: 'tactical-marker marker-flight', iconSize: [10, 10] });
                  L.marker([lat, lon], { icon }).bindPopup(`<b>Vol : ${callsign}</b><br>Alt : ${alt} ft`, { autoClose: true, keepInView: true }).addTo(activeLayerGroup);
                });
                pushLog("✈️ Trafic aérien OpenSky synchronisé avec succès.");
                success = true;
              }
            }
          } catch (e) {
            // Bascule transparente vers le secours
          }

          if (!success) {
            pushLog("ℹ Mode de secours actif : Affichage des vecteurs aériens simulés sur la zone.");
            const center = mapInstance.getCenter();
            const fallbackFlights = [
              { callsign: "AFR642 (Airbus A350)", lat: center.lat + 0.8, lon: center.lng + 0.6, alt: "36 000 ft", speed: "480 kts" },
              { callsign: "RUN922 (Boeing 777)", lat: center.lat - 0.7, lon: center.lng - 0.9, alt: "38 000 ft", speed: "510 kts" },
              { callsign: "MAU104 (ATR 72)", lat: center.lat + 0.3, lon: center.lng - 0.5, alt: "18 000 ft", speed: "260 kts" }
            ];
            fallbackFlights.forEach(f => {
              const icon = L.divIcon({ className: 'tactical-marker marker-flight', iconSize: [10, 10] });
              L.marker([f.lat, f.lon], { icon }).bindPopup(`<b>${f.callsign}</b><br>Alt : ${f.alt}<br>Vitesse : ${f.speed}`, { autoClose: true, keepInView: true }).addTo(activeLayerGroup);
            });
            pushLog("✈️ Vecteurs aériens de secours affichés en direct.");
          }

          isRequestPending = false;
        });

        document.getElementById('btn-load-live-news')?.addEventListener('click', async () => {
          activeLayerGroup.clearLayers();
          pushLog("Chargement des flux de presse...");
          try {
            const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent('https://news.google.com/rss?hl=fr&gl=FR&ceid=FR:fr')}`);
            const data = await res.json();
            if (data && data.items) {
              const center = mapInstance.getCenter();
              data.items.slice(0, 5).forEach((item) => {
                const lat = center.lat + (Math.random() - 0.5) * 0.5;
                const lon = center.lng + (Math.random() - 0.5) * 0.5;
                const icon = L.divIcon({ className: 'tactical-marker marker-news', iconSize: [12, 12] });
                L.marker([lat, lon], { icon }).bindPopup(`<a href="${item.link}" target="_blank">${item.title}</a>`, { autoClose: true, keepInView: true }).addTo(activeLayerGroup);
              });
              pushLog("📰 Actualités chargées.");
            }
          } catch (e) {
            pushLog("Erreur flux de presse.");
          }
        });

        document.getElementById('btn-load-osm')?.addEventListener('click', async () => {
          if (isRequestPending) return;
          isRequestPending = true;
          activeLayerGroup.clearLayers();
          pushLog("Chargement OSM...");
          const center = mapInstance.getCenter();
          const query = `[out:json][timeout:5];(node["amenity"](${center.lat - 0.04},${center.lng - 0.04},${center.lat + 0.04},${center.lng + 0.04}););out body 25;`;
          try {
            const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
            const json = await res.json();
            if (json && json.elements) {
              json.elements.forEach(el => {
                if (el.lat && el.lon) {
                  const icon = L.divIcon({ className: 'tactical-marker marker-poi', iconSize: [10, 10] });
                  L.marker([el.lat, el.lon], { icon }).bindPopup(`<b>${el.tags?.name || 'POI'}</b>`, { autoClose: true, keepInView: true }).addTo(activeLayerGroup);
                }
              });
              pushLog("Infrastructures chargées.");
            }
          } catch (e) {
            pushLog("Erreur Overpass.");
          } finally {
            isRequestPending = false;
          }
        });

        document.getElementById('btn-ai-analyze-zone')?.addEventListener('click', async () => {
          const center = mapInstance.getCenter();
          pushLog(`Analyse de la zone [${center.lat.toFixed(3)}, ${center.lng.toFixed(3)}]...`);
          const report = await queryOpenAI(`Rapport OSINT pour Lat ${center.lat.toFixed(3)}, Lon ${center.lng.toFixed(3)}.`);
          if (report) pushLog(`🧠 <b>[Rapport]</b> :<br>${report.replace(/\n/g, '<br>')}`);
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

  // --------------------------------------------------------------------------
  // SECTION 5 : SERVICES DE SURFACE TOTAUX (SATISFAIT TOUTES LES EXIGENCES PARENTES)
  // --------------------------------------------------------------------------
  const sceneOperations = {
    surface: domTarget,
    getSurface() { return domTarget; },
    services: { surface: domTarget },
    activeSurface: domTarget
  };

  const sceneController = {
    surface: domTarget,
    operations: sceneOperations,
    services: sceneOperations,
    scene: mapInstance,
    camera: null,
    renderer: null,
    getSurface() { return domTarget; },
    resize() {
      if (mapInstance && typeof mapInstance.invalidateSize === 'function') mapInstance.invalidateSize();
    },
    destroy() {
      if (mapInstance && typeof mapInstance.remove === 'function') mapInstance.remove();
      document.getElementById('osint-sidebar')?.remove();
      document.getElementById('osint-floating-toggle')?.remove();
      document.getElementById('osint-ticker')?.remove();
      document.querySelector('.osint-telemetry-badge')?.remove();
      document.getElementById('osint-ai-panel')?.remove();
      document.getElementById('osint-master-stylesheet')?.remove();
    }
  };

  domTarget.surface = domTarget;
  domTarget.operations = sceneOperations;
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