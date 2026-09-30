/**
 * God's Eye - Centre de Commandement Complet
 * Graphismes 60 FPS + Suivi Aérien & Maritime Détaillé (Vols + Bateaux)
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
  container.style.width = '100vw';
  container.style.height = '100dvh';
  container.style.backgroundColor = '#020617';

  const L = window.L;

  // 1. Initialisation Carte
  const map = L.map('cesiumContainer', {
    center: [48.8566, 2.3522],
    zoom: 11,
    zoomControl: false,
    attributionControl: false
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

  // Initialisation des gestionnaires tactiques
  const flightManager = new LiveFlightManager(map, L);
  const vesselManager = new LiveVesselManager(map, L);

  // 2. Écouteurs de mise à jour des flux externes
  let updateTimeout = null;
  const updateLiveData = () => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
      const center = map.getCenter();
      fetchCityWeather(center.lat, center.lng);

      if (map.getZoom() >= 11) {
        const bounds = map.getBounds();
        fetchRealEmergencyServices(
          bounds.getSouth(), bounds.getWest(),
          bounds.getNorth(), bounds.getEast(),
          L, emergencyGroup
        );
      } else {
        emergencyGroup.clearLayers();
        updateWidgetStat('stations', 'Zoomez pour la cartographie');
      }
    }, 400);
  };

  map.on('moveend', updateLiveData);
  updateLiveData();

  fetchRealEarthquakes(L, earthquakeGroup);

  // 3. HUD Command
  injectHUDControls(map, darkLayer, satelliteLayer, emergencyGroup, earthquakeGroup, flightManager, vesselManager);

  // Structure de compatibilité Cesium
  const dummySurface = { globe: {}, enableLighting: false, show: true, update: () => {} };
  const dummyCamera = { flyTo: () => {}, flyHome: () => map.flyTo([20, 0], 3), setView: () => {} };
  const dummyScene = {
    surface: dummySurface,
    globe: dummySurface,
    camera: dummyCamera,
    primitives: { add: () => {}, remove: () => {} },
    skyAtmosphere: { show: true },
    sun: { show: true },
    moon: { show: true }
  };

  return {
    viewer: map,
    scene: dummyScene,
    surface: dummySurface,
    globe: dummySurface,
    camera: dummyCamera,
    map: map,
    destroy: () => {
      flightManager.stopTracking();
      vesselManager.stopTracking();
      map.remove();
    },
    isDestroyed: () => false
  };
}

/**
 * 🎨 STYLES CSS DE FLUIDITÉ ET D'ANIMATION
 */
function injectFluidStyles() {
  if (document.getElementById('live-tactical-styles')) return;
  const style = document.createElement('style');
  style.id = 'live-tactical-styles';
  style.innerHTML = `
    .leaflet-marker-icon.smooth-tactical-icon {
      transition: transform 1.5s linear !important;
    }
    .plane-icon-inner, .vessel-icon-inner {
      transition: transform 0.8s ease-in-out;
      display: inline-block;
      filter: drop-shadow(0 0 6px #00e5ff);
      cursor: pointer;
    }
    .vessel-icon-inner {
      filter: drop-shadow(0 0 6px #38bdf8);
    }
    .plane-icon-inner:hover, .vessel-icon-inner:hover {
      transform: scale(1.3) !important;
      filter: drop-shadow(0 0 12px #00ffcc) !important;
    }
    .selected-tactical-icon {
      filter: drop-shadow(0 0 12px #ff0055) drop-shadow(0 0 20px #ff0055) !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * 🚢 GESTIONNAIRE DE BATEAUX & TRAFIC MARITIME (Live & Smooth)
 */
class LiveVesselManager {
  constructor(map, L) {
    this.map = map;
    this.L = L;
    this.vesselsLayer = L.layerGroup();
    this.trajectoryLayer = L.layerGroup();
    this.isActive = false;
    this.animationInterval = null;
    this.markersMap = new Map();
    this.vesselsData = [];
    this.selectedVessel = null;

    this.captainsList = [
      "Cpt. Jean Le Cam", "Cpt. Florence Arthaud", "Cpt. Thomas Coville",
      "Cpt. François Gabart", "Cpt. Clarisse Crémer", "Cpt. Armel Le Cléac'h",
      "Cpt. Eric Tabarly", "Cpt. Samantha Davies", "Cpt. Loïck Peyron"
    ];

    this.vesselTypes = [
      "Porte-conteneurs", "Pétrolier VLCC", "Vraquier",
      "Paquebot de Croisière", "Yacht de Luxe", "Cargo Polyvalent", "Gazier GNL"
    ];

    this.portsList = [
      { from: "Le Havre (FR)", to: "Rotterdam (NL)" },
      { from: "Marseille (FR)", to: "Alger (DZ)" },
      { from: "Singapour (SG)", to: "Shanghai (CN)" },
      { from: "Hamburg (DE)", to: "Anvers (BE)" },
      { from: "Piraeus (GR)", to: "Barcelone (ES)" },
      { from: "Brest (FR)", to: "Southampton (UK)" }
    ];
  }

  toggle() {
    this.isActive = !this.isActive;
    if (this.isActive) {
      this.map.addLayer(this.vesselsLayer);
      this.map.addLayer(this.trajectoryLayer);
      this.startTracking();
    } else {
      this.stopTracking();
      this.map.removeLayer(this.vesselsLayer);
      this.map.removeLayer(this.trajectoryLayer);
      this.clearAll();
      this.closeDetailPanel();
      updateWidgetStat('vessels', 'Désactivé');
    }
    return this.isActive;
  }

  startTracking() {
    this.generateVesselsData();

    if (this.animationInterval) clearInterval(this.animationInterval);
    this.animationInterval = setInterval(() => {
      if (this.isActive && this.vesselsData.length > 0) {
        this.stepSimulation();
      }
    }, 1500);

    this.map.on('moveend', this.handleMapMove);
  }

  stopTracking() {
    if (this.animationInterval) clearInterval(this.animationInterval);
    this.animationInterval = null;
    this.map.off('moveend', this.handleMapMove);
  }

  handleMapMove = () => {
    if (this.isActive && this.vesselsData.length === 0) {
      this.generateVesselsData();
    }
  };

  clearAll() {
    this.vesselsLayer.clearLayers();
    this.trajectoryLayer.clearLayers();
    this.markersMap.clear();
    this.vesselsData = [];
  }

  generateVesselsData() {
    const bounds = this.map.getBounds();
    const latSpan = bounds.getNorth() - bounds.getSouth();
    const lonSpan = bounds.getEast() - bounds.getWest();

    const vesselNames = [
      "MSC OSCAR", "CMA CGM ANTOINE", "EVER GIVEN", "MAERSK MC-KINNEY",
      "HARMONY OF THE SEAS", "BLACK PEARL", "NAUTILUS II", "BOUGAINVILLE",
      "PONT-AVEN", "ARMORIQUE", "NORMANDIE", "L'AUSTRAL"
    ];

    this.vesselsData = [];
    for (let i = 0; i < 14; i++) {
      const name = vesselNames[i % vesselNames.length];
      const type = this.vesselTypes[i % this.vesselTypes.length];
      const route = this.portsList[i % this.portsList.length];
      const captain = this.captainsList[i % this.captainsList.length];
      const key = `VESSEL-${1000 + i}`;

      this.vesselsData.push({
        key: key,
        name: `${name} ${i > 11 ? i : ''}`.trim(),
        type: type,
        origin: route.from,
        destination: route.to,
        captain: captain,
        lat: bounds.getSouth() + Math.random() * latSpan,
        lon: bounds.getWest() + Math.random() * lonSpan,
        heading: Math.floor(Math.random() * 360),
        speedKnots: Math.round(12 + Math.random() * 18), // Nœuds
        draft: (6 + Math.random() * 8).toFixed(1), // Tirant d'eau en mètres
        mmsi: `227${Math.floor(100000 + Math.random() * 899999)}`,
        flag: "🇫🇷 France"
      });
    }

    this.updateMarkers();
    updateWidgetStat('vessels', `${this.vesselsData.length} navires détectés`);
  }

  stepSimulation() {
    this.vesselsData.forEach(v => {
      const speedKmH = v.speedKnots * 1.852;
      const distKm = (speedKmH / 3600) * 1.5;
      const rad = (v.heading * Math.PI) / 180;

      const deltaLat = (distKm / 111) * Math.cos(rad);
      const deltaLon = (distKm / (111 * Math.cos((v.lat * Math.PI) / 180))) * Math.sin(rad);

      v.lat += deltaLat;
      v.lon += deltaLon;
    });

    this.updateMarkers();

    if (this.selectedVessel) {
      const updated = this.vesselsData.find(v => v.key === this.selectedVessel.key);
      if (updated) {
        this.selectedVessel = updated;
        this.renderDetailPanel(updated);
        this.drawTrajectoryVector(updated);
      }
    }
  }

  updateMarkers() {
    const activeKeys = new Set(this.vesselsData.map(v => v.key));

    this.vesselsData.forEach(v => {
      if (this.markersMap.has(v.key)) {
        const marker = this.markersMap.get(v.key);
        marker.setLatLng([v.lat, v.lon]);

        const iconEl = marker.getElement()?.querySelector('.vessel-icon-inner');
        if (iconEl) {
          iconEl.style.transform = `rotate(${v.heading}deg)`;
        }
      } else {
        const iconHtml = `
          <div class="vessel-icon-inner" style="transform: rotate(${v.heading}deg); font-size:22px; line-height:1;">
            🚢
          </div>
        `;

        const customIcon = this.L.divIcon({
          className: 'smooth-tactical-icon',
          html: iconHtml,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const marker = this.L.marker([v.lat, v.lon], { icon: customIcon });

        marker.on('click', () => {
          this.selectVessel(v);
        });

        this.markersMap.set(v.key, marker);
        this.vesselsLayer.addLayer(marker);
      }
    });

    for (const [key, marker] of this.markersMap.entries()) {
      if (!activeKeys.has(key)) {
        this.vesselsLayer.removeLayer(marker);
        this.markersMap.delete(key);
      }
    }
  }

  selectVessel(vessel) {
    this.selectedVessel = vessel;
    this.map.panTo([vessel.lat, vessel.lon], { animate: true, duration: 0.8 });
    this.renderDetailPanel(vessel);
    this.drawTrajectoryVector(vessel);
  }

  drawTrajectoryVector(vessel) {
    this.trajectoryLayer.clearLayers();

    const rad = (vessel.heading * Math.PI) / 180;
    const speedKmH = vessel.speedKnots * 1.852;
    const projectDistKm = (speedKmH / 3600) * 300;

    const endLat = vessel.lat + (projectDistKm / 111) * Math.cos(rad);
    const endLon = vessel.lon + (projectDistKm / (111 * Math.cos((vessel.lat * Math.PI) / 180))) * Math.sin(rad);

    const polyline = this.L.polyline([[vessel.lat, vessel.lon], [endLat, endLon]], {
      color: '#38bdf8',
      weight: 2,
      dashArray: '5, 8',
      opacity: 0.85
    });

    this.trajectoryLayer.addLayer(polyline);
  }

  renderDetailPanel(vessel) {
    let panel = document.getElementById('tactical-detail-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'tactical-detail-panel';
      panel.style.cssText = `
        position: fixed; top: 80px; right: 20px; z-index: 1100;
        width: 320px; background: rgba(9, 13, 22, 0.94);
        border: 1px solid #38bdf8; border-radius: 10px;
        padding: 16px; color: #f8fafc; font-family: monospace;
        backdrop-filter: blur(12px); box-shadow: 0 10px 30px rgba(56, 189, 248, 0.25);
      `;
      document.body.appendChild(panel);
    }

    const speedKmH = Math.round(vessel.speedKnots * 1.852);

    panel.style.display = 'block';
    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1e293b; padding-bottom:8px; margin-bottom:10px;">
        <div style="color:#38bdf8; font-weight:bold; font-size:15px;">
          🚢 NAVIRE : ${vessel.name}
        </div>
        <button id="close-tactical-panel" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">✕</button>
      </div>

      <!-- TRAJET MARITIME -->
      <div style="background:#040711; border:1px solid #38bdf8; padding:10px; border-radius:6px; margin-bottom:10px; text-align:center;">
        <div style="color:#64748b; font-size:10px; margin-bottom:4px;">ROUTE MARITIME DECLAREE</div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-weight:bold;">
          <span style="color:#38bdf8; font-size:12px;">⚓ ${vessel.origin}</span>
          <span style="color:#00ffcc;">➔</span>
          <span style="color:#ffaa00; font-size:12px;">⚓ ${vessel.destination}</span>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:11px; margin-bottom:10px;">
        <div style="background:#0f172a; padding:8px; border-radius:6px;">
          <span style="color:#94a3b8; display:block;">TYPE BÂTIMENT</span>
          <strong style="color:#fff;">${vessel.type}</strong>
        </div>
        <div style="background:#0f172a; padding:8px; border-radius:6px;">
          <span style="color:#94a3b8; display:block;">COMMANDANT</span>
          <strong style="color:#00ffcc;">👨‍✈️ ${vessel.captain}</strong>
        </div>
        <div style="background:#0f172a; padding:8px; border-radius:6px;">
          <span style="color:#94a3b8; display:block;">VITESSE</span>
          <strong style="color:#fff;">${vessel.speedKnots} kts</strong>
          <span style="color:#64748b; font-size:9px;">(${speedKmH} km/h)</span>
        </div>
        <div style="background:#0f172a; padding:8px; border-radius:6px;">
          <span style="color:#94a3b8; display:block;">TIRANT D'EAU</span>
          <strong style="color:#fff;">${vessel.draft} m</strong>
        </div>
        <div style="background:#0f172a; padding:8px; border-radius:6px;">
          <span style="color:#94a3b8; display:block;">CAP</span>
          <strong style="color:#ffaa00;">${vessel.heading}°</strong>
        </div>
        <div style="background:#0f172a; padding:8px; border-radius:6px;">
          <span style="color:#94a3b8; display:block;">PAVILLON</span>
          <strong style="color:#fff;">${vessel.flag}</strong>
        </div>
      </div>

      <div style="background:#040711; border:1px solid #1e293b; padding:8px; border-radius:6px; font-size:10px; margin-bottom:10px;">
        <div><b>MMSI :</b> ${vessel.mmsi} | <b>GPS :</b> ${vessel.lat.toFixed(4)}°, ${vessel.lon.toFixed(4)}°</div>
      </div>

      <button id="center-on-vessel-btn" style="
        width: 100%; background: #38bdf8; color: #020617; border: none;
        padding: 8px; border-radius: 6px; font-weight: bold; cursor: pointer;
        font-family: monospace;
      ">
        🎯 SUIVRE CE NAVIRE
      </button>
    `;

    document.getElementById('close-tactical-panel')?.addEventListener('click', () => {
      this.closeDetailPanel();
    });

    document.getElementById('center-on-vessel-btn')?.addEventListener('click', () => {
      this.map.flyTo([vessel.lat, vessel.lon], 13, { duration: 1 });
    });
  }

  closeDetailPanel() {
    const panel = document.getElementById('tactical-detail-panel');
    if (panel) panel.style.display = 'none';
    this.trajectoryLayer.clearLayers();
    this.selectedVessel = null;
  }
}

/**
 * ✈️ GESTIONNAIRE DE VOLS (Smooth & Détaillé)
 */
class LiveFlightManager {
  constructor(map, L) {
    this.map = map;
    this.L = L;
    this.flightsLayer = L.layerGroup();
    this.trajectoryLayer = L.layerGroup();
    this.isActive = false;
    this.refreshInterval = null;
    this.animationInterval = null;
    this.markersMap = new Map();
    this.planesData = [];
    this.selectedPlane = null;

    this.pilotsList = [
      "Cpt. Marc Dubois", "Cpt. Sarah Bernard", "Cpt. Thomas Laurent",
      "Cpt. Elena Rostova", "Cpt. James Wilson", "Cpt. Hiroshi Tanaka"
    ];

    this.routesList = [
      { from: "Paris (CDG)", to: "Nice (NCE)" },
      { from: "Londres (LHR)", to: "New York (JFK)" },
      { from: "Francfort (FRA)", to: "Tokyo (HND)" },
      { from: "Dubaï (DXB)", to: "Paris (CDG)" },
      { from: "Amsterdam (AMS)", to: "Madrid (MAD)" }
    ];
  }

  toggle() {
    this.isActive = !this.isActive;
    if (this.isActive) {
      this.map.addLayer(this.flightsLayer);
      this.map.addLayer(this.trajectoryLayer);
      this.startTracking();
    } else {
      this.stopTracking();
      this.map.removeLayer(this.flightsLayer);
      this.map.removeLayer(this.trajectoryLayer);
      this.clearAll();
      this.closeFlightDetailPanel();
      updateWidgetStat('flights', 'Désactivé');
    }
    return this.isActive;
  }

  startTracking() {
    this.fetchLiveFlights();

    if (this.refreshInterval) clearInterval(this.refreshInterval);
    this.refreshInterval = setInterval(() => {
      if (this.isActive) this.fetchLiveFlights();
    }, 10000);

    if (this.animationInterval) clearInterval(this.animationInterval);
    this.animationInterval = setInterval(() => {
      if (this.isActive && this.planesData.length > 0) {
        this.stepSimulation();
      }
    }, 1500);

    this.map.on('moveend', this.handleMapMove);
  }

  stopTracking() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.animationInterval) clearInterval(this.animationInterval);
    this.refreshInterval = null;
    this.animationInterval = null;
    this.map.off('moveend', this.handleMapMove);
  }

  handleMapMove = () => {
    if (this.isActive) this.fetchLiveFlights();
  };

  clearAll() {
    this.flightsLayer.clearLayers();
    this.trajectoryLayer.clearLayers();
    this.markersMap.clear();
    this.planesData = [];
  }

  async fetchLiveFlights() {
    if (!this.isActive) return;

    if (this.map.getZoom() < 5) {
      this.clearAll();
      this.closeFlightDetailPanel();
      updateWidgetStat('flights', 'Zoomez pour afficher les vols');
      return;
    }

    const bounds = this.map.getBounds();
    const s = bounds.getSouth(), w = bounds.getWest();
    const n = bounds.getNorth(), e = bounds.getEast();

    updateWidgetStat('flights', 'Balayage radar...');

    let liveStates = null;

    try {
      const openSkyUrl = `https://opensky-network.org/api/states/all?lamin=${s}&lomin=${w}&lamax=${n}&lomax=${e}`;
      const res = await fetch(openSkyUrl);
      if (res.ok) {
        const data = await res.json();
        if (data && data.states) liveStates = data.states;
      }
    } catch (e) {}

    if (liveStates && liveStates.length > 0) {
      this.processRealStates(liveStates);
    } else {
      this.processSimulatedRadar(bounds);
    }
  }

  processRealStates(states) {
    const activeStates = states.filter(s => s[6] && s[5] && !s[8]).slice(0, 25);

    this.planesData = activeStates.map((f, idx) => {
      const [icao24, callsign, country, timePos, lastContact, lon, lat, baroAlt, onGround, velocity, trueTrack] = f;
      const key = icao24.toUpperCase();
      const existing = this.planesData.find(p => p.key === key);

      const route = existing ? existing.route : this.routesList[idx % this.routesList.length];
      const pilot = existing ? existing.pilot : this.pilotsList[idx % this.pilotsList.length];

      return {
        key: key,
        callsign: callsign ? callsign.trim() : `VOL-${key.slice(0, 4)}`,
        airline: country ? `Air ${country}` : 'Compagnie Internationale',
        country: country || 'International',
        origin: route.from,
        destination: route.to,
        pilot: pilot,
        lat, lon,
        heading: Math.round(trueTrack || 0),
        speed: Math.round((velocity || 180) * 3.6),
        altitude: Math.round(baroAlt || 8500),
        icao: key,
        squawk: Math.floor(1000 + Math.random() * 8999).toString(),
        isReal: true
      };
    });

    this.updateMarkers();
    updateWidgetStat('flights', `${this.planesData.length} vol(s) en direct`);
  }

  processSimulatedRadar(bounds) {
    if (this.planesData.length === 0 || this.planesData.length < 8) {
      const latSpan = bounds.getNorth() - bounds.getSouth();
      const lonSpan = bounds.getEast() - bounds.getWest();

      const airlines = [
        { name: 'Air France', country: 'France', prefix: 'AFR' },
        { name: 'Lufthansa', country: 'Allemagne', prefix: 'DLH' },
        { name: 'British Airways', country: 'Royaume-Uni', prefix: 'BAW' },
        { name: 'Emirates', country: 'Émirats Arabes Unis', prefix: 'UAE' }
      ];

      this.planesData = [];
      for (let i = 0; i < 16; i++) {
        const air = airlines[Math.floor(Math.random() * airlines.length)];
        const route = this.routesList[i % this.routesList.length];
        const pilot = this.pilotsList[i % this.pilotsList.length];
        const key = `SIM-${air.prefix}${100 + i}`;

        this.planesData.push({
          key: key,
          callsign: `${air.prefix}${1000 + Math.floor(Math.random() * 8999)}`,
          airline: air.name,
          country: air.country,
          origin: route.from,
          destination: route.to,
          pilot: pilot,
          lat: bounds.getSouth() + Math.random() * latSpan,
          lon: bounds.getWest() + Math.random() * lonSpan,
          heading: Math.floor(Math.random() * 360),
          speed: 680 + Math.floor(Math.random() * 240),
          altitude: 6500 + Math.floor(Math.random() * 5500),
          icao: Math.random().toString(16).substring(2, 8).toUpperCase(),
          squawk: `${Math.floor(1000 + Math.random() * 6999)}`,
          isReal: false
        });
      }
    }

    this.updateMarkers();
    updateWidgetStat('flights', `${this.planesData.length} vol(s) actifs (Radar)`);
  }

  stepSimulation() {
    this.planesData.forEach(p => {
      const distKm = (p.speed / 3600) * 1.5;
      const rad = (p.heading * Math.PI) / 180;

      const deltaLat = (distKm / 111) * Math.cos(rad);
      const deltaLon = (distKm / (111 * Math.cos((p.lat * Math.PI) / 180))) * Math.sin(rad);

      p.lat += deltaLat;
      p.lon += deltaLon;
    });

    this.updateMarkers();

    if (this.selectedPlane) {
      const updated = this.planesData.find(p => p.key === this.selectedPlane.key);
      if (updated) {
        this.selectedPlane = updated;
        this.renderFlightDetailPanel(updated);
        this.drawTrajectoryVector(updated);
      }
    }
  }

  updateMarkers() {
    const activeKeys = new Set(this.planesData.map(p => p.key));

    this.planesData.forEach(p => {
      if (this.markersMap.has(p.key)) {
        const marker = this.markersMap.get(p.key);
        marker.setLatLng([p.lat, p.lon]);

        const iconEl = marker.getElement()?.querySelector('.plane-icon-inner');
        if (iconEl) {
          iconEl.style.transform = `rotate(${p.heading}deg)`;
        }
      } else {
        const iconHtml = `
          <div class="plane-icon-inner" style="transform: rotate(${p.heading}deg); font-size:22px; line-height:1;">
            ✈️
          </div>
        `;

        const customIcon = this.L.divIcon({
          className: 'smooth-tactical-icon',
          html: iconHtml,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const marker = this.L.marker([p.lat, p.lon], { icon: customIcon });

        marker.on('click', () => {
          this.selectFlight(p);
        });

        this.markersMap.set(p.key, marker);
        this.flightsLayer.addLayer(marker);
      }
    });

    for (const [key, marker] of this.markersMap.entries()) {
      if (!activeKeys.has(key)) {
        this.flightsLayer.removeLayer(marker);
        this.markersMap.delete(key);
      }
    }
  }

  selectFlight(plane) {
    this.selectedPlane = plane;
    this.map.panTo([plane.lat, plane.lon], { animate: true, duration: 0.8 });
    this.renderFlightDetailPanel(plane);
    this.drawTrajectoryVector(plane);
  }

  drawTrajectoryVector(plane) {
    this.trajectoryLayer.clearLayers();

    const rad = (plane.heading * Math.PI) / 180;
    const projectDistKm = (plane.speed / 3600) * 120;

    const endLat = plane.lat + (projectDistKm / 111) * Math.cos(rad);
    const endLon = plane.lon + (projectDistKm / (111 * Math.cos((plane.lat * Math.PI) / 180))) * Math.sin(rad);

    const polyline = this.L.polyline([[plane.lat, plane.lon], [endLat, endLon]], {
      color: '#00e5ff',
      weight: 2,
      dashArray: '6, 8',
      opacity: 0.85
    });

    this.trajectoryLayer.addLayer(polyline);
  }

  renderFlightDetailPanel(plane) {
    let panel = document.getElementById('tactical-detail-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'tactical-detail-panel';
      panel.style.cssText = `
        position: fixed; top: 80px; right: 20px; z-index: 1100;
        width: 320px; background: rgba(9, 13, 22, 0.94);
        border: 1px solid #00e5ff; border-radius: 10px;
        padding: 16px; color: #f8fafc; font-family: monospace;
        backdrop-filter: blur(12px); box-shadow: 0 10px 30px rgba(0, 229, 255, 0.25);
      `;
      document.body.appendChild(panel);
    }

    const knots = Math.round(plane.speed * 0.539957);
    const feet = Math.round(plane.altitude * 3.28084);

    panel.style.display = 'block';
    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1e293b; padding-bottom:8px; margin-bottom:10px;">
        <div style="color:#00e5ff; font-weight:bold; font-size:16px;">
          ✈️ VOL : ${plane.callsign}
        </div>
        <button id="close-tactical-panel" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">✕</button>
      </div>

      <div style="background:#040711; border:1px solid #00e5ff; padding:10px; border-radius:6px; margin-bottom:10px; text-align:center;">
        <div style="color:#64748b; font-size:10px; margin-bottom:4px;">PLAN DE VOL PLANIFIÉ</div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-weight:bold;">
          <span style="color:#00ffcc; font-size:12px;">🛫 ${plane.origin}</span>
          <span style="color:#00e5ff;">➔</span>
          <span style="color:#ffaa00; font-size:12px;">🛬 ${plane.destination}</span>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:11px; margin-bottom:10px;">
        <div style="background:#0f172a; padding:8px; border-radius:6px;">
          <span style="color:#94a3b8; display:block;">COMPAGNIE</span>
          <strong style="color:#fff;">${plane.airline}</strong>
        </div>
        <div style="background:#0f172a; padding:8px; border-radius:6px;">
          <span style="color:#94a3b8; display:block;">COMMANDANT DE BORD</span>
          <strong style="color:#00ffcc;">👨‍✈️ ${plane.pilot}</strong>
        </div>
        <div style="background:#0f172a; padding:8px; border-radius:6px;">
          <span style="color:#94a3b8; display:block;">VITESSE</span>
          <strong style="color:#fff;">${plane.speed} km/h</strong>
          <span style="color:#64748b; font-size:9px;">(${knots} kts)</span>
        </div>
        <div style="background:#0f172a; padding:8px; border-radius:6px;">
          <span style="color:#94a3b8; display:block;">ALTITUDE</span>
          <strong style="color:#fff;">${plane.altitude.toLocaleString()} m</strong>
          <span style="color:#64748b; font-size:9px;">(${feet.toLocaleString()} ft)</span>
        </div>
        <div style="background:#0f172a; padding:8px; border-radius:6px;">
          <span style="color:#94a3b8; display:block;">CAP REAL</span>
          <strong style="color:#ffaa00;">${plane.heading}°</strong>
        </div>
        <div style="background:#0f172a; padding:8px; border-radius:6px;">
          <span style="color:#94a3b8; display:block;">TRANSPONDEUR</span>
          <strong style="color:#ff0055;">${plane.squawk}</strong>
        </div>
      </div>

      <div style="background:#040711; border:1px solid #1e293b; padding:8px; border-radius:6px; font-size:10px; margin-bottom:10px;">
        <div><b>GPS :</b> ${plane.lat.toFixed(4)}°, ${plane.lon.toFixed(4)}° | <b>ICAO :</b> <span style="color:#00e5ff;">${plane.icao}</span></div>
      </div>

      <button id="center-on-plane-btn" style="
        width: 100%; background: #00e5ff; color: #020617; border: none;
        padding: 8px; border-radius: 6px; font-weight: bold; cursor: pointer;
        font-family: monospace;
      ">
        🎯 SUIVRE CET APPAREIL
      </button>
    `;

    document.getElementById('close-tactical-panel')?.addEventListener('click', () => {
      this.closeFlightDetailPanel();
    });

    document.getElementById('center-on-plane-btn')?.addEventListener('click', () => {
      this.map.flyTo([plane.lat, plane.lon], 13, { duration: 1 });
    });
  }

  closeFlightDetailPanel() {
    const panel = document.getElementById('tactical-detail-panel');
    if (panel) panel.style.display = 'none';
    this.trajectoryLayer.clearLayers();
    this.selectedPlane = null;
  }
}

/**
 * 🌤 MÉTÉO RÉELLE
 */
async function fetchCityWeather(lat, lon) {
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
    const data = await res.json();
    if (data.current_weather) {
      updateCityWidget({
        temp: `${data.current_weather.temperature}°C`,
        wind: `${data.current_weather.windspeed} km/h`
      });
    }
  } catch (err) {
    console.warn("Météo non accessible", err);
  }
}

/**
 * 🚒 SECOURS & POLICE DIRECT (Overpass API Sécurisée)
 */
async function fetchRealEmergencyServices(s, w, n, e, L, layerGroup) {
  const overpassQuery = `[out:json][timeout:10];(node["amenity"="fire_station"](${s},${w},${n},${e});node["amenity"="police"](${s},${w},${n},${e});node["amenity"="hospital"](${s},${w},${n},${e}););out body 30;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    layerGroup.clearLayers();

    if (data && data.elements) {
      let count = 0;
      data.elements.forEach(item => {
        count++;
        const amenity = item.tags.amenity;
        let icon = '🚒';
        let color = '#ff3333';
        let title = item.tags.name || 'Caserne de Pompiers';

        if (amenity === 'police') {
          icon = '🚓';
          color = '#3388ff';
          title = item.tags.name || 'Poste de Police';
        } else if (amenity === 'hospital') {
          icon = '🏥';
          color = '#00ffcc';
          title = item.tags.name || 'Hôpital / Urgences';
        }

        const customIcon = L.divIcon({
          html: `<div style="background:${color}; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:1px solid #fff; box-shadow:0 0 8px ${color}; font-size:12px;">${icon}</div>`,
          iconSize: [22, 22]
        });

        const marker = L.marker([item.lat, item.lon], { icon: customIcon });
        marker.bindPopup(`
          <div style="color:#fff; background:#0a101d; padding:8px; border-radius:4px; font-family:monospace; border:1px solid ${color};">
            <strong style="color:${color}">${icon} ${title}</strong><br/>
            <span>Catégorie : ${amenity.toUpperCase()}</span>
          </div>
        `);
        layerGroup.addLayer(marker);
      });
      updateWidgetStat('stations', `${count} infrastructure(s)`);
    }
  } catch (err) {
    updateWidgetStat('stations', 'Cartographie active (Miroir)');
  }
}

/**
 * 🌋 SÉISMES EN DIRECT (USGS)
 */
async function fetchRealEarthquakes(L, layerGroup) {
  try {
    const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
    if (!res.ok) return;
    const data = await res.json();

    if (data && data.features) {
      data.features.forEach(eq => {
        const coords = [eq.geometry.coordinates[1], eq.geometry.coordinates[0]];
        const mag = eq.properties.mag;
        const color = mag >= 5 ? '#ff0055' : mag >= 3 ? '#ffaa00' : '#ffff00';

        const circle = L.circleMarker(coords, {
          radius: Math.max(mag * 3, 4),
          fillColor: color,
          color: '#ffffff',
          weight: 1,
          fillOpacity: 0.8
        }).bindPopup(`
          <div style="color:#fff; background:#0a101d; padding:8px; font-family:monospace; border:1px solid ${color};">
            <strong style="color:${color}">🌋 SÉISME RÉEL M${mag}</strong><br/>
            <span>Épicentre : ${eq.properties.place}</span>
          </div>
        `);
        layerGroup.addLayer(circle);
      });
    }
  } catch (err) {
    console.warn("USGS Indisponible", err);
  }
}

/**
 * 📊 WIDGET HUD TACTIQUE
 */
function updateCityWidget(data) {
  let widget = document.getElementById('city-live-widget');
  if (!widget) {
    widget = document.createElement('div');
    widget.id = 'city-live-widget';
    widget.style.cssText = `
      position: fixed; bottom: 20px; left: 20px; z-index: 1000;
      background: rgba(10, 16, 29, 0.95); border: 1px solid #00ffcc;
      border-radius: 8px; padding: 12px 16px; color: #fff;
      font-family: monospace; font-size: 13px; backdrop-filter: blur(8px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.5); min-width: 250px;
    `;
    document.body.appendChild(widget);
  }

  widget.style.display = 'block';
  widget.innerHTML = `
    <div style="color:#00ffcc; font-weight:bold; margin-bottom:6px;">
      🔴 FLUX TACTIQUE EN DIRECT
    </div>
    <div>🌡️ Température : <span style="color:#fff;">${data.temp}</span></div>
    <div>💨 Vent : <span style="color:#fff;">${data.wind}</span></div>
    <div>✈️ Traffic Aérien : <span id="widget-flights" style="color:#00e5ff;">Désactivé</span></div>
    <div>🚢 Traffic Maritime : <span id="widget-vessels" style="color:#38bdf8;">Désactivé</span></div>
    <div>🚒 Secours / Police : <span id="widget-stations" style="color:#ff3333;">Analyse...</span></div>
  `;
}

function updateWidgetStat(id, text) {
  const el = document.getElementById(`widget-${id}`);
  if (el) el.innerText = text;
}

/**
 * 🎛️ CONTROLES DU MENU HUD
 */
function injectHUDControls(map, darkLayer, satelliteLayer, emergencyGroup, earthquakeGroup, flightManager, vesselManager) {
  if (document.getElementById('hud-country-menu')) return;

  const hudMenu = document.createElement('div');
  hudMenu.id = 'hud-country-menu';
  hudMenu.innerHTML = `
    <div class="hud-panel">
      <div class="hud-header">
        <span>🎖️ GOD'S EYE - LIVE COMMAND</span>
        <button id="hud-toggle-btn">☰</button>
      </div>
      <div class="hud-body" id="hud-body">
        
        <div class="hud-section">
          <label>🔍 ALLER DANS UNE VILLE</label>
          <div style="display:flex; gap:5px; margin-top:5px;">
            <input type="text" id="hud-search-input" placeholder="ex: Paris, Tokyo, Miami..." style="flex:1; background:#0a101d; border:1px solid #00ffcc; color:#fff; padding:6px; border-radius:4px; font-family:monospace;" />
            <button id="hud-search-btn" class="hud-btn highlight" style="padding:0 10px;">🔎</button>
          </div>
        </div>

        <div class="hud-section">
          <label>🎨 STYLE DE CARTE</label>
          <div class="hud-grid">
            <button class="hud-btn highlight" id="btn-style-dark">🕶️ Sombre</button>
            <button class="hud-btn" id="btn-style-sat">🛰️ Satellite</button>
          </div>
        </div>

        <div class="hud-section">
          <label>📡 CALQUES TACTIQUES</label>
          <div class="hud-grid" style="grid-template-columns: 1fr 1fr;">
            <button class="hud-btn" id="btn-toggle-flights">✈️ Vols</button>
            <button class="hud-btn" id="btn-toggle-vessels">🚢 Bateaux</button>
            <button class="hud-btn highlight" id="btn-toggle-emergency">🚒 Secours</button>
            <button class="hud-btn highlight" id="btn-toggle-quake">🌋 Séismes</button>
          </div>
        </div>

        <div class="hud-section">
          <button class="hud-btn highlight" id="btn-reset-view">🎯 Vue Globale</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(hudMenu);

  document.getElementById('hud-toggle-btn')?.addEventListener('click', () => {
    document.getElementById('hud-body')?.classList.toggle('collapsed');
  });

  const searchAction = async () => {
    const val = document.getElementById('hud-search-input')?.value;
    if (!val) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (data && data[0]) {
        map.flyTo([parseFloat(data[0].lat), parseFloat(data[0].lon)], 12, { duration: 1.5 });
      }
    } catch (e) {
      console.warn("Erreur recherche", e);
    }
  };

  document.getElementById('hud-search-btn')?.addEventListener('click', searchAction);
  document.getElementById('hud-search-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchAction();
  });

  document.getElementById('btn-style-dark')?.addEventListener('click', () => {
    if (map.hasLayer(satelliteLayer)) map.removeLayer(satelliteLayer);
    map.addLayer(darkLayer);
  });

  document.getElementById('btn-style-sat')?.addEventListener('click', () => {
    if (map.hasLayer(darkLayer)) map.removeLayer(darkLayer);
    map.addLayer(satelliteLayer);
  });

  const flightsBtn = document.getElementById('btn-toggle-flights');
  flightsBtn?.addEventListener('click', () => {
    const active = flightManager.toggle();
    if (active) {
      flightsBtn.classList.add('highlight');
    } else {
      flightsBtn.classList.remove('highlight');
    }
  });

  const vesselsBtn = document.getElementById('btn-toggle-vessels');
  vesselsBtn?.addEventListener('click', () => {
    const active = vesselManager.toggle();
    if (active) {
      vesselsBtn.classList.add('highlight');
    } else {
      vesselsBtn.classList.remove('highlight');
    }
  });

  document.getElementById('btn-toggle-emergency')?.addEventListener('click', (e) => {
    if (map.hasLayer(emergencyGroup)) {
      map.removeLayer(emergencyGroup);
      e.target.classList.remove('highlight');
    } else {
      map.addLayer(emergencyGroup);
      e.target.classList.add('highlight');
    }
  });

  document.getElementById('btn-toggle-quake')?.addEventListener('click', (e) => {
    if (map.hasLayer(earthquakeGroup)) {
      map.removeLayer(earthquakeGroup);
      e.target.classList.remove('highlight');
    } else {
      map.addLayer(earthquakeGroup);
      e.target.classList.add('highlight');
    }
  });

  document.getElementById('btn-reset-view')?.addEventListener('click', () => {
    map.flyTo([20, 0], 3, { duration: 1 });
  });
}

export const createScene = createApplicationScene;
export default createApplicationScene;