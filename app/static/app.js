// app.js

// Funzioni per la gestione delle startup selezionate
let selectedStartups = [];

function toggleStartupSelection(startupId) {
    const index = selectedStartups.indexOf(startupId);
    if (index === -1) {
        selectedStartups.push(startupId);
    } else {
        selectedStartups.splice(index, 1);
    }
    updateSelectedCounter();
}

function updateSelectedCounter() {
    const counter = document.getElementById('selected-counter');
    if (counter) {
        counter.textContent = selectedStartups.length;
    }
}

async function generatePDF() {
    if (selectedStartups.length === 0) {
        alert('Seleziona almeno una startup per generare il report');
        return;
    }
    console.log('Generazione PDF per le startup selezionate:', selectedStartups);
    // Invia le startup selezionate al server per generare il PDF
    try {
        const response = await fetch('/api/generate-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ selectedStartups })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `startup_report_${new Date().toISOString().slice(0,10)}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            console.error(response);
            throw new Error('Errore nella generazione del PDF');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Errore durante la generazione del PDF');
    }
}

// Funzioni modificate per usare le API
async function loadDashboard() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        // Update stats
        document.getElementById('total-startups').textContent = data.totalStartups;
        document.getElementById('total-connections').textContent = data.totalConnections;
        document.getElementById('total-sectors').textContent = data.totalSectors;
        
        // Load recent startups
        const container = document.getElementById('recent-startups');
        container.innerHTML = '';
        
        data.recentStartups.forEach(startup => {
            container.appendChild(createStartupCard(startup));
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function addStartup(event) {
    event.preventDefault();
    
    const startupData = {
        companyName: document.getElementById('company-name').value,
        website: document.getElementById('website').value,
        ceoContact: document.getElementById('ceo-contact').value,
        description: document.getElementById('description').value,
        offering: document.getElementById('offering').value,
        sector: document.getElementById('sector').value,
        seeking: document.getElementById('seeking').value,
        target: document.getElementById('target').value
    };
    
    try {
        const response = await fetch('/api/startups', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(startupData)
        });
        
        if (response.ok) {
            // Reset form
            document.getElementById('startup-form').reset();
            
            // Show success message
            alert('✅ Startup aggiunta con successo!');
            
            // Refresh data
            loadDashboard();
            loadBrowseFilters();
        } else {
            throw new Error('Failed to add startup');
        }
    } catch (error) {
        console.error('Error adding startup:', error);
        alert('❌ Errore durante l\'aggiunta della startup');
    }
}

async function loadBrowseFilters() {
    try {
        const response = await fetch('/api/startups');
        const startups = await response.json();
        
        const sectorFilter = document.getElementById('filter-sector');
        const sectors = [...new Set(startups.map(s => s.sector))].sort();
        
        // Clear existing options (except "All")
        sectorFilter.innerHTML = '<option value="">Tutti i settori</option>';
        
        sectors.forEach(sector => {
            if (sector) {
                const option = document.createElement('option');
                option.value = sector;
                option.textContent = sector;
                sectorFilter.appendChild(option);
            }
        });
    } catch (error) {
        console.error('Error loading filters:', error);
    }
}

async function applyFilters() {
    const sectorFilter = document.getElementById('filter-sector').value;
    const searchFilter = document.getElementById('filter-search').value.toLowerCase();
    const seekingFilter = document.getElementById('filter-seeking').value.toLowerCase();
    
    try {
        const response = await fetch('/api/startups');
        let startups = await response.json();
        
        let filtered = startups.filter(startup => {
            const matchesSector = !sectorFilter || startup.sector === sectorFilter;
            const matchesSearch = !searchFilter || startup.companyName.toLowerCase().includes(searchFilter);
            const matchesSeeking = !seekingFilter || (startup.seeking && startup.seeking.toLowerCase().includes(seekingFilter));
            
            return matchesSector && matchesSearch && matchesSeeking;
        });
        
        const container = document.getElementById('filtered-startups');
        container.innerHTML = '';
        
        if (filtered.length === 0) {
            container.innerHTML = '<p>Nessuna startup trovata con i filtri selezionati.</p>';
            return;
        }
        
        filtered.forEach(startup => {
            container.appendChild(createStartupCard(startup, true));
        });
    } catch (error) {
        console.error('Error applying filters:', error);
    }
}

async function loadFilteredStartups() {
    // Resetta le selezioni quando si applicano nuovi filtri
    selectedStartups = [];
    updateSelectedCounter();

    await applyFilters();
}

function createStartupCard(startup, showActions = false) {
    const card = document.createElement('div');
    card.className = 'startup-card';
    
    // Aggiunge classe 'selected' se la startup è selezionata
    if (selectedStartups.includes(startup.id)) {
        card.classList.add('selected');
    }
    
    card.innerHTML = `
        ${showActions ? `
            <div class="selection-checkbox">
                <input type="checkbox" id="select-${startup.id}" 
                    onchange="toggleStartupSelection(${startup.id}, this)"
                    ${selectedStartups.includes(startup.id) ? 'checked' : ''}>
                <label for="select-${startup.id}"></label>
            </div>
        ` : ''}
        <h3>${startup.companyName}</h3>
        ${startup.website ? `<a href="${startup.website}" target="_blank" class="website">🌐 ${startup.website}</a>` : ''}
        <div class="field"><strong>CEO:</strong> ${startup.ceoContact}</div>
        <div class="field"><strong>Settore:</strong> ${startup.sector}</div>
        <div class="field"><strong>Descrizione:</strong> ${startup.description}</div>
        ${showActions ? `
            <div class="actions">
                <button class="btn btn-success btn-small" onclick="openConnectionModal(${startup.id}, '${startup.companyName}')">
                    🤝 Crea Connessione
                </button>
                <button class="btn btn-primary btn-small" onclick="openEditModal(${JSON.stringify(startup).replace(/"/g, '&quot;')})">
                    ✏️ Modifica
                </button>
                <button class="btn btn-secondary btn-small" onclick="deleteStartup(${startup.id})">
                    🗑️ Elimina
                </button>
            </div>
        ` : ''}
    `;
    
    return card;
}

function toggleStartupSelection(startupId, checkboxElement) {
    const index = selectedStartups.indexOf(startupId);
    if (index === -1) {
        selectedStartups.push(startupId);
        if (checkboxElement) {
            checkboxElement.checked = true;
            checkboxElement.parentElement.parentElement.classList.add('selected');
        }
    } else {
        selectedStartups.splice(index, 1);
        if (checkboxElement) {
            checkboxElement.checked = false;
            checkboxElement.parentElement.parentElement.classList.remove('selected');
        }
    }
    updateSelectedCounter();
}

function clearFilters() {
    document.getElementById('filter-sector').value = '';
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-seeking').value = '';
    applyFilters();
}

function openConnectionModal(startupId, startupName) {
    document.getElementById('selected-startup-id').value = startupId;
    document.querySelector('.modal-content h2').textContent = `Crea Connessione Commerciale con ${startupName}`;
    document.getElementById('connection-modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('connection-modal').style.display = 'none';
    document.getElementById('connection-form').reset();
}

async function createConnection(event) {
    event.preventDefault();
    
    const startupId = parseInt(document.getElementById('selected-startup-id').value);
    const startupName = document.querySelector('.modal-content h2').textContent.replace('Crea Connessione Commerciale con ', '');
    
    const connectionData = {
        startupId: startupId,
        startupName: startupName,
        contactCompany: document.getElementById('contact-company').value,
        contactPerson: document.getElementById('contact-person').value,
        contactEmail: document.getElementById('contact-email').value,
        notes: document.getElementById('connection-notes').value
    };
    
    try {
        const response = await fetch('/api/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(connectionData)
        });
        
        if (response.ok) {
            closeModal();
            alert('✅ Connessione commerciale creata con successo!');
            
            // Refresh dashboard stats
            loadDashboard();
            loadEvents();
        } else {
            throw new Error('Failed to create connection');
        }
    } catch (error) {
        console.error('Error creating connection:', error);
        alert('❌ Errore durante la creazione della connessione');
    }
}

async function loadEvents() {
    try {
        const response = await fetch('/api/events');
        const events = await response.json();
        
        const container = document.getElementById('events-list');
        container.innerHTML = '';
        
        if (events.length === 0) {
            container.innerHTML = '<p>Nessun evento commerciale registrato.</p>';
            return;
        }
        
        events.forEach(event => {
            const eventItem = document.createElement('div');
            eventItem.className = 'event-item';
            
            const date = new Date(event.createdAt).toLocaleDateString('it-IT');
            
            eventItem.innerHTML = `
                <div class="event-date">${date}</div>
                <strong>Connessione creata: ${event.startupName} ↔ ${event.contactCompany}</strong><br>
                <strong>Contatto:</strong> ${event.contactPerson} ${event.contactEmail ? `(${event.contactEmail})` : ''}<br>
                ${event.notes ? `<strong>Note:</strong> ${event.notes}` : ''}
            `;
            
            container.appendChild(eventItem);
        });
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

async function deleteStartup(startupId) {
    if (confirm('Sei sicuro di voler eliminare questa startup?')) {
        try {
            const response = await fetch(`/api/startups/${startupId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                // Refresh all data
                loadDashboard();
                loadBrowseFilters();
                loadFilteredStartups();
                loadEvents();
                
                alert('✅ Startup eliminata con successo!');
            } else {
                throw new Error('Failed to delete startup');
            }
        } catch (error) {
            console.error('Error deleting startup:', error);
            alert('❌ Errore durante l\'eliminazione della startup');
        }
    }
}

function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    
    // Reload data if needed
    if (tabName === 'dashboard') {
        loadDashboard();
    } else if (tabName === 'browse') {
        loadFilteredStartups();
    } else if (tabName === 'events') {
        loadEvents();
    }
}

function openEditModal(startup) {
    // Popola il form con i dati esistenti
    document.getElementById('edit-company-name').value = startup.companyName;
    document.getElementById('edit-website').value = startup.website || '';
    document.getElementById('edit-ceo-contact').value = startup.ceoContact;
    document.getElementById('edit-description').value = startup.description;
    document.getElementById('edit-offering').value = startup.offering;
    document.getElementById('edit-sector').value = startup.sector;
    document.getElementById('edit-seeking').value = startup.seeking || '';
    document.getElementById('edit-target').value = startup.target || '';
    document.getElementById('edit-startup-id').value = startup.id;
    
    // Mostra il modal
    document.getElementById('edit-modal').style.display = 'block';
}

async function updateStartup(event) {
    event.preventDefault();
    
    const startupId = parseInt(document.getElementById('edit-startup-id').value);
    const startupData = {
        companyName: document.getElementById('edit-company-name').value,
        website: document.getElementById('edit-website').value,
        ceoContact: document.getElementById('edit-ceo-contact').value,
        description: document.getElementById('edit-description').value,
        offering: document.getElementById('edit-offering').value,
        sector: document.getElementById('edit-sector').value,
        seeking: document.getElementById('edit-seeking').value,
        target: document.getElementById('edit-target').value
    };
    
    try {
        const response = await fetch(`/api/startups/${startupId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(startupData)
        });
        
        if (response.ok) {
            // Chiudi il modal
            document.getElementById('edit-modal').style.display = 'none';
            setTimeout(() => {
                alert('✅ Startup aggiornata con successo!');
            }, 2000);
            
            // Ricarica i dati
            loadFilteredStartups();
            loadDashboard();
        } else {
            throw new Error('Failed to update startup');
        }
    } catch (error) {
        console.error('Error updating startup:', error);
        alert('❌ Errore durante l\'aggiornamento della startup');
    }
}

// Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
    loadDashboard();
    loadBrowseFilters();
    loadFilteredStartups();
    loadEvents();
    
    // Form submissions
    document.getElementById('startup-form').addEventListener('submit', addStartup);
    document.getElementById('connection-form').addEventListener('submit', createConnection);
    
    // Filter events
    document.getElementById('filter-sector').addEventListener('change', applyFilters);
    document.getElementById('filter-search').addEventListener('input', applyFilters);
    document.getElementById('filter-seeking').addEventListener('input', applyFilters);
    document.getElementById('edit-form').addEventListener('submit', updateStartup);
    
    // Modal events
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('connection-modal');
        if (event.target === modal) {
            closeModal();
        }
    });
});