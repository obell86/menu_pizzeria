// build-menu.js (AGGIORNATO CON IL NUOVO BASE ID)

const fetch = require('node-fetch');
const fs = require('fs');

// --- Configurazione Airtable (CON I TUOI NUOVI DATI) ---
const AIRTABLE_BASE_ID = 'patv7G4CZgIP2tixj'; // <-- NUOVO ID BASE INSERITO QUI
// IMPORTANTE: Leggiamo la chiave segreta dalle variabili d'ambiente di Netlify!
const AIRTABLE_PAT = process.env.AIRTABLE_PAT_KEY; 
const MENU_CATEGORIE_TABLE_NAME = 'Menu_Categorie';
const MENU_ARTICOLI_TABLE_NAME = 'Menu_Articoli';

const fieldMap = {
    menuCategorie: { nome: 'Nome Categoria', ordine: 'Ordine Visualizzazione', attivo: 'Stato Attivo', configurazione: 'Configurazione' },
    menuArticoli: { nome: 'Nome Articolo', prezzo: 'Prezzo', descrizione: 'Descrizione', categoria: 'Categoria', attivo: 'Stato Attivo', configurazione: 'Configurazione' }
};
const configRecordId = 'recK0pTqrdvJWLi9d'; // Se anche questo ID è cambiato, dovrai aggiornarlo

// --- Funzioni Helper (copiate dal tuo script) ---
const getField = (fields, fieldName, defaultValue = null) => { if (!fields) return defaultValue; const value = fields[fieldName]; return (value !== undefined && value !== null && value !== '') ? value : defaultValue; };

// --- FUNZIONE CHE GENERA L'HTML DEL MENU ---
function generateMenuHTML(menuData) {
    if (!menuData || menuData.length === 0) {
        return '<p>Il menu non è disponibile al momento.</p>';
    }
    let menuHTML = '';
    menuData.forEach(category => {
        if (!category.items || category.items.length === 0) return;
        menuHTML += `<div class="menu-category"><h3 class="category-title" tabindex="0">${category.name || '?'}</h3><ul class="item-list" style="max-height: 0; overflow: hidden;">`;
        category.items.forEach(item => {
            let formattedPrice = ''; const priceValue = item.price; if (typeof priceValue === 'number') { formattedPrice = `€${priceValue.toFixed(2)}`; } else if (typeof priceValue === 'string') { formattedPrice = priceValue; }
            menuHTML += `<li class="menu-item"><div class="item-details"><span class="item-name">${item.name || '?'}</span>`;
            if(item.description) { menuHTML += `<p class="item-description">${item.description}</p>`; }
            menuHTML += `</div>`; if(formattedPrice) { menuHTML += `<span class="item-price">${formattedPrice}</span>`; } menuHTML += `</li>`;
        });
        menuHTML += `</ul></div>`;
    });
    return menuHTML;
}


// --- Funzione Principale di Build ---
async function buildMenu() {
    console.log("Inizio processo di build del menu...");

    if (!AIRTABLE_PAT) {
        throw new Error("Errore: La chiave API AIRTABLE_PAT_KEY non è stata impostata nelle variabili d'ambiente!");
    }

    try {
        const headers = { Authorization: `Bearer ${AIRTABLE_PAT}` };
        
        const catAttivoField = fieldMap.menuCategorie.attivo; const catConfigField = fieldMap.menuCategorie.configurazione;
        const itemAttivoField = fieldMap.menuArticoli.attivo; const itemConfigField = fieldMap.menuArticoli.configurazione;
        const catCategoriaField = fieldMap.menuArticoli.categoria;

        const filterFormulaCategoriesSimple = `{${catAttivoField}}=1`;
        const sortOrder = `sort[0][field]=${encodeURIComponent(fieldMap.menuCategorie.ordine)}&sort[0][direction]=asc`;
        const categoriesUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(MENU_CATEGORIE_TABLE_NAME)}?filterByFormula=${encodeURIComponent(filterFormulaCategoriesSimple)}&${sortOrder}`;
        const categoriesResponse = await fetch(categoriesUrl, { headers });
        if (!categoriesResponse.ok) throw new Error(`API Categorie: ${await categoriesResponse.text()}`);
        const categoriesResult = await categoriesResponse.json();
        const allActiveCategories = categoriesResult.records || [];

        const filterFormulaItemsSimple = `{${itemAttivoField}}=1`;
        const itemsUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(MENU_ARTICOLI_TABLE_NAME)}?filterByFormula=${encodeURIComponent(filterFormulaItemsSimple)}`;
        const itemsResponse = await fetch(itemsUrl, { headers });
        if (!itemsResponse.ok) throw new Error(`API Articoli: ${await itemsResponse.text()}`);
        const itemsResult = await itemsResponse.json();
        const allActiveItems = itemsResult.records || [];

        const filteredCategories = allActiveCategories.filter(catRec => {
            const linkedConfigIds = getField(catRec.fields, catConfigField, []);
            return Array.isArray(linkedConfigIds) && linkedConfigIds.includes(configRecordId);
        });

        const filteredItems = allActiveItems.filter(itemRec => {
           const linkedConfigIds = getField(itemRec.fields, itemConfigField, []);
           return Array.isArray(linkedConfigIds) && linkedConfigIds.includes(configRecordId);
        });

        const processedMenuData = filteredCategories.map(catRec => {
            const catId = catRec.id;
            const categoryName = getField(catRec.fields, fieldMap.menuCategorie.nome, 'Categoria Mancante');
            const items = filteredItems
                .filter(itemRec => {
                    const linkedCategoryIds = getField(itemRec.fields, catCategoriaField, []);
                    return Array.isArray(linkedCategoryIds) && linkedCategoryIds.includes(catId);
                })
                .map(itemRec => ({
                    id: itemRec.id,
                    name: getField(itemRec.fields, fieldMap.menuArticoli.nome, 'Nome Mancante'),
                    price: getField(itemRec.fields, fieldMap.menuArticoli.prezzo),
                    description: getField(itemRec.fields, fieldMap.menuArticoli.descrizione, '')
                }));
            return { id: catId, name: categoryName, items: items };
        }).filter(category => category.items.length > 0);

        console.log(`Trovate ${processedMenuData.length} categorie valide.`);

        const finalMenuHTML = generateMenuHTML(processedMenuData);
        const template = fs.readFileSync('menu.template.html', 'utf-8');
        const finalHTML = template.replace('<!-- MENU_CONTENT_PLACEHOLDER -->', finalMenuHTML);
        fs.writeFileSync('menu.html', finalHTML);
        
        console.log("Build completata: menu.html creato con successo!");

    } catch (error) {
        console.error('ERRORE DURANTE LA BUILD:', error);
        process.exit(1);
    }
}

buildMenu();