// DEBUG: Script started.
console.log("DEBUG: script.js (Tailwind v3 - Fixes) loaded.");

let allPerfumes = [];
let allBrands = new Map(); // Til at gemme brand-information
const state = {
    searchQuery: '',
    favorites: [],
    showingFavorites: false,
    selectedBrand: null // Til at spore valgt brand
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
    if (state.selectedBrand) {
        resultsCountEl.textContent = `Showing ${perfumes.length} result(s) for "${state.selectedBrand}".`;
    } else if (state.showingFavorites) {
        resultsCountEl.textContent = `Showing ${perfumes.length} favorite(s).`;
    } else {
        resultsCountEl.textContent = `Showing ${perfumes.length} of ${allPerfumes.length} results.`;
    }

    if (perfumes.length === 0) {
        container.innerHTML = `<p class="text-gray-600 col-span-full">${state.showingFavorites ? 'You have no favorites.' : 'No perfumes matched your search.'}</p>`;
        return;
    }

    // Klon skabelon for hver parfume
    perfumes.forEach(perfume => {
        const p = perfume.item ? perfume.item : perfume; // Håndter data fra 'item'
        const card = template.content.cloneNode(true);

        const isFavorite = state.favorites.includes(p.code);

        // Udfyld data
        card.querySelector('[data-field="code"]').textContent = p.code;
        card.querySelector('[data-field="inspiredBy"]').textContent = p.inspiredBy;
        card.querySelector('[data-field="brand"]').textContent = p.brand;
        
        // Sæt Shobi-link
        const shobiLink = `https://leparfum.com.gr/en/module/iqitsearch/searchiqit?s=${p.code}`;
        card.querySelector('[data-field="shobiLink"]').href = shobiLink;

        // Håndter favoritknap
        const favButton = card.querySelector('.favorite-btn');
        favButton.dataset.code = p.code;
        favButton.innerHTML = isFavorite ? '<i class="fa-solid fa-heart"></i>' : '<i class="fa-regular fa-heart"></i>';
        if (isFavorite) {
            favButton.classList.add('is-favorite');
        }

        // --- IKONER (OPDATERET) ---
        // Håndter Audience Ikoner
        const audienceIconsContainer = card.querySelector('[data-field="audience-icons"]');
        audienceIconsContainer.innerHTML = getAudienceIcons(p.audience);

        // NY: Håndter Type Ikoner
        const typeIconsContainer = card.querySelector('[data-field="type-icons"]');
        typeIconsContainer.innerHTML = getTypeIcons(p.type);
        // --- SLUT IKONER ---

        // Sæt data-attributter til klik-handlere
        card.querySelector('[data-action="show-details"]').dataset.code = p.code;
        card.querySelector('[data-action="filter-brand"]').dataset.brand = p.brand;

        container.appendChild(card);
    });

    // Gen-tilføj event listeners til de nye elementer
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
 * Anvender de nuværende filtre (brand, favoritter, søgning) og gen-renderer listen.
 */
function applyFiltersAndRender() {
    let filtered = [...allPerfumes]; // Start med alle

    // Prioriteret filtrering:
    // 1. Er et Brand valgt?
    if (state.selectedBrand) {
        filtered = filtered.filter(p => p.brand === state.selectedBrand);
    } 
    // 2. Ellers, viser vi favoritter?
    else if (state.showingFavorites) {
        // VIGTIGT: Start fra allPerfumes, ikke 'filtered'
        filtered = allPerfumes.filter(p => state.favorites.includes(p.code));
    }

    // 3. Anvend søgefilter OVENPÅ resultatet af (1) eller (2)
    if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        filtered = filtered.filter(p =>
            String(p.inspiredBy || '').toLowerCase().includes(query) || // Parfumenavn
            String(p.brand || '').toLowerCase().includes(query) ||      // Firma
            String(p.code || '').toLowerCase().includes(query)           // Shobi Kode
        );
    }

    // 4. Opdater Brand Info boksen (vil skjule sig selv, hvis state.selectedBrand er null)
    displayBrandInfo();

    // 5. Render de filtrerede resultater
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

    // Udfyld og vis boksen
    contentEl.innerHTML = `
        <h2 class="text-2xl font-bold text-gray-900">${brandInfo.name}</h2>
        <p class="mt-2 text-gray-700">${brandInfo.description || 'No information available for this brand.'}</p>
    `;
    container.classList.remove('hidden');
}

/**
 * Håndterer klik på en brand-knap.
 * @param {string} brandName - Navnet på det brand, der blev klikket på.
 */
function handleBrandFilterClick(brandName) {
    // Sæt state
    state.selectedBrand = brandName;
    state.searchQuery = ''; // Nulstil søgning
    state.showingFavorites = false; // Slå favoritter fra

    // Nulstil UI
    document.getElementById('search-input').value = '';
    document.getElementById('favorites-btn').classList.remove('bg-red-800'); // Deaktiver favorit-knap visuelt

    // Gen-render
    applyFiltersAndRender();
    
    // Scroll op til brand-infoen
    document.getElementById('brand-info-container').scrollIntoView({ behavior: 'smooth' });
}


// --- IKON-HJÆLPERE ---

/**
 * (ROBUST) Returnerer HTML-strenge for audience-ikoner.
 * @param {string | undefined} audience - Audience-strengen (f.eks. "Male", "Female", "Unisex")
 */
function getAudienceIcons(audience) {
    // Gør funktionen robust overfor null/undefined/ikke-strenge
    const a = String(audience || '').toLowerCase();
    if (!a) return ''; // Retur tom streng, hvis audience er tom eller null
    
    let icons = '';

    if (a.includes('male') || a.includes('men')) {
        icons += '<i class="fas fa-mars" title="Male"></i>';
    }
    if (a.includes('female') || a.includes('women')) {
        icons += '<i class="fas fa-venus" title="Female"></i>';
    }
    if (a.includes('unisex')) {
        icons += '<i class="fas fa-venus-mars" title="Unisex"></i>';
    }
    
    return icons;
}

/**
 * NY: Mapning af duft-keywords til Font Awesome ikoner.
 */
const SCENT_ICON_MAP = {
    'citrus': '<i class="fas fa-lemon" title="Citrus"></i>',
    'woody': '<i class="fas fa-tree" title="Woody"></i>',
    'floral': '<i class="fas fa-fan" title="Floral"></i>', // 'fan' bruges ofte til 'aromatic/floral'
    'aromatic': '<i class="fas fa-seedling" title="Aromatic"></i>',
    'spicy': '<i class="fas fa-pepper-hot" title="Spicy"></i>',
    'oriental': '<i class="fas fa-feather" title="Oriental"></i>',
    'fresh': '<i class="fas fa-wind" title="Fresh"></i>',
    'aquatic': '<i class="fas fa-water" title="Aquatic"></i>',
    'leather': '<i class="fas fa-layer-group" title="Leather"></i>'
};

/**
 * NY: Returnerer HTML-strenge for dufttype-ikoner.
 * @param {string | undefined} type - Type-strengen (f.eks. "Citrus Aromatic")
 */
function getTypeIcons(type) {
    const typeString = String(type || '').toLowerCase();
    if (!typeString) return '';

    let iconsHtml = '';
    // Brug et Set for at sikre, at vi kun tilføjer hvert ikon én gang
    const addedIcons = new Set();

    for (const key in SCENT_ICON_MAP) {
        if (typeString.includes(key) && !addedIcons.has(key)) {
            iconsHtml += SCENT_ICON_MAP[key];
            addedIcons.add(key);
        }
    }
    return iconsHtml;
}


// --- KERNELOGIK: FAVORITTER ---

function toggleFavorite(event) {
    event.stopPropagation(); // Stop klikket fra at åbne modalen
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

// --- KERNELOGIK: MODAL ---

const modal = document.getElementById('perfume-modal');
const modalContent = document.getElementById('modal-content');
const modalOverlay = document.getElementById('modal-overlay');
const modalCloseBtn = document.getElementById('modal-close-btn');

/**
 * Viser detalje-modalen for en specifik parfume.
 * @param {string} code - Shobi-koden for parfumen.
 */
function showPerfumeModal(code) {
    const perfume = allPerfumes.find(p => p.code === code);
    if (!perfume) return;

    // Udfyld modal-indhold
    document.getElementById('modal-inspiredBy').textContent = perfume.inspiredBy;
    document.getElementById('modal-brand').textContent = perfume.brand;
    document.getElementById('modal-code').textContent = perfume.code;
    document.getElementById('modal-description').textContent = perfume.description || 'No description available.';
    
    // Byg noter
    const notesHtml = `
        ${perfume.notes_top ? `<p><strong class="text-gray-600">Top:</strong> ${perfume.notes_top}</p>` : ''}
        ${perfume.notes_heart ? `<p><strong class="text-gray-600">Heart:</strong> ${perfume.notes_heart}</p>` : ''}
        ${perfume.notes_base ? `<p><strong class="text-gray-600">Base:</strong> ${perfume.notes_base}</p>` : ''}
    `;
    const notesContainer = document.getElementById('modal-notes');
    notesContainer.innerHTML = notesHtml || '<p>No note details available.</p>';
    
    // Sæt "Køb"-link
    document.getElementById('modal-shobiLink').href = `https://leparfum.com.gr/en/module/iqitsearch/searchiqit?s=${perfume.code}`;
    
    // Vis modalen med overgange
    modal.classList.remove('invisible');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('opacity-0', '-translate-y-10');
    }, 10); // Lille forsinkelse for at sikre, at CSS-overgange starter
}

/**
 * Skjuler detalje-modalen.
 */
function hidePerfumeModal() {
    modal.classList.add('opacity-0');
    modalContent.classList.add('opacity-0', '-translate-y-10');
    setTimeout(() => {
        modal.classList.add('invisible');
    }, 300); // Matcher overgangs-varigheden (duration-300)
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
        
        allBrands.clear(); // Nulstil brand-mappet

        // Datatransformation: Flad databasen OG gem brand-info
        if (rawData.length > 0 && Array.isArray(rawData[0].perfumes)) {
            allPerfumes = rawData.flatMap(brandObject => {
                if (brandObject && Array.isArray(brandObject.perfumes)) {
                    const brandName = brandObject.brandInfo?.name || "Unknown Brand";
                    const brandInfo = brandObject.brandInfo || { name: brandName };

                    // Gem brand-info i mappet
                    if (!allBrands.has(brandName)) {
                        allBrands.set(brandName, brandInfo);
                    }

                    return brandObject.perfumes.map(perfume => ({
                        ...perfume,
                        brand: brandName // Tilføj brandnavn til hver parfume
                    }));
                }
                return [];
            });
        } else {
            allPerfumes = rawData; // Fallback
        }

        allPerfumes = allPerfumes.filter(p => p && p.code && p.inspiredBy);
        console.log(`DEBUG: Total valid perfumes loaded: ${allPerfumes.length}`);
        console.log(`DEBUG: Total unique brands loaded: ${allBrands.size}`);

    } catch (error) {
        console.error("ERROR: Could not load or parse perfume data:", error);
        document.getElementById('results-count').textContent = `Error: Could not load data.`;
        return;
    }

    loadFavorites();
    applyFiltersAndRender();
}

// --- EVENT LISTENERS (DOMContentLoade) ---

document.addEventListener('DOMContentLoaded', () => {
    init();

    // Søgefelt-listener
    document.getElementById('search-input').addEventListener('input', e => {
        state.searchQuery = e.target.value;
        // Når brugeren søger, nulstilles brand- og favoritfiltre
        state.showingFavorites = false;
        state.selectedBrand = null;
        document.getElementById('favorites-btn').classList.remove('bg-red-800');
        
        applyFiltersAndRender();
    });

    // Favoritknap-listener
    document.getElementById('favorites-btn').addEventListener('click', () => {
        state.showingFavorites = !state.showingFavorites;
        
        // Nulstil andre filtre
        state.searchQuery = '';
        state.selectedBrand = null;
        document.getElementById('search-input').value = '';
        
        // Visuel opdatering
        const btn = document.getElementById('favorites-btn');
        if (state.showingFavorites) {
            btn.classList.add('bg-red-800'); // Aktiv tilstand
        } else {
            btn.classList.remove('bg-red-800'); // Standard tilstand
        }

        applyFiltersAndRender();
    });

    // Clear Brand Filter-knap
    document.getElementById('clear-brand-filter').addEventListener('click', () => {
        state.selectedBrand = null;
        applyFiltersAndRender();
    });

    // Modal Lyttere
    modalCloseBtn.addEventListener('click', hidePerfumeModal);
    modalOverlay.addEventListener('click', hidePerfumeModal);
    
    // Stop klik inde i modalen fra at lukke den (hvis den bobler op til overlay)
    modalContent.addEventListener('click', (e) => e.stopPropagation());
});
