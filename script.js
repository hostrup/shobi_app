document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const searchInput = document.getElementById('searchInput');
    const perfumeList = document.getElementById('perfumeList');
    const brandFilter = document.getElementById('brandFilter');
    const themeToggle = document.getElementById('theme-toggle');
    const totalPerfumesEl = document.getElementById('total-perfumes');
    const totalBrandsEl = document.getElementById('total-brands');

    let perfumesData = [];
    let allBrands = [];

    // --- THEME MANAGEMENT ---
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        let theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
    });

    // --- DATA FETCHING & INITIALIZATION ---
    fetch('database_complete.json')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            perfumesData = data;
            allBrands = [...new Set(perfumesData.map(p => p.brand).filter(b => b).sort())];
            
            updateStatistics(perfumesData.length, allBrands.length);
            populateBrandFilter(allBrands);
            displayPerfumes(perfumesData);
        })
        .catch(error => {
            console.error("Fejl ved indlæsning af parfumedata:", error);
            perfumeList.innerHTML = `<p style="color: red;">Kunne ikke indlæse parfumedata fra database_complete.json. Tjek filnavnet og konsollen.</p>`;
        });

    // --- UI UPDATE FUNCTIONS ---
    function updateStatistics(perfumeCount, brandCount) {
        totalPerfumesEl.textContent = perfumeCount;
        totalBrandsEl.textContent = brandCount;
    }
    
    function populateBrandFilter(brands) {
        brandFilter.innerHTML = '<option value="">Alle Brands</option>';
        brands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            brandFilter.appendChild(option);
        });
    }

    function displayPerfumes(perfumes) {
        perfumeList.innerHTML = '';
        if (perfumes.length === 0) {
            perfumeList.innerHTML = '<p>Ingen parfumer matcher din søgning.</p>';
            return;
        }
        perfumes.forEach(perfume => {
            const perfumeCard = document.createElement('div');
            perfumeCard.className = 'perfume-card';

            const topNotes = perfume.notes?.top?.join(', ') || 'N/A';
            const heartNotes = perfume.notes?.heart?.join(', ') || 'N/A';
            const baseNotes = perfume.notes?.base?.join(', ') || 'N/A';
            const shobiLink = `https://leparfum.com.gr/en/products/${perfume.code}`;

            perfumeCard.innerHTML = `
                <h3>${perfume.inspiredBy}</h3>
                <p class="brand-name"><strong>Brand:</strong> ${perfume.brand || 'N/A'}</p>
                <p class="description">${perfume.description || 'Ingen beskrivelse.'}</p>
                <div class="notes">
                    <p><strong>Topnoter:</strong> ${topNotes}</p>
                    <p><strong>Hjertenoter:</strong> ${heartNotes}</p>
                    <p><strong>Basenoter:</strong> ${baseNotes}</p>
                </div>
                <div class="details">
                    <p><strong>Dufttype:</strong> ${perfume.scentType || 'N/A'}</p>
                    <p><strong>Anledning:</strong> ${perfume.occasions?.join(', ') || 'N/A'}</p>
                    <p><strong>Sæson:</strong> ${perfume.seasons?.join(', ') || 'N/A'}</p>
                </div>
                <a href="${shobiLink}" class="shobi-link" target="_blank">Køb hos Shobi (Kode: ${perfume.code})</a>
            `;
            perfumeList.appendChild(perfumeCard);
        });
    }

    // --- FILTER & SEARCH LOGIC ---
    function filterAndSearch() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedBrand = brandFilter.value;

        let filteredPerfumes = perfumesData;

        if (selectedBrand) {
            filteredPerfumes = filteredPerfumes.filter(p => p.brand === selectedBrand);
        }

        if (searchTerm) {
            filteredPerfumes = filteredPerfumes.filter(p =>
                (p.inspiredBy && p.inspiredBy.toLowerCase().includes(searchTerm)) ||
                (p.brand && p.brand.toLowerCase().includes(searchTerm)) ||
                (p.description && p.description.toLowerCase().includes(searchTerm))
            );
        }

        displayPerfumes(filteredPerfumes);
    }

    // --- EVENT LISTENERS ---
    searchInput.addEventListener('input', filterAndSearch);
    brandFilter.addEventListener('change', filterAndSearch);
});
