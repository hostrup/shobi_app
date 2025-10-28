// DEBUG: Script started.
console.log("DEBUG: script.js (Tailwind v9 - Themes) loaded.");

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

// KONSTANTER til Boost Guide
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

        // Udfyld data (med nyt beskrivelsesfelt)
        card.querySelector('[data-field="code"]').textContent = p.code;
        card.querySelector('[data-field="inspiredBy"]').textContent = p.inspiredBy;
        card.querySelector('[data-field="brand"]').textContent = p.brand;
        card.querySelector('[data-field="description"]').textContent = p.description || '';
        
        const shobiLink = `https://leparfum.com.gr/en/module/iqitsearch/searchiqit?s=${p.code}`;
        card.querySelector('[data-field="shobiLink"]').href = shobiLink;

        // Håndter favoritknap
        const favButton = card.querySelector('.favorite-btn');
        favButton.dataset.code = p.code;
        favButton.innerHTML = isFavorite ? '<i class="fa-solid fa-heart"></i>' : '<i class="fa-regular fa-heart"></i>';
        if (isFavorite) favButton.classList.add('is-favorite');

        // Ikoner (i deres nye rækkefølge)
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
 * Håndterer klik på et ikon-filter på et kort. (Uændret)
 */
function handleIconFilterClick(filterType, filterValue) {
    // Ret 'accord' til 'accords' for at matche state-nøglen
    const stateKey = filterType === 'accord' ? 'accords' : filterType;

    // NYT: Åbn mobil-filtre, hvis de er lukkede
    const filtersContent = document.getElementById('filters-content');
    if (filtersContent.classList.contains('hidden')) {
        toggleMobileFilters();
    }

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

// --- IKON-HJÆLPERE (Uændret) ---

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

// --- KERNELOGIK: MODAL (Uændret) ---

const modal = document.getElementById('perfume-modal');
const modalContent = document.getElementById('modal-content');
const modalOverlay = document.getElementById('modal-overlay');
const modalCloseBtn = document.getElementById('modal-close-btn');

function getBoostGuideHtml(perfume) {
    const accords = perfume.mainAccords || [];
    const isHeavy = accords.some(accord => HEAVY_ACCORDS.includes(accord.toLowerCase()));

    let rec;
    let title;

    if (isHeavy) {
        title = "Heavy/Gourmand Scent";
        rec = { '30ml': '2ml', '50ml': '3-4ml', '100ml': '5ml' };
    } else {
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
                    <span class="text
