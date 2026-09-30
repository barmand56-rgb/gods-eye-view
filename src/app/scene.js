/**
 * God's Eye - Module Tactique Leaflet avec Caméras et Alertes d'Urgences
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

  // 1. Initialisation de la carte
  const map = L.map('cesiumContainer', {
    center: [20, 0],
    zoom: 3,
    zoomControl: false,
    attributionControl: false
  });

  // Fonds de carte
  const darkLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 16 }
  ).addTo(map);

  const satelliteLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 18 }
  );

  // 2. Groupes de calques pour les Caméras et Urgences
  const cameraGroup = L.layerGroup().addTo(map);
  const emergencyGroup = L.layerGroup().addTo(map);

  // 3. Charger les Caméras et les Urgences
  loadPublicCameras(map, L, cameraGroup);
  loadGlobalEmergencyIncidents(map, L, emergencyGroup);
  startLiveEmergencySimulation(map, L, emergencyGroup);

  // 4. Injecter le menu HUD enrichi
  injectHUDControls(map, darkLayer, satelliteLayer, cameraGroup, emergencyGroup);

  // Simulation pour assurer la compatibilité
  const dummySurface = { globe: {}, enableLighting: false, show: true };
  const dummyCamera = { flyTo: () => {}, flyHome: () => map.flyTo([20, 0], 3) };
  const dummyScene = { surface: dummySurface, globe: dummySurface, camera: dummyCamera };

  return {
    viewer: map,
    scene: dummyScene,
    surface: dummySurface,
    globe: dummySurface,
    camera: dummyCamera,
    map: map,
    destroy: () => map.remove(),
    isDestroyed: () => false
  };
}

/**
 * 📹 CHARGEMENT DES CAMÉRAS DE SURVEILLANCE / WEBCAMS
 */
function loadPublicCameras(map, L, layerGroup) {
  const cameraIcon = L.divIcon({
    className: 'custom-cam-icon',
    html: `<div style="background:#00ffcc; width:12px; height:12px; border-radius:50%; border:2px solid #000; box-shadow:0 0 10px #00ffcc;"></div>`,
    iconSize: [12, 12]
  });

  const cameras = [
    {
      name: "CAM-01 : Paris - Tour Eiffel / Champ de Mars",
      coords: [48.8584, 2.2945],
      streamUrl: "https://www.youtube.com/embed/live_stream?channel=UC1yC2A9U_yBv6Y130fA1Pgg"
    },
    {
      name: "CAM-02 : New York - Times Square Central",
      coords: [40.7580, -73.9855],
      streamUrl: "https://www.youtube.com/embed/1-iS7LArMPA"
    },
    {
      name: "CAM-03 : Tokyo - Shibuya Crossing",
      coords: [35.6595, 139.7004],
      streamUrl: "https://www.youtube.com/embed/H43glf0144k"
    },
    {
      name: "CAM-04 : Dubaï - Downtown / Burj Khalifa",
      coords: [25.1972, 55.2744],
      streamUrl: "https://www.youtube.com/embed/live_stream"
    }
  ];

  cameras.forEach(cam => {
    const marker = L.marker(cam.coords, { icon: cameraIcon });
    const popupContent = `
      <div style="color:#00ffcc; background:#0a101d; padding:10px; border-radius:6px; font-family:monospace; min-width:260px;">
        <strong style="display:block; margin-bottom:6px;">📹 ${cam.name}</strong>
        <div style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border:1px solid #00ffcc;">
          <iframe src="${cam.streamUrl}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allowfullscreen></iframe>
        </div>
        <small style="color:#aaa; display:block; margin-top:5px;">STATUT: FLUX TACTIQUE EN DIRECT</small>
      </div>
    `;
    marker.bindPopup(popupContent);
    layerGroup.addLayer(marker);
  });
}

/**
 * 🚨 CHARGEMENT DES ALERTES D'URGENCES MONDIALES RÉELLES (GDACS API)
 */
async function loadGlobalEmergencyIncidents(map, L, layerGroup) {
  const fireIcon = L.divIcon({
    className: 'custom-fire-icon',
    html: `<div style="background:#ff3333; width:14px; height:14px; border-radius:50%; border:2px solid #fff; box-shadow:0 0 12px #ff3333; animation: pulse 1s infinite;"></div>`,
    iconSize: [14, 14]
  });

  try {
    const response = await fetch('https://www.gdacs.org/gdacsapi/api/events/geteventlist/M');
    const data = await response.json();

    if (data && data.features) {
      data.features.slice(0, 25).forEach(event => {
        const coords = [event.geometry.coordinates[1], event.geometry.coordinates[0]];
        const props = event.properties;
        
        const marker = L.marker(coords, { icon: fireIcon });
        marker.bindPopup(`
          <div style="color:#ff4444; background:#0a101d; padding:10px; border-radius:6px; font-family:monospace;">
            <strong>🚨 INTERVENTION INTERNATIONALE</strong><br/>
            <span>Type : ${props.eventname || 'Incident majeur'}</span><br/>
            <span>Pays : ${props.country || 'Zone Internationale'}</span><br/>
            <span>Niveau d'alerte : ${props.alertlevel || 'ROUGE'}</span>
          </div>
        `);
        layerGroup.addLayer(marker);
      });
    }
  } catch (err) {
    console.warn("API GDACS indisponible, bascule sur le simulateur d'interventions.");
  }
}

/**
 * 🚒 SIMULATEUR EN TEMPS RÉEL DE DISPATCH DES SECOURS (POMPIERS / POLICE / SAMU)
 */
function startLiveEmergencySimulation(map, L, layerGroup) {
  const emergencyTypes = [
    { title: "🚒 Incendie Urbain / Pompiers", color: "#ff4444" },
    { title: "🚑 Urgence Médicale SAMU", color: "#3388ff" },
    { title: "🚓 Intervention Forces de l'Ordre", color: "#ffbb00" },
    { title: "🔥 Départ de Feu de Forêt", color: "#ff6600" }
  ];

  const cities = [
    { name: "Paris", lat: 48.8566, lon: 2.3522 },
    { name: "Marseille", lat: 43.2965, lon: 5.3698 },
    { name: "New York", lat: 40.7128, lon: -74.0060 },
    { name: "Londres", lat: 51.5074, lon: -0.1278 },
    { name: "Tokyo", lat: 35.6762, lon: 139.6503 }
  ];

  // Génère une nouvelle intervention toutes les 8 secondes
  setInterval(() => {
    const city = cities[Math.floor(Math.random() * cities.length)];
    const type = emergencyTypes[Math.floor(Math.random() * emergencyTypes.length)];
    
    // Décalage aléatoire autour de la ville
    const lat = city.lat + (Math.random() - 0.5) * 0.1;
    const lon = city.lon + (Math.random() - 0.5) * 0.1;

    const icon = L.divIcon({
      html: `<div style="background:${type.color}; width:12px; height:12px; border-radius:50%; border:2px solid #fff; box-shadow:0 0 10px ${type.color};"></div>`,
      iconSize: [12, 12]
    });

    const marker = L.marker([lat, lon], { icon }).bindPopup(`
      <div style="color:#fff; background:#0a101d; padding:10px; border-radius:6px; font-family:monospace;">
        <strong style="color:${type.color};">${type.title}</strong><br/>
        <span>Secteur : ${city.name}</span><br/>
        <small style="color:#aaa;">DISPATCH SECOURS EN COURS</small>
      </div>
    `);

    layerGroup.addLayer(marker);
  }, 8000);
}

/**
 * 🎛️ MENU HUD AVEC CONTRÔLE DES CALQUES (CAMÉRAS / URGENCES)
 */
function injectHUDControls(map, darkLayer, satelliteLayer, cameraGroup, emergencyGroup) {
  if (document.getElementById('hud-country-menu')) return;

  const hudMenu = document.createElement('div');
  hudMenu.id = 'hud-country-menu';
  hudMenu.innerHTML = `
    <div class="hud-panel">
      <div class="hud-header">
        <span>🎖️ GOD'S EYE - TACTICAL DISPATCH</span>
        <button id="hud-toggle-btn">☰</button>
      </div>
      <div class="hud-body" id="hud-body">
        
        <div class="hud-section">
          <label>🎨 STYLE DE CARTE</label>
          <div class="hud-grid">
            <button class="hud-btn highlight" id="btn-style-dark">🕶️ Sombre</button>
            <button class="hud-btn" id="btn-style-sat">🛰️ Satellite</button>
          </div>
        </div>

        <div class="hud-section">
          <label>📡 CALQUES D'ACQUISITION</label>
          <div class="hud-grid">
            <button class="hud-btn highlight" id="btn-toggle-cams">📹 Caméras</button>
            <button class="hud-btn highlight" id="btn-toggle-emergencies">🚨 Urgences</button>
          </div>
        </div>

        <div class="hud-section">
          <label>SÉLECTEUR DE PAYS</label>
          <select id="country-select" class="hud-select">
            <option value="">-- Choisir un pays --</option>
            <option value="48.8566,2.3522,6">🇫🇷 France</option>
            <option value="37.0902,-95.7129,4">🇺🇸 États-Unis</option>
            <option value="36.2048,138.2529,5">🇯🇵 Japon</option>
            <option value="25.2048,55.2708,8">🇦🇪 Émirats Arabes Unis</option>
          </select>
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

  // Contrôle des cartes
  document.getElementById('btn-style-dark')?.addEventListener('click', () => {
    if (map.hasLayer(satelliteLayer)) map.removeLayer(satelliteLayer);
    map.addLayer(darkLayer);
  });

  document.getElementById('btn-style-sat')?.addEventListener('click', () => {
    if (map.hasLayer(darkLayer)) map.removeLayer(darkLayer);
    map.addLayer(satelliteLayer);
  });

  // Toggle Caméras
  document.getElementById('btn-toggle-cams')?.addEventListener('click', (e) => {
    if (map.hasLayer(cameraGroup)) {
      map.removeLayer(cameraGroup);
      e.target.classList.remove('highlight');
    } else {
      map.addLayer(cameraGroup);
      e.target.classList.add('highlight');
    }
  });

  // Toggle Urgences
  document.getElementById('btn-toggle-emergencies')?.addEventListener('click', (e) => {
    if (map.hasLayer(emergencyGroup)) {
      map.removeLayer(emergencyGroup);
      e.target.classList.remove('highlight');
    } else {
      map.addLayer(emergencyGroup);
      e.target.classList.add('highlight');
    }
  });

  document.getElementById('country-select')?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (!val) return;
    const [lat, lon, zoom] = val.split(',').map(Number);
    map.flyTo([lat, lon], zoom, { duration: 1.5 });
  });

  document.getElementById('btn-reset-view')?.addEventListener('click', () => {
    map.flyTo([20, 0], 3, { duration: 1 });
  });
}

export const createScene = createApplicationScene;
export default createApplicationScene;