document.addEventListener('DOMContentLoaded', function () {
    let perfumes = [];
    let radarChart = null;

    // Funktion til at indlæse parfume-data fra JSON-fil
    function loadPerfumes() {
        fetch('database_complete.json')
            .then(response => response.json())
            .then(data => {
                perfumes = data;
                displayPerfumes(perfumes);
                populateBrandFilter(perfumes);
            })
            .catch(error => console.error('Fejl ved indlæsning af parfume-data:', error));
    }

    // Funktion til at vise parfumer i liste
    function displayPerfumes(perfumeList) {
        const perfumeListElement = document.getElementById('perfumeList');
        perfumeListElement.innerHTML = '';
        perfumeList.forEach(perfume => {
            const listItem = document.createElement('a');
            listItem.href = '#';
            listItem.className = 'list-group-item list-group-item-action';
            listItem.textContent = `${perfume.brand} - ${perfume.inspiredBy}`;
            listItem.onclick = () => {
                displayPerfumeDetails(perfume);
                return false;
            };
            perfumeListElement.appendChild(listItem);
        });
    }

    // Funktion til at vise detaljer for en valgt parfume
    function displayPerfumeDetails(perfume) {
        const perfumeDetailsElement = document.getElementById('perfumeDetails');
        perfumeDetailsElement.innerHTML = '';

        const card = document.createElement('div');
        card.className = 'card bg-dark text-white';

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';

        const title = document.createElement('h5');
        title.className = 'card-title';
        title.textContent = `${perfume.brand} - ${perfume.inspiredBy}`;

        const subtitle = document.createElement('h6');
        subtitle.className = 'card-subtitle mb-2 text-muted';
        subtitle.textContent = `Type: ${perfume.scentType}`;

        const description = document.createElement('p');
        description.className = 'card-text';
        description.textContent = perfume.description;

        const notes = document.createElement('p');
        notes.className = 'card-text';
        notes.innerHTML = `<strong>Duftnoter:</strong><br>${perfume.notes.replace(/<br>/g, '<br>&nbsp;&nbsp;&nbsp;')}`;

        const links = document.createElement('div');
        links.className = 'mt-3';

        const shobiLink = document.createElement('a');
        shobiLink.className = 'btn btn-primary me-2';
        shobiLink.textContent = 'Find på Shobi';
        shobiLink.target = '_blank';
        // RETTELSE: Her tilføjes det korrekte link til Shobi-knappen
        shobiLink.href = `https://leparfum.com.gr/en/module/iqitsearch/searchiqit?s=${perfume.code}`;

        const parfumoLink = document.createElement('a');
        parfumoLink.className = 'btn btn-secondary';
        parfumoLink.textContent = 'Se på Parfumo';
        parfumoLink.href = perfume.link;
        parfumoLink.target = '_blank';

        const chartCanvas = document.createElement('canvas');
        chartCanvas.id = 'radarChart';
        chartCanvas.className = 'mt-4';

        links.appendChild(shobiLink);
        links.appendChild(parfumoLink);
        cardBody.appendChild(title);
        cardBody.appendChild(subtitle);
        cardBody.appendChild(description);
        cardBody.appendChild(notes);
        cardBody.appendChild(links);
        cardBody.appendChild(chartCanvas);
        card.appendChild(cardBody);
        perfumeDetailsElement.appendChild(card);

        createRadarChart(perfume.scentProfile);
    }

    // Funktion til at oprette radar-diagram for duftprofil
    function createRadarChart(scentProfile) {
        const ctx = document.getElementById('radarChart').getContext('2d');
        if (radarChart) {
            radarChart.destroy();
        }
        radarChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: Object.keys(scentProfile),
                datasets: [{
                    label: 'Duftprofil',
                    data: Object.values(scentProfile),
                    // RETTELSE: Her er farverne på diagrammet blevet ændret
                    backgroundColor: 'rgba(211, 54, 130, 0.2)',
                    borderColor: 'rgba(211, 54, 130, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255, 255, 255, 0.2)' },
                        grid: { color: 'rgba(255, 255, 255, 0.2)' },
                        pointLabels: { color: 'white', font: { size: 12 } },
                        ticks: {
                            color: 'white',
                            backdropColor: 'transparent',
                            stepSize: 1
                        },
                        min: 0,
                        max: 5
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: 'white'
                        }
                    }
                }
            }
        });
    }

    // Funktion til at filtrere parfumer baseret på søgning
    function filterPerfumes() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const brandFilter = document.getElementById('brandFilter').value;
        const filteredPerfumes = perfumes.filter(perfume => {
            const brandMatch = brandFilter === '' || perfume.brand === brandFilter;
            const searchMatch = perfume.brand.toLowerCase().includes(searchTerm) ||
                perfume.inspiredBy.toLowerCase().includes(searchTerm) ||
                (perfume.code && perfume.code.toLowerCase().includes(searchTerm));
            return brandMatch && searchMatch;
        });
        displayPerfumes(filteredPerfumes);
    }

    // Funktion til at udfylde brand-filter dropdown
    function populateBrandFilter(perfumes) {
        const brandFilterElement = document.getElementById('brandFilter');
        const brands = [...new Set(perfumes.map(perfume => perfume.brand))];
        brands.sort();
        brands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            brandFilterElement.appendChild(option);
        });
    }

    document.getElementById('searchInput').addEventListener('input', filterPerfumes);
    document.getElementById('brandFilter').addEventListener('change', filterPerfumes);

    loadPerfumes();
});
