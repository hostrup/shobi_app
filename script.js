// DEBUG: Script started.
console.log("DEBUG: script.js (Tailwind v11.2 - FINAL Filter Loader Fix) loaded.");

let allPerfumes = [];
let allBrands = new Map();
const state = {
    searchQuery: '',
    favorites: [],
    showingFavorites: false,
    selectedBrand: null,
    activeFilters: {
        gender: [],
        brands: [],
        season: [],
        occasion: [],
        accords: []
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
        container.innerHTML = `<p class="text-secondary col-span-full">No perfumes matched your selection.</p>`;
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
        card.querySelector('[data-field="description"]').textContent = p.description || '';

        const shobiLink = `https://leparfum.com.gr/en/module/iqitsearch/searchiqit?s=${p.code}`;
        card.querySelector('[data-field="shobiLink"]').href = shobiLink;

        // Håndter favoritknap
        const favButton = card.querySelector('.favorite-btn');
        favButton.dataset.code = p.code;
        favButton.innerHTML = isFavorite ? '<i class="fa-solid fa-heart"></i>' : '<i class="fa-regular fa-heart"></i>';
        if (isFavorite) favButton.classList.add('is-favorite');

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
    container.querySelectorAll('[data-action="filter-icon"]').forEach(btn =>
        btn.addEventListener('click', (e) => {
            const el = e.currentTarget;
            handleIconFilterClick(el.dataset.filterType, el.dataset.filterValue);
        })
    );
}

/**
 * Anvender HELE filterkæden korrekt.
 */
function applyFiltersAndRender() {
    let filtered = [...allPerfumes]; // Start med alle

    // --- Filterkæde ---

    // 1. Hovedvisning: Enkelt Brand (klik) ELLER Flere Brands (tjekboks) ELLER Favoritter
    if (state.selectedBrand) {
        filtered = filtered.filter(p => p.brand === state.selectedBrand);
    } else if (state.activeFilters.brands.length > 0) {
        filtered = filtered.filter(p => state.activeFilters.brands.includes(p.brand));
    } else if (state.showingFavorites) {
        filtered = filtered.filter(p => state.favorites.includes(p.code));
    }

    // 2. Anvend Gender-filtre
    if (state.activeFilters.gender.length > 0) {
        filtered = filtered.filter(p => {
            return state.activeFilters.gender.some(filterGender => p.genderAffinity.includes(filterGender));
        });
    }

    // 3. Anvend Season-filtre (søger i p.bestSuitedFor.season array)
    if (state.activeFilters.season.length > 0) {
        filtered = filtered.filter(p => {
            return state.activeFilters.season.some(filterSeason => p.bestSuitedFor.season.includes(filterSeason));
        });
    }

    // 4. Anvend Occasion-filtre (søger i p.bestSuitedFor.occasion array)
    if (state.activeFilters.occasion.length > 0) {
        filtered = filtered.filter(p => {
            return state.activeFilters.occasion.some(filterOccasion => p.bestSuitedFor.occasion.includes(filterOccasion));
        });
    }

    // 5. Anvend Accord-filtre
    if (state.activeFilters.accords.length > 0) {
        filtered = filtered.filter(p => {
            return state.activeFilters.accords.every(filterAccord => p.mainAccords.includes(filterAccord));
        });
    }

    // 6. Anvend Søgefilter (til sidst)
    if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        filtered = filtered.filter(p =>
            String(p.inspiredBy || '').toLowerCase().includes(query) ||
            String(p.brand || '').toLowerCase().includes(query) ||
            String(p.code || '').toLowerCase().includes(query)
        );
    }

    // 7. Opdater Brand Info boksen
    displayBrandInfo();

    // 8. Render de filtrerede resultater
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
        <h2 class="text-2xl font-bold text-primary">${brandInfo.name}</h2>
        <p class="mt-2 text-secondary">${brandInfo.description || 'No information available for this brand.'}</p>
    `;
    container.classList.remove('hidden');
}

/**
 * Håndterer klik på en brand-knap. (Opdateret)
 */
function handleBrandFilterClick(brandName) {
    state.selectedBrand = brandName;
    state.showingFavorites = false;

    // Nulstil brand-tjekbokse i state og UI
    state.activeFilters.brands = [];
    document.querySelectorAll('#brand-filters input[type="checkbox"]').forEach(cb => cb.checked = false);

    document.getElementById('favorites-btn').classList.remove('bg-red-800');

    applyFiltersAndRender();
    document.getElementById('brand-info-container').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Håndterer klik på et ikon-filter på et kort. (Uændret)
 */
function handleIconFilterClick(filterType, filterValue) {
    const stateKey = filterType === 'accord' ? 'accords' : filterType;

    const filtersContent = document.getElementById('filters-content');
    if (filtersContent.classList.contains('hidden') && window.innerWidth < 1024) { // Kun toggle på mobil
        toggleMobileFilters();
    }

    const checkbox = document.querySelector(`#filter-sidebar input[name="${filterType}"][value="${filterValue}"]`);

    if (checkbox && !checkbox.checked) {
        checkbox.checked = true;

        if (!state.activeFilters[stateKey].includes(filterValue)) {
            state.activeFilters[stateKey].push(filterValue);
        }

        // Nulstil selectedBrand hvis et brand-ikon klikkes (selvom vi ikke har dem endnu)
        if (stateKey === 'brands') {
             state.selectedBrand = null;
        }

        applyFiltersAndRender();
    }
}

// --- IKON-HJÆLPERE (Uændret) ---

function getAudienceIcons(audience) {
    const a = String(audience || '').toLowerCase();
    if (!a) return '';
    let icons = [];

    const iconMap = {
        'masculine': { value: 'masculine', html: '<i class="fas fa-mars text-blue-600" title="Masculine"></i>' },
        'feminine': { value: 'feminine', html: '<i class="fas fa-venus text-red-600" title="Feminine"></i>' },
        'unisex': { value: 'unisex', html: '<i class="fas fa-venus-mars text-green-600" title="Unisex"></i>' }
    };

    if (a.includes('male') || a.includes('masculine') || a.includes('men')) icons.push(iconMap.masculine);
    if (a.includes('female') || a.includes('feminine') || a.includes('women')) icons.push(iconMap.feminine);
    if (a.includes('unisex')) icons.push(iconMap.unisex);

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
            <p class="text-sm text-secondary mb-2">Recommendation for a <strong class="text-primary">${title}</strong>:</p>
            <div class="flex justify-around">
                <div>
                    <span class="text-lg font-bold text-primary">30ml</span>
                    <p class="text-sm text-accent font-medium">+ ${rec['30ml']}</p>
                </div>
                <div>
                    <span class="text-lg font-bold text-primary">50ml</span>
                    <p class="text-sm text-accent font-medium">+ ${rec['50ml']}</p>
                </div>
                <div>
                    <span class="text-lg font-bold text-primary">100ml</span>
                    <p class="text-sm text-accent font-medium">+ ${rec['100ml']}</p>
                </div>
            </div>
        </div>
    `;
}

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
        ${topNotes ? `<p><strong class="text-primary">Top:</strong> ${topNotes}</p>` : ''}
        ${heartNotes ? `<p><strong class="text-primary">Heart:</strong> ${heartNotes}</p>` : ''}
        ${baseNotes ? `<p><strong class="text-primary">Base:</strong> ${baseNotes}</p>` : ''}
    `;
    notesContainer.innerHTML = (topNotes || heartNotes || baseNotes) ? notesHtml : '<p>No note details available.</p>';

    const boostGuideContainer = document.getElementById('modal-boost-guide');
    boostGuideContainer.innerHTML = getBoostGuideHtml(perfume);

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


// --- FILTER-LOGIK (OPDATERET) ---

function toggleMobileFilters() {
    const filtersContent = document.getElementById('filters-content');
    const filtersIcon = document.getElementById('filters-toggle-icon');
    filtersContent.classList.toggle('hidden');
    filtersIcon.classList.toggle('rotate-180');
}

/**
 * Nulstiller alle filtre.
 */
function resetAllFilters() {
    // 1. Nulstil state
    state.searchQuery = '';
    state.showingFavorites = false;
    state.selectedBrand = null;
    state.activeFilters = {
        gender: [],
        brands: [],
        season: [],
        occasion: [],
        accords: []
    };

    // 2. Nulstil UI-elementer
    document.getElementById('search-input').value = '';
    document.getElementById('favorites-btn').classList.remove('bg-red-800');

    // 3. Nulstil alle tjekbokse
    document.querySelectorAll('#filter-sidebar input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });

    // 4. Gen-render
    applyFiltersAndRender();
}

/**
 * (RETTET) Bygger nu Brand, Season og Occasion dynamisk fra korrekt data.
 */
function populateFilters() {
    const genderContainer = document.getElementById('gender-filters');
    const brandContainer = document.getElementById('brand-filters');
    const seasonContainer = document.getElementById('season-filters');
    const occasionContainer = document.getElementById('occasion-filters');
    const accordContainer = document.getElementById('accord-filters');

    // 1. Byg Gender Filtre (Hardkodet)
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

    // 2. Byg Brand Filtre (Dynamisk)
    const sortedBrands = [...allBrands.keys()].sort();
    brandContainer.innerHTML = sortedBrands.map(brand => `
        <label>
            <input type="checkbox" name="brand" value="${brand}">
            ${brand}
        </label>
    `).join('');
    // *** FEJLRETTELSE *** Fjernet overflødig .remove()
    // document.getElementById('brand-loader').remove();

    // 3. RETTET: Byg Season Filtre (Dynamisk fra p.bestSuitedFor.season)
    const allSeasons = new Set(allPerfumes.flatMap(p => p.bestSuitedFor.season));
    allSeasons.delete(''); // Fjern tomme strenge hvis de findes
    const sortedSeasons = [...allSeasons].sort();

    seasonContainer.innerHTML = sortedSeasons.map(season => {
        const capitalized = season.charAt(0).toUpperCase() + season.slice(1);
        return `
            <label>
                <input type="checkbox" name="season" value="${season}">
                ${capitalized}
            </label>
        `;
    }).join('');
    // *** FEJLRETTELSE *** Fjernet overflødig .remove()
    // document.getElementById('season-loader').remove();

    // 4. RETTET: Byg Occasion Filtre (Dynamisk fra p.bestSuitedFor.occasion)
    const allOccasions = new Set(allPerfumes.flatMap(p => p.bestSuitedFor.occasion));
    allOccasions.delete(''); // Fjern tomme strenge hvis de findes
    const sortedOccasions = [...allOccasions].sort();

    occasionContainer.innerHTML = sortedOccasions.map(occasion => {
        const capitalized = occasion.charAt(0).toUpperCase() + occasion.slice(1);
        return `
            <label>
                <input type="checkbox" name="occasion" value="${occasion}">
                ${capitalized}
            </label>
        `;
    }).join('');
    // *** FEJLRETTELSE *** Fjernet overflødig .remove()
    // document.getElementById('occasion-loader').remove();

    // 5. Byg Accord Filtre (Dynamisk)
    const allAccords = new Set(allPerfumes.flatMap(p => p.mainAccords));
    const sortedAccords = [...allAccords].sort();

    accordContainer.innerHTML = sortedAccords.map(accord => {
        const mapKey = Object.keys(SCENT_ICON_MAP).find(key => accord.includes(key));
        const icon = mapKey ? SCENT_ICON_MAP[mapKey].icon : '';
        const capitalized = accord.charAt(0).toUpperCase() + accord.slice(1);

        return `
            <label>
                <input type="checkbox" name="accord" value="${accord}">
                <span class="inline-block w-5 mr-1">${icon}</span> ${capitalized}
            </label>
        `;
    }).join('');
    // *** FEJLRETTELSE *** Fjernet overflødig .remove()
    // document.getElementById('accord-loader').remove();

    // 6. Tilføj Event Listeners til ALLE tjekbokse
    document.querySelectorAll('#filter-sidebar input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', handleCheckboxChange); // Brug central handler
    });

    // 7. Fjern alle loaders EFTER at indholdet er sat (og find dem først)
    const brandLoader = document.getElementById('brand-loader');
    if (brandLoader) brandLoader.remove();
    const seasonLoader = document.getElementById('season-loader');
    if (seasonLoader) seasonLoader.remove();
    const occasionLoader = document.getElementById('occasion-loader');
    if (occasionLoader) occasionLoader.remove();
    const accordLoader = document.getElementById('accord-loader');
    if (accordLoader) accordLoader.remove();
}

/**
 * Central handler for alle filter-checkbox ændringer.
 */
function handleCheckboxChange(e) {
    let filterType;
    switch(e.target.name) {
        case 'gender': filterType = 'gender'; break;
        case 'brand': filterType = 'brands'; break;
        case 'season': filterType = 'season'; break;
        case 'occasion': filterType = 'occasion'; break;
        case 'accord': filterType = 'accords'; break;
        default: return; // Ukendt filter
    }

    const value = e.target.value;

    if (e.target.checked) {
        if (!state.activeFilters[filterType].includes(value)) {
            state.activeFilters[filterType].push(value);
        }
        // Nulstil selectedBrand hvis et brand-tjekboks vælges
        if (filterType === 'brands') {
            state.selectedBrand = null;
        }
    } else {
        const index = state.activeFilters[filterType].indexOf(value);
        if (index > -1) state.activeFilters[filterType].splice(index, 1);
    }
    applyFiltersAndRender();
}


// --- TEMA-LOGIK (Uændret) ---

function setTheme(theme) {
    const htmlTag = document.getElementById('html-tag');
    if (theme === 'light') {
        htmlTag.removeAttribute('data-theme');
        localStorage.removeItem('shobi-theme');
    } else {
        htmlTag.setAttribute('data-theme', theme);
        localStorage.setItem('shobi-theme', theme);
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('shobi-theme');
    if (savedTheme) {
        setTheme(savedTheme);
    }
    const themeMenuBtn = document.getElementById('theme-menu-btn');
    const themeMenuDropdown = document.getElementById('theme-menu-dropdown');

    themeMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        themeMenuDropdown.classList.toggle('hidden');
    });
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const theme = e.currentTarget.dataset.theme;
            setTheme(theme);
            themeMenuDropdown.classList.add('hidden');
        });
    });
    window.addEventListener('click', () => {
        if (!themeMenuDropdown.classList.contains('hidden')) {
            themeMenuDropdown.classList.add('hidden');
        }
    });
}

// --- INITIALISERING (RETTET) ---

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

        // RETTET: Korrekt datarensning for alle felter
        allPerfumes = allPerfumes.filter(p => p && p.code && p.inspiredBy).map(p => ({
            ...p,
            brand: p.brand || "Unknown Brand", // Sikrer at brand altid er sat
            genderAffinity: String(p.genderAffinity || '').toLowerCase(),
            mainAccords: (p.mainAccords || []).map(a => a.toLowerCase()),
            // RETTET: Bevarer bestSuitedFor objektet og renser dets arrays korrekt
            bestSuitedFor: {
                season: (p.bestSuitedFor?.season || []).map(s => s.toLowerCase()),
                occasion: (p.bestSuitedFor?.occasion || []).map(o => o.toLowerCase())
            },
            notes: p.notes || { top: [], heart: [], base: [] }
        }));

        console.log(`DEBUG: Total valid perfumes loaded: ${allPerfumes.length}`);
        // console.log("DEBUG: Sample cleaned perfume:", allPerfumes.find(p => p.bestSuitedFor.season.length > 0)); // Tilføjet for debugging

    } catch (error) {
        console.error("ERROR: Could not load or parse perfume data:", error);
        document.getElementById('results-count').textContent = `Error: Could not load data.`;
        return;
    }

    loadFavorites();
    populateFilters(); // Skal nu virke korrekt
    applyFiltersAndRender();
}

// --- EVENT LISTENERS (DOMContentLoade) (Uændret) ---

document.addEventListener('DOMContentLoaded', () => {
    init(); // Kører hoved-logik
    initTheme(); // Kører tema-logik

    // Mobil filter toggle
    document.getElementById('filters-toggle-btn').addEventListener('click', toggleMobileFilters);

    // Nulstil filter knapper (mobil + desktop)
    document.getElementById('reset-all-filters-btn-desktop').addEventListener('click', resetAllFilters);
    document.getElementById('reset-all-filters-btn-mobile').addEventListener('click', resetAllFilters);

    // Søgefelt-listener
    document.getElementById('search-input').addEventListener('input', e => {
        state.searchQuery = e.target.value;
        applyFiltersAndRender();
    });

    // Favoritknap-listener
    document.getElementById('favorites-btn').addEventListener('click', () => {
        state.showingFavorites = !state.showingFavorites;
        state.selectedBrand = null;

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
