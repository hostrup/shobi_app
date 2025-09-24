document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const perfumeList = document.getElementById('perfumeList');
    const brandFilter = document.getElementById('brandFilter');
    let perfumesData = [];
    let allBrands = [];

    // Fetch perfume data from the CORRECT JSON file
    fetch('database_complete.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            perfumesData = data;
            // Extract unique brand names for the filter
            allBrands = [...new Set(perfumesData.map(p => p.brand).filter(b => b).sort())];
            populateBrandFilter(allBrands);
            displayPerfumes(perfumesData);
        })
        .catch(error => {
            console.error("Fejl ved indlæsning af parfumedata:", error);
            perfumeList.innerHTML = '<p style="color: red;">Kunne ikke indlæse parfumedata fra database_complete.json. Tjek filnavnet og konsollen for fejl.</p>';
        });

    // Function to populate the brand filter dropdown
    function populateBrandFilter(brands) {
        brandFilter.innerHTML = '<option value="">Alle Brands</option>'; // Reset
        brands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            brandFilter.appendChild(option);
        });
    }

    // Function to display perfumes on the page
    function displayPerfumes(perfumes) {
        perfumeList.innerHTML = '';
        if (perfumes.length === 0) {
            perfumeList.innerHTML = '<p>Ingen parfumer matcher din søgning.</p>';
            return;
        }
        perfumes.forEach(perfume => {
            const perfumeCard = document.createElement('div');
            perfumeCard.className = 'perfume-card';

            // Safely access notes
            const topNotes = perfume.notes?.top?.join(', ') || 'N/A';
            const heartNotes = perfume.notes?.heart?.join(', ') || 'N/A';
            const baseNotes = perfume.notes?.base?.join(', ') || 'N/A';

            // Construct the purchase link
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

    // Function to filter and search perfumes
    function filterAndSearch() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedBrand = brandFilter.value;

        let filteredPerfumes = perfumesData;

        // Filter by brand first
        if (selectedBrand) {
            filteredPerfumes = filteredPerfumes.filter(perfume => perfume.brand === selectedBrand);
        }

        // Then filter by search term
        if (searchTerm) {
            filteredPerfumes = filteredPerfumes.filter(perfume =>
                (perfume.inspiredBy && perfume.inspiredBy.toLowerCase().includes(searchTerm)) ||
                (perfume.brand && perfume.brand.toLowerCase().includes(searchTerm)) ||
                (perfume.description && perfume.description.toLowerCase().includes(searchTerm))
            );
        }

        displayPerfumes(filteredPerfumes);
    }

    // Event listeners for search and filter
    searchInput.addEventListener('input', filterAndSearch);
    brandFilter.addEventListener('change', filterAndSearch);
});
