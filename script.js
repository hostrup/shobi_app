// DEBUG: Script started.
console.log("DEBUG: script.js (Tailwind v7 - Clickable Icons & Boost Guide) loaded.");

let allPerfumes = [];
let allBrands = new Map(); 
const state = {
    searchQuery: '',
    favorites: [],
    showingFavorites: false,
    selectedBrand: null,
    activeFilters: {
        gender: [],
        accords: [],
        season: [],
        occasion: []
    }
};

// NYE KONSTANTER til Boost Guide
const LIGHT_ACCORDS = ['fresh', 'aquatic', 'citrus', 'aromatic', 'floral'];
const HEAVY_ACCORDS = ['gourmand', 'oriental', 'amber', 'spicy', 'leather', 'woody'];

// --- KERNELOGIK: DATAVISNING ---

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
        // NYT: Udfyld beskrivelse
        card.querySelector('[data-field="description"]').textContent = p.description || '';
        
        const shobiLink = `https://leparfum.com.gr/en/module/iqitsearch/searchiqit?s=${p.code}`;
        card.querySelector('[data-field="shobiLink"]').href = shobiLink;

        // Håndter favoritknap
        const favButton = card.querySelector('.favorite-btn');
        favButton.dataset.code = p.code;
        favButton.innerHTML = isFavorite ? '<i class="fa-solid fa-heart"></i>' : '<i class="fa-regular fa-heart"></i>';
        if (isFavorite) favButton.classList.add('is-favorite');

        // Ikoner (nu klikbare)
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
    // NYT: Listener til ikon-filtre
    container.querySelectorAll('[data-action="filter-icon"]').forEach(btn => 
        btn.addEventListener('click', (e) => {
            const el = e.currentTarget;
            handleIconFilterClick(el.dataset.filterType, el.dataset.filterValue);
        })
    );
}

/**
 * Anvender HELE filterkæden og gen-renderer listen. (Logik uændret)
 */
function applyFiltersAndRender() {
    let filtered = [...allPerfumes]; // Start med alle

    // --- Filterkæde ---
    // 1. Hovedvisning
    if (state.selectedBrand) {
        filtered = filtered.filter(p => p.brand === state.selectedBrand);
    } else if (state.showingFavorites) {
        filtered = filtered.filter(p => state.favorites.includes(p.code));
    }
    // 2. Gender
    if (state.activeFilters.gender.length > 0) {
        filtered = filtered.filter(p => {
            const gender = String(p.genderAffinity || '').toLowerCase();
            return state.activeFilters.gender.some(filterGender => gender.includes(filterGender));
        });
    }
    // 3. Season
    if (state.activeFilters.season.length > 0) {
        filtered = filtered.filter(p => {
            const seasons = (p.bestSuitedFor.season || []).map(s => s.toLowerCase());
            return state.activeFilters.season.some(filterSeason => seasons.includes(filterSeason));
        });
    }
    // 4. Occasion
    if (state.activeFilters.occasion.length > 0) {
        filtered = filtered.filter(p => {
            const occasions = (p.bestSuitedFor.occasion || []).map(o => o.toLowerCase());
            return state.activeFilters.occasion.some(filterOccasion => occasions.includes(filterOccasion));
        });
    }
    // 5. Accords
    if (state.activeFilters.accords.length > 0) {
        filtered = filtered.filter(p => {
            const accords = (p.mainAccords || []).map(a => a.toLowerCase());
            return state.activeFilters.accords.every(filterAccord => accords.includes(filterAccord));
        });
    }
    // 6. Søgning
    if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        filtered = filtered.filter(p =>
            String(p.inspiredBy || '').toLowerCase().includes(query) || 
            String(p.brand || '').toLowerCase().includes(query) ||      
            String(p.code || '').toLowerCase().includes(query)           
        );
    }
    // 7. Opdater Brand Info
    displayBrandInfo();
    // 8. Render
    displayPerfumes(filtered);
}

/**
 * Viser info-boksen for det valgte brand. (Uændret)
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
 * Håndterer klik på en brand-knap. (Uændret)
 */
function handleBrandFilterClick(brandName) {
    state.selectedBrand = brandName;
    state.showingFavorites = false; 
    document.getElementById('favorites-btn').classList.remove('bg-red-800'); 
    applyFiltersAndRender();
    document.getElementById('brand-info-container').scrollIntoView({ behavior: 'smooth' });
}

/**
 * NYT: Håndterer klik på et ikon-filter på et kort.
 * @param {string} filterType - 'gender' eller 'accord'
 * @param {string} filterValue - Værdien der skal aktiveres (f.eks. 'feminine' eller 'citrus')
 */
function handleIconFilterClick(filterType, filterValue) {
    // Ret 'accord' til 'accords' for at matche state-nøglen
    const stateKey = filterType === 'accord' ? 'accords' : filterType;

    // Find den tilsvarende tjekboks i sidebaren
    const checkbox = document.querySelector(`#filter-sidebar input[name="${filterType}"][value="${filterValue}"]`);
    
    if (checkbox && !checkbox.checked) {
        // Marker den
        checkbox.checked = true;
        
        // Opdater state manuelt (som om brugeren klikkede på tjekboksen)
        if (!state.activeFilters[stateKey].includes(filterValue)) {
            state.activeFilters[stateKey].push(filterValue);
        }
        
        // Gen-render
        applyFiltersAndRender();
    }
}

// --- IKON-HJÆLPERE (OPDATERET) ---

/**
 * (OPDATERET) Returnerer klikbare ikoner med farve.
 */
function getAudienceIcons(audience) {
    const a = String(audience || '').toLowerCase();
    if (!a) return ''; 
    let icons = []; // Brug et array til at bygge
    
    const iconMap = {
        'masculine': { value: 'masculine', html: '<i class="fas fa-mars text-blue-600" title="Masculine"></i>' },
        'feminine': { value: 'feminine', html: '<i class="fas fa-venus text-red-600" title="Feminine"></i>' },
        'unisex': { value: 'unisex', html: '<i class="fas fa-venus-mars text-green-600" title="Unisex"></i>' }
    };
    
    if (a.includes('male') || a.includes('masculine') || a.includes('men')) icons.push(iconMap.masculine);
    if (a.includes('female') || a.includes('feminine') || a.includes('women')) icons.push(iconMap.feminine);
    if (a.includes('unisex')) icons.push(iconMap.unisex);

    // Pak hver ikon ind i en klikbar span
    return icons.map(icon => 
        `<span data-action="filter-icon" data-filter-type="gender" data-filter-value="${icon.value}">${icon.html}</span>`
    ).join(' ');
}

/**
 * (OPDATERET) Mapning af duft-keywords til ikoner MED FARVE.
 */
const SCENT_ICON_MAP = {
    'citrus': { icon: '<i class="fas fa-lemon text-yellow-500" title="Citrus"></i>', value: 'citrus' },
    'woody': { icon: '<i class="fas fa-tree text-amber-700" title="Woody"></i>', value: 'woody' },
    'floral': { icon: '<i class="fas fa-fan text-pink-400" title="Floral"></i>', value: 'floral' },
    'aromatic': { icon: '<i class="fas fa-seedling text-lime-600" title="Aromatic"></i>', value: 'aromatic' },
    'spicy': { icon: '<i class="fas fa-pepper-hot text-orange-600" title="Spicy"></i>', value: 'spicy' },
    'oriental': { icon: '<i class="fas fa-feather text-purple-500" title="Oriental/Amber"></i>', value: 'oriental' },
    'amber': { icon: '<i class="fas fa-feather text-purple-500" title="Oriental/Amber"></i>', value: 'amber' },
    'fresh': { icon: '<i class="fas fa-wind text-sky-500" title="Fresh"></i>', value: 'fresh' },
    'aquatic': { icon: '<i class="fas fa-water text-cyan-500" title="Aquatic"></i>', value: 'aquatic' },
    'leather': { icon: '<i class="fas fa-layer-group text-stone-600" title="Leather"></i>', value: 'leather' }
};

/**
 * (OPDATERET) Returnerer klikbare dufttype-ikoner.
 */
function getTypeIcons(accords) {
    if (!Array.isArray(accords) || accords.length === 0) return '';
    let iconsHtml = [];
    const addedIcons = new Set();
    const lowerCaseAccords = accords.map(a => a.toLowerCase());

    for (const key in SCENT_ICON_MAP) {
        if (!addedIcons.has(key) && lowerCaseAccords.some(accord => accord.includes(key))) {
            const iconData = SCENT_ICON_MAP[key];
            iconsHtml.push(
                `<span data-action="filter-icon" data-filter-type="accord" data-filter-value="${iconData.value}">${iconData.icon}</span>`
            );
            addedIcons.add(key);
        }
    }
    return iconsHtml.join(' ');
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

// --- KERNELOGIK: MODAL (OPDATERET) ---

const modal = document.getElementById('perfume-modal');
const modalContent = document.getElementById('modal-content');
const modalOverlay = document.getElementById('modal-overlay');
const modalCloseBtn = document.getElementById('modal-close-btn');

/**
 * NYT: Bygger HTML til boost-guiden baseret på parfume-type.
 * @param {Object} perfume - Parfume-objektet.
 */
function getBoostGuideHtml(perfume) {
    const accords = perfume.mainAccords || [];
    // Bestem type: Hvis NOGEN 'heavy' accords er til stede, er den heavy. Ellers standard.
    const isHeavy = accords.some(accord => HEAVY_ACCORDS.includes(accord.toLowerCase()));

    let rec;
    let title;

    if (isHeavy) {
        title = "Heavy/Gourmand Scent";
        rec = { '30ml': '2ml', '50ml': '3-4ml', '100ml': '5ml' };
    } else {
        // Standard/Light (sikker anbefaling)
        title = "Fresh/Light Scent";
        rec = { '30ml': '1ml', '50ml': '2ml', '100ml': '3ml' };
    }

    return `
        <div class="w-full">
            <p class="text-sm text-gray-600 mb-2">Recommendation for a <strong class="text-gray-900">${title}</strong>:</p>
            <div class="flex justify-around">
                <div>
                    <span class="text-lg font-bold">30ml</span>
                    <p class="text-sm text-blue-600 font-medium">+ ${rec['30ml']}</p>
                </div>
                <div>
                    <span class="text-lg font-bold">50ml</span>
                    <p class="text-sm text-blue-600 font-medium">+ ${rec['50ml']}</p>
                </div>
                <div>
                    <span class="text-lg font-bold">100ml</span>
                    <p class="text-sm text-blue-600 font-medium">+ ${rec['100ml']}</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * (OPDATERET) Viser modalen og kalder nu getBoostGuideHtml.
 */
function showPerfumeModal(code) {
    const perfume = allPerfumes.find(p => p.code === code);
    if (!perfume) return;

    // Udfyld standard-info
    document.getElementById('modal-inspiredBy').textContent = perfume.inspiredBy;
    document.getElementById('modal-brand').textContent = perfume.brand;
    document.getElementById('modal-code').textContent = perfume.code;
    document.getElementById('modal-description').textContent = perfume.description || 'No description available.';
    
    // Udfyld noter
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
    
    // NYT: Udfyld Boost Guide
    const boostGuideContainer = document.getElementById('modal-boost-guide');
    boostGuideContainer.innerHTML = getBoostGuideHtml(perfume);
    
    // Sæt "Køb"-link
    document.getElementById('modal-shobiLink').href = `https://leparfum.com.gr/en/module/iqitsearch/searchiqit?s=${perfume.code}`;
    
    // Vis modal
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


// --- FILTER-LOGIK (Uændret) ---

function populateFilters() {
    const genderContainer = document.getElementById('gender-filters');
    const seasonContainer = document.getElementById('season-filters');
    const occasionContainer = document.getElementById('occasion-filters');
    const accordContainer = document.getElementById('accord-filters');
    
    // 1. Byg Gender Filtre
    const genders = [
        { label: 'Masculine', value: 'masculine' },
        { label: 'Feminine', value: 'feminine' },
        { label: 'Unisex', value: 'unisex' }
    ];
    genderContainer.innerHTML = genders.map(g => `
        <label>
            <input type="checkbox" name="gender" value="${g.value}">
            ${g.label}
        </label>
    `).join('');

    // 2. Byg Season Filtre
    const seasons = [
        { label: 'Spring', value: 'spring' },
        { label: 'Summer', value: 'summer' }, 
        { label: 'Fall', value: 'fall' },
        { label: 'Winter', value: 'winter' }
    ];
    seasonContainer.innerHTML = seasons.map(s => `
        <label>
            <input type="checkbox" name="season" value="${s.value}">
            ${s.label}
        </label>
    `).join('');

    // 3. Byg Occasion Filtre
    const occasions = [
        { label: 'Daytime', value: 'daytime' },
        { label: 'Nightlife', value: 'nightlife' }
    ];
    occasionContainer.innerHTML = occasions.map(o => `
        <label>
            <input type="checkbox" name="occasion" value="${o.value}">
            ${o.label}
        </label>
    `).join('');

    // 4. Byg Accord Filtre (Dynamisk)
    const allAccords = new Set(allPerfumes.flatMap(p => (p.mainAccords || [])).map(a => a.toLowerCase()));
    const sortedAccords = [...allAccords].sort();

    accordContainer.innerHTML = sortedAccords.map(accord => {
        // Find den 'key' i SCENT_ICON_MAP, der matcher
        const mapKey = Object.keys(SCENT_ICON_MAP).find(key => accord.includes(key));
        const icon = mapKey ? SCENT_ICON_MAP[mapKey].icon : ''; // Få ikonet, hvis det findes
        const capitalized = accord.charAt(0).toUpperCase() + accord.slice(1);
        
        return `
            <label>
                <input type="checkbox" name="accord" value="${accord}">
                <span class="inline-block w-5 mr-1">${icon}</span> ${capitalized}
            </label>
        `;
    }).join('');
    // Rettelse fra v6.1: Vi fjerner ikke loaderen, da innerHTML overskriver den.

    // 5. Tilføj Event Listeners til ALLE tjekbokse
    document.querySelectorAll('#filter-sidebar input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            let filterType;
            if (e.target.name === 'gender') filterType = 'gender';
            else if (e.target.name === 'season') filterType = 'season';
            else if (e.target.name === 'occasion') filterType = 'occasion';
            else filterType = 'accords'; // 'accord' i HTML, 'accords' i state
            
            const value = e.target.value;
            
            if (e.target.checked) {
                if (!state.activeFilters[filterType].includes(value)) { // Undgå duplikater
                    state.activeFilters[filterType].push(value);
                }
            } else {
                const index = state.activeFilters[filterType].indexOf(value);
                if (index > -1) state.activeFilters[filterType].splice(index, 1);
            }
            applyFiltersAndRender(); // Gen-render listen
        });
    });
}


// --- INITIALISERING (Uændret) ---

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

        // OPDATERET: Udvidet datarensning
        allPerfumes = allPerfumes.filter(p => p && p.code && p.inspiredBy).map(p => ({
            ...p,
            notes: p.notes || { top: [], heart: [], base: [] },
            mainAccords: (p.mainAccords || []).map(a => a.toLowerCase()),
            bestSuitedFor: p.bestSuitedFor || { season: [], occasion: [] } // Sikrer at bestSuitedFor eksisterer
        }));
        
        console.log(`DEBUG: Total valid perfumes loaded: ${allPerfumes.length}`);

    } catch (error) {
        console.error("ERROR: Could not load or parse perfume data:", error);
        document.getElementById('results-count').textContent = `Error: Could not load data.`;
        return;
    }

    loadFavorites();
    populateFilters(); // Byg filtrene
    applyFiltersAndRender(); // Vis den indledende liste
}

// --- EVENT LISTENERS (DOMContentLoade) (Uændret) ---

document.addEventListener('DOMContentLoaded', () => {
    init();

    // Søgefelt-listener
    document.getElementById('search-input').addEventListener('input', e => {
        state.searchQuery = e.target.value;
        applyFiltersAndRender();
    });

    // Favoritknap-listener
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

    // Clear Brand Filter-knap
    document.getElementById('clear-brand-filter').addEventListener('click', () => {
        state.selectedBrand = null;
        applyFiltersAndRender();
    });

    // Modal Lyttere
    modalCloseBtn.addEventListener('click', hidePerfumeModal);
    modalOverlay.addEventListener('click', hidePerfumeModal);
    modalContent.addEventListener('click', (e) => e.stopPropagation());
});
