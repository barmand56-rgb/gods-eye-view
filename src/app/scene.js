/**
 * OSINT COMMAND CENTER - FULL STACK MODULE
 * Thème : Rétro-futuriste / Insulaire / Anti-monopole / Temps réel
 */

(function() {
  'use strict';

  // 1. INJECTION DES STYLES RÉTRO & HUD
  function injectOSINTStyles() {
    if (document.getElementById('osint-crisis-styles')) return;
    const style = document.createElement('style');
    style.id = 'osint-crisis-styles';
    style.innerHTML = `
      body, html { background: #050508; color: #00ffcc; font-family: 'Courier New', Courier, monospace; margin: 0; padding: 0; overflow: hidden; height: 100vh; }
      #map { width: 100vw; height: 100vh; background: #020617; }
      
      /* Effet Scanline style écran cathodique */
      body::after {
        content: " "; display: block; position: fixed; top: 0; left: 0; bottom: 0; right: 0;
        background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
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

      /* Ticker bas de page */
      #osint-ticker {
        position: fixed; bottom: 0; left: 0; width: 100vw; height: 24px;
        background: #020617; border-top: 1px solid rgba(0, 255, 204, 0.4);
        color: #00ffcc; font-size: 11px; line-height: 24px;
        overflow: hidden; z-index: 1001; white-space: nowrap; box-sizing: border-box; padding-left: 10px;
      }

      /* Marqueurs cartographiques */
      .osint-dot { width: 10px; height: 10px; background: #00ffcc; border: 2px solid #020617; border-radius: 50%; box-shadow: 0 0 8px #00ffcc; cursor: pointer; transition: transform 0.2s; }
      .osint-dot:hover { transform: scale(1.5); }
      .dot-flight { background: #38bdf8; box-shadow: 0 0 8px #38bdf8; }
      .dot-business { background: #facc15; box-shadow: 0 0 8px #facc15; }
      .dot-maritime { background: #a855f7; box-shadow: 0 0 8px #a855f7; }

      /* Terminal IA & Panneau de contrôle */
      #osint-ai-panel {
        position: fixed; bottom: 35px; left: 15px; width: 360px; max-height: 300px;
        background: rgba(2, 6, 23, 0.92); border: 1px solid rgba(0, 255, 204, 0.4);
        padding: 12px; z-index: 1000; box-shadow: 0 0 15px rgba(0,0,0,0.8); font-size: 12px;
        overflow-y: auto; border-radius: 4px;
      }
      #osint-ai-panel h3 { margin: 0 0 8px 0; font-size: 13px; color: #f43f5e; border-bottom: 1px dashed rgba(244, 63, 94, 0.4); padding-bottom: 4px; }
      .ai-log-entry { margin-bottom: 6px; border-left: 2px solid #00ffcc; padding-left: 6px; }
    `;
    document.head.appendChild(style);
  }

  // 2. GESTIONNAIRE DE VOLS RÉELS (OpenSky API)
  class OSINTOpenSkyFlightManager {
    constructor(map, L, group) {
      this.map = map; this.L = L; this.group = group; this.isActive = false; this.timer = null;
    }
    toggle() {
      this.isActive = !this.isActive;
      if (this.isActive) {
        this.fetchFlights();
        this.timer = setInterval(() => this.fetchFlights(), 20000);
        this.map.addLayer(this.group);
      } else {
        if (this.timer) clearInterval(this.timer);
        this.map.removeLayer(this.group);
        this.group.clearLayers();
      }
      return this.isActive;
    }
    async fetchFlights() {
      if (!this.isActive) return;
      const b = this.map.getBounds();
      const url = `https://opensky-network.org/api/states/all?lamin=${b.getSouth()}&lamax=${b.getNorth()}&lomin=${b.getWest()}&lomax=${b.getEast()}`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (!data.states) return;
        this.group.clearLayers();
        data.states.forEach(flight => {
          const callsign = flight[1] ? flight[1].trim() : 'INCONNU';
          const lon = flight[5], lat = flight[6];
          const alt = flight[7] ? Math.round(flight[7] * 3.28084) : 0;
          if (!lat || !lon) return;
          const icon = this.L.divIcon({ className: 'osint-dot dot-flight', iconSize: [8, 8] });
          const marker = this.L.marker([lat, lon], { icon }).bindPopup(`<b style="color:#000;">VOL: ${callsign}</b><br>Alt: ${alt}ft`);
          this.group.addLayer(marker);
        });
      } catch (e) { console.warn("OpenSky API indisponible"); }
    }
  }

  // 3. GESTIONNAIRE D'INFRASTRUCTURES & ÉCONOMIE LOCALE (Overpass API - OSM)
  class OSINTBusinessManager {
    constructor(map, L, group, onAnalysisNeeded) {
      this.map = map; this.L = L; this.group = group; this.isActive = false; this.onAnalysisNeeded = onAnalysisNeeded;
    }
    toggle() {
      this.isActive = !this.isActive;
      if (this.isActive) {
        this.fetchOSMData();
        this.map.addLayer(this.group);
      } else {
        this.map.removeLayer(this.group);
        this.group.clearLayers();
      }
      return this.isActive;
    }
    async fetchOSMData() {
      if (!this.isActive) return;
      const b = this.map.getBounds();
      const query = `[out:json][timeout:25];(node["shop"](${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()});way["amenity"="marketplace"](${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}););out body;`;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        this.group.clearLayers();
        data.elements.forEach(el => {
          if (!el.lat || !el.lon) return;
          const name = el.tags && el.tags.name ? el.tags.name : 'Commerce / Échoppe';
          const icon = this.L.divIcon({ className: 'osint-dot dot-business', iconSize: [8, 8] });
          const marker = this.L.marker([el.lat, el.lon], { icon }).bindPopup(`<b style="color:#000;">${name}</b><br>Analyse monopole en cours...`);
          marker.on('click', () => {
            if (this.onAnalysisNeeded) this.onAnalysisNeeded(name, "Commerce local / Enjeu de distribution");
          });
          this.group.addLayer(marker);
        });
      } catch (e) { console.warn("Overpass API erreur"); }
    }
  }

  // 4. MODULE D'INTELLIGENCE ARTIFICIELLE (OpenAI API avec clé locale)
  async function queryAIAnalysis(targetName, contextType) {
    let apiKey = localStorage.getItem('osint_openai_key');
    if (!apiKey) {
      apiKey = prompt("Entrez votre clé API OpenAI pour activer l'analyse stratégique cynique :");
      if (apiKey) localStorage.setItem('osint_openai_key', apiKey.trim());
      else return;
    }

    const logDiv = document.getElementById('ai-log');
    logDiv.innerHTML = `<div class="ai-log-entry">Analyse tactique en cours pour : <b>${targetName}</b>...</div>` + logDiv.innerHTML;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Tu es un superordinateur de commandement OSINT cynique et paranoïaque. Tu analyses les données économiques, géopolitiques et l'accaparement foncier ou les monopoles dans les territoires insulaires avec un ton froid, percutant et légèrement critique envers les rentes de situation."
            },
            {
              role: "user",
              content: `Analyse cette cible : ${targetName} (${contextType}). Donne un court rapport d'impact sur la vie chère, les monopoles ou la souveraineté locale en 3 phrases max.`
            }
          ]
        })
      });
      const data = await response.json();
      const aiText = data.choices[0].message.content;
      logDiv.innerHTML = `<div class="ai-log-entry" style="color: #facc15;"><b>Rapport IA :</b> ${aiText}</div>` + logDiv.innerHTML;
    } catch (err) {
      logDiv.innerHTML = `<div class="ai-log-entry" style="color: #f43f5e;">Erreur de liaison avec l'IA.</div>` + logDiv.innerHTML;
    }
  }

  // 5. INITIALISATION AU CHARGEMENT
  window.addEventListener('DOMContentLoaded', () => {
    injectOSINTStyles();

    // Ticker d'alerte bas de page
    const ticker = document.createElement('div');
    ticker.id = 'osint-ticker';
    ticker.innerHTML = `
      <span style="display:inline-block; animation: ticker 35s linear infinite;">
        ⚡ [STRATCOM] : Surveillance des flux mondiaux et insulaires active • OpenSky & Overpass connectés • Cliquez sur les points pour déclencher l'analyse IA •
      </span>
    `;
    document.body.appendChild(ticker);

    // Radar visuel
    const radar = document.createElement('div');
    radar.className = 'osint-radar-sweep';
    document.body.appendChild(radar);

    // Terminal IA fixe
    const aiPanel = document.createElement('div');
    aiPanel.id = 'osint-ai-panel';
    aiPanel.innerHTML = `
      <h3>TERMINAL ANALYSE IA</h3>
      <div id="ai-log">Système opérationnel. En attente de sélection de cible sur la carte...</div>
    `;
    document.body.appendChild(aiPanel);

    console.log("OSINT Command Center (Full Suite) initialisé.");
    window.queryAIAnalysis = queryAIAnalysis; // Exposé globalement si besoin
  });
})();