// DEBUG: Script started.
console.log("DEBUG: script.js loaded and running.");

let allPerfumes = [];
const state = { searchQuery: '', sortKey: 'inspiredBy', activeFilters: {}, favorites: [], showingFavorites: false, viewMode: 'grid', currentView: 'main' };
let topAccordsChart = null;
let scentProfileChart = null;
let perfumeDetailsModal;

function displayPerfumes(perfumes, containerId, customTitle = null) {
    const listElement = document.getElementById(containerId);
    listElement.className = state.viewMode === 'grid' ? 'row g-4' : 'list-group';
    
    const resultsCountEl = document.getElementById('results-count');
    if (customTitle) {
        resultsCountEl.innerHTML = customTitle;
    } else if (containerId === 'perfume-list') {
        resultsCountEl.textContent = `Showing ${perfumes.length} results`;
    }

    if(perfumes.length === 0) {
        listElement.innerHTML = '<div class="col-12"><div class="alert alert-info">No perfumes matched your criteria.</div></div>';
        return;
    }

    const perfumesHTML = perfumes.map(perfume => {
        const p = perfume.item ? perfume.item : perfume;
        const isFavorite = state.favorites.includes(p.code);
        const accordsText = (p.mainAccords || []).slice(0, 3).map(a => `<span class="badge bg-secondary me-1 accord-tag" onclick="handleAccordClick('${a}')">${a}</span>`).join('');
        
        const shobiLink = `https://leparfum.com.gr/en/products/${p.code}`;
        const parfumoLinkHTML = p.link ? `<a href="${p.link}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-info ms-1">Parfumo</a>` : '';

        let genderIcon = '';
        if (p.genderAffinity === 'Feminine') genderIcon = '<i class="fas fa-venus text-danger ms-2"></i>';
        else if (p.genderAffinity === 'Masculine') genderIcon = '<i class="fas fa-mars text-primary ms-2"></i>';
        else if (p.genderAffinity === 'Unisex') genderIcon = '<i class="fas fa-venus-mars text-warning ms-2"></i>';
        
        if (state.viewMode === 'grid') {
            return `
            <div class="col-md-6 col-xl-4">
                <div class="card h-100 shadow-sm perfume-card bg-body-tertiary">
                    <div class="card-body d-flex flex-column position-relative">
                        <i class="fas fa-heart favorite-btn ${isFavorite ? 'is-favorite' : ''}" data-code="${p.code}"></i>
                        <h5 class="card-title">${p.inspiredBy}${genderIcon}</h5>
                        <h6 class="card-subtitle mb-2 text-muted"><span class="brand-link" data-brand="${p.brand}">${p.brand}</span></h6>
                        <p class="card-text small flex-grow-1">${String(p.description || 'No description available.').substring(0, 80)}...</p>
                        <div class="mb-2">${accordsText}</div>
                        <div class="mt-auto">
                            <button class="btn btn-sm btn-outline-secondary" onclick="showPerfumeDetails('${p.code}')">Details</button>
                            <a href="${shobiLink}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-primary ms-1">Shobi</a>
                            ${parfumoLinkHTML}
                        </div>
                    </div>
                </div>
            </div>`;
        } else {
            return `
            <li class="list-group-item bg-body-tertiary">
                <div class="d-flex w-100 justify-content-between align-items-start">
                    <div>
                        <h5 class="mb-1">${p.inspiredBy}${genderIcon} <small class="text-muted">by <span class="brand-link" data-brand="${p.brand}">${p.brand}</span></small></h5>
                        <p class="mb-1 small">${String(p.description || 'No description available.').substring(0, 120)}...</p>
                        <div class="mt-2">${accordsText}</div>
                    </div>
                    <div class="d-flex flex-column align-items-end ms-3 text-nowrap" style="min-width: 120px;">
                        <i class="fas fa-heart favorite-btn mb-auto ${isFavorite ? 'is-favorite' : ''}" data-code="${p.code}"></i>
                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-secondary" onclick="showPerfumeDetails('${p.code}')">Details</button>
                            <a href="${shobiLink}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-primary ms-1">Shobi</a>
                            ${parfumoLinkHTML}
                        </div>
                    </div>
                </div>
            </li>`;
        }
    }).join('');

    listElement.innerHTML = perfumesHTML;
    
    listElement.querySelectorAll('.favorite-btn').forEach(btn => btn.addEventListener('click', toggleFavorite));
    listElement.querySelectorAll('.brand-link').forEach(link => link.addEventListener('click', e => showBrandView(e.target.dataset.brand)));
}

function applyFiltersAndRender() {
    let filtered = [...allPerfumes];
    if (state.showingFavorites) {
        filtered = filtered.filter(p => state.favorites.includes(p.code));
    }
    if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        filtered = filtered.filter(p => 
            String(p.inspiredBy || '').toLowerCase().includes(query) || 
            String(p.brand || '').toLowerCase().includes(query)
        );
    }
    for (const key in state.activeFilters) {
        const selected = state.activeFilters[key];
        if (selected.length > 0) {
            filtered = filtered.filter(p => {
                if (Array.isArray(p[key])) return selected.some(val => p[key].includes(val));
                return selected.includes(p[key]);
            });
        }
    }
    filtered.sort((a, b) => String(a[state.sortKey] || '').localeCompare(String(b[state.sortKey] || '')));
    displayPerfumes(filtered, 'perfume-list');
}

function createFilters() {
    const accordion = document.getElementById('filter-accordion');
    const filters = {
        mainAccords: { title: 'Main Accords', options: new Set(), limit: 10 },
        seasons: { title: 'Season', options: new Set() },
        occasions: { title: 'Occasion', options: new Set() },
        genderAffinity: { title: 'Gender', options: new Set() }
    };

    const allOccasions = new Set();
    allPerfumes.forEach(p => {
        (p.seasons || []).forEach(s => filters.seasons.options.add(s));
        (p.occasions || []).forEach(o => allOccasions.add(o));
        if (p.genderAffinity) filters.genderAffinity.options.add(p.genderAffinity);
    });
    [...allOccasions].sort().forEach(o => filters.occasions.options.add(o));

    const counts = allPerfumes.flatMap(p => p.mainAccords || []).reduce((acc, a) => { acc[a] = (acc[a] || 0) + 1; return acc; }, {});
    const topAccords = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, filters.mainAccords.limit).map(e => e[0]);
    topAccords.forEach(a => filters.mainAccords.options.add(a));
    
    let html = '';
    for (const key in filters) {
        state.activeFilters[key] = [];
        const options = [...filters[key].options].sort();
        if (options.length === 0) continue;

        html += `
        <div class="accordion-item">
            <h2 class="accordion-header" id="heading-${key}">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${key}">
                    ${filters[key].title}
                </button>
            </h2>
            <div id="collapse-${key}" class="accordion-collapse collapse" aria-labelledby="heading-${key}">
                <div class="accordion-body" style="max-height: 200px; overflow-y: auto;">`;
        options.forEach(option => {
            html += `<div class="form-check"><input class="form-check-input filter-checkbox" type="checkbox" value="${option}" id="${key}-${option}" data-filter-key="${key}"><label class="form-check-label" for="${key}-${option}">${option}</label></div>`;
        });
        html += `</div></div></div>`;
    }
    accordion.innerHTML = html;
    accordion.querySelectorAll('.filter-checkbox').forEach(box => box.addEventListener('change', handleFilterChange));
}

function calculateAndShowStats() {
    const chartCanvas = document.getElementById('topAccordsChart');
    if (!chartCanvas) return;
    const ctx = chartCanvas.getContext('2d');
    const counts = allPerfumes.flatMap(p => p.mainAccords || []).reduce((acc, a) => { acc[a] = (acc[a] || 0) + 1; return acc; }, {});
    const top5 = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5);
    if (topAccordsChart) topAccordsChart.destroy();
    topAccordsChart = new Chart(ctx, {
        type: 'doughnut',
        data: { 
            labels: top5.map(a => a[0]), 
            datasets: [{ 
                label: 'Most Popular Accords', 
                data: top5.map(a => a[1]),
                backgroundColor: ['rgba(60, 100, 255, 0.7)', 'rgba(255, 99, 132, 0.7)', 'rgba(255, 205, 86, 0.7)', 'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)'],
            }] 
        },
        options: { 
            responsive: true, 
            plugins: { legend: { position: 'top' } },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const chartElement = elements[0];
                    const label = topAccordsChart.data.labels[chartElement.index];
                    handleAccordClick(label);
                }
            }
        }
    });
}

window.navigateToBrand = function(brandName) {
    perfumeDetailsModal.hide();
    showBrandView(brandName);
}

function showPerfumeDetails(code) {
    const perfume = allPerfumes.find(p => p.code === code);
    if (!perfume) return;
    const content = document.getElementById('perfume-details-content');
    
    document.getElementById('perfumeDetailsLabel').innerHTML = `${perfume.inspiredBy} by <a href="#" onclick="event.preventDefault(); window.navigateToBrand('${perfume.brand}')" class="brand-link-modal">${perfume.brand}</a>`;
    
    const notesHTML = (notes, title) => notes && notes.length > 0 ? `<h6>${title}</h6><p class="text-muted">${notes.join(', ')}</p>` : '';
    content.innerHTML = `
        <div class="row">
            <div class="col-md-7">
                <p>${perfume.description}</p><hr>
                <h5>Scent Pyramid</h5>
                ${notesHTML(perfume.notes.top, 'Top Notes')}
                ${notesHTML(perfume.notes.heart, 'Heart Notes')}
                ${notesHTML(perfume.notes.base, 'Base Notes')}
                <button class="btn btn-info mt-3" onclick="findSimilarPerfumes('${perfume.code}')"><i class="fas fa-search"></i> Find Similar</button>
            </div>
            <div class="col-md-5">
                <h5>Scent Profile</h5>
                <canvas id="scentProfileChart"></canvas>
            </div>
        </div>`;
    
    const ctx = document.getElementById('scentProfileChart').getContext('2d');
    const accordLabels = perfume.mainAccords || [];
    const accordData = accordLabels.map((_, i) => 10 - i * 1.5);

    if (scentProfileChart) scentProfileChart.destroy();
    scentProfileChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: accordLabels,
            datasets: [{ label: 'Profile', data: accordData, fill: true, backgroundColor: 'rgba(var(--bs-primary-rgb), 0.2)', borderColor: 'rgb(var(--bs-primary-rgb))', pointBackgroundColor: 'rgb(var(--bs-primary-rgb))' }]
        },
        options: { scales: { r: { suggestedMin: 0, suggestedMax: 10, ticks: { display: false } } }, plugins: { legend: { display: false } } }
    });

    perfumeDetailsModal.show();
}

function showBrandView(brandName) {
    state.currentView = 'brand';
    document.getElementById('main-view').classList.add('d-none');
    document.getElementById('brand-view').classList.remove('d-none');
    const brandPerfumes = allPerfumes.filter(p => p.brand === brandName);
    const brandInfoEntry = allPerfumes.find(p => p.brand === brandName && p.brandDescription);
    const brandDescription = brandInfoEntry ? brandInfoEntry.brandDescription : 'No brand description available.';
    document.getElementById('brand-info').innerHTML = `<h2>${brandName}</h2><p>${brandDescription}</p>`;
    displayPerfumes(brandPerfumes, 'brand-perfume-list');
}

function findSimilarPerfumes(baseCode) {
    const basePerfume = allPerfumes.find(p => p.code === baseCode);
    const baseAccords = new Set(basePerfume.mainAccords);
    const similar = allPerfumes.filter(p => p.code !== baseCode).map(p => ({ item: p, score: (p.mainAccords || []).filter(accord => baseAccords.has(accord)).length })).sort((a, b) => b.score - a.score).slice(0, 6);
    perfumeDetailsModal.hide();
    resetAllFilters();
    const customTitle = `<h5>Showing perfumes similar to <strong>${basePerfume.inspiredBy}</strong></h5>`;
    displayPerfumes(similar, 'perfume-list', customTitle);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.handleAccordClick = (accord) => {
    if (!accord) return;
    resetAllFilters();
    const checkbox = document.querySelector(`#filter-accordion input[value="${accord}"]`);
    if (checkbox) {
        checkbox.checked = true;
        const key = checkbox.dataset.filterKey;
        if (key) {
            state.activeFilters[key].push(accord);
        }
    }
    applyFiltersAndRender();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleFilterChange(e) {
    const key = e.target.dataset.filterKey;
    const value = e.target.value;
    if (e.target.checked) state.activeFilters[key].push(value);
    else state.activeFilters[key] = state.activeFilters[key].filter(v => v !== value);
    state.showingFavorites = false;
    applyFiltersAndRender();
}

function toggleFavorite(event) {
    const code = event.target.dataset.code;
    const index = state.favorites.indexOf(code);
    if (index > -1) state.favorites.splice(index, 1);
    else state.favorites.push(code);
    localStorage.setItem('shobi-favorites', JSON.stringify(state.favorites));
    document.getElementById('favorites-count').textContent = state.favorites.length;
    event.target.classList.toggle('is-favorite', index === -1);
    if (state.showingFavorites) {
        applyFiltersAndRender();
    }
}

function resetAllFilters() {
    document.querySelectorAll('.filter-checkbox').forEach(box => box.checked = false);
    for (const key in state.activeFilters) { state.activeFilters[key] = []; }
    state.showingFavorites = false;
    document.getElementById('favorites-btn').classList.remove('active');
    state.searchQuery = ''; 
    document.getElementById('search-input').value = '';
    applyFiltersAndRender();
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', (theme === 'light' || theme === 'dark') ? theme : 'light');
    document.documentElement.setAttribute('data-theme', (theme !== 'light' && theme !== 'dark') ? theme : '');
    localStorage.setItem('shobi-theme', theme);
}

async function init() {
    console.log("DEBUG: init() function started.");
    try {
        const response = await fetch('database_complete.json');
        console.log("DEBUG: Fetch response received. Status:", response.status);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const rawData = await response.json();
        console.log(`DEBUG: Successfully parsed JSON. Found ${rawData.length} raw entries.`);
        
        if (rawData.length > 0 && Array.isArray(rawData[0].perfumes)) {
            console.log("DEBUG: Data structure is [Brand with nested perfumes]. Flattening the structure.");
            
            // *** THE FIX IS HERE ***
            allPerfumes = rawData.flatMap(brandObject => {
                if (brandObject && Array.isArray(brandObject.perfumes)) {
                    // Check for brand name under 'brand' or 'brandName' key
                    const brandName = brandObject.brand || brandObject.brandName || "Unknown Brand";
                    // Add brand information to each perfume object as it's processed
                    return brandObject.perfumes.map(perfume => ({
                        ...perfume,
                        brand: brandName, 
                        brandDescription: brandObject.brandDescription
                    }));
                }
                return [];
            });
            console.log(`DEBUG: Successfully flattened data. Total perfumes found: ${allPerfumes.length}`);

        } else {
            console.log("DEBUG: Data structure appears to be a flat list. Processing as-is.");
            allPerfumes = rawData;
        }

        allPerfumes = allPerfumes.filter(p => p && p.code && p.inspiredBy).map(p => ({
            ...p,
            mainAccords: Array.isArray(p.mainAccords) ? p.mainAccords : [],
            seasons: Array.isArray(p.seasons) ? p.seasons : [],
            occasions: Array.isArray(p.occasions) ? p.occasions : [],
            notes: p.notes || { top: [], heart: [], base: [] }
        }));
        
        console.log(`DEBUG: Data sanitized. Final valid perfume count: ${allPerfumes.length}`);
        if (allPerfumes.length > 0) {
            console.log("DEBUG: First valid perfume object after processing:", allPerfumes[0]);
        }
        if (allPerfumes.length === 0 && rawData.length > 0) {
            console.error("CRITICAL ERROR: No valid perfumes were found. Check JSON structure and flattening logic.");
        }

    } catch (error) {
        console.error("ERROR: Could not load or parse perfume data:", error);
        document.getElementById('results-count').innerHTML = `<span class="text-danger">Error: Could not load data. See console (F12) for details.</span>`;
        return;
    }

    perfumeDetailsModal = new bootstrap.Modal(document.getElementById('perfume-details-modal'));
    const savedFavorites = localStorage.getItem('shobi-favorites');
    if(savedFavorites) state.favorites = JSON.parse(savedFavorites);
    document.getElementById('favorites-count').textContent = state.favorites.length;
    
    console.log("DEBUG: Creating filters and calculating stats.");
    createFilters();
    calculateAndShowStats();
    
    setTheme(localStorage.getItem('shobi-theme') || 'light');
    
    console.log("DEBUG: Performing initial render.");
    applyFiltersAndRender();
}

document.addEventListener('DOMContentLoaded', () => {
    init();

    document.getElementById('search-input').addEventListener('input', e => { 
        state.searchQuery = e.target.value; 
        state.showingFavorites = false; 
        applyFiltersAndRender(); 
    });
    document.getElementById('sort-btn-group').addEventListener('click', e => {
        if (e.target.matches('.btn')) {
            document.querySelector('#sort-btn-group .btn.active').classList.remove('active');
            e.target.classList.add('active');
            state.sortKey = e.target.id === 'sort-by-name' ? 'inspiredBy' : 'brand';
            applyFiltersAndRender();
        }
    });
    document.getElementById('view-btn-group').addEventListener('click', e => {
        const button = e.target.closest('button');
        if (button) {
            document.querySelector('#view-btn-group .btn.active').classList.remove('active');
            button.classList.add('active');
            state.viewMode = button.id === 'view-grid' ? 'grid' : 'list';
            applyFiltersAndRender();
        }
    });
    document.querySelectorAll('.theme-choice').forEach(item => item.addEventListener('click', e => { e.preventDefault(); setTheme(e.target.dataset.themeValue); }));
    document.getElementById('favorites-btn').addEventListener('click', () => {
        state.showingFavorites = !state.showingFavorites;
        if(state.showingFavorites) { resetAllFilters(); state.showingFavorites = true; }
        document.getElementById('favorites-btn').classList.toggle('active', state.showingFavorites);
        applyFiltersAndRender();
    });
    document.getElementById('surprise-btn').addEventListener('click', () => {
        if(allPerfumes.length > 0) {
            const randomIndex = Math.floor(Math.random() * allPerfumes.length);
            const randomPerfume = allPerfumes[randomIndex];
            showPerfumeDetails(randomPerfume.code);
        }
    });
    document.getElementById('reset-filters-btn').addEventListener('click', resetAllFilters);
    document.getElementById('back-to-all-btn').addEventListener('click', () => {
        state.currentView = 'main';
        document.getElementById('brand-view').classList.add('d-none');
        document.getElementById('main-view').classList.remove('d-none');
        applyFiltersAndRender();
    });
});
