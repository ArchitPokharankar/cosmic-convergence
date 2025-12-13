const App = {
    data: [],
    useLive: false,
    selectedId: null,
    
    // Simulation State
    isPlaying: false,
    simProgress: 0, 
    simLoopId: null,

    async init() {
        console.log("System Initializing...");
        
        Visuals.init('radar-canvas');
        
        UI.init({
            onRefresh: () => this.refreshData(),
            onToggleLive: (val) => { this.useLive = val; this.refreshData(); }
        });

        this.setupTimeControls();
        this.setupCanvasClick();

        await this.refreshData();
    },

    setupTimeControls() {
        const slider = document.getElementById('time-slider');
        const playBtn = document.getElementById('btn-play-pause');
        const statusDisplay = document.getElementById('sim-status');

        slider.addEventListener('input', (e) => {
            this.simProgress = parseFloat(e.target.value);
            this.updateSimulation();
        });

        playBtn.addEventListener('click', () => {
            this.isPlaying = !this.isPlaying;
            playBtn.innerText = this.isPlaying ? '❚❚' : '▶';
            statusDisplay.innerText = this.isPlaying ? 'SIMULATING...' : 'PAUSED';
            statusDisplay.style.color = this.isPlaying ? '#00f0ff' : '#6c8a9e';
            
            if (this.isPlaying) this.runSimLoop();
            else cancelAnimationFrame(this.simLoopId);
        });
    },

    runSimLoop() {
        if (!this.isPlaying) return;
        this.simProgress += 0.2; 
        if (this.simProgress > 100) this.simProgress = 0; 
        
        document.getElementById('time-slider').value = this.simProgress;
        this.updateSimulation();
        
        this.simLoopId = requestAnimationFrame(() => this.runSimLoop());
    },

    updateSimulation() {
        const progressNormalized = this.simProgress / 100;
        
        // Update Date
        const simTimeMs = Date.now() + (progressNormalized * 7 * 24 * 60 * 60 * 1000);
        document.getElementById('sim-date').innerText = new Date(simTimeMs).toLocaleString();

        // Render Frame
        Visuals.render(this.data, this.selectedId, progressNormalized);
    },

    setupCanvasClick() {
        const canvas = document.getElementById('radar-canvas');
        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const clickedAst = Visuals.getAsteroidAt(e.clientX - rect.left, e.clientY - rect.top);
            if (clickedAst) this.selectAsteroid(clickedAst.id);
        });
    },

    async refreshData() {
        document.getElementById('asteroid-list').innerHTML = '<li class="loading-text">Scanning Deep Space...</li>';
        
        const rawData = await API.fetchFeed(this.useLive);
        if (!rawData) { UI.updateStatus(this.useLive, true); return; }

        this.data = DataProcessor.process(rawData);
        
        UI.updateStatus(this.useLive, false);
        UI.populateList(this.data, (id) => this.selectAsteroid(id));
        document.getElementById('hud-count').innerText = this.data.length;
        
        this.simProgress = 0;
        document.getElementById('time-slider').value = 0;
        
        this.updateSimulation(); 
    },

    selectAsteroid(id) {
        this.selectedId = id;
        const ast = this.data.find(a => a.id === id);
        if (ast) {
            // Pass deflect logic to UI
            UI.showDetails(ast, () => this.deflectAsteroid(id));
            this.updateSimulation(); 
        }
    },

    // --- RESTORED DEFLECTION LOGIC ---
    deflectAsteroid(id) {
        // 1. Launch Missile Visualization
        Visuals.launchMissile(id, () => {
            // 2. Callback executed on Impact
            const ast = this.data.find(a => a.id === id);
            if (ast) {
                // Update Model
                ast.is_deflected = true;
                ast.risk_score = 0; 

                // Update UI (Right Panel)
                this.selectAsteroid(id);
                // Update List (Left Panel)
                UI.populateList(this.data, (idx) => this.selectAsteroid(idx));
                // Redraw Visuals (Green orbit)
                this.updateSimulation();
            }
        });
    }
};

window.addEventListener('DOMContentLoaded', () => App.init());