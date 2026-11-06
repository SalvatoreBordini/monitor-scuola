// CONFIGURAZIONE: Link CSV completo di Google Fogli
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRhm88eN5NYQejIzjKx7H4LGrrm8Xpv85xX-szGbkznPETKtk_gDXhrULWXPqZK4jO9f3RDm6E46r9B/pub?output=csv';

// ==========================================
// 1. GESTIONE OROLOGIO (CON SECONDI) E DATA
// ==========================================
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const clockEl = document.getElementById('orologio') || document.getElementById('current-time');
    if (clockEl) clockEl.textContent = `${hours}:${minutes}:${seconds}`;
    
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateEl = document.getElementById('data') || document.getElementById('current-date');
    if (dateEl) dateEl.textContent = now.toLocaleDateString('it-IT', options);
}
setInterval(updateClock, 1000);
updateClock();

// ==========================================
// 2. PARSER DI CONVERSIONE CSV
// ==========================================
function parseCSV(text) {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0 || !lines) return [];
    
    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : ',';
    
    const headers = firstLine.split(separator).map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const currentline = line.split(separator).map(cell => cell.trim().replace(/"/g, ''));
        const obj = {};
        
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = currentline[j] || '';
        }
        result.push(obj);
    }
    return result;
}

// ==========================================
// 3. CONVERSIONE TESTO DATA IN OGGETTO DATE
// ==========================================
function parseEventDate(dateStr) {
    if (!dateStr) return null;
    
    const mesiIta = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
    const now = new Date();
    let giorno = null;
    let mese = now.getMonth(); 
    let anno = now.getFullYear();

    const matchNumerico = dateStr.match(/(\d+)[\/\-](\d+)/);
    if (matchNumerico) {
        giorno = parseInt(matchNumerico[1], 10);
        mese = parseInt(matchNumerico[2], 10) - 1;
    } else {
        const matchGiorno = dateStr.match(/\d+/);
        if (matchGiorno) giorno = parseInt(matchGiorno[0], 10);
        
        const strMinuscola = dateStr.toLowerCase();
        for (let i = 0; i < mesiIta.length; i++) {
            if (strMinuscola.includes(mesiIta[i])) {
                mese = i;
                break;
            }
        }
    }

    if (giorno === null || isNaN(giorno)) return null;

    if (now.getMonth() === 11 && mese === 0) anno += 1;
    if (now.getMonth() === 0 && mese === 11) anno -= 1;

    return new Date(anno, mese, giorno, 0, 0, 0);
}

// ==========================================
// 4. RECUPERO E RENDER DATI (ANTI-CACHE)
// ==========================================
async function fetchMonitorData() {
    try {
        const finalUrl = GOOGLE_SHEET_CSV_URL + (GOOGLE_SHEET_CSV_URL.includes('?') ? '&' : '?') + 'nocache=' + new Date().getTime();
        const response = await fetch(finalUrl);
        const csvText = await response.text();
        
        const eventi = parseCSV(csvText);
        renderNews(eventi);
    } catch (error) {
        console.error("Errore di sincronizzazione dati:", error);
        const container = document.getElementById('eventi-container') || document.getElementById('news-container');
        if (container) {
            container.innerHTML = '<li class="loading-text">Calendario temporaneamente non disponibile.</li>';
        }
    }
}

function renderNews(eventi) {
    const container = document.getElementById('eventi-container') || document.getElementById('news-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    const eventiValidi = eventi.filter(e => e.titolo && e.data && e.data.toLowerCase() !== 'data');
    
    if (eventiValidi.length === 0) {
        container.innerHTML = '<li class="loading-text">Nessun evento o circolare in bacheca.</li>';
        return;
    }
    
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    
    const dataScadenza = new Date();
    dataScadenza.setDate(oggi.getDate() + 10);
    dataScadenza.setHours(23, 59, 59, 999);

    const eventiProssimiDieciGiorni = eventiValidi.filter(evento => {
        const dataEvento = parseEventDate(evento.data);
        if (!dataEvento) return true; // Se la data non è parsabile, la mostra comunque
        return dataEvento >= oggi && dataEvento <= dataScadenza;
    });

    if (eventiProssimiDieciGiorni.length === 0) {
        container.innerHTML = '<li class="loading-text">Nessun evento previsto nei prossimi 10 giorni.</li>';
        return;
    }
    
    eventiProssimiDieciGiorni.forEach(evento => {
        const data = evento.data || '';
        const titolo = evento.titolo || '';
        const ora = evento.ora || '';
        const luogo = evento.luogo || '';

        const li = document.createElement('li');
        li.className = 'evento-item';
        li.innerHTML = `
            <div class="evento-header">
                <span class="evento-data">${data}</span>
                ${ora ? `<span class="evento-ora">${ora}</span>` : ''}
            </div>
            <div class="evento-testo">${titolo}</div>
            ${luogo ? `<div class="evento-luogo">📍 ${luogo}</div>` : ''}
        `;
        container.appendChild(li);
    });
}

fetchMonitorData();
setInterval(fetchMonitorData, 60000);
