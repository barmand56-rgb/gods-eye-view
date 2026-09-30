/**
 * OSINT COMMAND CENTER - EXPORT MODULE
 */

export function createApplicationScene(container, options = {}) {
  // 1. Injection des styles
  if (!document.getElementById('osint-crisis-styles')) {
    const style = document.createElement('style');
    style.id = 'osint-crisis-styles';
    style.innerHTML = `
      body, html { background: #050508; color: #00ffcc; font-family: 'Courier New', Courier, monospace; margin: 0; padding: 0; overflow: hidden; height: 100vh; }
      #map { width: 100vw; height: 100vh; background: #020617; }
      
      body::after {
        content: " "; display: block; position: fixed; top: 0; left: 0; bottom: 0; right: 0;
        background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
        z-index: 99999; background-size: 100% 3px, 3px 100%; pointer-events: none;
      }

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

      #osint-ticker {
        position: fixed; bottom: 0; left: 0; width: 100vw; height: 24px;
        background: #020617; border-top: 1px solid rgba(0, 255, 204, 0.4);
        color: #00ffcc; font-size: 11px; line-height: 24px;
        overflow: hidden; z-index: 1001; white-space: nowrap; box-sizing: border-box; padding-left: 10px;
      }

      #osint-ai-panel {
        position: fixed; bottom: 35px; left: 15px; width: 360px; max-height: 300px;
        background: rgba(2, 6, 23, 0.92); border: 1px solid rgba(0, 255, 204, 0.4);
        padding: 12px; z-index: 1000; box-shadow: 0 0 15px rgba(0,0,0,0.8); font-size: 12px;
        overflow-y: auto; border-radius: 4px; color: #00ffcc;
      }
      #osint-ai-panel h3 { margin: 0 0 8px 0; font-size: 13px; color: #f43f5e; border-bottom: 1px dashed rgba(244, 63, 94, 0.4); padding-bottom: 4px; }
      .ai-log-entry { margin-bottom: 6px; border-left: 2px solid #00ffcc; padding-left: 6px; }
    `;
    document.head.appendChild(style);
  }

  // 2. Création des éléments visuels de la salle de crise
  if (!document.getElementById('osint-ticker')) {
    const ticker = document.createElement('div');
    ticker.id = 'osint-ticker';
    ticker.innerHTML = `
      <span style="display:inline-block;">
        ⚡ [STRATCOM] : Système de commandement opérationnel • Surveillance des flux et monopoles active •
      </span>
    `;
    document.body.appendChild(ticker);
  }

  if (!document.querySelector('.osint-radar-sweep')) {
    const radar = document.createElement('div');
    radar.className = 'osint-radar-sweep';
    document.body.appendChild(radar);
  }

  if (!document.getElementById('osint-ai-panel')) {
    const aiPanel = document.createElement('div');
    aiPanel.id = 'osint-ai-panel';
    aiPanel.innerHTML = `
      <h3>TERMINAL ANALYSE IA</h3>
      <div id="ai-log">Système opérationnel. Prêt pour l'investigation géopolitique.</div>
    `;
    document.body.appendChild(aiPanel);
  }

  console.log("Module OSINT chargé avec succès via createApplicationScene.");

  // Objet de retour pour interagir avec la scène si nécessaire
  return {
    destroy() {
      // Nettoyage si besoin
    }
  };
}