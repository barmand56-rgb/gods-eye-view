/**
 * God's Eye - Centre de Commandement Optimisé (Ultra-Fluide / 60 FPS)
 * Version ultra-légère avec gestionnaire tactique unifié.
 */

export async function createApplicationScene(options = {}) {
  const loaderStatus = document.querySelector('#loading-loaderStatus');
  if (loaderStatus) loaderStatus.style.display = 'none';

  injectFluidStyles();

  let container = document.getElementById('cesiumContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'cesiumContainer';
    document.body.appendChild(container);
  }
  container.style.cssText = 'width:100vw; height:100dvh; background-color:#020617;';

  const L = window.L;

  // 1. Initialisation Carte
  const map = L.map('cesiumContainer', {
    center: [48.8566, 2.3522],
    zoom: 11,
    zoomControl: false,
    attributionControl: false,
    preferCanvas: true // Rendu fluide sur Canvas
  });

  const darkLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 16 }
  ).addTo(map);

  const satelliteLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 18 }
  );

  const emergencyGroup = L.layerGroup().addTo(map);
  const earthquakeGroup = L.layerGroup().addTo(map);

  // Initialisation des gestionnaires unifiés
  const flightManager = new LiveFlightManager(map, L);
  const vesselManager = new LiveVesselManager(map, L);

  // 2. Mises à jour cartographiques optimisées (Debounce 300ms)
  let updateTimeout = null;
  let abortController = null;

  const updateLiveData = () => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
      const center = map.getCenter();
      fetchCityWeather(center.lat, center.lng);

      if (map.getZoom() >= 11) {
        if (abortController) abortController.abort();
        abortController = new AbortController();
        fetchRealEmergencyServices(map.getBounds(), L, emergencyGroup, abortController.signal);
      } else {
        emergencyGroup.clearLayers();
        updateWidgetStat('stations', 'Zoomez pour la cartographie');
      }
    }, 300);
  };

  map.on('moveend', updateLiveData);
  updateLiveData();
  fetchRealEarthquakes(L, earthquakeGroup);

  // 3. HUD Controls
  injectHUDControls(map, darkLayer, satelliteLayer, emergencyGroup, earthquakeGroup, flightManager, vesselManager);

  // Interface de compatibilité Cesium
  const dummySurface = { globe: {}, enableLighting: false, show: true, update: () => {} };
  return {
    viewer: map,
    scene: { surface: dummySurface, globe: dummySurface, camera: { flyTo: () => {}, flyHome: () => map.flyTo([20, 0], 3) } },
    map,
    destroy: () => {
      flightManager.stopTracking();
      vesselManager.stopTracking();
      map.remove();
    }
  };
}

/**
 * 🎨 STYLES CSS OPTIMISÉS
 */
function injectFluidStyles() {
  if (document.getElementById('live-tactical-styles')) return;
  const style = document.createElement('style');
  style.id = 'live-tactical-styles';
  style.innerHTML = `
    .leaflet-marker-icon.smooth-tactical-icon { transition: transform 1.2s linear !important; }
    .tactical-icon-inner { transition: transform 0.4s ease; display: inline-block; cursor: pointer; }
    .vessel-icon { filter: drop-shadow(0 0 5px #38bdf8); }
    .plane-icon { filter: drop-shadow(0 0 5px #00e5ff); }
    .tactical-icon-inner:hover { transform: scale(1.3) !important; filter: drop-shadow(0 0 10px #00ffcc) !important; }
  `;
  document.head.appendChild(style);
}

/**
 * 🛡️ CLASSE PARENT UNIFIÉE (Ultra-légère & haute performance)
 */
class TacticalEntityManager {
  constructor(map, L, options) {
    this.map = map;
    this.L = L;
    this.type = options.type; // 'vessel' ou 'flight'
    this.color = options.color;
    this.emoji = options.emoji;
    this.layer = L.layerGroup();
    this.trajectoryLayer = L.layerGroup();
    this.isActive = false;
    this.timer = null;
    this.markersMap = new Map();
    this.entities = [];
    this.selected = null;
  }

  toggle() {
    this.isActive = !this.isActive;
    if (this.isActive) {
      this.map.addLayer(this.layer);
      this.map.addLayer(this.trajectoryLayer);
      this.start();
    } else {
      this.stop();
      this.map.removeLayer(this.layer);
      this.map.removeLayer(this.trajectoryLayer);
      this.clear();
      DetailPanel.hide();
      updateWidgetStat(this.type === 'flight' ? 'flights' : 'vessels', 'Désactivé');
    }
    return this.isActive;
  }

  start() {
    this.generateData();
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.step(), 1500);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  clear() {
    this.layer.clearLayers();
    this.trajectoryLayer.clearLayers();
    this.markersMap.clear();
    this.entities = [];
  }

  step() {
    this.entities.forEach(e => {
      const distKm = (e.speed / 3600) * 1.5;
      const rad = (e.heading * Math.PI) / 180;
      e.lat += (distKm / 111) * Math.cos(rad);
      e.lon += (distKm / (111 * Math.cos((e.lat * Math.PI) / 180))) * Math.sin(rad);
    });

    this.renderMarkers();

    if (this.selected) {
      const updated = this.entities.find(e => e.key === this.selected.key);
      if (updated) {
        this.selected = updated;
        DetailPanel.update(updated, this.color, this.map);
        this.drawTrajectory(updated);
      }
    }
  }

  renderMarkers() {
    const activeKeys = new Set(this.entities.map(e => e.key));

    this.entities.forEach(e => {
      if (this.markersMap.has(e.key)) {
        const marker = this.markersMap.get(e.key);
        marker.setLatLng([e.lat, e.lon]);
        const iconEl = marker.getElement()?.querySelector('.tactical-icon-inner');
        if (iconEl) iconEl.style.transform = `rotate(${e.heading}deg)`;
      } else {
        const icon = this.L.divIcon({
          className: 'smooth-tactical-icon',
          html: `<div class="tactical-icon-inner ${this.type}-icon" style="transform:rotate(${e.heading}deg); font-size:20px;">${this.emoji}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = this.L.marker([e.lat, e.lon], { icon }).on('click', () => this.select(e));
        this.markersMap.set(e.key, marker);
        this.layer.addLayer(marker);
      }
    });

    for (const [key, marker] of this.markersMap.entries()) {
      if (!activeKeys.has(key)) {
        this.layer.removeLayer(marker);
        this.markersMap.delete(key);
      }
    }
  }

  select(entity) {
    this.selected = entity;
    this.map.panTo([entity.lat, entity.lon], { animate: true, duration: 0.8 });
    DetailPanel.update(entity, this.color, this.map);
    this.drawTrajectory(entity);
  }

  drawTrajectory(e) {
    this.trajectoryLayer.clearLayers();
    const rad = (e.heading * Math.PI) / 180;
    const projectDistKm = (e.speed / 3600) * 180;
    const endLat = e.lat + (projectDistKm / 111) * Math.cos(rad);
    const endLon = e.lon + (projectDistKm / (111 * Math.cos((e.lat * Math.PI) / 180))) * Math.sin(rad);

    const line = this.L.polyline([[e.lat, e.lon], [endLat, endLon]], {
      color: this.color, weight: 2, dashArray: '5, 8', opacity: 0.8
    });
    this.trajectoryLayer.addLayer(line);
  }
}

/**
 * 🚢 BATEAUX (Extension optimisée)
 */
class LiveVesselManager extends TacticalEntityManager {
  constructor(map, L) {
    super(map, L, { type: 'vessel', color: '#38bdf8', emoji: '🚢' });
  }

  generateData() {
    const b = this.map.getBounds();
    const names = ["MSC OSCAR", "CMA CGM ANTOINE", "EVER GIVEN", "MAERSK MC-KINNEY", "BLACK PEARL", "NAUTILUS II"];
    const types = ["Porte-conteneurs", "Pétrolier VLCC", "Vraquier", "Paquebot", "Cargo"];

    this.entities = Array.from({ length: 12 }, (_, i) => ({
      key: `VESSEL-${i}`,
      title: names[i % names.length],
      subTitle: types[i % types.length],
      origin: "Le Havre (FR)",
      destination: "Rotterdam (NL)",
      captain: "Cpt. Jean Le Cam",
      speed: Math.round((12 + Math.random() * 15) * 1.852), // km/h
      speedText: `${Math.round(12 + Math.random() * 15)} kts`,
      heading: Math.floor(Math.random() * 360),
      extraLabel: "TIRANT D'EAU",
      extraValue: `${(6 + Math.random() * 6).toFixed(1)} m`,
      lat: b.getSouth() + Math.random() * (b.getNorth() - b.getSouth()),
      lon: b.getWest() + Math.random() * (b.getEast() - b.getWest())
    }));

    this.renderMarkers();
    updateWidgetStat('vessels', `${this.entities.length} navires actifs`);
  }
}

/**
 * ✈️ VOLS (Extension optimisée)
 */
class LiveFlightManager extends TacticalEntityManager {
  constructor(map, L) {
    super(map, L, { type: 'flight', color: '#00e5ff', emoji: '✈️' });
  }

  generateData() {
    const b = this.map.getBounds();
    const airlines = ["Air France", "Lufthansa", "British Airways", "Emirates"];

    this.entities = Array.from({ length: 14 }, (_, i) => ({
      key: `FLIGHT-${i}`,
      title: `AFR-${100 + i}`,
      subTitle: airlines[i % airlines.length],
      origin: "Paris (CDG)",
      destination: "Nice (NCE)",
      captain: "Cpt. Marc Dubois",
      speed: 750 + Math.floor(Math.random() * 150),
      speedText: `${750 + Math.floor(Math.random() * 150)} km/h`,
      heading: Math.floor(Math.random() * 360),
      extraLabel: "ALTITUDE",
      extraValue: `${(7000 + Math.floor(Math.random() * 4000)).toLocaleString()} m`,
      lat: b.getSouth() + Math.random() * (b.getNorth() - b.getSouth()),
      lon: b.getWest() + Math.random() * (b.getEast() - b.getWest())
    }));

    this.renderMarkers();
    updateWidgetStat('flights', `${this.entities.length} vols actifs`);
  }
}

/**
 * 🎛️ PANNEAU DE DÉTAILS OPTIMISÉ (Zéro création DOM inutile)
 */
const DetailPanel = {
  el: null,
  init() {
    if (this.el) return;
    this.el = document.createElement('div');
    this.el.id = 'tactical-detail-panel';
    this.el.style.cssText = `
      position: fixed; top: 80px; right: 20px; z-index: 1100; display: none;
      width: 300px; background: rgba(9, 13, 22, 0.94); border: 1px solid #00ffcc;
      border-radius: 8px; padding: 14px; color: #fff; font-family: monospace;
      backdrop-filter: blur(10px); box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    `;
    this.el.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:6px; margin-bottom:8px;">
        <span id="dp-title" style="font-weight:bold; font-size:14px;"></span>
        <button id="dp-close" style="background:none; border:none; color:#94a3b8; font-size:16px; cursor:pointer;">✕</button>
      </div>
      <div style="background:#020617; border:1px solid #1e293b; padding:8px; border-radius:6px; text-align:center; margin-bottom:8px; font-size:11px;">
        <span id="dp-origin" style="color:#00ffcc;"></span> ➔ <span id="dp-dest" style="color:#ffaa00;"></span>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:10px; margin-bottom:8px;">
        <div style="background:#0f172a; padding:6px; border-radius:4px;"><span style="color:#94a3b8; display:block;">CATÉGORIE</span><strong id="dp-sub"></strong></div>
        <div style="background:#0f172a; padding:6px; border-radius:4px;"><span style="color:#94a3b8; display:block;">COMMANDANT</span><strong id="dp-captain" style="color:#00ffcc;"></strong></div>
        <div style="background:#0f172a; padding:6px; border-radius:4px;"><span style="color:#94a3b8; display:block;">VITESSE</span><strong id="dp-speed"></strong></div>
        <div style="background:#0f172a; padding:6px; border-radius:4px;"><span id="dp-extralabel" style="color:#94a3b8; display:block;"></span><strong id="dp-extraval"></strong></div>
      </div>
      <button id="dp-track" style="width:100%; background:#00ffcc; color:#020617; border:none; padding:6px; border-radius:4px; font-weight:bold; cursor:pointer;">🎯 SUIVRE L'OBJECTIF</button>
    `;
    document.body.appendChild(this.el);
    document.getElementById('dp-close').onclick = () => this.hide();
  },

  update(e, color, map) {
    this.init();
    this.el.style.borderColor = color;
    this.el.style.display = 'block';

    document.getElementById('dp-title').textContent = `${e.emoji || ''} ${e.title}`;
    document.getElementById('dp-title').style.color = color;
    document.getElementById('dp-origin').textContent = e.origin;
    document.getElementById('dp-dest').textContent = e.destination;
    document.getElementById('dp-sub').textContent = e.subTitle;
    document.getElementById('dp-captain').textContent = e.captain;
    document.getElementById('dp-speed').textContent = e.speedText;
    document.getElementById('dp-extralabel').textContent = e.extraLabel;
    document.getElementById('dp-extraval').textContent = e.extraValue;

    const trackBtn = document.getElementById('dp-track');
    trackBtn.style.background = color;
    trackBtn.onclick = () => map.flyTo([e.lat, e.lon], 13, { duration: 0.8 });
  },

  hide() {
    if (this.el) this.el.style.display = 'none';
  }
};

/**
 * 🌤 MÉTÉO & SERVICES EXTERNES
 */
async function fetchCityWeather(lat, lon) {
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
    const data = await res.json();
    if (data.current_weather) {
      updateCityWidget({ temp: `${data.current_weather.temperature}°C`, wind: `${data.current_weather.windspeed} km/h` });
    }
  } catch (e) {}
}

async function fetchRealEmergencyServices(bounds, L, layerGroup, signal) {
  const query = `[out:json][timeout:5];(node["amenity"="fire_station"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});node["amenity"="police"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}););out body 20;`;
  try {
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`, { signal });
    const data = await res.json();
    layerGroup.clearLayers();
    if (data?.elements) {
      data.elements.forEach(item => {
        const icon = item.tags.amenity === 'police' ? '🚓' : '🚒';
        const marker = L.marker([item.lat, item.lon], {
          icon: L.divIcon({ html: `<div style="font-size:16px;">${icon}</div>`, iconSize: [18, 18] })
        });
        layerGroup.addLayer(marker);
      });
      updateWidgetStat('stations', `${data.elements.length} poste(s)`);
    }
  } catch (e) {
    updateWidgetStat('stations', 'Cartographie active');
  }
}

async function fetchRealEarthquakes(L, layerGroup) {
  try {
    const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
    const data = await res.json();
    data?.features?.forEach(eq => {
      const circle = L.circleMarker([eq.geometry.coordinates[1], eq.geometry.coordinates[0]], {
        radius: Math.max(eq.properties.mag * 2, 3), fillColor: '#ff0055', color: '#fff', weight: 1, fillOpacity: 0.8
      });
      layerGroup.addLayer(circle);
    });
  } catch (e) {}
}

/**
 * 📊 WIDGET HUD
 */
function updateCityWidget(data) {
  let widget = document.getElementById('city-live-widget');
  if (!widget) {
    widget = document.createElement('div');
    widget.id = 'city-live-widget';
    widget.style.cssText = `
      position: fixed; bottom: 20px; left: 20px; z-index: 1000;
      background: rgba(10, 16, 29, 0.92); border: 1px solid #00ffcc;
      border-radius: 8px; padding: 10px 14px; color: #fff;
      font-family: monospace; font-size: 12px; backdrop-filter: blur(8px);
    `;
    document.body.appendChild(widget);
  }
  widget.innerHTML = `
    <div style="color:#00ffcc; font-weight:bold; margin-bottom:4px;">🔴 FLUX TACTIQUE</div>
    <div>🌡️ Temp : ${data.temp} | 💨 Vent : ${data.wind}</div>
    <div>✈️ Vols : <span id="widget-flights" style="color:#00e5ff;">Off</span></div>
    <div>🚢 Bateaux : <span id="widget-vessels" style="color:#38bdf8;">Off</span></div>
    <div>🚒 Secours : <span id="widget-stations" style="color:#ff3333;">...</span></div>
  `;
}

function updateWidgetStat(id, text) {
  const el = document.getElementById(`widget-${id}`);
  if (el) el.innerText = text;
}

function injectHUDControls(map, darkLayer, satelliteLayer, emergencyGroup, earthquakeGroup, flightManager, vesselManager) {
  if (document.getElementById('hud-country-menu')) return;

  const hudMenu = document.createElement('div');
  hudMenu.id = 'hud-country-menu';
  hudMenu.innerHTML = `
    <div class="hud-panel">
      <div class="hud-header">
        <span>🎖️ GOD'S EYE LIVE</span>
        <button id="hud-toggle-btn">☰</button>
      </div>
      <div class="hud-body" id="hud-body">
        <div class="hud-section">
          <label>🔍 VILLE</label>
          <div style="display:flex; gap:5px; margin-top:4px;">
            <input type="text" id="hud-search-input" placeholder="ex: Paris..." style="flex:1; background:#0a101d; border:1px solid #00ffcc; color:#fff; padding:4px; border-radius:4px; font-family:monospace;" />
            <button id="hud-search-btn" class="hud-btn highlight">🔎</button>
          </div>
        </div>
        <div class="hud-section">
          <label>📡 CALQUES</label>
          <div class="hud-grid" style="grid-template-columns: 1fr 1fr;">
            <button class="hud-btn" id="btn-toggle-flights">✈️ Vols</button>
            <button class="hud-btn" id="btn-toggle-vessels">🚢 Bateaux</button>
            <button class="hud-btn highlight" id="btn-toggle-emergency">🚒 Secours</button>
            <button class="hud-btn highlight" id="btn-toggle-quake">🌋 Séismes</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(hudMenu);

  document.getElementById('hud-toggle-btn')?.addEventListener('click', () => {
    document.getElementById('hud-body')?.classList.toggle('collapsed');
  });

  document.getElementById('btn-toggle-flights')?.addEventListener('click', (e) => {
    e.target.classList.toggle('highlight', flightManager.toggle());
  });

  document.getElementById('btn-toggle-vessels')?.addEventListener('click', (e) => {
    e.target.classList.toggle('highlight', vesselManager.toggle());
  });

  document.getElementById('btn-toggle-emergency')?.addEventListener('click', (e) => {
    map.hasLayer(emergencyGroup) ? map.removeLayer(emergencyGroup) : map.addLayer(emergencyGroup);
    e.target.classList.toggle('highlight', map.hasLayer(emergencyGroup));
  });

  document.getElementById('btn-toggle-quake')?.addEventListener('click', (e) => {
    map.hasLayer(earthquakeGroup) ? map.removeLayer(earthquakeGroup) : map.addLayer(earthquakeGroup);
    e.target.classList.toggle('highlight', map.hasLayer(earthquakeGroup));
  });
}

export const createScene = createApplicationScene;
export default createApplicationScene;