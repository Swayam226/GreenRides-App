// Simulated values — replace with real values from localStorage or backend
const totalCO2 = parseFloat(localStorage.getItem('totalCO2') || "0");
const totalPoints = parseInt(localStorage.getItem('totalPoints') || "0");

document.getElementById('dashboardCO2').textContent = totalCO2.toFixed(2);
document.getElementById('dashboardPoints').textContent = totalPoints;

// Generate CO2 data for current week
const today = new Date();
const dayOfWeek = today.getDay(); // 0 = Sunday
const weekStart = new Date(today);
weekStart.setDate(today.getDate() - dayOfWeek);

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const co2PerDay = Array(7).fill(0);

// Load daily data from localStorage
const savedData = JSON.parse(localStorage.getItem('co2PerDay') || '[]');
savedData.forEach(({ day, co2 }) => {
    if (day >= 0 && day < 7) co2PerDay[day] += co2;
});

// Chart.js setup
const ctx = document.getElementById('co2Chart').getContext('2d');
new Chart(ctx, {
    type: 'bar',
    data: {
        labels: days,
        datasets: [{
            label: 'CO2 Saved (kg)',
            data: co2PerDay,
            backgroundColor: '#4caf50'
        }]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true,
                title: { display: true, text: 'kg CO2' }
            }
        }
    }
});

// Redemption History Display
const redeemedList = document.getElementById("redeemedList");
const redemptions = JSON.parse(localStorage.getItem("redeemedPerks") || "[]");

if (redeemedList) {
    if (redemptions.length === 0) {
        redeemedList.innerHTML = "<li>No perks redeemed yet.</li>";
    } else {
        redeemedList.innerHTML = redemptions
            .map(r => `<li>🎁 <strong>${r.name}</strong> - Redeemed on ${r.date}</li>`)
            .join('');
    }
}

