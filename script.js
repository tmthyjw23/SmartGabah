// Initial setup
lucide.createIcons();

// --- SELECTORS ---
const els = {
    inputs: document.querySelectorAll('.cost-input'),
    harvest: document.getElementById('inputHarvestResult'),
    sliderFarmer: document.getElementById('sliderFarmer'),
    sliderGov: document.getElementById('sliderGov'),
    inputTrader: document.getElementById('inputTraderPrice'),
    labelFarmer: document.getElementById('labelFarmerPct'),
    labelGov: document.getElementById('labelGovPct'),
    valFarmerRp: document.getElementById('valFarmerRp'),
    valGovRp: document.getElementById('valGovRp'),
    displayRiceResult: document.getElementById('displayRiceResult'),
    dHPP: document.getElementById('displayHPP'),
    dFarmer: document.getElementById('displayFarmerPrice'),
    dGov: document.getElementById('displayGovPrice'),
    lossPanel: document.getElementById('lossPanel'),
    displayTotalLoss: document.getElementById('displayTotalLoss'),
    banner: document.getElementById('statusBanner'),
    statusTitle: document.getElementById('statusTitle'),
    statusDesc: document.getElementById('statusDesc'),
    statusIcon: document.getElementById('statusIcon'),
    actionBtn: document.getElementById('actionBtn'),
    resultGrid: document.getElementById('resultGrid'),
    // Cards for enabling/disabling
    costInputsCard: document.getElementById('costInputsCard'),
    policyInputsCard: document.getElementById('policyInputsCard'),
};

// --- FORMATTERS ---
const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
const formatNum = (n) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n);

// --- STATE ---
let isPuso = false;
let chart = null;

// --- CORE CALCULATION ---
function calculate() {
    // 1. VALIDATION
    document.querySelectorAll('.cost-input, #inputHarvestResult, #inputTraderPrice').forEach(input => {
        if (input.value && parseFloat(input.value) < 0) input.value = '0';
    });

    // 2. AGGREGATE COSTS
    let totalCost = 0;
    els.inputs.forEach(i => totalCost += Number(i.value) || 0);

    // 3. HARVEST & CONVERSION
    const harvest = Number(els.harvest.value) || 0;
    const riceResult = harvest > 0 ? (harvest / 1.57) : 0;
    if (els.displayRiceResult) els.displayRiceResult.innerText = `${formatNum(riceResult)} Kg`;
    const hpp = harvest > 0 ? totalCost / harvest : 0;

    // 4. POLICY & MARGINS (with Enforcement)
    let pFarmer = Number(els.sliderFarmer.value);
    let pGov = Number(els.sliderGov.value);
    if (pGov < pFarmer) {
        pGov = pFarmer;
        els.sliderGov.value = pGov;
    }
    
    // 5. PRICE CALCULATIONS
    const marginFarmer = hpp * (pFarmer / 100);
    const marginGov = hpp * (pGov / 100);
    const priceFarmer = hpp + marginFarmer;
    const priceGov = hpp + marginGov;
    
    // 6. TRADER PRICE
    const priceTrader = Number(els.inputTrader.value) || 0;

    // 7. UPDATE UI LABELS
    els.labelFarmer.innerText = pFarmer + '%';
    if (els.valFarmerRp) els.valFarmerRp.innerText = `+${formatRp(marginFarmer * 1.57)}`;
    els.labelGov.innerText = pGov + '%';
    if (els.valGovRp) els.valGovRp.innerText = `+${formatRp(marginGov * 1.57)}`;

    // 8. UPDATE RESULT CARDS
    if (!isPuso) {
        els.dHPP.innerText = formatRp(hpp * 1.57);
        els.dFarmer.innerText = formatRp(priceFarmer * 1.57);
        els.dGov.innerText = formatRp(priceGov * 1.57);
        els.lossPanel.classList.add('hidden');
        els.resultGrid.classList.remove('hidden');
    } else {
        els.dHPP.innerText = "N/A";
        els.dFarmer.innerText = "N/A";
        els.dGov.innerText = "N/A";
        els.lossPanel.classList.remove('hidden');
        els.resultGrid.classList.add('hidden');
        els.displayTotalLoss.innerText = formatRp(totalCost);
    }

    // 9. UPDATE GLOBAL STATUS
    updateStatus(isPuso, priceTrader, priceGov, priceFarmer, hpp);
    updateChart(isPuso, hpp, priceFarmer, priceGov, priceTrader);
}

// --- UI UPDATES ---
function updateStatus(puso, traderPrice, govPrice, farmerPrice, hpp) {
    const govPricePerBeras = govPrice * 1.57;
    const farmerPricePerBeras = farmerPrice * 1.57;
    const highLimit = govPricePerBeras * 1.5;

    let iconName, statusClass, title, description, showActionButton = false;

    if (puso) {
        statusClass = 'status-puso';
        title = "SISTEM OFFLINE: GAGAL PANEN";
        description = "Kerugian masif terdeteksi. Produksi nol.";
        iconName = 'cloud-off';
        showActionButton = true;
    } else if (hpp <= 0) {
        statusClass = 'status-lengkap';
        title = "DATA TIDAK LENGKAP";
        description = "Lengkapi data biaya dan hasil panen untuk memulai analisis.";
        iconName = 'file-warning';
    } else if (traderPrice <= 0) {
        statusClass = 'status-menunggu';
        title = "MENUNGGU PENAWARAN";
        description = "Masukkan harga tawaran dari pedagang untuk analisis spektrum.";
        iconName = 'mouse-pointer-click';
    } else if (traderPrice > highLimit) {
        statusClass = 'status-melonjak';
        title = "HARGA MELONJAK DRASTIS";
        description = `Tawaran pedagang (${formatRp(traderPrice)}) melebihi batas kritis (${formatRp(highLimit)}).`;
        iconName = 'trending-up';
        showActionButton = true;
    } else if (traderPrice > govPricePerBeras) {
        statusClass = 'status-di-atas-standar';
        title = "HARGA DI ATAS STANDAR";
        description = `Tawaran pedagang (${formatRp(traderPrice)}) di atas standar pemerintah (${formatRp(govPricePerBeras)}).`;
        iconName = 'alert-circle';
    } else if (traderPrice < farmerPricePerBeras) {
        statusClass = 'status-tidak-untung';
        title = "PETANI MERUGI";
        description = `Tawaran pedagang (${formatRp(traderPrice)}) di bawah target jual petani (${formatRp(farmerPricePerBeras)}).`;
        iconName = 'thumbs-down';
    } else {
        statusClass = 'status-kondusif';
        title = "PASAR KONDUSIF";
        description = "Harga tawaran pedagang berada dalam rentang yang ideal.";
        iconName = 'thumbs-up';
    }

    els.banner.className = 'status-hub active ' + statusClass;
    els.statusTitle.innerText = title;
    els.statusDesc.innerText = description;
    els.statusIcon.innerHTML = `<i data-lucide="${iconName}" style="width: 3rem; height: 3rem;"></i>`;
    els.actionBtn.classList.toggle('hidden', !showActionButton);
    if(showActionButton) els.actionBtn.innerText = "Lakukan Operasi Pasar";

    lucide.createIcons();
}

function togglePuso(state) {
    isPuso = state;
    // Only disable the cards for cost and policy inputs
    [els.costInputsCard, els.policyInputsCard].forEach(card => {
        card.style.opacity = state ? '0.5' : '1';
        card.style.pointerEvents = state ? 'none' : 'auto';
    });
    calculate();
}

// --- CHARTING ---
function updateChart(puso, hpp, farmer, gov, trader) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    const data = puso ? [0, 0, 0, 0] : [hpp * 1.57, farmer * 1.57, gov * 1.57, trader];

    const chartColors = {
        grid: 'rgba(129, 217, 133, 0.1)',
        text: 'rgb(139, 154, 201)'
    };
    
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
                    backgroundColor: [
                        'rgba(139, 154, 201, 0.5)', 
                        'rgba(129, 217, 133, 0.5)',
                        'rgba(110, 165, 255, 0.5)',
                        'rgba(255, 201, 113, 0.5)'
                    ],
                    borderColor: [
                        'rgb(139, 154, 201)',
                        'rgb(129, 217, 133)',
                        'rgb(110, 165, 255)',
                        'rgb(255, 201, 113)'
                    ],
                    borderWidth: 1,
                    borderRadius: 4,
                    barThickness: 30
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: chartColors.grid },
                        ticks: { color: chartColors.text, font: { weight: '600' } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: chartColors.text, font: { weight: '600' } }
                    }
                }
            }
        });
    }
}

// --- EVENT LISTENERS ---
document.querySelectorAll('.cost-input, #inputHarvestResult, #inputTraderPrice, #sliderFarmer, #sliderGov').forEach(el => {
    el.addEventListener('input', calculate);
});

document.querySelectorAll('input[name="statusPanen"]').forEach(el => {
    el.addEventListener('change', () => togglePuso(el.value === 'puso'));
});

// Initial Calculation
calculate();
