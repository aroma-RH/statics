// Éléments DOM
const grilleTravailleurs = document.getElementById('workersGrid');
const champRecherche = document.getElementById('searchInput');
const filtreGroupe = document.getElementById('groupFilter');
const filtreContrat = document.getElementById('contractFilter');
const filtreStatut = document.getElementById('statusFilter');
const modal = document.getElementById('workerModal');
const contenuModal = modal.querySelector('.modal-content');
const boutonFermer = modal.querySelector('.close-button');

// Graphiques
let graphiqueStatut, graphiqueGroupe, graphiqueContrat;

// Point de terminaison de l'API Google Sheets
const URL_API_SHEETS = 'https://script.google.com/macros/s/AKfycbx1_L8ndzZd2W59PcCItx5jM8IsUM0Vs8_977JZm1I1ImncsTI7Q098CLjxK_fvHEWtiQ/exec';

// État
let travailleurs = [];
let groupes = new Set();

// Initialiser les Graphiques
// Graphiques
let graphiqueAge;

// Initialiser les Graphiques
function initialiserGraphiques() {
    // Graphique de distribution des statuts
    const statutCtx = document.getElementById('statusChart').getContext('2d');
    graphiqueStatut = new Chart(statutCtx, {
        type: 'doughnut',
        data: {
            labels: ['Active', 'Changement'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#dcfce7', '#fee2e2'],
                borderColor: ['#166534', '#991b1b'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });

    // Graphique de distribution des groupes
    const groupeCtx = document.getElementById('groupChart').getContext('2d');
    graphiqueGroupe = new Chart(groupeCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Travailleurs par Groupe',
                data: [],
                backgroundColor: '#2563eb',
                borderColor: '#1e40af',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });

    // Graphique de type de contrat
    const contratCtx = document.getElementById('contractChart').getContext('2d');
    graphiqueContrat = new Chart(contratCtx, {
        type: 'pie',
        data: {
            labels: ['AGRI STRATEGIE', 'AGRI SUPPORT', 'BEST PROFIL', 'FARM LABOR', 'AGRICONOMIE'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6'],
                borderColor: ['#2563eb', '#1e40af', '#1d4ed8', '#1e3a8a', '#1e3a8a'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });

    // Graphique de distribution des âges
    const ageCtx = document.getElementById('ageChart').getContext('2d');
    graphiqueAge = new Chart(ageCtx, {
        type: 'bar',
        data: {
            labels: ['18-25', '26-35', '36-45', '46-60', '+60'],
            datasets: [{
                label: 'Travailleurs par Tranche d\'âge',
                data: [0, 0, 0, 0],
                backgroundColor: '#34D399',
                borderColor: '#10B981',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Mettre à jour les Graphiques
function mettreAJourGraphiques(donneesTravailleurs) {
    // Mettre à jour le Graphique de Statut
    const comptesStatut = donneesTravailleurs.reduce((acc, travailleur) => {
        acc[travailleur.status] = (acc[travailleur.status] || 0) + 1;
        return acc;
    }, {});
    
    graphiqueStatut.data.datasets[0].data = [
        comptesStatut['Active'] || 0,
        comptesStatut['Changement'] || 0
    ];
    graphiqueStatut.update();

    // Mettre à jour le Graphique de Groupe
    const comptesGroupe = donneesTravailleurs.reduce((acc, travailleur) => {
        acc[travailleur.group] = (acc[travailleur.group] || 0) + 1;
        return acc;
    }, {});
    
    graphiqueGroupe.data.labels = Object.keys(comptesGroupe);
    graphiqueGroupe.data.datasets[0].data = Object.values(comptesGroupe);
    graphiqueGroupe.update();

    // Mettre à jour le Graphique de Contrat
    const comptesContrat = donneesTravailleurs.reduce((acc, travailleur) => {
        acc[travailleur.contractType] = (acc[travailleur.contractType] || 0) + 1;
        return acc;
    }, {});
    
    const typesContrat = ['AGRI STRATEGIE', 'AGRI SUPPORT', 'BEST PROFIL', 'FARM LABOR', 'AGRICONOMIE'];
    graphiqueContrat.data.datasets[0].data = typesContrat.map(type => comptesContrat[type] || 0);
    graphiqueContrat.update();

    // Mettre à jour le Graphique de Tranches d'Âge
    const comptesAge = [0, 0, 0, 0, 0]; // Indices pour les tranches d'âge [18-25, 26-35, 36-45, 46-60]
    
    donneesTravailleurs.forEach(travailleur => {
        const age = travailleur.AGE;
        if (age >= 18 && age <= 25) {
            comptesAge[0] += 1;
        } else if (age >= 26 && age <= 35) {
            comptesAge[1] += 1;
        } else if (age >= 36 && age <= 45) {
            comptesAge[2] += 1;
        } else if (age >= 46 && age <= 60) {
            comptesAge[3] += 1;
        } else if (age > 60) {
            comptesAge[4] += 1; // New category for age greater than 60
        }
        
    });

    graphiqueAge.data.datasets[0].data = comptesAge;
    graphiqueAge.update();
}


function obtenirStatutEnFonctionDeDateDebut(dateDebut) {
    const debut = new Date(dateDebut);
    const dateActuelle = new Date();
    debut.setMonth(debut.getMonth() + 6);
    return dateActuelle > debut ? 'Changement' : 'Active';
}

function calculerJoursTravailles(dateDebut) {
    const debut = new Date(dateDebut);
    const dateActuelle = new Date();
    const differenceTemps = dateActuelle - debut;
    return Math.floor(differenceTemps / (1000 * 3600 * 24));
}

async function recupererTravailleurs() {
    try {
        const reponse = await fetch(URL_API_SHEETS);
        if (!reponse.ok) throw new Error('Échec de la récupération des données des travailleurs');
        const donnees = await reponse.json();

        travailleurs = donnees.map(travailleur => {
            const statut = obtenirStatutEnFonctionDeDateDebut(travailleur[13]);
            const joursTravailles = calculerJoursTravailles(travailleur[13]);

            return {
                name: travailleur[2],
                role: travailleur[0],
                group: travailleur[10],
                CIN: travailleur[3],
                contractType: travailleur[7],
                startDate: travailleur[13],
                status: statut,
                poste: travailleur[12],
                transport: travailleur[15],
                AGE: travailleur[5],
                daysWorked: joursTravailles
            };
        });

        travailleurs.forEach(travailleur => groupes.add(travailleur.group));
        afficherTravailleurs(travailleurs);
        remplirFiltreGroupe();
        calculerEtAfficherNombreTotalTravailleurs(travailleurs);
        mettreAJourGraphiques(travailleurs);
    } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        grilleTravailleurs.innerHTML = `
            <div class="error-message">
                Impossible de charger les données des travailleurs. Veuillez réessayer plus tard.
            </div>
        `;
    }
}

function calculerEtAfficherNombreTotalTravailleurs(listeTravailleurs) {
    const totalTravailleurs = listeTravailleurs.length;
    const elementTotalTravailleurs = document.getElementById('totalWorkersCount');
    elementTotalTravailleurs.textContent = totalTravailleurs;
}

// Remplir et trier le filtre de Groupe
function remplirFiltreGroupe() {
    filtreGroupe.innerHTML = '<option value="">Tous les Groupes</option>';

    // Convertir le Set en un tableau et le trier par ordre alphabétique
    const groupesTries = Array.from(groupes).sort();

    // Ajouter les groupes triés comme options
    groupesTries.forEach(groupe => {
        const option = document.createElement('option');
        option.value = groupe;
        option.textContent = groupe;
        filtreGroupe.appendChild(option);
    });
}

// Remplir et trier le filtre de Contrat
function remplirFiltreContrat(typesContrat) {
    filtreContrat.innerHTML = '<option value="">Tous les Contrats</option>';

    // Trier les types de contrat par ordre alphabétique (A à Z)
    const contratsTries = typesContrat.sort();

    // Ajouter les types de contrats triés comme options
    contratsTries.forEach(contrat => {
        const option = document.createElement('option');
        option.value = contrat;
        option.textContent = contrat;
        filtreContrat.appendChild(option);
    });
}

function creerCarteTravailleur(travailleur) {
    const carte = document.createElement('div');
    carte.className = 'worker-card';
    carte.innerHTML = `
        <div class="worker-header">
            <div>
                <div class="worker-name">${travailleur.name}</div>
                <div class="worker-role">${travailleur.role}</div>
            </div>
        </div>
        <div class="worker-info">
            <div class="info-item">Groupe: ${travailleur.group}</div>
            <div class="info-item">Contrat: ${travailleur.contractType}</div>
            <div class="info-item">Date de Début: ${travailleur.startDate}</div>
            
            <div class="info-item">Jours Travaillés: ${travailleur.daysWorked} jours</div>
        </div>
        <div class="status-badge ${travailleur.status === 'Active' ? 'status-active' : 'status-changement'}">
            ${travailleur.status}
        </div>
    `;
    
    carte.addEventListener('click', () => afficherDetailsTravailleur(travailleur));
    return carte;
}

function afficherDetailsTravailleur(travailleur) {
    const corpsModal = modal.querySelector('.modal-body');
    corpsModal.innerHTML = `
        <div>
            <h2 style="font-size: 1.5rem; font-weight: 600;">${travailleur.name}</h2>
            <p style="color: #6b7280;">${travailleur.role}</p>
        </div>
        <div>
            <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 1rem;"> Informations</h3>
            <div class="info-item">CIN: ${travailleur.CIN}</div>
            <div class="info-item">Groupe: ${travailleur.group}</div>
            <div class="info-item">Contrat: ${travailleur.contractType}</div>
            <div class="info-item">Date de Début: ${travailleur.startDate}</div>
            <div class="info-item">Age: ${travailleur.AGE} ans</div>
            <div class="info-item">Jours Travaillés: ${travailleur.daysWorked} jours</div>
            <div class="info-item">Statut: 
                <span class="status-badge ${travailleur.status === 'Active' ? 'status-active' : 'status-changement'}">${travailleur.status}</span>
            </div>
        </div>
        <div>
            <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 1rem;">Informations Supplémentaires</h3>
            <div class="info-item">Poste: ${travailleur.poste}</div>
            <div class="info-item">Transport: ${travailleur.transport}</div>
        </div>
    `;
    modal.style.display = 'block';
}

function fermerModal() {
    modal.style.display = 'none';
}

function filtrerTravailleurs() {
    const termeRecherche = champRecherche.value.toLowerCase();
    const groupeSelectionne = filtreGroupe.value;
    const contratSelectionne = filtreContrat.value;
    const statutSelectionne = filtreStatut.value;

    const travailleursFiltres = travailleurs.filter(travailleur => {
        const correspondRecherche = travailleur.name.toLowerCase().includes(termeRecherche);
        const correspondGroupe = !groupeSelectionne || travailleur.group === groupeSelectionne;
        const correspondContrat = !contratSelectionne || travailleur.contractType === contratSelectionne;
        const correspondStatut = !statutSelectionne || travailleur.status === statutSelectionne;

        return correspondRecherche && correspondGroupe && correspondContrat && correspondStatut;
    });

    afficherTravailleurs(travailleursFiltres);
    calculerEtAfficherNombreTotalTravailleurs(travailleursFiltres);
    mettreAJourGraphiques(travailleursFiltres);
}

function afficherTravailleurs(travailleursARendre) {
    grilleTravailleurs.innerHTML = '';
    travailleursARendre.forEach(travailleur => {
        grilleTravailleurs.appendChild(creerCarteTravailleur(travailleur));
    });
}

// Écouteurs d'événements
champRecherche.addEventListener('input', filtrerTravailleurs);
filtreGroupe.addEventListener('change', filtrerTravailleurs);
filtreContrat.addEventListener('change', filtrerTravailleurs);
filtreStatut.addEventListener('change', filtrerTravailleurs);
boutonFermer.addEventListener('click', fermerModal);
window.addEventListener('click', (e) => {
    if (e.target === modal) fermerModal();
});

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    initialiserGraphiques();
    recupererTravailleurs();
});

$(document).ready(function() {
    // Exemple de données de groupe
    // Remplir le dropdown avec les groupes
    const selectGroupe = $("#groupFilter");
    groupes.sort(); // Trier les groupes par ordre alphabétique de A à Z
    groupes.forEach(groupe => {
      selectGroupe.append(new Option(groupe, groupe));
    });

    // Initialiser select2 pour la fonctionnalité de recherche
    selectGroupe.select2({
      placeholder: "Sélectionner un groupe",
      allowClear: true
    });
});
