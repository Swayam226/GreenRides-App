let routes = [];
let totalCO2 = parseFloat(localStorage.getItem('totalCO2')) || 0;
let totalPoints = parseInt(localStorage.getItem('totalPoints')) || 0;

const CO2_PER_KM_CAR = 0.21;
const POINTS_PER_KM = 5;

const tiers = [
    { name: 'Eco Newbie 🐣', min: 0, max: 49 },
    { name: 'Transit Rookie 🛴', min: 50, max: 149 },
    { name: 'Carbon Crusher 🔋', min: 150, max: 299 },
    { name: 'Metro Maverick 🚇', min: 300, max: 499 },
    { name: 'Green Glider 🛸', min: 500, max: 999 },
    { name: 'Planet Hero 🌍💚', min: 1000, max: Infinity }
];

// Runs when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;

    if (path.includes("index.html") || path === "/" || path.endsWith("/")) {
        // Only fetch routes and setup trip form on index page
        fetch('data/routes.json')
            .then(response => {
                if (!response.ok) throw new Error('Failed to load routes.json');
                return response.json();
            })
            .then(data => {
                routes = data;
                setupTripForm();
                updateTier(totalPoints);
            })
            .catch(error => {
                console.error(error);
                alert('Failed to load route data. The app will not work correctly.');
            });
    }

    // Wallet Page
    const walletPointsEl = document.getElementById("walletPoints");
    if (walletPointsEl) {
        walletPointsEl.textContent = totalPoints;
    }

    // Dashboard Redemption List
    const redeemedList = document.getElementById("redeemedList");
    if (redeemedList) {
        const redemptions = JSON.parse(localStorage.getItem("redeemedPerks") || "[]");
        if (redemptions.length === 0) {
            redeemedList.innerHTML = "<li>No perks redeemed yet.</li>";
        } else {
            redeemedList.innerHTML = redemptions
                .map(r => `<li>🎁 <strong>${r.name}</strong> - Redeemed on ${r.date}</li>`)
                .join('');
        }
    }
});

function updateTier(points) {
    const tierNameEl = document.getElementById('tierName');
    const tierProgressEl = document.getElementById('tierProgress');
    const nextTierInfoEl = document.getElementById('nextTierInfo');

    if (!(tierNameEl && tierProgressEl && nextTierInfoEl)) return; // prevent running on wallet.html

    const current = tiers.find(t => points >= t.min && points <= t.max);
    const next = tiers.find(t => t.min > current.min);

    tierNameEl.textContent = current.name;

    if (next) {
        const range = next.min - current.min;
        const progress = ((points - current.min) / range) * 100;
        tierProgressEl.style.width = `${progress}%`;
        nextTierInfoEl.textContent = `${next.min - points} points to reach "${next.name}"`;
    } else {
        tierProgressEl.style.width = `100%`;
        nextTierInfoEl.textContent = `You've reached the highest tier! 🎉`;
    }
}

async function drawRoute(from, to) {
    const baseUrl = 'https://nominatim.openstreetmap.org/search';

    // Step 1: Get coordinates of from and to
    const fromRes = await fetch(`${baseUrl}?q=${from}&format=json&limit=1`);
    const toRes = await fetch(`${baseUrl}?q=${to}&format=json&limit=1`);

    const fromData = await fromRes.json();
    const toData = await toRes.json();

    if (fromData.length === 0 || toData.length === 0) {
        alert("Unable to locate one or both cities on the map.");
        return;
    }

    const fromCoords = [parseFloat(fromData[0].lat), parseFloat(fromData[0].lon)];
    const toCoords = [parseFloat(toData[0].lat), parseFloat(toData[0].lon)];

    // Step 2: Request route from OpenRouteService
    const orsUrl = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${fromCoords[1]},${fromCoords[0]};${toCoords[1]},${toCoords[0]}?overview=full&geometries=geojson`;

    const routeRes = await fetch(orsUrl);
    const routeJson = await routeRes.json();

    if (!routeJson.routes || routeJson.routes.length === 0) {
        alert("Unable to fetch route.");
        return;
    }

    const route = routeJson.routes[0].geometry;

    // Step 3: Clear previous route
    if (routeLayer) {
        map.removeLayer(routeLayer);
    }

    // Step 4: Draw the route
    routeLayer = L.geoJSON(route, {
        style: { color: 'green', weight: 4 }
    }).addTo(map);

    // Fit map to route bounds
    const bounds = L.geoJSON(route).getBounds();
    map.fitBounds(bounds);
}


function setupTripForm() {
    const tripForm = document.getElementById('tripForm');
    const co2SavedEl = document.getElementById('co2Saved');
    const pointsEl = document.getElementById('points');
    const walletPointsEl = document.getElementById('walletPoints');
    const messageEl = document.getElementById('tripMessage');

    tripForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const modeInput = document.getElementById('mode').value.trim().toLowerCase();
        const fromInput = document.getElementById('from').value.trim().toLowerCase();
        const toInput = document.getElementById('to').value.trim().toLowerCase();

        const route = routes.find(r =>
            r.from.toLowerCase() === fromInput &&
            r.to.toLowerCase() === toInput &&
            r.mode === modeInput
        );

        if (!route) {
            messageEl.textContent = "Route not found in database. Please check your input.";
            messageEl.style.color = 'red';
            return;
        }

        const distance = route.distance;
        const co2 = distance * CO2_PER_KM_CAR;
        const earnedPoints = Math.floor(distance * POINTS_PER_KM);

        totalCO2 += co2;
        totalPoints += earnedPoints;

        localStorage.setItem('totalCO2', totalCO2.toFixed(2));
        localStorage.setItem('totalPoints', totalPoints);

        const today = new Date().getDay();
        const dailyData = JSON.parse(localStorage.getItem('co2PerDay') || '[]');
        dailyData.push({ day: today, co2: co2 });
        localStorage.setItem('co2PerDay', JSON.stringify(dailyData));

        updateTier(totalPoints);

        co2SavedEl.textContent = totalCO2.toFixed(2);
        pointsEl.textContent = totalPoints;
        if (walletPointsEl) walletPointsEl.textContent = totalPoints;

        messageEl.textContent = `Logged ${modeInput} trip (${distance} km). +${earnedPoints} points!`;
        drawRoute(fromInput, toInput);

        messageEl.style.color = 'green';

        // Geocode and draw route
        drawRoute(fromInput, toInput);

        tripForm.reset();

    });
}

let map = L.map('map').setView([22.5726, 88.3639], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data © OpenStreetMap contributors'
}).addTo(map);

let routeLayer = null;


function redeemReward(requiredPoints, rewardName) {
    let totalPoints = parseInt(localStorage.getItem("totalPoints")) || 0;

    const msg = document.getElementById("redeemMessage");

    if (totalPoints >= requiredPoints) {
        totalPoints -= requiredPoints;
        localStorage.setItem("totalPoints", totalPoints);

        const walletPointsEl = document.getElementById("walletPoints");
        if (walletPointsEl) walletPointsEl.textContent = totalPoints;

        const redemptions = JSON.parse(localStorage.getItem("redeemedPerks") || "[]");
        redemptions.push({
            name: rewardName,
            date: new Date().toLocaleString(),
        });
        localStorage.setItem("redeemedPerks", JSON.stringify(redemptions));

        if (msg) msg.textContent = `✅ Redeemed: ${rewardName}`;
    } else {
        if (msg) msg.textContent = `❌ Not enough points to redeem "${rewardName}".`;
    }
}
