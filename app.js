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
const URL_API_SHEETS = 'https://script.google.com/macros/s/AKfycbzpWGznMf1qKNyevSOyfs2n8TaUiO43wL_STwp8Eq92eVl1MK0XNYdd2bTWSKi_OHTelQ/exec';

// État
let travailleurs = [];
let groupes = new Set();


let graphiqueAge;


function initialiserGraphiques() {

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


    const ageCtx = document.getElementById('ageChart').getContext('2d');
    graphiqueAge = new Chart(ageCtx, {
        type: 'bar',
        data: {
            labels: ['18-25', '25-35', '35-45', '45-50', '50-65'],
            datasets: [{
                label: 'Ouvrirs par Tranche d\'âge',
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


function mettreAJourGraphiques(donneesTravailleurs) {

    const comptesStatut = donneesTravailleurs.reduce((acc, travailleur) => {
        acc[travailleur.status] = (acc[travailleur.status] || 0) + 1;
        return acc;
    }, {});
    
    graphiqueStatut.data.datasets[0].data = [
        comptesStatut['Active'] || 0,
        comptesStatut['Changement'] || 0
    ];
    graphiqueStatut.update();

  
    const comptesGroupe = donneesTravailleurs.reduce((acc, travailleur) => {
        acc[travailleur.group] = (acc[travailleur.group] || 0) + 1;
        return acc;
    }, {});
    
    graphiqueGroupe.data.labels = Object.keys(comptesGroupe);
    graphiqueGroupe.data.datasets[0].data = Object.values(comptesGroupe);
    graphiqueGroupe.update();

   
    const comptesContrat = donneesTravailleurs.reduce((acc, travailleur) => {
        acc[travailleur.contractType] = (acc[travailleur.contractType] || 0) + 1;
        return acc;
    }, {});
    
    const typesContrat = ['AGRI STRATEGIE', 'AGRI SUPPORT', 'BEST PROFIL', 'FARM LABOR', 'AGRICONOMIE'];
    
  
    const totalContrats = Object.values(comptesContrat).reduce((sum, value) => sum + value, 0);
    
    
    const dataWithPercentage = typesContrat.map(type => {
        const count = comptesContrat[type] || 0;
        const percentage = totalContrats > 0 ? ((count / totalContrats) * 100).toFixed(1) : 0;
        return { count, label: `${type} (${percentage}%)` };
    });
    
    // تحديث الرسم البياني
    graphiqueContrat.data.datasets[0].data = dataWithPercentage.map(item => item.count);
    graphiqueContrat.data.labels = dataWithPercentage.map(item => item.label);
    graphiqueContrat.update();
    

  
    const comptesAge = [0, 0, 0, 0, 0]; 
    
    donneesTravailleurs.forEach(travailleur => {
        const age = travailleur.AGE;
        if (age >= 18 && age < 25) {
            comptesAge[0] += 1;
        } else if (age >= 25 && age < 35) {
            comptesAge[1] += 1;
        } else if (age >= 35 && age < 45) {
            comptesAge[2] += 1;
        } else if (age >= 45 && age < 50) {
            comptesAge[3] += 1;
        } else if (age >= 50 && age < 65) {
            comptesAge[4] += 1; 
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

function afficherMoyenneAge(averageAge) {
    // Select the element where you want to display the average age
    const averageAgeElement = document.getElementById('average-age');
    averageAgeElement.textContent = averageAge.toFixed(2);  // Display with 2 decimal places
}
function formaterDate(date) {
  // Function to format the date as dd/mmm/yyyy
  const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString('en-GB', options).replace(/ /g, '/');
}
async function recupererTravailleurs() {0
    try {
        const reponse = await fetch(URL_API_SHEETS);
        if (!reponse.ok) throw new Error('Échec de la récupération des données des travailleurs');
        const donnees = await reponse.json();

        let totalAge = 0;
        let totalWorkers = 0;

        travailleurs = donnees.map(travailleur => {
            const statut = obtenirStatutEnFonctionDeDateDebut(travailleur[23]);
            const joursTravailles = calculerJoursTravailles(travailleur[23]);
            const age = parseInt(travailleur[5], 10); // Ensure age is an integer
            const startDateFormatted = formaterDate(travailleur[23]);
            

            // Check if age is a valid number and only add to total if it is
            if (!isNaN(age) && age > 0) {
                totalAge += age;
                totalWorkers += 1;
            }

            return {
                name: travailleur[2],
                role: travailleur[0],
                group: travailleur[10],
                CIN: travailleur[3],
                contractType: travailleur[7],
                startDate: startDateFormatted,
                status: statut,
                poste: travailleur[12],
                transport: travailleur[15],
                AGE: age,
                daysWorked: joursTravailles
            };
        });

        // Calculate the average age
        const averageAge = totalWorkers > 0 ? totalAge / totalWorkers : 0;
        afficherMoyenneAge(averageAge);  // Call to update the average age in the UI

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
