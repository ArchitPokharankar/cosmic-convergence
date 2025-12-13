const UI = {
    init(handlers) {
        this.listEl = document.getElementById('asteroid-list');
        this.statusDot = document.getElementById('status-indicator');
        this.statusText = document.getElementById('status-text');
        
        document.getElementById('btn-refresh').addEventListener('click', handlers.onRefresh);
        document.getElementById('toggle-live').addEventListener('change', (e) => handlers.onToggleLive(e.target.checked));
        
        // Deflect Button Handler
        const btnDeflect = document.getElementById('btn-deflect');
        if (btnDeflect) {
            btnDeflect.addEventListener('click', () => {
                if (this.onDeflectCallback) this.onDeflectCallback();
            });
        }
        this.countdownInterval = null;
    },

    updateStatus(isLive, isError) {
        if (isError) {
            this.statusDot.className = "status-dot error";
            this.statusText.innerText = "CONNECTION ERROR (USING FALLBACK)";
        } else if (isLive) {
            this.statusDot.className = "status-dot active";
            this.statusText.innerText = "LIVE FEED ACTIVE";
        } else {
            this.statusDot.className = "status-dot";
            this.statusText.innerText = "OFFLINE SIMULATION";
        }
    },

    populateList(asteroids, onSelect) {
        this.listEl.innerHTML = '';
        if (asteroids.length === 0) {
            this.listEl.innerHTML = '<li class="loading-text">No Objects Found.</li>';
            return;
        }

        asteroids.forEach(ast => {
            const li = document.createElement('li');
            let hazardClass = '';
            if (ast.risk_score >= 60 && !ast.is_deflected) hazardClass = 'hazardous'; 
            
            let riskColor = '#00f0ff'; 
            if (ast.risk_score >= 30) riskColor = '#ffd700';
            if (ast.risk_score >= 60) riskColor = '#ff0055';

            let rightSideText = `<span style="color:${riskColor}; font-size: 0.9em;">Risk: ${ast.risk_score}%</span>`;
            if (ast.is_deflected) {
                rightSideText = `<span style="color:#0f0; font-weight:bold; font-size: 0.9em;">✓ SAFE</span>`;
            }

            li.className = `ast-item ${hazardClass}`;
            li.innerHTML = `<span style="font-weight:bold;">${ast.name}</span>${rightSideText}`;
            
            li.addEventListener('click', () => {
                document.querySelectorAll('.ast-item').forEach(item => item.classList.remove('active-item'));
                li.classList.add('active-item');
                onSelect(ast.id);
            });
            this.listEl.appendChild(li);
        });
    },

    formatTimeDelta(ms) {
        if (ms < 0) return "PASSED";
        const seconds = Math.floor(ms / 1000);
        const days = Math.floor(seconds / (3600 * 24));
        const hours = Math.floor((seconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        let output = '';
        if (days > 0) output += `${days}D `;
        output += `${String(hours).padStart(2, '0')}H ${String(minutes).padStart(2, '0')}M ${String(secs).padStart(2, '0')}S`;
        return output.trim();
    },

    updateCountdown(epochClose) {
        const countdownEl = document.getElementById('d-time-countdown');
        if (!countdownEl) return;
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        const tick = () => {
            const now = Date.now();
            const timeDelta = epochClose - now;
            if (timeDelta <= 0) {
                countdownEl.innerText = "PASSED";
                clearInterval(this.countdownInterval);
                return;
            }
            countdownEl.innerText = this.formatTimeDelta(timeDelta);
        };
        tick();
        this.countdownInterval = setInterval(tick, 1000);
    },

    showDetails(ast, onDeflect) {
        this.onDeflectCallback = onDeflect;

        document.getElementById('target-placeholder').classList.add('hidden');
        document.getElementById('target-data').classList.remove('hidden');

        document.getElementById('d-name').innerText = ast.name;
        document.getElementById('d-risk-val').innerText = ast.risk_score + "/100";
        document.getElementById('d-risk-bar').style.width = ast.risk_score + "%";
        document.getElementById('d-diameter').innerText = ast.diameter.toFixed(3) + " km";
        document.getElementById('d-velocity').innerText = Utils.formatNumber(ast.velocity) + " km/h";
        document.getElementById('d-miss').innerText = Utils.formatNumber(ast.miss_distance) + " km";
        document.getElementById('d-approach-date-time').innerText = ast.approach_full;
        this.updateCountdown(ast.epoch_close);

        // --- RESTORED IMPACT INFO ---
        const energyEl = document.getElementById('d-energy');
        const impactTypeEl = document.getElementById('d-impact-type');
        
        if (energyEl) energyEl.innerText = Utils.formatNumber(ast.impact_energy_mt) + " MT";
        if (impactTypeEl) impactTypeEl.innerText = ast.impact_type;

        const warningEl = document.getElementById('collision-warning');
        const btnDeflect = document.getElementById('btn-deflect');
        
        if (ast.is_deflected) {
            warningEl.innerText = "✓ ORBIT STABILIZED (SAFE)";
            warningEl.style.background = "rgba(0, 255, 0, 0.2)";
            warningEl.style.color = "#0f0";
            warningEl.style.border = "1px solid #0f0";
            warningEl.classList.remove('hidden');

            if (btnDeflect) btnDeflect.classList.add('hidden');
            document.getElementById('d-risk-bar').style.background = "#0f0";
        } else {
            document.getElementById('d-risk-bar').style.background = "linear-gradient(90deg, #0f0, #ff0, #f00)";

            if (btnDeflect) {
                if (ast.risk_score > 50) btnDeflect.classList.remove('hidden');
                else btnDeflect.classList.add('hidden');
            }

            if (ast.risk_score >= 60) {
                warningEl.innerText = "⚠ POTENTIAL HAZARD DETECTED";
                warningEl.style.background = "var(--accent)";
                warningEl.style.color = "#000";
                warningEl.style.border = "none";
                warningEl.classList.remove('hidden');
            } else if (ast.risk_score >= 30) {
                warningEl.innerText = "⚠ MODERATE RISK DETECTED";
                warningEl.style.background = "#ffd700";
                warningEl.style.color = "#000";
                warningEl.style.border = "none";
                warningEl.classList.remove('hidden');
            } else {
                warningEl.classList.add('hidden');
            }
        }
    }
};