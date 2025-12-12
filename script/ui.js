const UI = {
    init(handlers) {
        this.listEl = document.getElementById('asteroid-list');
        this.statusDot = document.getElementById('status-indicator');
        this.statusText = document.getElementById('status-text');
        
        // Buttons
        document.getElementById('btn-refresh').addEventListener('click', handlers.onRefresh);
        document.getElementById('toggle-live').addEventListener('change', (e) => handlers.onToggleLive(e.target.checked));

        this.countdownInterval = null; // Store interval ID for cleanup
    },

    updateStatus(isLive, isError) {
        if (isError) {
            this.statusDot.className = "status-dot error";
            this.statusText.innerText = "CONNECTION ERROR";
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
        asteroids.forEach(ast => {
            const li = document.createElement('li');
            li.className = `ast-item ${ast.is_hazardous ? 'hazardous' : ''}`;
            li.innerHTML = `
                <span>${ast.name}</span>
                <span>Risk: ${ast.risk_score}%</span>
            `;
            li.addEventListener('click', () => {
                // Remove active class from all other items
                document.querySelectorAll('.ast-item').forEach(item => item.classList.remove('active-item'));
                // Add active class to the clicked item
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

        // Clear previous interval if exists
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        // Run the countdown function immediately and then every second
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

    showDetails(ast) {
        document.getElementById('target-placeholder').classList.add('hidden');
        document.getElementById('target-data').classList.remove('hidden');

        // Populate basic fields
        document.getElementById('d-name').innerText = ast.name;
        document.getElementById('d-risk-val').innerText = ast.risk_score + "/100";
        document.getElementById('d-risk-bar').style.width = ast.risk_score + "%";
        document.getElementById('d-diameter').innerText = ast.diameter.toFixed(3) + " km";
        document.getElementById('d-velocity').innerText = Utils.formatNumber(ast.velocity) + " km/h";
        document.getElementById('d-miss').innerText = Utils.formatNumber(ast.miss_distance) + " km";
        
        // Populate NEW Predictive fields
        document.getElementById('d-approach-date-time').innerText = ast.approach_full;
        this.updateCountdown(ast.epoch_close);

        // Collision Warning
        const warningEl = document.getElementById('collision-warning');
        if (ast.miss_distance < 40000 || ast.risk_score > 80) {
            warningEl.classList.remove('hidden');
        } else {
            warningEl.classList.add('hidden');
        }
    }
};