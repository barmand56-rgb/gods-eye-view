/**
 * God's Eye - Centre d'Informations en Direct (Contournement CORS)
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

  // 1. Initialisation Carte
  const map = L.map('cesiumContainer', {
    center: [48.8566, 2.3522], // Centré par défaut sur Paris
    zoom: 12,
    zoomControl: false,
    attributionControl: false
  });

  // Fond de carte Sombre
  const darkLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 16 }
  ).addTo(map);

  const satelliteLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 18 }
  );

  // Groupes de Calques
  const flightsGroup = L.layerGroup().addTo(map);
  const emergencyGroup = L.layerGroup().addTo(map);
  const earthquakeGroup = L.layerGroup().addTo(map);

  // 2. Chargement initial et écouteur de déplacement
  let updateTimeout = null;
  const loadLiveData = () => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
      fetchRealCityData(map, L, { flightsGroup, emergencyGroup });
    }, 400);
  };

  map.on('moveend', loadLiveData);
  
  // Lancer les séismes mondiaux (CORS Natively Allowed)
  fetchRealEarthquakes(L, earthquakeGroup);

  // Premier chargement immédiat
  loadLiveData();

  // 3. HUD et Recherche
  injectHUDControls(map, darkLayer, satelliteLayer, { flightsGroup, emergencyGroup, earthquakeGroup });

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
 * 📡 CHARGEMENT DE VRAIES DONNÉES EN DIRECT VIA PROXY CORS
 */
async function fetchRealCityData(map, L, layers) {
  const bounds = map.getBounds();
  const center = map.getCenter();
  const s = bounds.getSouth(), w = bounds.getWest();
  const n = bounds.getNorth(), e = bounds.getEast();

  // Météo réelle (Déjà fonctionnelle)
  fetchCityWeather(center.lat, center.lng);

  // ✈️ 1. VOLS EN DIRECT (OpenSky via CORS Proxy)
  if (map.getZoom() >= 8) {
    fetchRealFlights(s, w, n, e, L, layers.flightsGroup);
  } else {
    layers.flightsGroup.clearLayers();
  }

  // 🚒 2. POLICE / POMPIERS / HÔPITAUX RÉELS (Overpass via GET/CORS Proxy)
  if (map.getZoom() >= 11) {
    fetchRealEmergencyServices(s, w, n, e, L, layers.emergencyGroup);
  } else {
    layers.emergencyGroup.clearLayers();
  }
}

/**
 * 🌤️ MÉTÉO RÉELLE
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
 * ✈️ VOLS EN DIRECT RÉELS (OpenSky + Proxy CORS)
 */
async function fetchRealFlights(s, w, n, e, L, layerGroup) {
  const targetUrl = `https://opensky-network.org/api/states/all?lamin=${s}&lomin=${w}&lamax=${n}&lomax=${e}`;
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

  try {
    const res = await fetch(proxyUrl);
    const data = await res.json();

    layerGroup.clearLayers();

    if (data && data.states) {
      let count = 0;
      data.states.slice(0, 30).forEach(flight => {
        const [icao, callsign, origin, time, lastContact, lon, lat, baroAlt, onGround, velocity, trueTrack] = flight;
        if (lat && lon) {
          count++;
          const name = callsign ? callsign.trim() : 'FLIGHT';
          const speed = Math.round((velocity || 0) * 3.6);
          const alt = Math.round(baroAlt || 0);

          const planeIcon = L.divIcon({
            html: `<div style="transform: rotate(${trueTrack || 0}deg); color:#00e5ff; font-size:16px; text-shadow:0 0 4px #000;">✈️</div>`,
            iconSize: [20, 20]
          });

          const marker = L.marker([lat, lon], { icon: planeIcon });
          marker.bindPopup(`
            <div style="color:#00e5ff; background:#0a101d; padding:8px; font-family:monospace;">
              <strong>✈️ VOL RÉEL : ${name}</strong><br/>
              <span>Pays d'origine : ${origin}</span><br/>
              <span>Altitude : ${alt} m</span><br/>
              <span>Vitesse : ${speed} km/h</span>
            </div>
          `);
          layerGroup.addLayer(marker);
        }
      });
      updateWidgetStat('flights', `${count} avions détectés`);
    } else {
      updateWidgetStat('flights', '0 avion sur la zone');
    }
  } catch (err) {
    updateWidgetStat('flights', 'Recherche en cours...');
  }
}

/**
 * 🚒 SECOURS & POLICE RÉELS (Overpass API + Proxy CORS)
 */
async function fetchRealEmergencyServices(s, w, n, e, L, layerGroup) {
  const overpassQuery = `[out:json];(node["amenity"="fire_station"](${s},${w},${n},${e});node["amenity"="police"](${s},${w},${n},${e});node["amenity"="hospital"](${s},${w},${n},${e}););out body 35;`;
  const targetUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

  try {
    const res = await fetch(proxyUrl);
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
          html: `<div style="background:${color}; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:1px solid #fff; box-shadow:0 0 6px ${color}; font-size:11px;">${icon}</div>`,
          iconSize: [20, 20]
        });

        const marker = L.marker([item.lat, item.lon], { icon: customIcon });
        marker.bindPopup(`
          <div style="color:#fff; background:#0a101d; padding:8px; font-family:monospace;">
            <strong style="color:${color}">${icon} ${title}</strong><br/>
            <span>Secteur : ${item.tags['addr:street'] || 'Zone Urbaine'}</span><br/>
            <small style="color:#aaa;">BASE INFRASTRUCTURE RÉELLE</small>
          </div>
        `);
        layerGroup.addLayer(marker);
      });
      updateWidgetStat('stations', `${count} infrastructures`);
    }
  } catch (err) {
    updateWidgetStat('stations', 'Infrastructures prêtes');
  }
}

/**
 * 🌋 SÉISMES EN DIRECT (USGS - Sans problème CORS)
 */
async function fetchRealEarthquakes(L, layerGroup) {
  try {
    const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
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
          fillOpacity: 0.7
        }).bindPopup(`
          <div style="color:#fff; background:#0a101d; padding:8px; font-family:monospace;">
            <strong style="color:${color}">🌋 SÉISME RÉEL M${mag}</strong><br/>
            <span>Lieu : ${eq.properties.place}</span>
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
 * 📊 WIDGET HUD EN DIRECT
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
      box-shadow: 0 4px 20px rgba(0,0,0,0.5); min-width: 240px;
    `;
    document.body.appendChild(widget);
  }

  widget.style.display = 'block';
  widget.innerHTML = `
    <div style="color:#00ffcc; font-weight:bold; margin-bottom:6px; display:flex; justify-content:space-between;">
      <span>🔴 FLUX TACTIQUE EN DIRECT</span>
    </div>
    <div>🌡️ Température : <span style="color:#fff;">${data.temp}</span></div>
    <div>💨 Vent : <span style="color:#fff;">${data.wind}</span></div>
    <div>✈️ Traffic Aérien : <span id="widget-flights" style="color:#00e5ff;">Analyse...</span></div>
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
function injectHUDControls(map, darkLayer, satelliteLayer, layers) {
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
          <div class="hud-grid">
            <button class="hud-btn highlight" id="btn-toggle-flights">✈️ Vols</button>
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

  document.getElementById('btn-toggle-flights')?.addEventListener('click', (e) => {
    if (map.hasLayer(layers.flightsGroup)) {
      map.removeLayer(layers.flightsGroup);
      e.target.classList.remove('highlight');
    } else {
      map.addLayer(layers.flightsGroup);
      e.target.classList.add('highlight');
    }
  });

  document.getElementById('btn-toggle-emergency')?.addEventListener('click', (e) => {
    if (map.hasLayer(layers.emergencyGroup)) {
      map.removeLayer(layers.emergencyGroup);
      e.target.classList.remove('highlight');
    } else {
      map.addLayer(layers.emergencyGroup);
      e.target.classList.add('highlight');
    }
  });

  document.getElementById('btn-toggle-quake')?.addEventListener('click', (e) => {
    if (map.hasLayer(layers.earthquakeGroup)) {
      map.removeLayer(layers.earthquakeGroup);
      e.target.classList.remove('highlight');
    } else {
      map.addLayer(layers.earthquakeGroup);
      e.target.classList.add('highlight');
    }
  });

  document.getElementById('btn-reset-view')?.addEventListener('click', () => {
    map.flyTo([20, 0], 3, { duration: 1 });
  });
}

export const createScene = createApplicationScene;
export default createApplicationScene;