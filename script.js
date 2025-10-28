// DEBUG: Script started.
console.log("DEBUG: script.js (Tailwind Udkast) loaded.");

let allPerfumes = [];
const state = {
    searchQuery: '',
    favorites: [],
    showingFavorites: false
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
    if (state.showingFavorites) {
        resultsCountEl.textContent = `Viser ${perfumes.length} favorit(er).`;
    } else {
        resultsCountEl.textContent = `Viser ${perfumes.length} ud af ${allPerfumes.length} resultater.`;
    }

    if (perfumes.length === 0) {
        container.innerHTML = `<p class="text-gray-600 col-span-full">${state.showingFavorites ? 'Du har ingen favoritter.' : 'Ingen parfumer matchede din søgning.'}</p>`;
        return;
    }

    // Klon skabelon for hver parfume
    perfumes.forEach(perfume => {
        const p = perfume.item ? perfume.item : perfume; // Håndter data fra 'item' (hvis den bruges)
        const card = template.content.cloneNode(true);

        const isFavorite = state.favorites.includes(p.code);

        // Find og udfyld elementer i klonen
        card.querySelector('[data-field="code"]').textContent = p.code;
        card.querySelector('[data-field="inspiredBy"]').textContent = p.inspiredBy;
        card.querySelector('[data-field="brand"]').textContent = p.brand;
        
        // Sæt Shobi-link
        const shobiLink = `https://leparfum.com.gr/en/module/iqitsearch/searchiqit?s=${p.code}`;
        card.querySelector('[data-field="shobiLink"]').href = shobiLink;

        // Håndter favoritknap
        const favButton = card.querySelector('.favorite-btn');
        favButton.dataset.code = p.code;
        // Udskift ikonet baseret på tilstand
        favButton.innerHTML = isFavorite ? '<i class="fa-solid fa-heart"></i>' : '<i class="fa-regular fa-heart"></i>';
        if (isFavorite) {
            favButton.classList.add('is-favorite');
        }

        container.appendChild(card);
    });

    // Gen-tilføj event listeners til de nye knapper
    container.querySelectorAll('.favorite-btn').forEach(btn => 
        btn.addEventListener('click', toggleFavorite)
    );
}

/**
 * Anvender de nuværende filtre (søgning og favoritter) og gen-renderer listen.
 */
function applyFiltersAndRender() {
    let perfumeSource = allPerfumes;

    // 1. Tjek om vi kun skal vise favoritter
    if (state.showingFavorites) {
        perfumeSource = allPerfumes.filter(p => state.favorites.includes(p.code));
    }

    let filtered = [...perfumeSource];

    // 2. Anvend søgefilter
    if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        filtered = filtered.filter(p =>
            String(p.inspiredBy || '').toLowerCase().includes(query) || // Parfumenavn
            String(p.brand || '').toLowerCase().includes(query) ||      // Firma
            String(p.code || '').toLowerCase().includes(query)           // Shobi Kode (dækker "DRC-")
        );
    }

    displayPerfumes(filtered);
}

// --- KERNELOGIK: FAVORITTER ---

/**
 * Toggler en parfume som favorit og gemmer til localStorage.
 * @param {Event} event - Klik-eventet fra favoritknappen.
 */
function toggleFavorite(event) {
    const button = event.currentTarget; // Få fat i knappen
    const code = button.dataset.code;
    const index = state.favorites.indexOf(code);

    if (index > -1) {
        // Fjern fra favoritter
        state.favorites.splice(index, 1);
        button.innerHTML = '<i class="fa-regular fa-heart"></i>'; // Sæt til tomt hjerte
        button.classList.remove('is-favorite');
    } else {
        // Tilføj til favoritter
        state.favorites.push(code);
        button.innerHTML = '<i class="fa-solid fa-heart"></i>'; // Sæt til fyldt hjerte
        button.classList.add('is-favorite');
    }

    // Gem og opdater UI
    localStorage.setItem('shobi-favorites', JSON.stringify(state.favorites));
    document.getElementById('favorites-count').textContent = state.favorites.length;

    // Hvis vi er i favorit-visning, skal listen gen-rendes med det samme
    if (state.showingFavorites) {
        applyFiltersAndRender();
    }
}

/**
 * Indlæser favoritter fra localStorage ved start.
 */
function loadFavorites() {
    const savedFavorites = localStorage.getItem('shobi-favorites');
    if (savedFavorites) {
        state.favorites = JSON.parse(savedFavorites);
    }
    document.getElementById('favorites-count').textContent = state.favorites.length;
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

        // Datatransformation: Flad databasen og tilføj brand-info til hver parfume
        if (rawData.length > 0 && Array.isArray(rawData[0].perfumes)) {
            allPerfumes = rawData.flatMap(brandObject => {
                if (brandObject && Array.isArray(brandObject.perfumes)) {
                    const brandName = brandObject.brandInfo?.name || "Unknown Brand";
                    return brandObject.perfumes.map(perfume => ({
                        ...perfume,
                        brand: brandName
                    }));
                }
                return [];
            });
        } else {
            // Fallback for en allerede flad struktur (just in case)
            allPerfumes = rawData;
        }

        // Ryd op i data
        allPerfumes = allPerfumes.filter(p => p && p.code && p.inspiredBy);
        console.log(`DEBUG: Total valid perfumes loaded: ${allPerfumes.length}`);

    } catch (error) {
        console.error("ERROR: Could not load or parse perfume data:", error);
        document.getElementById('results-count').textContent = `Fejl: Kunne ikke indlæse data.`;
        return;
    }

    // Indlæs favoritter fra localStorage
    loadFavorites();

    // Vis alle parfumer fra start
    applyFiltersAndRender();
}

// --- EVENT LISTENERS ---

document.addEventListener('DOMContentLoaded', () => {
    init();

    // Søgefelt-listener
    document.getElementById('search-input').addEventListener('input', e => {
        state.searchQuery = e.target.value;
        // Hvis brugeren søger, slå favorit-visning fra
        if (state.showingFavorites) {
            state.showingFavorites = false;
            document.getElementById('favorites-btn').classList.remove('active', 'bg-red-800');
        }
        applyFiltersAndRender();
    });

    // Favoritknap-listener
    document.getElementById('favorites-btn').addEventListener('click', () => {
        state.showingFavorites = !state.showingFavorites;
        
        // Nulstil søgning når favorit-visning toggles
        state.searchQuery = '';
        document.getElementById('search-input').value = '';
        
        // Visuelt opdater knappen (Tailwind-klasser)
        const btn = document.getElementById('favorites-btn');
        if (state.showingFavorites) {
            btn.classList.add('active', 'bg-red-800'); // Gør knappen "aktiv"
        } else {
            btn.classList.remove('active', 'bg-red-800'); // Nulstil knap
        }

        applyFiltersAndRender();
    });
});
