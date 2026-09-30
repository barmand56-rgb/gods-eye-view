/**
 * God's Eye - Worldwide Command Center (City-Precision & Realtime OSINT)
 */
export async function createApplicationScene(options = {}) {
  const loaderStatus = document.querySelector('#loading-loaderStatus');
  if (loaderStatus) loaderStatus.style.display = 'none';

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

  // 1. Initialisation de la Carte Mondiale
  const map = L.map('cesiumContainer', {
    center: [20, 0],
    zoom: 3,
    zoomControl: false,
    attributionControl: false
  });

  // Base Layers
  const darkLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 16 }
  ).addTo(map);

  const satelliteLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 18 }
  );

  // Groupes de calques
  const localEmergencyGroup = L.layerGroup().addTo(map);
  const earthquakeGroup = L.layerGroup().addTo(map);
  const cameraGroup = L.layerGroup().addTo(map);

  // 2. Chargement des données mondiales globales
  loadEarthquakes(L, earthquakeGroup);
  loadGlobalWebcams(L, cameraGroup);

  // 3. Système d'extraction dynamique d'infrastructures par ville
  let fetchTimeout = null;
  const updateCityData = () => {
    if (map.getZoom() >= 11) {
      clearTimeout(fetchTimeout);
      fetchTimeout = setTimeout(() => {
        fetchRealCityInfrastructures(map, L, localEmergencyGroup);
      }, 600); // Debounce de 600ms pour préserver les requêtes
    } else {
      localEmergencyGroup.clearLayers();
    }
  };

  map.on('moveend', updateCityData);

  // 4. Inserer le HUD avec Barre de Recherche Globale
  injectHUDControls(map, darkLayer, satelliteLayer, cameraGroup, earthquakeGroup, localEmergencyGroup);

  // Mock de compatibilité application.js
  const dummySurface = { globe: {}, enableLighting: false, show: true };
  const dummyCamera = { flyTo: () => {}, flyHome: () => map.flyTo([20, 0], 3) };

  return {
    viewer: map,
    scene: { surface: dummySurface, globe: dummySurface, camera: dummyCamera },
    surface: dummySurface,
    globe: dummySurface,
    camera: dummyCamera,
    map: map,
    destroy: () => map.remove(),
    isDestroyed: () => false
  };
}

/**
 * 🔍 RECHERCHE MONDIALE DE VILLE (API Nominatim - OpenStreetMap)
 */
async function searchGlobalCity(query, map) {
  if (!query || query.trim().length === 0) return;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
    );
    const results = await response.json();

    if (results && results.length > 0) {
      const bestMatch = results[0];
      const lat = parseFloat(bestMatch.lat);
      const lon = parseFloat(bestMatch.lon);
      map.flyTo([lat, lon], 12, { duration: 1.8 });
    } else {
      alert("⚠️ Ville ou emplacement non trouvé.");
    }
  } catch (err) {
    console.error("Erreur de géocodage:", err);
  }
}

/**
 * 🚒 EXTRACTION EN TEMPS RÉEL DES INFRASTRUCTURES DE LA VILLE (Overpass API)
 * Récupère les vrais Pompiers, Hôpitaux et Commissariats du secteur affiché
 */
async function fetchRealCityInfrastructures(map, L, layerGroup) {
  const bounds = map.getBounds();
  const s = bounds.getSouth();
  const w = bounds.getWest();
  const n = bounds.getNorth();
  const e = bounds.getEast();

  // Requête Overpass pour les éléments "amenity" urgences
  const query = `
    [out:json][timeout:10];
    (
      node["amenity"="fire_station"](${s},${w},${n},${e});
      node["amenity"="hospital"](${s},${w},${n},${e});
      node["amenity"="police"](${s},${w},${n},${e});
    );
    out body 40;
  `;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query
    });
    const data = await res.json();

    layerGroup.clearLayers();

    if (data && data.elements) {
      data.elements.forEach(item => {
        const type = item.tags.amenity;
        let iconHtml = '';
        let title = '';
        let color = '';

        if (type === 'fire_station') {
          iconHtml = '🚒';
          title = item.tags.name || 'Caserne de Pompiers';
          color = '#ff3333';
        } else if (type === 'hospital') {
          iconHtml = '🏥';
          title = item.tags.name || 'Hôpital / Urgences';
          color = '#3399ff';
        } else if (type === 'police') {
          iconHtml = '🚓';
          title = item.tags.name || 'Commissariat / Police';
          color = '#ffcc00';
        }

        const customIcon = L.divIcon({
          html: `<div style="background:${color}; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff; box-shadow:0 0 8px ${color}; font-size:12px;">${iconHtml}</div>`,
          iconSize: [22, 22]
        });

        const marker = L.marker([item.lat, item.lon], { icon: customIcon });
        marker.bindPopup(`
          <div style="color:#fff; background:#0a101d; padding:8px; font-family:monospace;">
            <strong style="color:${color}">${iconHtml} ${title}</strong><br/>
            <span>Secteur : ${item.tags['addr:city'] || 'Zone Urbaine'}</span><br/>
            <small style="color:#888;">INFRASTRUCTURE TACTIQUE RÉELLE</small>
          </div>
        `);
        layerGroup.addLayer(marker);
      });
    }
  } catch (err) {
    console.warn("Overpass API temporairement indisponible pour ce secteur", err);
  }
}

/**
 * 🌋 SÉISMES MONDIAUX
 */
async function loadEarthquakes(L, layerGroup) {
  try {
    const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
    const data = await res.json();

    data.features.forEach(eq => {
      const coords = [eq.geometry.coordinates[1], eq.geometry.coordinates[0]];
      const mag = eq.properties.mag;
      const radius = Math.max(mag * 3.5, 5);
      const color = mag >= 5 ? '#ff0055' : mag >= 3 ? '#ffaa00' : '#ffff00';

      const circle = L.circleMarker(coords, {
        radius: radius,
        fillColor: color,
        color: '#ffffff',
        weight: 1,
        fillOpacity: 0.6
      }).bindPopup(`
        <div style="color:#fff; background:#0a101d; padding:8px; font-family:monospace;">
          <strong style="color:${color}">🌋 SÉISME MAGNITUDE ${mag}</strong><br/>
          <span>Lieu : ${eq.properties.place}</span>
        </div>
      `);
      layerGroup.addLayer(circle);
    });
  } catch (e) {
    console.warn("USGS unavailable", e);
  }
}

/**
 * 📹 CAMÉRAS MONDIALES
 */
function loadGlobalWebcams(L, layerGroup) {
  const cameraIcon = L.divIcon({
    html: `<div style="background:#00ffcc; width:12px; height:12px; border-radius:50%; border:2px solid #000; box-shadow:0 0 10px #00ffcc;"></div>`,
    iconSize: [12, 12]
  });

  const cams = [
    { name: "Paris - Tour Eiffel", coords: [48.8584, 2.2945], url: "https://www.youtube.com/embed/live_stream?channel=UC1yC2A9U_yBv6Y130fA1Pgg" },
    { name: "New York - Times Square", coords: [40.7580, -73.9855], url: "https://www.youtube.com/embed/1-iS7LArMPA" },
    { name: "Tokyo - Shibuya", coords: [35.6595, 139.7004], url: "https://www.youtube.com/embed/H43glf0144k" },
    { name: "London - Abbey Road", coords: [51.5320, -0.1773], url: "https://www.youtube.com/embed/live_stream" }
  ];

  cams.forEach(cam => {
    const marker = L.marker(cam.coords, { icon: cameraIcon });
    marker.bindPopup(`
      <div style="color:#00ffcc; background:#0a101d; padding:8px; font-family:monospace; min-width:240px;">
        <strong>📹 ${cam.name}</strong>
        <div style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; margin-top:5px;">
          <iframe src="${cam.url}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allowfullscreen></iframe>
        </div>
      </div>
    `);
    layerGroup.addLayer(marker);
  });
}

/**
 * 🎛️ CONTRÔLE HUD & BARRE DE RECHERCHE UNIVERSELLE
 */
function injectHUDControls(map, darkLayer, satelliteLayer, cameraGroup, earthquakeGroup, localEmergencyGroup) {
  if (document.getElementById('hud-country-menu')) return;

  const hudMenu = document.createElement('div');
  hudMenu.id = 'hud-country-menu';
  hudMenu.innerHTML = `
    <div class="hud-panel">
      <div class="hud-header">
        <span>🎖️ GOD'S EYE - GLOBAL COMMAND</span>
        <button id="hud-toggle-btn">☰</button>
      </div>
      <div class="hud-body" id="hud-body">
        
        <div class="hud-section">
          <label>🔍 RECHERCHE MONDIALE (VILLE / PAYS)</label>
          <div style="display:flex; gap:5px; margin-top:5px;">
            <input type="text" id="hud-search-input" placeholder="ex: Paris, Tokyo, Montreal..." style="flex:1; background:#0a101d; border:1px solid #00ffcc; color:#fff; padding:6px; border-radius:4px; font-family:monospace;" />
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
          <label>📡 CALQUES D'OBSERVATION</label>
          <div class="hud-grid">
            <button class="hud-btn highlight" id="btn-toggle-local">🚑 Incidents locaux</button>
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

  // Action de recherche
  const triggerSearch = () => {
    const input = document.getElementById('hud-search-input');
    if (input && input.value) {
      searchGlobalCity(input.value, map);
    }
  };

  document.getElementById('hud-search-btn')?.addEventListener('click', triggerSearch);
  document.getElementById('hud-search-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') triggerSearch();
  });

  // Changement de mode de carte
  document.getElementById('btn-style-dark')?.addEventListener('click', () => {
    if (map.hasLayer(satelliteLayer)) map.removeLayer(satelliteLayer);
    map.addLayer(darkLayer);
  });

  document.getElementById('btn-style-sat')?.addEventListener('click', () => {
    if (map.hasLayer(darkLayer)) map.removeLayer(darkLayer);
    map.addLayer(satelliteLayer);
  });

  // Toggles de calques
  document.getElementById('btn-toggle-local')?.addEventListener('click', (e) => {
    if (map.hasLayer(localEmergencyGroup)) {
      map.removeLayer(localEmergencyGroup);
      e.target.classList.remove('highlight');
    } else {
      map.addLayer(localEmergencyGroup);
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
    map.flyTo([20, 0], 3, { duration: 1.2 });
  });
}

export const createScene = createApplicationScene;
export default createApplicationScene;