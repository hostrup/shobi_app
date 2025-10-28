// DEBUG: Script started.
console.log("DEBUG: script.js (Tailwind v5 - Filters) loaded.");

let allPerfumes = [];
let allBrands = new Map(); 
const state = {
    searchQuery: '',
    favorites: [],
    showingFavorites: false,
    selectedBrand: null,
    // NYT: Objekt til at holde styr på aktive filtre
    activeFilters: {
        gender: [],
        accords: []
    }
};

// --- KERNELOGIK: DATAVISNING ---

/**
 * Viser parfumer i containeren ved at klone en HTML-skabelon.
 * @param {Array} perfumes - Et array af parfume-objekter, der skal vises.
 */
function displayPerfumes(perfumes) {
    const container = document.getElementById('resultsContainer');
    const template = document.getElementById('perfume-card-template');
    const resultsCountEl = document.getElementById('results-count');

    // Nulstil container
    container.innerHTML = '';

    // Opdater tæller
    let countText = `Showing ${perfumes.length}`;
    if (state.selectedBrand) {
        countText += ` result(s) for "${state.selectedBrand}"`;
    } else if (state.showingFavorites) {
        countText += ` favorite(s)`;
    } else {
        countText += ` of ${allPerfumes.length} results`;
    }
    resultsCountEl.textContent = countText + ".";


    if (perfumes.length === 0) {
        container.innerHTML = `<p class="text-gray-600 col-span-full">No perfumes matched your selection.</p>`;
        return;
    }

    // Klon skabelon for hver parfume
    perfumes.forEach(perfume => {
        const p = perfume.item ? perfume.item : perfume; 
        const card = template.content.cloneNode(true);

        const isFavorite = state.favorites.includes(p.code);

        // Udfyld data
        card.querySelector('[data-field="code"]').textContent = p.code;
        card.querySelector('[data-field="inspiredBy"]').textContent = p.inspiredBy;
        card.querySelector('[data-field="brand"]').textContent = p.brand;
        
        const shobiLink = `https://leparfum.com.gr/en/module/iqitsearch/searchiqit?s=${p.code}`;
        card.querySelector('[data-field="shobiLink"]').href = shobiLink;

        // Håndter favoritknap
        const favButton = card.querySelector('.favorite-btn');
        favButton.dataset.code = p.code;
        favButton.innerHTML = isFavorite ? '<i class="fa-solid fa-heart"></i>' : '<i class="fa-regular fa-heart"></i>';
        if (isFavorite) {
            favButton.classList.add('is-favorite');
        }

        // Ikoner
        const audienceIconsContainer = card.querySelector('[data-field="audience-icons"]');
        audienceIconsContainer.innerHTML = getAudienceIcons(p.genderAffinity); 
        const typeIconsContainer = card.querySelector('[data-field="type-icons"]');
        typeIconsContainer.innerHTML = getTypeIcons(p.mainAccords);

        // Sæt data-attributter til klik-handlere
        card.querySelector('[data-action="show-details"]').dataset.code = p.code;
        card.querySelector('[data-action="filter-brand"]').dataset.brand = p.brand;

        container.appendChild(card);
    });

    // Gen-tilføj event listeners
    container.querySelectorAll('.favorite-btn').forEach(btn => 
        btn.addEventListener('click', toggleFavorite)
    );
    container.querySelectorAll('[data-action="show-details"]').forEach(el => 
        el.addEventListener('click', (e) => showPerfumeModal(e.currentTarget.dataset.code))
    );
    container.querySelectorAll('[data-action="filter-brand"]').forEach(btn => 
        btn.addEventListener('click', (e) => handleBrandFilterClick(e.currentTarget.dataset.brand))
    );
}

/**
 * (OMSKREVET) Anvender HELE filterkæden og gen-renderer listen.
 */
function applyFiltersAndRender() {
    let filtered = [...allPerfumes]; // Start med alle

    // --- Filterkæde ---

    // 1. Hovedvisning: Brand eller Favoritter
    if (state.selectedBrand) {
        filtered = filtered.filter(p => p.brand === state.selectedBrand);
    } else if (state.showingFavorites) {
        filtered = filtered.filter(p => state.favorites.includes(p.code));
    }

    // 2. NY: Anvend Gender-filtre
    if (state.activeFilters.gender.length > 0) {
        filtered = filtered.filter(p => {
            const gender = String(p.genderAffinity || '').toLowerCase();
            // Returner true, hvis parfume-genderen matcher ET AF de valgte filtre
            return state.activeFilters.gender.some(filterGender => gender.includes(filterGender));
        });
    }

    // 3. NY: Anvend Accord-filtre
    if (state.activeFilters.accords.length > 0) {
        filtered = filtered.filter(p => {
            const accords = (p.mainAccords || []).map(a => a.toLowerCase());
            // Returner true, hvis parfume-accords inkluderer ALLE de valgte filtre
            return state.activeFilters.accords.every(filterAccord => accords.includes(filterAccord));
        });
    }

    // 4. Anvend Søgefilter (til sidst)
    if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        filtered = filtered.filter(p =>
            String(p.inspiredBy || '').toLowerCase().includes(query) || 
            String(p.brand || '').toLowerCase().includes(query) ||      
            String(p.code || '').toLowerCase().includes(query)           
        );
    }

    // 5. Opdater Brand Info boksen
    displayBrandInfo();

    // 6. Render de filtrerede resultater
    displayPerfumes(filtered);
}

/**
 * Viser info-boksen for det valgte brand.
 */
function displayBrandInfo() {
    const container = document.getElementById('brand-info-container');
    const contentEl = document.getElementById('brand-info-content');

    if (!state.selectedBrand) {
        container.classList.add('hidden');
        return;
    }

    const brandInfo = allBrands.get(state.selectedBrand);
    if (!brandInfo) {
        container.classList.add('hidden');
        return;
    }

    contentEl.innerHTML = `
        <h2 class="text-2xl font-bold text-gray-900">${brandInfo.name}</h2>
        <p class="mt-2 text-gray-700">${brandInfo.description || 'No information available for this brand.'}</p>
    `;
    container.classList.remove('hidden');
}

/**
 * Håndterer klik på en brand-knap.
 */
function handleBrandFilterClick(brandName) {
    state.selectedBrand = brandName;
    state.showingFavorites = false; // Nulstil favoritter

    // Nulstil UI
    document.getElementById('favorites-btn').classList.remove('bg-red-800'); 

    applyFiltersAndRender();
    document.getElementById('brand-info-container').scrollIntoView({ behavior: 'smooth' });
}


// --- IKON-HJÆLPERE (Uændret) ---

function getAudienceIcons(audience) {
    const a = String(audience || '').toLowerCase();
    if (!a) return ''; 
    let icons = '';
    if (a.includes('male') || a.includes('masculine') || a.includes('men')) {
        icons += '<i class="fas fa-mars" title="Masculine"></i>';
    }
    if (a.includes('female') || a.includes('feminine') || a.includes('women')) {
        icons += '<i class="fas fa-venus" title="Feminine"></i>';
    }
    if (a.includes('unisex')) {
        icons += '<i class="fas fa-venus-mars" title="Unisex"></i>';
    }
    return icons;
}

const SCENT_ICON_MAP = {
    'citrus': '<i class="fas fa-lemon" title="Citrus"></i>',
    'woody': '<i class="fas fa-tree" title="Woody"></i>',
    'floral': '<i class="fas fa-fan" title="Floral"></i>',
    'aromatic': '<i class="fas fa-seedling" title="Aromatic"></i>',
    'spicy': '<i class="fas fa-pepper-hot" title="Spicy"></i>',
    'oriental': '<i class="fas fa-feather" title="Oriental/Amber"></i>',
    'amber': '<i class="fas fa-feather" title="Oriental/Amber"></i>',
    'fresh': '<i class="fas fa-wind" title="Fresh"></i>',
    'aquatic': '<i class="fas fa-water" title="Aquatic"></i>',
    'leather': '<i class="fas fa-layer-group" title="Leather"></i>'
};

function getTypeIcons(accords) {
    if (!Array.isArray(accords) || accords.length === 0) return '';
    let iconsHtml = '';
    const addedIcons = new Set();
    const lowerCaseAccords = accords.map(a => a.toLowerCase());
    for (const key in SCENT_ICON_MAP) {
        if (!addedIcons.has(key) && lowerCaseAccords.some(accord => accord.includes(key))) {
            iconsHtml += SCENT_ICON_MAP[key];
            addedIcons.add(key);
        }
    }
    return iconsHtml;
}


// --- KERNELOGIK: FAVORITTER (Uændret) ---

function toggleFavorite(event) {
    event.stopPropagation(); 
    const button = event.currentTarget;
    const code = button.dataset.code;
    const index = state.favorites.indexOf(code);

    if (index > -1) {
        state.favorites.splice(index, 1);
        button.innerHTML = '<i class="fa-regular fa-heart"></i>';
        button.classList.remove('is-favorite');
    } else {
        state.favorites.push(code);
        button.innerHTML = '<i class="fa-solid fa-heart"></i>';
        button.classList.add('is-favorite');
    }

    localStorage.setItem('shobi-favorites', JSON.stringify(state.favorites));
    document.getElementById('favorites-count').textContent = state.favorites.length;

    if (state.showingFavorites) {
        applyFiltersAndRender();
    }
}

function loadFavorites() {
    const savedFavorites = localStorage.getItem('shobi-favorites');
    if (savedFavorites) {
        state.favorites = JSON.parse(savedFavorites);
    }
    document.getElementById('favorites-count').textContent = state.favorites.length;
}

// --- KERNELOGIK: MODAL (Uændret) ---

const modal = document.getElementById('perfume-modal');
const modalContent = document.getElementById('modal-content');
const modalOverlay = document.getElementById('modal-overlay');
const modalCloseBtn = document.getElementById('modal-close-btn');

function showPerfumeModal(code) {
    const perfume = allPerfumes.find(p => p.code === code);
    if (!perfume) return;

    document.getElementById('modal-inspiredBy').textContent = perfume.inspiredBy;
    document.getElementById('modal-brand').textContent = perfume.brand;
    document.getElementById('modal-code').textContent = perfume.code;
    document.getElementById('modal-description').textContent = perfume.description || 'No description available.';
    
    const notesContainer = document.getElementById('modal-notes');
    const topNotes = perfume.notes && Array.isArray(perfume.notes.top) && perfume.notes.top.length > 0
        ? perfume.notes.top.join(', ')
        : null;
    const heartNotes = perfume.notes && Array.isArray(perfume.notes.heart) && perfume.notes.heart.length > 0
        ? perfume.notes.heart.join(', ')
        : null;
    const baseNotes = perfume.notes && Array.isArray(perfume.notes.base) && perfume.notes.base.length > 0
        ? perfume.notes.base.join(', ')
        : null;

    const notesHtml = `
        ${topNotes ? `<p><strong class="text-gray-600">Top:</strong> ${topNotes}</p>` : ''}
        ${heartNotes ? `<p><strong class="text-gray-600">Heart:</strong> ${heartNotes}</p>` : ''}
        ${baseNotes ? `<p><strong class="text-gray-600">Base:</strong> ${baseNotes}</p>` : ''}
    `;
    notesContainer.innerHTML = (topNotes || heartNotes || baseNotes) ? notesHtml : '<p>No note details available.</p>';
    
    document.getElementById('modal-shobiLink').href = `https://leparfum.com.gr/en/module/iqitsearch/searchiqit?s=${perfume.code}`;
    
    modal.classList.remove('invisible');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('opacity-0', '-translate-y-10');
    }, 10);
}

function hidePerfumeModal() {
    modal.classList.add('opacity-0');
    modalContent.classList.add('opacity-0', '-translate-y-10');
    setTimeout(() => {
        modal.classList.add('invisible');
    }, 300); 
}


// --- NY: FILTER-LOGIK ---

/**
 * Opretter og indsætter HTML for alle filtre og tilføjer event listeners.
 */
function populateFilters() {
    const genderContainer = document.getElementById('gender-filters');
    const accordContainer = document.getElementById('accord-filters');
    
    // 1. Byg Gender Filtre (hardkodet)
    const genders = [
        { label: 'Masculine', value: 'masculine' },
        { label: 'Feminine', value: 'feminine' },
        { label: 'Unisex', value: 'unisex' }
    ];
    let genderHtml = '';
    genders.forEach(gender => {
        genderHtml += `
            <label>
                <input type="checkbox" name="gender" value="${gender.value}">
                ${gender.label}
            </label>
        `;
    });
    genderContainer.innerHTML = genderHtml;

    // 2. Byg Accord Filtre (dynamisk)
    // Find alle unikke accords
    const allAccords = new Set(allPerfumes.flatMap(p => (p.mainAccords || [])).map(a => a.toLowerCase()));
    const sortedAccords = [...allAccords].sort();

    let accordHtml = '';
    sortedAccords.forEach(accord => {
        const capitalized = accord.charAt(0).toUpperCase() + accord.slice(1);
        accordHtml += `
            <label>
                <input type="checkbox" name="accord" value="${accord}">
                ${capitalized}
            </label>
        `;
    });
    document.getElementById('accord-loader').remove(); // Fjern loader
    accordContainer.innerHTML = accordHtml;

    // 3. Tilføj Event Listeners til alle tjekbokse
    document.querySelectorAll('#filter-sidebar input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const filterType = e.target.name === 'gender' ? 'gender' : 'accords';
            const value = e.target.value;
            
            if (e.target.checked) {
                // Tilføj til state
                state.activeFilters[filterType].push(value);
            } else {
                // Fjern fra state
                const index = state.activeFilters[filterType].indexOf(value);
                if (index > -1) {
                    state.activeFilters[filterType].splice(index, 1);
                }
            }
            console.log("Filters updated:", state.activeFilters);
            applyFiltersAndRender(); // Gen-render listen
        });
    });
}


// --- INITIALISERING ---

/**
 * Henter data og starter applikationen.
 */
async function init() {
    console.log("DEBUG: init() started.");
    try {
        const response = await fetch('database_complete.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const rawData = await response.json();
        allBrands.clear(); 

        if (rawData.length > 0 && Array.isArray(rawData[0].perfumes)) {
            allPerfumes = rawData.flatMap(brandObject => {
                if (brandObject && Array.isArray(brandObject.perfumes)) {
                    const brandName = brandObject.brandInfo?.name || "Unknown Brand";
                    const brandInfo = brandObject.brandInfo || { name: brandName };
                    if (!allBrands.has(brandName)) {
                        allBrands.set(brandName, brandInfo);
                    }
                    return brandObject.perfumes.map(perfume => ({
                        ...perfume,
                        brand: brandName 
                    }));
                }
                return [];
            });
        } else {
            allPerfumes = rawData; 
        }

        allPerfumes = allPerfumes.filter(p => p && p.code && p.inspiredBy).map(p => ({
            ...p,
            notes: p.notes || { top: [], heart: [], base: [] },
            mainAccords: (p.mainAccords || []).map(a => a.toLowerCase()) // Sikr at mainAccords er et array af små bogstaver
        }));
        
        console.log(`DEBUG: Total valid perfumes loaded: ${allPerfumes.length}`);

    } catch (error) {
        console.error("ERROR: Could not load or parse perfume data:", error);
        document.getElementById('results-count').textContent = `Error: Could not load data.`;
        return;
    }

    loadFavorites();
    populateFilters(); // NY: Byg filtrene
    applyFiltersAndRender(); // Vis den indledende liste
}

// --- EVENT LISTENERS (DOMContentLoade) ---

document.addEventListener('DOMContentLoaded', () => {
    init();

    // Søgefelt-listener (uændret, kalder nu den opdaterede filterfunktion)
    document.getElementById('search-input').addEventListener('input', e => {
        state.searchQuery = e.target.value;
        applyFiltersAndRender();
    });

    // Favoritknap-listener (Nulstiller nu KUN brand-valg)
    document.getElementById('favorites-btn').addEventListener('click', () => {
        state.showingFavorites = !state.showingFavorites;
        state.selectedBrand = null; // Nulstil brand-filter
        
        const btn = document.getElementById('favorites-btn');
        if (state.showingFavorites) {
            btn.classList.add('bg-red-800'); 
        } else {
            btn.classList.remove('bg-red-800'); 
        }
        applyFiltersAndRender();
    });

    // Clear Brand Filter-knap (Nulstiller nu KUN brand-valg)
    document.getElementById('clear-brand-filter').addEventListener('click', () => {
        state.selectedBrand = null;
        applyFiltersAndRender();
    });

    // Modal Lyttere (Uændret)
    modalCloseBtn.addEventListener('click', hidePerfumeModal);
    modalOverlay.addEventListener('click', hidePerfumeModal);
    modalContent.addEventListener('click', (e) => e.stopPropagation());
});
