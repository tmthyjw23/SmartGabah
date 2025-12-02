lucide.createIcons();

// --- Selectors ---
const els = {
    inputs: document.querySelectorAll('.cost-input'),
    harvest: document.getElementById('inputHarvestResult'),
    sliderFarmer: document.getElementById('sliderFarmer'),
    sliderGov: document.getElementById('sliderGov'),
    inputTrader: document.getElementById('inputTraderPrice'),
    
    // Labels
    labelFarmer: document.getElementById('labelFarmerPct'),
    labelGov: document.getElementById('labelGovPct'),
    valFarmerRp: document.getElementById('valFarmerRp'),
    valGovRp: document.getElementById('valGovRp'),
    govWarning: document.getElementById('govWarning'),
    
    // Displays - PERBAIKAN: Selector ini ditambahkan agar JS bisa mengubah teksnya
    displayTotalCostInput: document.getElementById('displayTotalCostInput'),
    displayRiceResult: document.getElementById('displayRiceResult'),
    
    // Display Results
    dHPP: document.getElementById('displayHPP'),
    dFarmer: document.getElementById('displayFarmerPrice'),
    dGov: document.getElementById('displayGovPrice'),
    lossPanel: document.getElementById('lossPanel'),
    displayTotalLoss: document.getElementById('displayTotalLoss'),
    
    // Status Banner
    banner: document.getElementById('statusBanner'),
    statusTitle: document.getElementById('statusTitle'),
    statusDesc: document.getElementById('statusDesc'),
    statusIcon: document.getElementById('statusIcon'),
    actionBtn: document.getElementById('actionBtn'),
    
    inputSection: document.getElementById('inputSection'),
    resultGrid: document.getElementById('resultGrid')
};

const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
const formatNum = (n) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n);

let isPuso = false;
let chart = null;

function calculate() {
    // 1. Costs & Total Cost Display (PERBAIKAN LOGIKA TOTAL BIAYA)
    let totalCost = 0;
    // Re-query inputs every calculation to ensure all fields are captured correctly
    const currentInputs = document.querySelectorAll('.cost-input');
    currentInputs.forEach(i => totalCost += Number(i.value) || 0);
    
    // Update Tampilan Total Biaya
    if(els.displayTotalCostInput) {
        els.displayTotalCostInput.innerText = formatRp(totalCost);
    }

    // 2. Harvest & Rice Conversion (PERBAIKAN LOGIKA BERAS)
    const harvest = Number(els.harvest.value) || 0;
    const riceResult = harvest > 0 ? (harvest / 1.57) : 0;
    
    // Update Tampilan Hasil Beras
    if(els.displayRiceResult) {
        els.displayRiceResult.innerText = formatNum(riceResult);
    }

    const hpp = harvest > 0 ? totalCost / harvest : 0;

    // 3. Percentages & Constraints
    let pFarmer = Number(els.sliderFarmer.value);
    let pGov = Number(els.sliderGov.value);

    if (pGov < pFarmer) {
        els.govWarning.classList.remove('hidden');
    } else {
        els.govWarning.classList.add('hidden');
    }
    
    // 4. Prices
    const marginFarmer = hpp * (pFarmer/100);
    const marginGov = hpp * (pGov/100);
    
    const priceFarmer = hpp + marginFarmer;
    const priceGov = hpp + marginGov;
    
    // 5. Trader Input Logic
    const priceTrader = Number(els.inputTrader.value) || 0;

                const marginFarmerPerBeras = marginFarmer * 1.57;
                const marginGovPerBeras = marginGov * 1.57;
    
                // 6. Update UI Labels
                els.labelFarmer.innerText = pFarmer + '%';
                els.valFarmerRp.innerText = `(+${formatRp(marginFarmerPerBeras)})`;
    
                els.labelGov.innerText = pGov + '%';
                els.valGovRp.innerText = `(+${formatRp(marginGovPerBeras)})`;
    // 7. Update Result Cards
                if (!isPuso) {
                    els.dHPP.innerText = formatRp(hpp * 1.57);
                    els.dFarmer.innerText = formatRp(priceFarmer * 1.57);
                    els.dGov.innerText = formatRp(priceGov * 1.57);
                    els.lossPanel.classList.add('hidden');
                } else {
                    els.dHPP.innerText = "-";
                    els.dFarmer.innerText = "-";
                    els.dGov.innerText = "-";
                    els.lossPanel.classList.remove('hidden');
                    els.displayTotalLoss.innerText = formatRp(totalCost);
                }
    // 8. Update Status Logic
    updateStatus(isPuso, priceTrader, priceGov, priceFarmer, hpp);
    updateChart(isPuso, hpp, priceFarmer, priceGov, priceTrader);
}

function updateStatus(puso, traderPrice, govPrice, farmerPrice, hpp) {

    // Reset Banner Style

    els.banner.className = "rounded-xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-500";

    els.actionBtn.classList.add('hidden');

    

    const govPricePerBeras = govPrice * 1.57;

    const farmerPricePerBeras = farmerPrice * 1.57;

    const highLimit = govPricePerBeras + (govPricePerBeras * 0.50); // 50% limit trigger



    let iconName = 'thumbs-up'; // Default icon



    if (puso) {

        els.banner.classList.add('bg-red-700', 'animate-status-danger');

        els.statusTitle.innerText = "DARURAT: GAGAL PANEN";

        els.statusDesc.innerText = "Produksi nol. Kerugian masif terdeteksi.";

        iconName = 'alert-octagon';

        els.actionBtn.innerText = "LAKUKAN OPERASI PASAR";

        els.actionBtn.classList.remove('hidden');

    } 

    else if (hpp <= 0) {

        els.banner.classList.add('bg-gray-500');

        els.statusTitle.innerText = "DATA BELUM LENGKAP";

        els.statusDesc.innerText = "Mohon lengkapi data biaya dan hasil panen.";

        iconName = 'help-circle';

    }

    else if (traderPrice > highLimit) {

        els.banner.classList.add('bg-red-600', 'animate-status-danger');

        els.statusTitle.innerText = "HARGA PASAR MELONJAK";

        els.statusDesc.innerText = `Tawaran pedagang (${formatRp(traderPrice)}) melebihi 50% batas pemerintah (${formatRp(highLimit)}).`;

        iconName = 'trending-up';

        els.actionBtn.innerText = "LAKUKAN OPERASI PASAR";

        els.actionBtn.classList.remove('hidden');

    }

    else if (traderPrice < farmerPricePerBeras && traderPrice > 0) { // Using Farmer Target as baseline for warning

        els.banner.classList.add('bg-yellow-500', 'animate-status-warning');

        els.statusTitle.innerText = "PETANI TIDAK UNTUNG";

        els.statusDesc.innerText = `Tawaran Harga Beras di bawah target jual petani (${formatRp(farmerPricePerBeras)}).`;

        iconName = 'thumbs-down';

    }

    else {

        els.banner.classList.add('bg-emerald-600');

        els.statusTitle.innerText = "PASAR KONDUSIF";

        els.statusDesc.innerText = "Harga tawaran pedagang dalam rentang wajar dan menguntungkan.";

        iconName = 'thumbs-up';

    }

    

    // Update the icon

    els.statusIcon.innerHTML = `<i data-lucide="${iconName}" class="w-8 h-8 text-white"></i>`;

    lucide.createIcons();

}

function togglePuso(state) {
    isPuso = state;
    if(isPuso) {
        els.inputSection.classList.add('opacity-50', 'pointer-events-none', 'grayscale');
        els.resultGrid.classList.add('opacity-50');
    } else {
        els.inputSection.classList.remove('opacity-50', 'pointer-events-none', 'grayscale');
        els.resultGrid.classList.remove('opacity-50');
    }
    calculate();
}

function updateChart(puso, hpp, farmer, gov, trader) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    
    // Convert gabah prices to beras prices
    const hppPerBeras = hpp * 1.57;
    const farmerPerBeras = farmer * 1.57;
    const govPerBeras = gov * 1.57;

    const data = puso ? [0, 0, 0, 0] : [hppPerBeras, farmerPerBeras, govPerBeras, trader];
    
    if (chart) {
        chart.data.datasets[0].data = data;
        chart.update();
    } else {
        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['HPP', 'Target Petani', 'Batas Pemerintah', 'Tawaran Pedagang'],
                datasets: [{
                    label: 'Harga (Rp/Kg)',
                    data: data,
                    backgroundColor: ['#9ca3af', '#22c55e', '#3b82f6', '#f97316'],
                    borderRadius: 6,
                    barThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}

// Listeners - Note: Since HTML inputs might be re-rendered or added, we should bind dynamically or ensure all cost-inputs are bound
// For simplicity in this structure, we just bind all existing ones.
document.querySelectorAll('.cost-input').forEach(i => i.addEventListener('input', calculate));

els.harvest.addEventListener('input', calculate);
els.sliderFarmer.addEventListener('input', calculate);
els.sliderGov.addEventListener('input', calculate);
els.inputTrader.addEventListener('input', calculate);

// Init
calculate();
