// DEBUG: Script started.
console.log("DEBUG: script.js loaded and running.");

let allPerfumes = [];
const state = { searchQuery: '', sortKey: 'inspiredBy', activeFilters: {}, favorites: [], showingFavorites: false, viewMode: 'grid', currentView: 'main', currentBrand: null };
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
        const perfumeSource = state.currentView === 'brand' ? allPerfumes.filter(p => p.brand === state.currentBrand) : allPerfumes;
        resultsCountEl.textContent = `Showing ${perfumes.length} of ${perfumeSource.length} results`;
    }

    if(perfumes.length === 0) {
        listElement.innerHTML = '<div class="col-12"><div class="alert alert-info">No perfumes matched your criteria.</div></div>';
        return;
    }

    const perfumesHTML = perfumes.map(perfume => {
        const p = perfume.item ? perfume.item : perfume;
        const isFavorite = state.favorites.includes(p.code);
        const accordsText = (p.mainAccords || []).slice(0, 3).map(a => `<span class="badge bg-secondary me-1 accord-tag" onclick="handleAccordClick('${a}')">${a}</span>`).join('');
        
        const shobiLink = `https://leparfum.com.gr/en/module/iqitsearch/searchiqit?s=${p.code}`;
        const parfumoLinkHTML = p.link ? `<a href="${p.link}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-info ms-1">Parfumo</a>` : '';

        let genderIcon = '';
        if (p.genderAffinity === 'Feminine') genderIcon = '<i class="fas fa-venus text-danger ms-2"></i>';
        else if (p.genderAffinity === 'Masculine') genderIcon = '<i class="fas fa-mars text-primary ms-2"></i>';
        else if (p.genderAffinity === 'Unisex') genderIcon = '<i class="fas fa-venus-mars text-warning ms-2"></i>';
        
        if (state.viewMode === 'grid') {
            const notesHTMLForCard = (notes, title) => {
                if (!notes || notes.length === 0) return '';
                return `<div class="mb-2"><strong>${title}:</strong> <span class="text-muted small">${notes.join(', ')}</span></div>`;
            };

            const cardBackHTML = `
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title mb-2">${p.inspiredBy}</h5>
                    <h6 class="card-subtitle mb-3 text-muted">Scent Pyramid</h6>
                    <div class="flex-grow-1">
                        ${notesHTMLForCard(p.notes.top, 'Top')}
                        ${notesHTMLForCard(p.notes.heart, 'Heart')}
                        ${notesHTMLForCard(p.notes.base, 'Base')}
                    </div>
                    <div class="mt-auto text-center">
                        <button class="btn btn-sm btn-outline-secondary" onclick="showPerfumeDetails('${p.code}')">Full Details & Charts</button>
                    </div>
                </div>`;
            
            return `
            <div class="col-md-6 col-xl-4 perfume-flip-card-container">
                <div class="perfume-card-flipper">
                    <div class="card h-100 shadow-sm perfume-card card-front bg-body-tertiary">
                        <div class="card-body d-flex flex-column position-relative">
                            <i class="fas fa-heart favorite-btn ${isFavorite ? 'is-favorite' : ''}" data-code="${p.code}"></i>
                            <h5 class="card-title">${p.inspiredBy}${genderIcon}</h5>
                            <h6 class="card-subtitle mb-2 text-muted"><span class="brand-link" data-brand="${p.brand}">${p.brand}</span></h6>
                            <p class="card-text small flex-grow-1">${String(p.description || 'No description available.').substring(0, 80)}...</p>
                            <div class="mb-2">${accordsText}</div>
                            <div class="mt-auto d-flex justify-content-between align-items-center">
                                <div>
                                    <a href="${shobiLink}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-primary">Shobi</a>
                                    ${parfumoLinkHTML}
                                </div>
                                <span class="text-muted small" style="font-size: 0.75rem;"><i class="fas fa-info-circle"></i> Hover for notes</span>
                            </div>
                        </div>
                    </div>
                    <div class="card h-100 shadow-sm perfume-card card-back bg-body-tertiary">
                        ${cardBackHTML}
                    </div>
                </div>
            </div>`;
        } else { // List view remains unchanged
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
    let perfumeSource = allPerfumes;
    if (state.currentView === 'brand' && state.currentBrand) {
        perfumeSource = allPerfumes.filter(p => p.brand === state.currentBrand);
    } else if (state.showingFavorites) {
        perfumeSource = allPerfumes.filter(p => state.favorites.includes(p.code));
    }

    let filtered = [...perfumeSource];
    
    if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        filtered = filtered.filter(p => 
            String(p.inspiredBy || '').toLowerCase().includes(query) || 
            String(p.brand || '').toLowerCase().includes(query) ||
            String(p.code || '').toLowerCase().includes(query)
        );
    }

    for (const key in state.activeFilters) {
        const selected = state.activeFilters[key];
        if (selected && selected.length > 0) {
            filtered = filtered.filter(p => {
                if (!p[key]) return false;
                if (Array.isArray(p[key])) return selected.some(val => p[key].includes(val));
                return selected.includes(p[key]);
            });
        }
    }

    filtered.sort((a, b) => String(a[state.sortKey] || '').localeCompare(String(b[state.sortKey] || '')));
    
    const containerId = state.currentView === 'brand' ? 'brand-perfume-list' : 'perfume-list';
    displayPerfumes(filtered, containerId);
}

function createFilters(perfumeSource) {
    const accordion = document.getElementById('filter-accordion');
    const filters = {
        brand: { title: 'Brand', options: new Set() },
        mainAccords: { title: 'Main Accords', options: new Set(), limit: 10 },
        seasons: { title: 'Season', options: new Set() },
        occasions: { title: 'Occasion', options: new Set() },
        genderAffinity: { title: 'Gender', options: new Set() }
    };

    const allOccasions = new Set();
    perfumeSource.forEach(p => {
        if (p.brand) filters.brand.options.add(p.brand);
        (p.seasons || []).forEach(s => filters.seasons.options.add(s));
        (p.occasions || []).forEach(o => allOccasions.add(o));
        if (p.genderAffinity) filters.genderAffinity.options.add(p.genderAffinity);
    });
    [...allOccasions].sort().forEach(o => filters.occasions.options.add(o));

    const counts = perfumeSource.flatMap(p => p.mainAccords || []).reduce((acc, a) => { acc[a] = (acc[a] || 0) + 1; return acc; }, {});
    const topAccords = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, filters.mainAccords.limit).map(e => e[0]);
    topAccords.forEach(a => filters.mainAccords.options.add(a));
    
    let html = '';
    for (const key in filters) {
        state.activeFilters[key] = state.activeFilters[key] || [];
        const options = [...filters[key].options].sort();
        if (options.length === 0) continue;

        const isBrandFilter = key === 'brand';
        const searchInputHTML = isBrandFilter ? `<input type="text" class="form-control form-control-sm mb-2" id="brand-filter-search" placeholder="Search brands...">` : '';
        const listContainerId = isBrandFilter ? `id="brand-filter-list"` : '';

        html += `
        <div class="accordion-item">
            <h2 class="accordion-header" id="heading-${key}">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${key}">
                    ${filters[key].title}
                </button>
            </h2>
            <div id="collapse-${key}" class="accordion-collapse collapse" aria-labelledby="heading-${key}">
                <div class="accordion-body" style="max-height: 200px; overflow-y: auto;">
                    ${searchInputHTML}
                    <div ${listContainerId}>`;
        options.forEach(option => {
            html += `<div class="form-check"><input class="form-check-input filter-checkbox" type="checkbox" value="${option}" id="${key}-${option.replace(/\s+/g, '-')}" data-filter-key="${key}"><label class="form-check-label" for="${key}-${option.replace(/\s+/g, '-')}">${option}</label></div>`;
        });
        html += `</div></div></div></div>`;
    }
    accordion.innerHTML = html;
    
    accordion.querySelectorAll('.filter-checkbox').forEach(box => box.addEventListener('change', handleFilterChange));
    
    const brandSearchInput = document.getElementById('brand-filter-search');
    if (brandSearchInput) {
        brandSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            document.querySelectorAll('#brand-filter-list .form-check').forEach(item => {
                const label = item.querySelector('label').textContent.toLowerCase();
                item.style.display = label.includes(searchTerm) ? '' : 'none';
            });
        });
    }
}

function calculateAndShowStats(perfumeSource) {
    const chartCanvas = document.getElementById('topAccordsChart');
    if (!chartCanvas) return;
    const ctx = chartCanvas.getContext('2d');
    const counts = perfumeSource.flatMap(p => p.mainAccords || []).reduce((acc, a) => { acc[a] = (acc[a] || 0) + 1; return acc; }, {});
    const top5 = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5);
    if (topAccordsChart) topAccordsChart.destroy();
    topAccordsChart = new Chart(ctx, {
        type: 'doughnut',
        data: { 
            labels: top5.map(a => a[0]), 
            datasets: [{ 
                label: 'Most Popular Accords', 
                data: top5.map(a => a[1]),
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
            datasets: [{ label: 'Profile', data: accordData, fill: true, backgroundColor: 'rgba(var(--primary-rgb), 0.2)', borderColor: 'rgb(var(--primary-rgb))', pointBackgroundColor: 'rgb(var(--primary-rgb))' }]
        },
        options: { scales: { r: { suggestedMin: 0, suggestedMax: 10, ticks: { display: false } } }, plugins: { legend: { display: false } } }
    });

    perfumeDetailsModal.show();
}

function showBrandView(brandName) {
    state.currentView = 'brand';
    state.currentBrand = brandName;
    document.getElementById('main-view').classList.add('d-none');
    document.getElementById('brand-view').classList.remove('d-none');
    
    const brandPerfumes = allPerfumes.filter(p => p.brand === brandName);
    const brandInfoEntry = allPerfumes.find(p => p.brand === brandName && p.brandDescription);
    const brandDescription = brandInfoEntry ? brandInfoEntry.brandDescription : 'No brand description available.';
    document.getElementById('brand-info').innerHTML = `<h2>${brandName}</h2><p>${brandDescription}</p>`;
    
    createFilters(brandPerfumes);
    calculateAndShowStats(brandPerfumes);
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
    
    if (!state.activeFilters[key]) {
        state.activeFilters[key] = [];
    }

    if (e.target.checked) {
        state.activeFilters[key].push(value);
    } else {
        state.activeFilters[key] = state.activeFilters[key].filter(v => v !== value);
    }
    
    state.showingFavorites = false;
    document.getElementById('favorites-btn').classList.remove('active');
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
    
    const brandSearchInput = document.getElementById('brand-filter-search');
    if (brandSearchInput) {
        brandSearchInput.value = '';
        brandSearchInput.dispatchEvent(new Event('input'));
    }
    
    state.showingFavorites = false;
    document.getElementById('favorites-btn').classList.remove('active');
    state.searchQuery = ''; 
    document.getElementById('search-input').value = '';
    applyFiltersAndRender();
}

function setTheme(theme) {
    if (!theme) return;
    const bootstrapTheme = (theme === 'light') ? 'light' : 'dark';
    document.documentElement.setAttribute('data-bs-theme', bootstrapTheme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('shobi-theme', theme);
}


async function init() {
    console.log("DEBUG: init() function started.");
    try {
        const response = await fetch('database_complete.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const rawData = await response.json();
        
        if (rawData.length > 0 && Array.isArray(rawData[0].perfumes)) {
            allPerfumes = rawData.flatMap(brandObject => {
                if (brandObject && Array.isArray(brandObject.perfumes)) {
                    const brandName = brandObject.brandInfo?.name || "Unknown Brand";
                    return brandObject.perfumes.map(perfume => ({
                        ...perfume,
                        brand: brandName, 
                        brandDescription: brandObject.brandInfo?.description
                    }));
                }
                return [];
            });
        } else {
            allPerfumes = rawData;
        }

        allPerfumes = allPerfumes.filter(p => p && p.code && p.inspiredBy).map(p => ({
            ...p,
            mainAccords: Array.isArray(p.mainAccords) ? p.mainAccords : [],
            seasons: Array.isArray(p.seasons) ? p.seasons : [],
            occasions: Array.isArray(p.occasions) ? p.occasions : [],
            notes: p.notes || { top: [], heart: [], base: [] }
        }));
        
        console.log(`DEBUG: Final valid perfume count: ${allPerfumes.length}`);
        
    } catch (error) {
        console.error("ERROR: Could not load or parse perfume data:", error);
        document.getElementById('results-count').innerHTML = `<span class="text-danger">Error: Could not load data. See console (F12) for details.</span>`;
        return;
    }

    perfumeDetailsModal = new bootstrap.Modal(document.getElementById('perfume-details-modal'));
    const savedFavorites = localStorage.getItem('shobi-favorites');
    if(savedFavorites) state.favorites = JSON.parse(savedFavorites);
    document.getElementById('favorites-count').textContent = state.favorites.length;
    
    setTheme(localStorage.getItem('shobi-theme') || 'light');
    
    createFilters(allPerfumes);
    calculateAndShowStats(allPerfumes);
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
        state.currentView = 'main';
        state.currentBrand = null;
        document.getElementById('brand-view').classList.add('d-none');
        document.getElementById('main-view').classList.remove('d-none');
        if(state.showingFavorites) { 
            resetAllFilters(); 
            state.showingFavorites = true; 
            createFilters(allPerfumes.filter(p => state.favorites.includes(p.code)));
            calculateAndShowStats(allPerfumes.filter(p => state.favorites.includes(p.code)));
        } else {
            createFilters(allPerfumes);
            calculateAndShowStats(allPerfumes);
        }
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
    document.getElementById('reset-filters-btn').addEventListener('click', () => {
        resetAllFilters();
        if (state.currentView === 'brand') {
             const brandPerfumes = allPerfumes.filter(p => p.brand === state.currentBrand);
             displayFiltersAndRender(brandPerfumes, 'brand-perfume-list');
        }
    });
    document.getElementById('back-to-all-btn').addEventListener('click', () => {
        state.currentView = 'main';
        state.currentBrand = null;
        document.getElementById('brand-view').classList.add('d-none');
        document.getElementById('main-view').classList.remove('d-none');
        createFilters(allPerfumes);
        calculateAndShowStats(allPerfumes);
        applyFiltersAndRender();
    });
});
