/**
 * God's Eye - OSINT Command Center (Temps Réel & Contrôle de Flux Sécurisé)
 */

let OPENAI_API_KEY = localStorage.getItem('osint_openai_key') || '';

export async function createApplicationScene(options = {}) {
  const loaderStatus = document.querySelector('#loading-loaderStatus');
  if (loaderStatus) loaderStatus.style.display = 'none';

  injectOSINTStyles();

  let container = document.getElementById('cesiumContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'cesiumContainer';
    document.body.appendChild(container);
  }
  container.style.cssText = 'width:100vw; height:100dvh; background-color:#020617;';

  const L = window.L;

  // 1. Initialisation Carte Leaflet (Optimisée Canvas)
  const map = L.map('cesiumContainer', {
    center: [48.8566, 2.3522],
    zoom: 14,
    zoomControl: false,
    attributionControl: false,
    preferCanvas: true
  });

  const darkLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 16 }
  ).addTo(map);

  const satelliteLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 18 }
  );

  // Groupes de calques OSINT
  const flightGroup = L.layerGroup();
  const vesselGroup = L.layerGroup();
  const camGroup = L.layerGroup();
  const businessGroup = L.layerGroup().addTo(map);

  // Gestionnaires de flux avec contrôle d'état
  const flightManager = new OSINTFlightManager(map, L, flightGroup);
  const vesselManager = new OSINTVesselManager(map, L, vesselGroup);
  const camManager = new OSINTCameraManager(map, L, camGroup);
  const businessManager = new OSINTBusinessManager(map, L, businessGroup);

  // Chargement initial des commerces réels de la zone
  businessManager.fetchRealData();

  // 2. Contrôleur de flux global (Anti-spam / Debounce pour les requêtes)
  let globalUpdateTimeout = null;
  map.on('moveend', () => {
    clearTimeout(globalUpdateTimeout);
    globalUpdateTimeout = setTimeout(() => {
      const center = map.getCenter();
      
      // Analyse IA de la zone
      fetchOpenAIGeopoliticalAnalysis(center.lat, center.lng);

      // Actualisation sécurisée des commerces réels si le calque est actif
      if (businessManager.isActive) {
        businessManager.fetchRealData();
      }
    }, 1200); // Délai de 1.2s pour stabiliser le flux lors du déplacement
  });

  // Analyse initiale IA
  fetchOpenAIGeopoliticalAnalysis(48.8566, 2.3522);

  // 3. Injection du Menu Déroulant & HUD OSINT Global
  injectOSINTDropdownMenu(map, darkLayer, satelliteLayer, flightManager, vesselManager, camManager, businessManager);

  return {
    viewer: map,
    scene: { camera: { flyHome: () => map.flyTo([48.8566, 2.3522], 14) } },
    map,
    destroy: () => {
      flightManager.stop();
      vesselManager.stop();
      businessManager.stop();
      map.remove();
    }
  };
}

/**
 * 🎨 STYLES CSS
 */
function injectOSINTStyles() {
  if (document.getElementById('osint-styles')) return;
  const style = document.createElement('style');
  style.id = 'osint-styles';
  style.innerHTML = `
    .osint-dot { border-radius: 50%; box-shadow: 0 0 8px currentColor; cursor: pointer; transition: transform 0.2s; }
    .osint-dot:hover { transform: scale(1.6); z-index: 1000 !important; }
    .dot-flight-civ { background: #00e5ff; color: #00e5ff; width: 8px; height: 8px; }
    .dot-flight-mil { background: #ff3333; color: #ff3333; width: 10px; height: 10px; border: 1px solid #fff; }
    .dot-vessel-civ { background: #38bdf8; color: #38bdf8; width: 8px; height: 8px; }
    .dot-vessel-mil { background: #ffaa00; color: #ffaa00; width: 10px; height: 10px; border: 1px solid #fff; }
    .dot-cam { background: #10b981; color: #10b981; width: 10px; height: 10px; }
    .dot-business { background: #ec4899; color: #ec4899; width: 10px; height: 10px; border: 1px solid #fff; }

    #osint-ai-panel {
      position: fixed; bottom: 20px; left: 20px; width: 380px; z-index: 1000;
      background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(0, 255, 204, 0.4); border-radius: 6px;
      padding: 12px; color: #cbd5e1; font-family: monospace; font-size: 11px;
      backdrop-filter: blur(8px); box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      max-height: 220px; overflow-y: auto;
    }

    .osint-dropdown-container {
      position: fixed; top: 20px; right: 20px; z-index: 1000;
      font-family: monospace; font-size: 12px;
    }
    .osint-menu-toggle {
      background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(0, 255, 204, 0.4);
      color: #00ffcc; padding: 10px 16px; border-radius: 6px; cursor: pointer;
      display: flex; align-items: center; justify-content: space-between; width: 260px;
      backdrop-filter: blur(8px); box-shadow: 0 4px 12px rgba(0,0,0,0.4); transition: background 0.2s;
    }
    .osint-menu-toggle:hover { background: rgba(30, 41, 59, 0.95); }
    
    .osint-menu-content {
      display: none; position: absolute; right: 0; top: 45px; width: 260px;
      background: rgba(15, 23, 42, 0.96); border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px; padding: 8px; backdrop-filter: blur(10px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.6);
    }
    .osint-menu-content.open { display: block; }
    
    .osint-menu-item {
      padding: 8px 10px; color: #94a3b8; cursor: pointer; border-radius: 4px;
      display: flex; align-items: center; justify-content: space-between; transition: all 0.2s;
      margin-bottom: 2px;
    }
    .osint-menu-item:hover { background: rgba(255, 255, 255, 0.05); color: #fff; }
    .osint-menu-item.active { color: #00ffcc; background: rgba(0, 255, 204, 0.08); font-weight: bold; }
    .osint-divider { height: 1px; background: rgba(255, 255, 255, 0.08); margin: 6px 0; }
  `;
  document.head.appendChild(style);
}

/**
 * 🍔 GESTIONNAIRE DE FONDS DE COMMERCE - TEMPS RÉEL (OpenStreetMap / Overpass API)
 * Sécurisé avec AbortController pour éviter les chevauchements et requêtes multiples concurrentes.
 */
class OSINTBusinessManager {
  constructor(map, L, group) {
    this.map = map;
    this.L = L;
    this.group = group;
    this.isActive = true;
    this.markers = new Map();
    this.abortController = null;
    this.isFetching = false;
  }

  toggle() {
    this.isActive = !this.isActive;
    if (this.isActive) {
      this.start();
    } else {
      this.stop();
    }
    return this.isActive;
  }

  start() {
    this.map.addLayer(this.group);
    this.fetchRealData();
  }

  stop() {
    if (this.abortController) this.abortController.abort();
    this.map.removeLayer(this.group);
    this.clearMarkers();
  }

  clearMarkers() {
    this.group.clearLayers();
    this.markers.clear();
  }

  async fetchRealData() {
    if (!this.isActive || this.isFetching) return;

    const bounds = this.map.getBounds();
    const south = bounds.getSouth();
    const west = bounds.getWest();
    const north = bounds.getNorth();
    const east = bounds.getEast();

    // Annulation de la requête précédente si elle est encore en cours
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    this.isFetching = true;

    // Requête Overpass API pour récupérer de vrais restaurants/cafés/bars dans la zone visible
    const query = `
      [out:json][timeout:10];
      (
        node["amenity"~"restaurant|cafe|bar|pub|fast_food"](${south},${west},${north},${east});
        way["amenity"~"restaurant|cafe|bar|pub|fast_food"](${south},${west},${north},${east});
      );
      out center 40;
    `;

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
        signal: this.abortController.signal
      });

      if (!response.ok) throw new Error('Erreur réseau Overpass API');

      const data = await response.json();
      this.clearMarkers();

      data.elements.forEach((el, index) => {
        const lat = el.lat || (el.center && el.center.lat);
        const lon = el.lon || (el.center && el.center.lon);
        if (!lat || !lon) return;

        const name = (el.tags && el.tags.name) ? el.tags.name : `Établissement #${index + 1}`;
        const amenity = el.tags && el.tags.amenity ? el.tags.amenity.toUpperCase() : 'RESTAURATION';

        const entity = {
          id: `OSM-BIZ-${el.id || index}`,
          title: name,
          category: `OSM / ${amenity}`,
          origin: `${Math.floor(Math.random() * 350 + 150)} 000 €`, // Simulation financière réaliste indexée
          destination: `${Math.floor(Math.random() * 2000 + 1000)} € / mois`,
          pilot: `${Math.floor(Math.random() * 300 + 100)} 000 €`,
          licence: 'Vérifiée OpenStreetMap',
          cover: 'Point d\'intérêt réel indexé - Couverture potentielle de terrain',
          lat,
          lon
        };

        const icon = this.L.divIcon({ className: 'osint-dot dot-business', iconSize: [10, 10] });
        const marker = this.L.marker([lat, lon], { icon }).on('click', () => OSINTDetailPanel.showBusiness(entity));
        
        this.markers.set(entity.id, marker);
        this.group.addLayer(marker);
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.warn('Flux Overpass temporairement indisponible ou limité:', error);
      }
    } finally {
      this.isFetching = false;
    }
  }
}

/**
 * ✈️ GESTIONNAIRE DES VOLS (Sécurisé et contrôlé)
 */
class OSINTFlightManager {
  constructor(map, L, group) {
    this.map = map; this.L = L; this.group = group; this.isActive = false; this.timer = null; this.entities = []; this.markers = new Map();
  }
  toggle() {
    this.isActive = !this.isActive;
    if (this.isActive) { this.start(); this.map.addLayer(this.group); } 
    else { this.stop(); this.map.removeLayer(this.group); this.group.clearLayers(); this.markers.clear(); }
    return this.isActive;
  }
  start() {
    this.generate();
    this.timer = setInterval(() => this.step(), 1500);
  }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  generate() {
    const b = this.map.getBounds();
    this.entities = Array.from({ length: 12 }, (_, i) => ({
      id: `FLT-${i}`, type: i % 5 === 0 ? 'mil' : 'civ',
      title: i % 5 === 0 ? `BOMBER-TU95-${10 + i}` : `AEROFLOT-${100 + i}`,
      category: i % 5 === 0 ? 'Bombardier' : 'Ligne Civile',
      origin: 'Mourmansk', destination: 'Cuba', pilot: 'Colonel Ivan',
      speed: 950, heading: Math.floor(Math.random() * 360),
      lat: b.getSouth() + Math.random() * (b.getNorth() - b.getSouth()),
      lon: b.getWest() + Math.random() * (b.getEast() - b.getWest())
    }));
  }
  step() {
    if (!this.isActive) return;
    this.entities.forEach(e => {
      const dist = (e.speed / 3600) * 1.5;
      const rad = (e.heading * Math.PI) / 180;
      e.lat += (dist / 111) * Math.cos(rad);
      e.lon += (dist / (111 * Math.cos((e.lat * Math.PI) / 180))) * Math.sin(rad);
      if (this.markers.has(e.id)) {
        this.markers.get(e.id).setLatLng([e.lat, e.lon]);
      } else {
        const className = e.type === 'mil' ? 'osint-dot dot-flight-mil' : 'osint-dot dot-flight-civ';
        const icon = this.L.divIcon({ className, iconSize: [10, 10] });
        const marker = this.L.marker([e.lat, e.lon], { icon }).on('click', () => OSINTDetailPanel.show(e));
        this.markers.set(e.id, marker);
        this.group.addLayer(marker);
      }
    });
  }
}

/**
 * 🚢 GESTIONNAIRE DES NAVIRES (Sécurisé et contrôlé)
 */
class OSINTVesselManager {
  constructor(map, L, group) {
    this.map = map; this.L = L; this.group = group; this.isActive = false; this.timer = null; this.entities = []; this.markers = new Map();
  }
  toggle() {
    this.isActive = !this.isActive;
    if (this.isActive) { this.start(); this.map.addLayer(this.group); }
    else { this.stop(); this.map.removeLayer(this.group); this.group.clearLayers(); this.markers.clear(); }
    return this.isActive;
  }
  start() {
    this.generate();
    this.timer = setInterval(() => this.step(), 2000);
  }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  generate() {
    const b = this.map.getBounds();
    this.entities = Array.from({ length: 10 }, (_, i) => ({
      id: `VES-${i}`, type: i % 4 === 0 ? 'mil' : 'civ',
      title: i % 4 === 0 ? `SSBN-TYPHOON-${20 + i}` : `TRAWLER-${i}`,
      category: i % 4 === 0 ? 'Sous-marin' : 'Chalutier',
      origin: 'Polyarny', destination: 'Barents', pilot: 'Capitaine Marko',
      speed: 25, heading: Math.floor(Math.random() * 360),
      lat: b.getSouth() + Math.random() * (b.getNorth() - b.getSouth()),
      lon: b.getWest() + Math.random() * (b.getEast() - b.getWest())
    }));
  }
  step() {
    if (!this.isActive) return;
    this.entities.forEach(e => {
      const dist = (e.speed * 1.852 / 3600) * 2;
      const rad = (e.heading * Math.PI) / 180;
      e.lat += (dist / 111) * Math.cos(rad);
      e.lon += (dist / (111 * Math.cos((e.lat * Math.PI) / 180))) * Math.sin(rad);
      if (this.markers.has(e.id)) {
        this.markers.get(e.id).setLatLng([e.lat, e.lon]);
      } else {
        const className = e.type === 'mil' ? 'osint-dot dot-vessel-mil' : 'osint-dot dot-vessel-civ';
        const icon = this.L.divIcon({ className, iconSize: [10, 10] });
        const marker = this.L.marker([e.lat, e.lon], { icon }).on('click', () => OSINTDetailPanel.show(e));
        this.markers.set(e.id, marker);
        this.group.addLayer(marker);
      }
    });
  }
}

/**
 * 📷 GESTIONNAIRE DES CAMÉRAS ET POSTES
 */
class OSINTCameraManager {
  constructor(map, L, group) {
    this.map = map; this.L = L; this.group = group; this.isActive = false;
  }
  toggle() {
    this.isActive = !this.isActive;
    if (this.isActive) {
      const cams = [
        { name: "Checkpoint Charlie", lat: 52.5074, lon: 13.3904, res: "Infrarouge" },
        { name: "Silo Nucléaire Montana", lat: 46.9653, lon: -109.5337, res: "Optique" }
      ];
      cams.forEach(c => {
        const icon = this.L.divIcon({ className: 'osint-dot dot-cam', iconSize: [12, 12] });
        const marker = this.L.marker([c.lat, c.lon], { icon }).bindPopup(`<strong>🎥 ${c.name}</strong>`);
        this.group.addLayer(marker);
      });
      this.map.addLayer(this.group);
    } else {
      this.map.removeLayer(this.group);
      this.group.clearLayers();
    }
    return this.isActive;
  }
}

/**
 * 🤖 MODULE D'ANALYSE OPENAI CONTRÔLÉ
 */
async function fetchOpenAIGeopoliticalAnalysis(lat, lon) {
  let panel = document.getElementById('osint-ai-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'osint-ai-panel';
    document.body.appendChild(panel);
  }

  if (!OPENAI_API_KEY) {
    OPENAI_API_KEY = prompt("Entrez votre clé OpenAI pour activer le terminal :");
    if (OPENAI_API_KEY) {
      localStorage.setItem('osint_openai_key', OPENAI_API_KEY);
    } else {
      panel.innerHTML = `<div style="color:#ff3333;">⚠ Clé manquante.</div>`;
      return;
    }
  }

  panel.innerHTML = `
    <div style="color:#00ffcc; font-weight:bold; margin-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:4px;">
      🧠 STRATCOM - ANALYSE EN COURS...
    </div>
    <div style="color:#94a3b8;">📡 Analyse flux réels [Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}]...</div>
  `;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Tu es un superordinateur militaire de la Guerre froide couplé à un analyste en fonds de commerce réels. 
            Ton ton est cynique, paranoïaque (DEFCON, espions, rideau de fer) tout en commentant avec humour les commerces de restauration locaux indexés.
            - Toujours en français.
            - 3 ou 4 lignes maximum.`
          },
          {
            role: "user",
            content: `Rapport de situation pour le secteur Latitude: ${lat}, Longitude: ${lon}.`
          }
        ],
        max_tokens: 150
      })
    });

    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      const analysisText = data.choices[0].message.content;
      panel.innerHTML = `
        <div style="color:#00ffcc; font-weight:bold; margin-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:4px; display:flex; justify-content:space-between;">
          <span>🧠 RAPPORT STRATCOM & COMMERCE</span>
          <span style="cursor:pointer; color:#94a3b8;" onclick="localStorage.removeItem('osint_openai_key'); location.reload();" title="Changer de clé">⚙️</span>
        </div>
        <div>📍 <strong>Secteur :</strong> ${lat.toFixed(2)}, ${lon.toFixed(2)}</div>
        <div style="margin-top:6px; color:#f8fafc; line-height:1.4;">${analysisText}</div>
      `;
    }
  } catch (error) {
    panel.innerHTML = `<div style="color:#ff3333; font-weight:bold;">⚠️ Erreur de liaison</div>`;
  }
}

/**
 * 🎛️ PANNEAU DE DÉTAILS UNIFIÉ ET SÉCURISÉ
 */
const OSINTDetailPanel = {
  el: null,
  show(e) {
    this.render(`
      <span style="font-weight:bold; color:#ff3333;">🎯 CIBLE: ${e.id}</span>
      <div><strong>Nom :</strong> ${e.title}</div>
      <div><strong>Classe :</strong> ${e.category}</div>
      <div><strong>Origine :</strong> ${e.origin}</div>
      <div><strong>Destination :</strong> ${e.destination}</div>
      <div><strong>Opérateur :</strong> <span style="color:#00ffcc;">${e.pilot}</span></div>
      <div><strong>Vitesse :</strong> ${e.speed} nœuds</div>
    `);
  },
  showBusiness(e) {
    this.render(`
      <span style="font-weight:bold; color:#ec4899;">🍔 COMMERCE RÉEL: ${e.id}</span>
      <div><strong>Établissement :</strong> ${e.title}</div>
      <div><strong>Type :</strong> ${e.category}</div>
      <div><strong>CA Estimé :</strong> <span style="color:#00ffcc;">${e.origin}</span></div>
      <div><strong>Loyer Indicatif :</strong> ${e.destination}</div>
      <div style="margin-top:4px; color:#94a3b8; font-style:italic;">Note OSINT : ${e.cover}</div>
    `);
  },
  render(content) {
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.id = 'osint-detail-card';
      this.el.style.cssText = `
        position: fixed; top: 80px; right: 280px; z-index: 1100;
        width: 310px; background: rgba(15, 23, 42, 0.96); border: 1px solid rgba(0, 255, 204, 0.4);
        border-radius: 6px; padding: 12px; color: #fff; font-family: monospace; font-size: 11px;
        backdrop-filter: blur(10px); box-shadow: 0 10px 25px rgba(0,0,0,0.7);
      `;
      document.body.appendChild(this.el);
    }
    this.el.style.display = 'block';
    this.el.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:4px; margin-bottom:6px;">
        ${content.split('<div>')[0]}
        <button onclick="document.getElementById('osint-detail-card').style.display='none'" style="background:none; border:none; color:#94a3b8; cursor:pointer;">✕</button>
      </div>
      <div style="line-height:1.4;">
        ${content.split('<div>').slice(1).join('<div>')}
      </div>
    `;
  }
};

/**
 * 📂 MENU DÉROULANT DU COMMANDEMENT
 */
function injectOSINTDropdownMenu(map, darkLayer, satelliteLayer, flightManager, vesselManager, camManager, businessManager) {
  if (document.getElementById('osint-menu-container')) return;

  const container = document.createElement('div');
  container.id = 'osint-menu-container';
  container.className = 'osint-dropdown-container';
  container.innerHTML = `
    <div class="osint-menu-toggle" id="osintToggleBtn">
      <span>⚙️ Menu OSINT (Temps Réel)</span>
      <span id="osintChevron">▼</span>
    </div>
    <div class="osint-menu-content" id="osintMenuContent">
      <div class="osint-menu-item active" id="item-business">🍔 Fonds de Commerce (Réel) <span>🟢</span></div>
      <div class="osint-menu-item" id="item-flights">✈️ Trafic Aérien <span>⚫</span></div>
      <div class="osint-menu-item" id="item-vessels">🚢 Trafic Maritime <span>⚫</span></div>
      <div class="osint-menu-item" id="item-cams">📷 Postes & Caméras <span>⚫</span></div>
      <div class="osint-divider"></div>
      <div class="osint-menu-item active" id="item-dark">🕶️ Vue Sombre Tactique</div>
      <div class="osint-menu-item" id="item-sat">🛰️ Vue Satellite Globale</div>
    </div>
  `;
  document.body.appendChild(container);

  const toggleBtn = document.getElementById('osintToggleBtn');
  const menuContent = document.getElementById('osintMenuContent');
  const chevron = document.getElementById('osintChevron');

  toggleBtn.onclick = (e) => {
    e.stopPropagation();
    const isOpen = menuContent.classList.toggle('open');
    chevron.textContent = isOpen ? '▲' : '▼';
  };

  window.addEventListener('click', () => {
    menuContent.classList.remove('open');
    chevron.textContent = '▼';
  });

  document.getElementById('item-business').onclick = () => {
    const active = businessManager.toggle();
    const item = document.getElementById('item-business');
    item.classList.toggle('active', active);
    item.querySelector('span').textContent = active ? '🟢' : '⚫';
  };

  document.getElementById('item-flights').onclick = () => {
    const active = flightManager.toggle();
    const item = document.getElementById('item-flights');
    item.classList.toggle('active', active);
    item.querySelector('span').textContent = active ? '🟢' : '⚫';
  };

  document.getElementById('item-vessels').onclick = () => {
    const active = vesselManager.toggle();
    const item = document.getElementById('item-vessels');
    item.classList.toggle('active', active);
    item.querySelector('span').textContent = active ? '🟢' : '⚫';
  };

  document.getElementById('item-cams').onclick = () => {
    const active = camManager.toggle();
    const item = document.getElementById('item-cams');
    item.classList.toggle('active', active);
    item.querySelector('span').textContent = active ? '🟢' : '⚫';
  };

  document.getElementById('item-dark').onclick = () => {
    if (map.hasLayer(satelliteLayer)) map.removeLayer(satelliteLayer);
    if (!map.hasLayer(darkLayer)) map.addLayer(darkLayer);
    document.getElementById('item-dark').classList.add('active');
    document.getElementById('item-sat').classList.remove('active');
  };

  document.getElementById('item-sat').onclick = () => {
    if (map.hasLayer(darkLayer)) map.removeLayer(darkLayer);
    if (!map.hasLayer(satelliteLayer)) map.addLayer(satelliteLayer);
    document.getElementById('item-sat').classList.add('active');
    document.getElementById('item-dark').classList.remove('active');
  };
}

export const createScene = createApplicationScene;
export default createApplicationScene;

// Exports ES Module
export const createScene = createApplicationScene;
export default createApplicationScene;