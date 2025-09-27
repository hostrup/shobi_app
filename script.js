// Erstat hele indholdet af din script.js med denne kode

document.addEventListener('DOMContentLoaded', () => {
    let allPerfumes = [], cart = [], favorites = [];
    let currentView = 'card', currentPage = 1, currentFilteredPerfumes = [];
    const ITEMS_PER_PAGE = 20;
    let notesSelect, grid, brandChartInstance, scentTypeChartInstance, calculatedStats = {}, statsInterval;

    const dom = {
        cardView: document.getElementById('card-view'),
        tableViewWrapper: document.getElementById('table-view-wrapper'),
        tableView: document.getElementById('table-view'),
        perfumeCount: document.getElementById('perfume-count'),
        noResults: document.getElementById('no-results'),
        loadMoreBtn: document.getElementById('load-more-btn'),
        loadMoreContainer: document.getElementById('load-more-container'),
        searchInput: document.getElementById('search'),
        brandFilter: document.getElementById('brand-filter'),
        typeFilter: document.getElementById('type-filter'),
        notesFilter: document.getElementById('notes-filter'),
        favoritesToggle: document.getElementById('favorites-toggle'),
        viewToggleCard: document.getElementById('view-toggle-card'),
        viewToggleTable: document.getElementById('view-toggle-table'),
        resetFiltersBtn: document.getElementById('reset-filters-btn'),
        cart: { toggle: document.getElementById('cart-toggle'), sidebar: document.getElementById('cart-sidebar'), overlay: document.getElementById('cart-overlay'), closeBtn: document.getElementById('close-cart'), itemsContainer: document.getElementById('cart-items'), count: document.getElementById('cart-count'), copyBtn: document.getElementById('copy-codes'), emptyMsg: document.getElementById('empty-cart-message') },
        dashboard: { toggle: document.getElementById('dashboard-toggle'), modal: document.getElementById('dashboard-modal'), closeBtn: document.getElementById('close-dashboard'), brandCount: document.getElementById('brand-count'), perfumeTotalCount: document.getElementById('perfume-total-count') },
        stats: { popularNote: document.getElementById('popular-note'), topNicheBrand: document.getElementById('top-niche-brand'), fruityPercentage: document.getElementById('fruity-percentage') },
        notification: document.getElementById('notification'),
        theme: { switcher: document.getElementById('theme-switcher'), toggleBtn: document.getElementById('theme-toggle-btn'), menu: document.getElementById('theme-menu') },
        perfumeModal: { container: document.getElementById('perfume-modal'), content: document.getElementById('perfume-modal-content') }
    };

    const typeMap = { 'WP': 'Women', 'MP': 'Men', 'EL': 'Unisex', 'AR': 'Niche', 'OTHER': 'Other' };

    async function init() {
        try {
            const response = await fetch('database_complete.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const perfumeData = await response.json();
            loadState();
            
            allPerfumes = perfumeData.map(p => ({
                ...p,
                type: p.category || 'OTHER',
                notesArray: (p.notes || "").replace(/<br>/g, ' ').replace(/<b>/g, '').replace(/<\/b>/g, '').split(/[:|]/).slice(1).flatMap(part => part.split(',')).map(n => formatBrandName(n.trim())).filter(Boolean)
            }));

            currentFilteredPerfumes = [...allPerfumes];
            populateFilters();
            initTableView();
            render(true);
            updateDashboardStats();
            calculateAllStats();
            updateStatsBanner();
            startStatsRotation();
            setupEventListeners();
        } catch (error) {
            console.error("Could not load and initialize the application:", error);
            document.body.innerHTML = `<div class="h-screen flex items-center justify-center bg-red-900 text-white"><div class="text-center p-8 bg-red-800 rounded-lg shadow-lg"><h1>Error Loading Data</h1><p class="mt-2">Could not load perfume data from <strong>database_complete.json</strong>.</p><p class="mt-1">Please ensure the file is in the same directory as this HTML file.</p></div></div>`;
        }
    }

    function loadState() {
        favorites = JSON.parse(localStorage.getItem('perfumeFavorites')) || [];
        applyTheme(localStorage.getItem('perfumeTheme') || 'solarized-dark');
    }

    function saveFavorites() { localStorage.setItem('perfumeFavorites', JSON.stringify(favorites)); }

    function applyTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        localStorage.setItem('perfumeTheme', themeName);
        if (brandChartInstance) createCharts();
        if (grid) grid.forceRender();
    }

    function populateFilters() {
        const brands = [...new Set(allPerfumes.map(p => p.brand))].sort();
        brands.forEach(brand => dom.brandFilter.add(new Option(formatBrandName(brand), brand)));
        const allNotes = [...new Set(allPerfumes.flatMap(p => p.notesArray))].sort();
        notesSelect = new SlimSelect({
            select: '#notes-filter',
            data: allNotes.map(note => ({ text: note, value: note })),
            settings: { placeholderText: 'Select notes...', searchText: 'No results' },
            onChange: () => applyFilters()
        });
    }

    function applyFilters() {
        const searchTerm = dom.searchInput.value.toLowerCase();
        const selectedBrand = dom.brandFilter.value;
        const selectedType = dom.typeFilter.value;
        const selectedNotes = notesSelect.selected();
        const showFavoritesOnly = dom.favoritesToggle.checked;

        currentFilteredPerfumes = allPerfumes.filter(p => {
            if (showFavoritesOnly && !favorites.includes(p.code)) return false;
            if (selectedBrand && p.brand !== selectedBrand) return false;
            if (selectedType && p.type !== selectedType) return false;
            if (selectedNotes.length > 0 && !selectedNotes.every(note => p.notesArray.includes(note))) return false;

            const typeName = typeMap[p.type] || '';
            const scentTypeName = (p.scentType || '').toLowerCase();

            if (searchTerm) {
                return (
                    (p.brand || '').toLowerCase().includes(searchTerm) ||
                    (p.inspiredBy || '').toLowerCase().includes(searchTerm) ||
                    (p.notes || '').toLowerCase().includes(searchTerm) ||
                    typeName.toLowerCase().includes(searchTerm) ||
                    (p.code || '').toLowerCase().includes(searchTerm) ||
                    scentTypeName.includes(searchTerm)
                );
            }
            return true;
        });
        render(true);
    }

    function resetFilters() {
        dom.searchInput.value = '';
        dom.brandFilter.value = '';
        dom.typeFilter.value = '';
        notesSelect.setSelected([]);
        dom.favoritesToggle.checked = false;
        applyFilters();
    }

    function render(isNewFilter) {
        if (isNewFilter) currentPage = 1;
        const perfumesToRender = currentFilteredPerfumes.slice(0, currentPage * ITEMS_PER_PAGE);
        dom.perfumeCount.textContent = `Showing ${perfumesToRender.length} of ${currentFilteredPerfumes.length} perfumes.`;
        dom.noResults.classList.toggle('hidden', currentFilteredPerfumes.length > 0);
        dom.loadMoreContainer.style.display = perfumesToRender.length < currentFilteredPerfumes.length && currentView === 'card' ? 'block' : 'none';
        if (currentView === 'card') renderCardView(isNewFilter);
        else renderTableView(currentFilteredPerfumes);
    }
    
    function renderCardView(isNewFilter) {
        const container = dom.cardView;
        if (isNewFilter) container.innerHTML = '';
        const perfumesToRender = currentFilteredPerfumes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
        
        const fragment = document.createDocumentFragment();
        perfumesToRender.forEach(p => {
            if(!p) return;
            const isFavorited = favorites.includes(p.code);
            const card = document.createElement('div');
            card.className = "perfume-card bg-[var(--bg-secondary)] rounded-xl shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 flex flex-col";
            card.dataset.code = p.code;
            card.innerHTML = `
                <div class="p-6 flex-grow">
                    <div class="flex justify-between items-start">
                        <div class="uppercase tracking-wide text-sm text-[var(--accent-primary)] font-semibold cursor-pointer hover:underline brand-link" data-brand="${p.brand}">${formatBrandName(p.brand)}</div>
                        <button data-code="${p.code}" class="favorite-btn ${isFavorited ? 'favorited' : ''} z-10" title="Favorite">
                            <svg class="w-6 h-6 text-[var(--accent-love)] heart-outline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.5l1.318-1.182a4.5 4.5 0 116.364 6.364L12 21l-7.682-7.682a4.5 4.5 0 010-6.364z"></path></svg>
                            <svg class="w-6 h-6 text-[var(--accent-love)] heart-solid" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"></path></svg>
                        </button>
                    </div>
                    <p class="block mt-1 text-lg leading-tight font-bold text-[var(--text-header)]">${formatInspiredByName(p.inspiredBy)}</p>
                    <div class="mt-2 text-[var(--text-primary)]">
                        <span class="font-semibold">${typeMap[p.type]}</span> &bull; 
                        <span class="italic cursor-pointer hover:underline find-similar-btn" data-scent-type="${p.scentType}">${p.scentType}</span>
                    </div>
                    <p class="mt-4 text-sm text-[var(--text-primary)] line-clamp-3">${p.description || "No description available."}</p>
                </div>
                <div class="p-6 bg-[var(--bg-tertiary)] flex items-center justify-between">
                     <span class="text-sm font-medium text-[var(--text-secondary)]">Code: ${p.code}</span>
                    <button data-code="${p.code}" class="add-to-cart-btn bg-[var(--border-color)] text-[var(--bg-primary)] p-2 rounded-full hover:bg-[var(--text-primary)] z-10">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    </button>
                </div>`;
            fragment.appendChild(card);
        });
        container.appendChild(fragment);
    }

    function initTableView() {
        grid = new gridjs.Grid({
            columns: [
                { name: 'Brand', formatter: (cell) => gridjs.html(`<span class="cursor-pointer hover:underline brand-link" data-brand="${cell}">${formatBrandName(cell)}</span>`) },
                'Inspired By',
                { name: 'Type', width: '100px' },
                { name: 'Code', width: '120px' },
                { name: 'Scent Type', hidden: true },
                {
                    name: 'Actions',
                    width: '150px',
                    sort: false,
                    formatter: (cell, row) => {
                        const code = row.cells[3].data;
                        const scentType = row.cells[4].data;
                        return gridjs.html(`
                            <div class="flex items-center justify-center space-x-2">
                                <button data-scent-type="${scentType}" class="find-similar-btn text-xs bg-[var(--accent-secondary)] text-white px-2 py-1 rounded-md hover:bg-[var(--accent-primary)]" title="Find Similar">Similar</button>
                                <button data-code="${code}" class="add-to-cart-btn bg-[var(--border-color)] text-[var(--bg-primary)] p-2 rounded-full hover:bg-[var(--text-primary)]"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg></button>
                                <button data-code="${code}" class="favorite-btn ${favorites.includes(code) ? 'favorited' : ''}" title="Favorite"><svg class="w-5 h-5 text-[var(--accent-love)] heart-outline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.5l1.318-1.182a4.5 4.5 0 116.364 6.364L12 21l-7.682-7.682a4.5 4.5 0 010-6.364z"></path></svg><svg class="w-5 h-5 text-[var(--accent-love)] heart-solid" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"></path></svg></button>
                            </div>`);
                    }
                }
            ],
            data: [],
            sort: true,
            pagination: { enabled: true, limit: 15 },
            style: { table: { 'white-space': 'nowrap' } }
        }).render(dom.tableView);
    }

    function renderTableView(perfumes) {
        grid.updateConfig({
            data: perfumes.map(p => [
                p.brand,
                formatInspiredByName(p.inspiredBy),
                typeMap[p.type],
                p.code,
                p.scentType,
                null
            ])
        }).forceRender();
    }

    function switchView(view) { if(view === currentView) return; currentView = view; dom.cardView.classList.toggle('hidden', view !== 'card'); dom.tableViewWrapper.classList.toggle('hidden', view !== 'table'); dom.viewToggleCard.classList.toggle('bg-[var(--accent-primary)]'); dom.viewToggleCard.classList.toggle('text-[var(--bg-primary)]'); dom.viewToggleTable.classList.toggle('bg-[var(--accent-primary)]'); dom.viewToggleTable.classList.toggle('text-[var(--bg-primary)]'); render(true); }
    function findSimilar(scentType) { if(!scentType) return; resetFilters(); dom.searchInput.value = scentType; applyFilters(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    function filterByBrand(brand) { resetFilters(); dom.brandFilter.value = brand; applyFilters(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

    function setupEventListeners() {
        dom.searchInput.addEventListener('input', applyFilters);
        dom.brandFilter.addEventListener('change', applyFilters);
        dom.typeFilter.addEventListener('change', applyFilters);
        dom.favoritesToggle.addEventListener('change', applyFilters);
        
        dom.viewToggleCard.addEventListener('click', () => switchView('card')); 
        dom.viewToggleTable.addEventListener('click', () => switchView('table'));
        dom.loadMoreBtn.addEventListener('click', () => { currentPage++; render(false); });
        dom.resetFiltersBtn.addEventListener('click', resetFilters);

        document.body.addEventListener('click', (e) => {
            const card = e.target.closest('.perfume-card');
            const addToCartBtn = e.target.closest('.add-to-cart-btn');
            const favBtn = e.target.closest('.favorite-btn');
            const removeFromCartBtn = e.target.closest('.remove-from-cart-btn');
            const similarBtn = e.target.closest('.find-similar-btn');
            const brandLink = e.target.closest('.brand-link');

            if (addToCartBtn) { e.stopPropagation(); addToCart(addToCartBtn.dataset.code); }
            else if (favBtn) { e.stopPropagation(); toggleFavorite(favBtn.dataset.code); }
            else if (card) { showPerfumeDetails(card.dataset.code); }
            else if (removeFromCartBtn) removeFromCart(removeFromCartBtn.dataset.code);
            else if (similarBtn) findSimilar(similarBtn.dataset.scentType);
            else if (brandLink) filterByBrand(brandLink.dataset.brand);
            
            if (!dom.theme.switcher.contains(e.target)) dom.theme.menu.classList.add('hidden');
        });

        dom.cart.toggle.addEventListener('click', toggleCart); dom.cart.closeBtn.addEventListener('click', toggleCart); dom.cart.overlay.addEventListener('click', toggleCart); dom.cart.copyBtn.addEventListener('click', copyCartCodes);
        dom.dashboard.toggle.addEventListener('click', toggleDashboard); dom.dashboard.closeBtn.addEventListener('click', toggleDashboard);
        dom.theme.toggleBtn.addEventListener('click', (e) => { e.stopPropagation(); dom.theme.menu.classList.toggle('hidden'); });
        dom.theme.menu.addEventListener('click', (e) => { if(e.target.matches('a[data-theme]')) { e.preventDefault(); applyTheme(e.target.dataset.theme); dom.theme.menu.classList.add('hidden'); } });
        
        dom.perfumeModal.container.addEventListener('click', (e) => { if(e.target === dom.perfumeModal.container) hidePerfumeDetails(); });
    }

    // *** NY FUNKTION: Formaterer noter med farver ***
    function formatNotes(notes) {
        if (!notes) return '<p>Not available.</p>';
        return notes.replace(/<b>Top:<\/b>/g, `<strong style="color: var(--note-top);">Top:</strong>`)
                    .replace(/<b>Heart:<\/b>/g, `<strong style="color: var(--note-heart);">Heart:</strong>`)
                    .replace(/<b>Base:<\/b>/g, `<strong style="color: var(--note-base);">Base:</strong>`);
    }
    
    // *** NY FUNKTION: Viser detaljer i modal ***
    function showPerfumeDetails(code) {
        const perfume = allPerfumes.find(p => p.code === code);
        if (!perfume) return;

        const shobiLink = `https://leparfum.com.gr/en/module/iqitsearch/searchiqit?s=${perfume.code}`;
        const parfumoLink = perfume.link || `https://www.parfumo.com/s_perfumes.php?lt=4&q=${encodeURIComponent(perfume.inspiredBy + ' ' + perfume.brand)}`;
        const parfumoDisabled = !perfume.link ? 'disabled opacity-50 cursor-not-allowed' : '';
        
        dom.perfumeModal.content.innerHTML = `
            <div class="p-6 flex justify-between items-center border-b border-[var(--border-color)]">
                <div>
                    <div class="uppercase tracking-wide text-sm text-[var(--accent-primary)] font-semibold">${formatBrandName(perfume.brand)}</div>
                    <h2 class="text-2xl font-bold text-[var(--text-header)] mt-1">${formatInspiredByName(perfume.inspiredBy)}</h2>
                </div>
                <button id="close-perfume-modal" class="p-2 rounded-full hover:bg-[var(--bg-primary)]">
                    <svg class="w-6 h-6 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <div class="p-6 overflow-y-auto space-y-6">
                <div>
                    <h3 class="font-semibold text-[var(--text-secondary)] mb-2">Description</h3>
                    <p>${perfume.description || "No description available."}</p>
                </div>
                <div>
                    <h3 class="font-semibold text-[var(--text-secondary)] mb-2">Scent Profile</h3>
                    <p class="leading-relaxed">${formatNotes(perfume.notes)}</p>
                </div>
            </div>
            <div class="p-6 mt-auto border-t border-[var(--border-color)] grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a href="${shobiLink}" target="_blank" class="text-center w-full bg-[var(--accent-secondary)] text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-80 transition">Shop at Shobi (${perfume.code})</a>
                <a href="${parfumoLink}" target="_blank" class="text-center w-full bg-[var(--border-color)] text-[var(--bg-primary)] font-bold py-3 px-4 rounded-lg hover:bg-opacity-80 transition ${parfumoDisabled}">View on Parfumo</a>
            </div>
        `;
        
        dom.perfumeModal.container.classList.remove('hidden');
        setTimeout(() => {
            dom.perfumeModal.content.classList.remove('scale-95', 'opacity-0');
            dom.perfumeModal.content.classList.add('scale-100', 'opacity-100');
        }, 10);

        document.getElementById('close-perfume-modal').addEventListener('click', hidePerfumeDetails);
    }

    // *** NY FUNKTION: Skjuler detaljer i modal ***
    function hidePerfumeDetails() {
        dom.perfumeModal.content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            dom.perfumeModal.container.classList.add('hidden');
        }, 300);
    }
    
    function toggleFavorite(code) { const index=favorites.indexOf(code); if(index > -1){favorites.splice(index,1)}else{favorites.push(code)} saveFavorites(); if(dom.favoritesToggle.checked)applyFilters(); document.querySelectorAll(`.favorite-btn[data-code="${code}"]`).forEach(btn=>btn.classList.toggle('favorited',favorites.includes(code))); }
    function addToCart(code) { if (!cart.includes(code)) { cart.push(code); updateCart(); } }
    function removeFromCart(code) { cart = cart.filter(c => c !== code); updateCart(); }
    function updateCart() { dom.cart.count.textContent = cart.length; dom.cart.itemsContainer.innerHTML = ''; dom.cart.emptyMsg.classList.toggle('hidden', cart.length > 0); dom.cart.copyBtn.disabled = cart.length === 0; cart.forEach(code => { const p = allPerfumes.find(p => p.code === code); if (p) { const itemEl = document.createElement('div'); itemEl.className = 'flex items-center justify-between bg-[var(--bg-tertiary)] p-3 rounded-lg shadow-sm'; itemEl.innerHTML = `<div><p class="font-semibold text-[var(--text-secondary)]">${formatInspiredByName(p.inspiredBy)}</p><p class="text-sm text-[var(--text-primary)]">${p.code}</p></div><button data-code="${code}" class="remove-from-cart-btn text-[var(--accent-danger)] p-2 rounded-full hover:bg-[var(--bg-secondary)]"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>`; dom.cart.itemsContainer.appendChild(itemEl); } }); }
    function toggleCart() { dom.cart.sidebar.classList.toggle('translate-x-full'); dom.cart.overlay.classList.toggle('hidden'); }
    function copyCartCodes() { navigator.clipboard.writeText(cart.join('\n')).then(() => { dom.notification.classList.remove('opacity-0','translate-y-2'); setTimeout(() => dom.notification.classList.add('opacity-0','translate-y-2'), 2000); }); }
    function toggleDashboard() { dom.dashboard.modal.classList.toggle('hidden'); if (!dom.dashboard.modal.classList.contains('hidden')) createCharts(); }
    function updateDashboardStats() { dom.dashboard.brandCount.textContent = [...new Set(allPerfumes.map(p => p.brand))].length; dom.dashboard.perfumeTotalCount.textContent = allPerfumes.length; }
    
    function calculateAllStats() {
        const noteCounts = allPerfumes.flatMap(p => p.notesArray).reduce((a, n) => { a[n] = (a[n] || 0) + 1; return a; }, {});
        const sortedNotes = Object.entries(noteCounts).sort(([, a], [, b]) => b - a);
        calculatedStats.topNote = sortedNotes.length > 0 ? formatBrandName(sortedNotes[0][0]) : '-';
        calculatedStats.rarestNote = sortedNotes.length > 0 ? formatBrandName(sortedNotes[sortedNotes.length - 1][0]) : '-';

        const nicheCounts = allPerfumes.filter(p => p.type === 'AR').reduce((a, p) => { a[p.brand] = (a[p.brand] || 0) + 1; return a; }, {});
        const topNiche = Object.entries(nicheCounts).sort(([, a], [, b]) => b - a)[0];
        calculatedStats.topNicheBrand = topNiche ? formatBrandName(topNiche[0]) : 'None';

        const brandCounts = allPerfumes.reduce((a, p) => { a[p.brand] = (a[p.brand] || 0) + 1; return a; }, {});
        const topBrand = Object.entries(brandCounts).sort(([,a],[,b])=>b-a)[0];
        calculatedStats.topOverallBrand = topBrand ? formatBrandName(topBrand[0]) : '-';

        const fruityCount = allPerfumes.filter(p => p.scentType && p.scentType.toLowerCase().includes('fruity')).length;
        calculatedStats.fruityPercentage = allPerfumes.length > 0 ? ((fruityCount / allPerfumes.length) * 100).toFixed(0) : 0;
        
        const unisexCount = allPerfumes.filter(p=> p.type === 'EL').length;
        calculatedStats.unisexPercentage = allPerfumes.length > 0 ? ((unisexCount/allPerfumes.length)*100).toFixed(0) : 0;

        const scentTypeCounts = allPerfumes.reduce((a,p)=>{const type = p.scentType || 'Unknown'; a[type]=(a[type]||0)+1; return a}, {});
        const topScentType = Object.entries(scentTypeCounts).sort(([,a],[,b])=>b-a)[0];
        calculatedStats.topScentType = topScentType ? topScentType[0] : '-';
    }

    function startStatsRotation() {
        if (statsInterval) clearInterval(statsInterval);
        statsInterval = setInterval(updateStatsBanner, 7000);
    }

    function updateStatsBanner() {
        const statsTemplates = [
            { title: "Most Popular Note", value: calculatedStats.topNote },
            { title: "Top Niche Brand", value: calculatedStats.topNicheBrand },
            { title: "Fruity Scent %", value: `${calculatedStats.fruityPercentage}%` },
            { title: "Brand With Most Perfumes", value: calculatedStats.topOverallBrand },
            { title: "Rarest Scent Note", value: calculatedStats.rarestNote },
            { title: "Unisex Perfume %", value: `${calculatedStats.unisexPercentage}%` },
            { title: "Most Common Scent Type", value: calculatedStats.topScentType }
        ];

        const shuffled = statsTemplates.sort(() => 0.5 - Math.random());
        const selectedStats = shuffled.slice(0, 3);
        const statItems = document.querySelectorAll('#stats-banner > div');
        
        statItems.forEach(item => item.classList.add('stat-fade-out'));

        setTimeout(() => {
            statItems.forEach((item, index) => {
                const stat = selectedStats[index];
                if (item && stat) {
                    item.querySelector('h4').textContent = stat.title;
                    item.querySelector('p').textContent = stat.value;
                }
                item.classList.remove('stat-fade-out');
            });
        }, 400);
    }
    
    function getThemeColor(varName) { return getComputedStyle(document.documentElement).getPropertyValue(varName).trim(); }
    function getThemeColorArray(varName) { return getComputedStyle(document.documentElement).getPropertyValue(varName).split(',').map(c => c.trim().replace(/'/g, '')); }

    function createCharts() {
        const textColor = getThemeColor('--text-primary');
        const chartOptions = { color: textColor, font: { family: 'Inter' } };
        const brandData = allPerfumes.reduce((acc,p)=>{acc[p.brand]=(acc[p.brand]||0)+1;return acc},{}); const sortedBrands = Object.entries(brandData).sort(([,a],[,b])=>b-a).slice(0,10);
        if (brandChartInstance) brandChartInstance.destroy();
        brandChartInstance = new Chart(document.getElementById('brandChart'),{type:'bar',data:{labels:sortedBrands.map(i=>formatBrandName(i[0])),datasets:[{label:'Number of Perfumes',data:sortedBrands.map(i=>i[1]),backgroundColor:getThemeColor('--accent-secondary')}]},options:{maintainAspectRatio:false,indexAxis:'y',scales:{y:{ticks:chartOptions},x:{ticks:chartOptions}},plugins:{legend:{labels:chartOptions}}}});
        const scentTypeData=allPerfumes.reduce((acc,p)=>{const type=p.scentType||'Unknown';acc[type]=(acc[type]||0)+1;return acc},{}); const sortedScentTypes=Object.entries(scentTypeData).sort(([,a],[,b])=>b-a).slice(0,10);
        if (scentTypeChartInstance) scentTypeChartInstance.destroy();
        scentTypeChartInstance = new Chart(document.getElementById('scentTypeChart'),{type:'doughnut',data:{labels:sortedScentTypes.map(i=>i[0]),datasets:[{data:sortedScentTypes.map(i=>i[1]),backgroundColor:getThemeColorArray('--chart-doughnut-colors'),borderWidth:0}]},options:{maintainAspectRatio:false,plugins:{legend:{position:'right',labels:chartOptions}}}});
    }
    
    const formatBrandName = (name) => name ? name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '';
    const formatInspiredByName = (name) => name ? name.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ') : '';
    
    init();
});
</script>
</body>
</html>
