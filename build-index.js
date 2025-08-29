// build-index.js (Traduzione completa dello script originale)

const fetch = require('node-fetch');
const fs = require('fs');

// --- Configurazione Airtable ---
const AIRTABLE_BASE_ID = 'patv7G4CZgIP2tixj'; // NUOVO ID BASE
const AIRTABLE_PAT = process.env.AIRTABLE_PAT_KEY;
const CONFIG_TABLE_NAME = 'Configurazione';
const LINKS_TABLE_NAME = 'Links';

// --- Mappatura Campi ---
const fieldMap = {
    config: {
        title: 'Titolo Pagina', titleSize: 'Dimensione Titolo', logoUrl: 'Logo',
        footerImageAlt: 'Alt Img Footer', footerImageUrl: 'Immagine Footer', backgroundUrl: 'Sfondo',
        showLoader: 'Mostra Loader', loaderText: 'Testo Loader',
        showCountdown: 'Mostra Countdown', countdownTarget: 'Data Target Countdown', countdownLabel: 'Etichetta Countdown',
        linkedLinks: 'Link Attivi'
    },
    links: { label: 'Etichetta', url: 'Scrivi URL', color: 'Scrivi Colore Pulsante' }
};
const defaultButtonColor = 'linear-gradient(180deg, #8a6d3b 0%, #6a512f 100%)';
const defaultBackgroundTexture = "url('https://www.transparenttextures.com/patterns/dark-wood.png')";

// --- Funzioni Helper ---
const getField = (fields, fieldName, defaultValue = null) => { if (!fields) return defaultValue; const value = fields[fieldName]; return (value !== undefined && value !== null && value !== '') ? value : defaultValue; };
const getAttachmentUrl = (fields, fieldName) => { const attach = getField(fields, fieldName); if (Array.isArray(attach) && attach.length > 0) { const first = attach[0]; if (first.thumbnails && first.thumbnails.large) { return first.thumbnails.large.url; } return first.url; } return null; };

async function buildIndex() {
    console.log("Inizio build completa della pagina principale...");
    if (!AIRTABLE_PAT) throw new Error("Errore: La chiave API AIRTABLE_PAT_KEY non è impostata!");

    try {
        const headers = { Authorization: `Bearer ${AIRTABLE_PAT}` };
        
        const configUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(CONFIG_TABLE_NAME)}?maxRecords=1`;
        const configResponse = await fetch(configUrl, { headers });
        if (!configResponse.ok) throw new Error(`API Config Error: ${await configResponse.text()}`);
        const configResult = await configResponse.json();
        if (!configResult.records || configResult.records.length === 0) throw new Error("Nessun record Configurazione trovato.");
        const configFields = configResult.records[0].fields;

        // --- PREPARAZIONE DATI PER IL TEMPLATE ---

        // 1. Sfondo
        let videoSrc = '', videoDisplay = 'none', containerStyle = `background-image: ${defaultBackgroundTexture}; background-repeat: repeat;`;
        const bgAttach = getField(configFields, fieldMap.config.backgroundUrl);
        if (Array.isArray(bgAttach) && bgAttach.length > 0) {
            const first = bgAttach[0];
            if (first.type && first.url) {
                if (first.type.startsWith('video/')) {
                    videoSrc = first.url; videoDisplay = 'block'; containerStyle = 'background-color: #3a2d27;';
                } else if (first.type.startsWith('image/')) {
                    containerStyle = `background-image: url('${getAttachmentUrl(configFields, fieldMap.config.backgroundUrl)}'); background-size: cover; background-position: center center; background-repeat: no-repeat;`;
                }
            }
        }

        // 2. Titolo
        const pageTitle = getField(configFields, fieldMap.config.title, 'Benvenuti');
        const titleSize = getField(configFields, fieldMap.config.titleSize, '');
        const titleStyle = titleSize ? `style="font-size: ${titleSize};"` : '';

        // 3. Logo
        const logoUrl = getAttachmentUrl(configFields, fieldMap.config.logoUrl);
        const logoHTML = logoUrl ? `<img src="${logoUrl}" alt="Logo">` : '';

        // 4. Countdown
        const showCountdown = getField(configFields, fieldMap.config.showCountdown, false);
        const countdownTarget = getField(configFields, fieldMap.config.countdownTarget);
        const countdownLabel = getField(configFields, fieldMap.config.countdownLabel, '');
        let countdownHTML = '';
        if (showCountdown && countdownTarget) {
            countdownHTML = `
                <div id="countdown-container">
                    <p id="countdown-label">${countdownLabel}</p>
                    <div id="countdown-timer" data-target-date="${countdownTarget}">
                        <span id="days">00</span><span id="hours">00</span><span id="minutes">00</span><span id="seconds">00</span>
                    </div>
                    <p id="countdown-message" style="display: none;"></p>
                </div>`;
        }
        
        // 5. Loader
        const showLoader = getField(configFields, fieldMap.config.showLoader, false);
        const loaderText = getField(configFields, fieldMap.config.loaderText, 'Caricamento...');
        let loaderHTML = '';
        if(showLoader) {
            loaderHTML = `<div class="loader-container" id="loader"><div class="loader-bar"></div><span id="loading-text-container">${loaderText}</span></div>`;
        }

        // 6. Link
        const linkedLinkIds = getField(configFields, fieldMap.config.linkedLinks, []);
        let linksHTML = '';
        if (linkedLinkIds.length > 0) {
            const recordIdFilter = linkedLinkIds.map(id => `RECORD_ID()='${id}'`).join(',');
            const linksUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(LINKS_TABLE_NAME)}?filterByFormula=OR(${recordIdFilter})`;
            const linksResponse = await fetch(linksUrl, { headers });
            if (linksResponse.ok) {
                const linksResult = await linksResponse.json();
                const linksById = linksResult.records.reduce((acc, rec) => { acc[rec.id] = rec.fields; return acc; }, {});
                const linksData = linkedLinkIds.map(id => linksById[id]).filter(Boolean);
                linksHTML = linksData.map(link => {
                    const url = getField(link, 'Scrivi URL', '#');
                    const label = getField(link, 'Etichetta', 'Link');
                    const color = getField(link, 'Scrivi Colore Pulsante', defaultButtonColor);
                    const isMenu = url.toLowerCase().includes('menu.html');
                    return `<a href="${url}" class="link-button ${isMenu ? 'menu-button-highlight' : ''}" target="${isMenu ? '_top' : '_blank'}" rel="${isMenu ? '' : 'noopener noreferrer'}" style="background: ${color};">${label}</a>`;
                }).join('\n');
            }
        }
        if (!linksHTML) linksHTML = '<p>Nessun link disponibile.</p>';
        
        // 7. Immagine Footer
        const footerImageUrl = getAttachmentUrl(configFields, fieldMap.config.footerImageUrl);
        const footerImageAlt = getField(configFields, fieldMap.config.footerImageAlt, '');
        const footerImageHTML = footerImageUrl ? `<img src="${footerImageUrl}" alt="${footerImageAlt}">` : '';

        // --- APPLICA TUTTO AL TEMPLATE ---
        const template = fs.readFileSync('index.template.html', 'utf-8');
        const finalHTML = template
            .replace('<!-- PAGE_TITLE_PLACEHOLDER -->', pageTitle)
            .replace('<!-- LOGO_PLACEHOLDER -->', logoHTML)
            .replace('<!-- TITLE_PLACEHOLDER -->', `<h1 id="page-title" ${titleStyle}>${pageTitle}</h1>`)
            .replace('<!-- COUNTDOWN_PLACEHOLDER -->', countdownHTML)
            .replace('<!-- LOADER_PLACEHOLDER -->', loaderHTML)
            .replace('<!-- LINKS_PLACEHOLDER -->', linksHTML)
            .replace('<!-- FOOTER_IMAGE_PLACEHOLDER -->', footerImageHTML)
            .replace('<!-- CONTAINER_STYLE_PLACEHOLDER -->', containerStyle)
            .replace('<!-- VIDEO_SRC_PLACEHOLDER -->', videoSrc)
            .replace('<!-- VIDEO_DISPLAY_PLACEHOLDER -->', videoDisplay);

        fs.writeFileSync('index.html', finalHTML);
        console.log("Build index.html completata con TUTTA la logica originale!");

    } catch (error) {
        console.error('ERRORE build index:', error);
        process.exit(1);
    }
}

buildIndex();