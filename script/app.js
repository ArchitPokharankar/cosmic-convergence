const App = {
    data: [],
    useLive: false,
    selectedId: null,
    
    // Simulation State
    isPlaying: false,
    simProgress: 0, // 0.0 to 1.0 (percent of slider)
    simLoopId: null,

    async init() {
        console.log("System Initializing...");
        
        Visuals.init('radar-canvas');
        
        // Setup UI Handlers
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
        const dateDisplay = document.getElementById('sim-date');
        const statusDisplay = document.getElementById('sim-status');

        // Slider Change
        slider.addEventListener('input', (e) => {
            this.simProgress = parseFloat(e.target.value);
            this.updateSimulation();
        });

        // Play Button
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
        
        // Increment progress (speed of simulation)
        this.simProgress += 0.2; // Speed factor
        if (this.simProgress > 100) this.simProgress = 0; // Loop
        
        document.getElementById('time-slider').value = this.simProgress;
        this.updateSimulation();
        
        this.simLoopId = requestAnimationFrame(() => this.runSimLoop());
    },

    updateSimulation() {
        // Convert 0-100 slider to 0.0-1.0 float
        const progressNormalized = this.simProgress / 100;
        
        // Update UI Text
        const simTimeMs = Date.now() + (progressNormalized * 7 * 24 * 60 * 60 * 1000);
        const simDate = new Date(simTimeMs);
        document.getElementById('sim-date').innerText = simDate.toLocaleString();

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
        
        // Reset Sim
        this.simProgress = 0;
        document.getElementById('time-slider').value = 0;
        this.updateSimulation(); 
    },

    selectAsteroid(id) {
        this.selectedId = id;
        const ast = this.data.find(a => a.id === id);
        if (ast) {
            UI.showDetails(ast);
            this.updateSimulation(); // Re-render to show selection
        }
    }
};

window.addEventListener('DOMContentLoaded', () => App.init());