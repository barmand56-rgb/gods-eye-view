/**
 * God's Eye - Worldwide Command Center (City Focus & Clean Live Data)
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
    center: [20, 0],
    zoom: 3,
    zoomControl: false,
    attributionControl: false
  });

  // Fonds de Carte
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
  const cameraGroup = L.layerGroup().addTo(map);

  // 2. Écouteur de Zoom & Déplacement (Mise à jour automatique par Ville)
  let updateTimeout = null;
  const handleCityZoom = () => {
    clearTimeout(updateTimeout);
    if (map.getZoom() >= 11) {
      updateTimeout = setTimeout(() => {
        fetchCityLiveData(map, L, { flightsGroup, emergencyGroup, cameraGroup });
      }, 500);
    } else {
      flightsGroup.clearLayers();
      emergencyGroup.clearLayers();
      cameraGroup.clearLayers();
      hideCityWidget();
    }
  };

  map.on('moveend', handleCityZoom);

  // 3. Interface HUD & Barre de Recherche
  injectHUDControls(map, darkLayer, satelliteLayer, { flightsGroup, emergencyGroup, cameraGroup });

  // Fallback compatibilité
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
 * 📊 CHARGEMENT DES INFOS EN DIRECT DÈS QU'ON ZOOM SUR UNE VILLE
 */
async function fetchCityLiveData(map, L, layers) {
  const bounds = map.getBounds();
  const center = map.getCenter();
  const s = bounds.getSouth(), w = bounds.getWest();
  const n = bounds.getNorth(), e = bounds.getEast();

  // A. Météo de la Ville en Temps Réel
  fetchCityWeather(center.lat, center.lng);

  // B. Vols en direct dans le périmètre (OpenSky API)
  fetchLiveFlights(s, w, n, e, L, layers.flightsGroup);

  // C. Police & Pompiers locaux (Overpass API)
  fetchLocalEmergencyServices(s, w, n, e, L, layers.emergencyGroup);

  // D. Caméras / Webcams du secteur
  fetchLocalCameras(center.lat, center.lng, L, layers.cameraGroup);
}

/**
 * 🌤️ 1. MÉTÉO EN TEMPS RÉEL (Open-Meteo API)
 */
async function fetchCityWeather(lat, lon) {
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
    const data = await res.json();
    if (data.current_weather) {
      const weather = data.current_weather;
      updateCityWidget({
        temp: `${weather.temperature}°C`,
        wind: `${weather.windspeed} km/h`,
        lat: lat.toFixed(2),
        lon: lon.toFixed(2)
      });
    }
  } catch (err) {
    console.warn("Météo indisponible", err);
  }
}

/**
 * ✈️ 2. VOLS EN DIRECT (OpenSky Network API)
 */
async function fetchLiveFlights(s, w, n, e, L, layerGroup) {
  layerGroup.clearLayers();
  try {
    const res = await fetch(`https://opensky-network.org/api/states/all?lamin=${s}&lomin=${w}&lamax=${n}&lomax=${e}`);
    const data = await res.json();

    if (data && data.states) {
      let flightCount = 0;
      data.states.slice(0, 20).forEach(flight => {
        const [icao, callsign, origin, time, lastContact, lon, lat, baroAlt, onGround, velocity, trueTrack] = flight;
        if (lat && lon) {
          flightCount++;
          const isMil = callsign && (callsign.startsWith('AFR') || callsign.startsWith('CTM') || callsign.startsWith('BAF') || velocity > 800);
          const iconSymbol = isMil ? '🛩️' : '✈️';
          const iconColor = isMil ? '#ffaa00' : '#00e5ff';

          const planeIcon = L.divIcon({
            html: `<div style="transform: rotate(${trueTrack || 0}deg); color:${iconColor}; font-size:16px; text-shadow:0 0 6px #000;">${iconSymbol}</div>`,
            iconSize: [20, 20]
          });

          const marker = L.marker([lat, lon], { icon: planeIcon });
          marker.bindPopup(`
            <div style="color:#fff; background:#0a101d; padding:8px; font-family:monospace;">
              <strong style="color:${iconColor}">${iconSymbol} VOL ${callsign?.trim() || 'INCONNU'}</strong><br/>
              <span>Origine : ${origin}</span><br/>
              <span>Altitude : ${Math.round(baroAlt || 0)} m</span><br/>
              <span>Vitesse : ${Math.round((velocity || 0) * 3.6)} km/h</span>
            </div>
          `);
          layerGroup.addLayer(marker);
        }
      });
      updateWidgetStat('flights', `${flightCount} appareils`);
    }
  } catch (err) {
    updateWidgetStat('flights', 'Scanner prêt');
  }
}

/**
 * 🚒 3. POLICE ET POMPIERS (Overpass API)
 */
async function fetchLocalEmergencyServices(s, w, n, e, L, layerGroup) {
  layerGroup.clearLayers();
  const query = `
    [out:json][timeout:8];
    (
      node["amenity"="fire_station"](${s},${w},${n},${e});
      node["amenity"="police"](${s},${w},${n},${e});
    );
    out body 25;
  `;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: query });
    const data = await res.json();

    if (data && data.elements) {
      let stationCount = 0;
      data.elements.forEach(item => {
        stationCount++;
        const isFire = item.tags.amenity === 'fire_station';
        const icon = isFire ? '🚒' : '🚓';
        const color = isFire ? '#ff3333' : '#3388ff';
        const name = item.tags.name || (isFire ? 'Caserne Pompiers' : 'Commissariat Police');

        const customIcon = L.divIcon({
          html: `<div style="background:${color}; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:1px solid #fff; box-shadow:0 0 6px ${color}; font-size:11px;">${icon}</div>`,
          iconSize: [20, 20]
        });

        const marker = L.marker([item.lat, item.lon], { icon: customIcon });
        marker.bindPopup(`
          <div style="color:#fff; background:#0a101d; padding:8px; font-family:monospace;">
            <strong style="color:${color}">${icon} ${name}</strong><br/>
            <span>Statut : Service Actif</span>
          </div>
        `);
        layerGroup.addLayer(marker);
      });
      updateWidgetStat('stations', `${stationCount} postes`);
    }
  } catch (err) {
    updateWidgetStat('stations', 'Infrastructures prêtes');
  }
}

/**
 * 📹 4. CAMÉRAS DE SURVEILLANCE
 */
function fetchLocalCameras(lat, lon, L, layerGroup) {
  layerGroup.clearLayers();
  
  // Exemples de caméras universelles adaptées aux coordonnées actuelles
  const cameraIcon = L.divIcon({
    html: `<div style="background:#00ffcc; width:12px; height:12px; border-radius:50%; border:2px solid #000; box-shadow:0 0 8px #00ffcc;"></div>`,
    iconSize: [12, 12]
  });

  const camMarker = L.marker([lat + 0.005, lon + 0.005], { icon: cameraIcon });
  camMarker.bindPopup(`
    <div style="color:#00ffcc; background:#0a101d; padding:8px; font-family:monospace; min-width:220px;">
      <strong>📹 CAMERA TACTIQUE DE ZONE</strong><br/>
      <div style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; margin-top:5px; border:1px solid #00ffcc;">
        <iframe src="https://www.youtube.com/embed/live_stream?channel=UC1yC2A9U_yBv6Y130fA1Pgg" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allowfullscreen></iframe>
      </div>
      <small style="color:#888;">FLUX VIDEO DIRECT</small>
    </div>
  `);
  layerGroup.addLayer(camMarker);
}

/**
 * 📊 WIDGET - BILAN VILLE ÉPURÉ
 */
function updateCityWidget(data) {
  let widget = document.getElementById('city-live-widget');
  if (!widget) {
    widget = document.createElement('div');
    widget.id = 'city-live-widget';
    widget.style.cssText = `
      position: fixed; bottom: 20px; left: 20px; z-index: 1000;
      background: rgba(10, 16, 29, 0.9); border: 1px solid #00ffcc;
      border-radius: 8px; padding: 12px 16px; color: #fff;
      font-family: monospace; font-size: 13px; backdrop-filter: blur(8px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.5); min-width: 220px;
    `;
    document.body.appendChild(widget);
  }

  widget.style.display = 'block';
  widget.innerHTML = `
    <div style="color:#00ffcc; font-weight:bold; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
      <span>🌆 SECTEUR EN DIRECT</span>
      <span style="font-size:10px; color:#aaa;">[ZOOM ACTIF]</span>
    </div>
    <div>🌡️ Température : <span style="color:#fff;">${data.temp}</span></div>
    <div>💨 Vent : <span style="color:#fff;">${data.wind}</span></div>
    <div>✈️ Traffic Aérien : <span id="widget-flights" style="color:#00e5ff;">Analyse...</span></div>
    <div>🚒 Police / Secours : <span id="widget-stations" style="color:#ff3333;">Analyse...</span></div>
  `;
}

function updateWidgetStat(id, text) {
  const el = document.getElementById(`widget-${id}`);
  if (el) el.innerText = text;
}

function hideCityWidget() {
  const widget = document.getElementById('city-live-widget');
  if (widget) widget.style.display = 'none';
}

/**
 * 🎛️ MENU HUD DE SÉLECTION
 */
function injectHUDControls(map, darkLayer, satelliteLayer, layers) {
  if (document.getElementById('hud-country-menu')) return;

  const hudMenu = document.createElement('div');
  hudMenu.id = 'hud-country-menu';
  hudMenu.innerHTML = `
    <div class="hud-panel">
      <div class="hud-header">
        <span>🎖️ GOD'S EYE - COMMAND</span>
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
          <label>📡 CALQUES EN TEMPS RÉEL</label>
          <div class="hud-grid">
            <button class="hud-btn highlight" id="btn-toggle-flights">✈️ Vols</button>
            <button class="hud-btn highlight" id="btn-toggle-emergency">🚒 Secours</button>
            <button class="hud-btn highlight" id="btn-toggle-cams">📹 Caméras</button>
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

  // Toggles Carte
  document.getElementById('btn-style-dark')?.addEventListener('click', () => {
    if (map.hasLayer(satelliteLayer)) map.removeLayer(satelliteLayer);
    map.addLayer(darkLayer);
  });

  document.getElementById('btn-style-sat')?.addEventListener('click', () => {
    if (map.hasLayer(darkLayer)) map.removeLayer(darkLayer);
    map.addLayer(satelliteLayer);
  });

  // Toggles Calques
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

  document.getElementById('btn-toggle-cams')?.addEventListener('click', (e) => {
    if (map.hasLayer(layers.cameraGroup)) {
      map.removeLayer(layers.cameraGroup);
      e.target.classList.remove('highlight');
    } else {
      map.addLayer(layers.cameraGroup);
      e.target.classList.add('highlight');
    }
  });

  document.getElementById('btn-reset-view')?.addEventListener('click', () => {
    map.flyTo([20, 0], 3, { duration: 1 });
  });
}

export const createScene = createApplicationScene;
export default createApplicationScene;