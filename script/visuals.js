const Visuals = {
    canvas: null, ctx: null, asteroids: [], animationId: null, earthImg: new Image(),
    
    // Viewport State
    width: 0, height: 0, rotation: 0, selectedId: null,
    zoomLevel: 1, baseScaleFactor: 1, maxDistInDataset: 1,

    // Time Simulation State
    simStartTime: Date.now(),
    simCurrentTime: Date.now(),
    simDurationMs: 7 * 24 * 60 * 60 * 1000, 
    baseOrbitalSpeed: 0.005, // NEW: Base speed for rotational movement

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.earthImg.src = 'assets/earth_1.png';
        
        window.addEventListener('resize', () => this.resize());
        this.resize();

        // Zoom Listeners
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.deltaY < 0 ? this.zoomIn(0.1) : this.zoomOut(0.1);
        });
        document.getElementById('btn-zoom-in').addEventListener('click', () => this.zoomIn(0.2));
        document.getElementById('btn-zoom-out').addEventListener('click', () => this.zoomOut(0.2));
    },

    resize() {
        if(!this.canvas) return;
        this.width = this.canvas.width = this.canvas.parentElement.offsetWidth;
        this.height = this.canvas.height = this.canvas.parentElement.offsetHeight;
        if(this.asteroids.length > 0) this.calculateScale();
    },

    zoomIn(amt) { this.zoomLevel = Math.min(5, this.zoomLevel + amt); },
    zoomOut(amt) { this.zoomLevel = Math.max(0.5, this.zoomLevel - amt); },

    calculateScale() {
        let maxDist = 0;
        this.asteroids.forEach(ast => { if (ast.miss_distance > maxDist) maxDist = ast.miss_distance; });
        this.maxDistInDataset = maxDist * 1.2; 
        const screenRadius = Math.min(this.width, this.height) / 2;
        this.baseScaleFactor = (screenRadius - 60) / this.maxDistInDataset;
    },

    // --- SIMULATION RENDERER ---
    render(data, selectedId, timeProgress0to1) {
        this.asteroids = data;
        this.selectedId = selectedId;
        
        const timeOffset = timeProgress0to1 * this.simDurationMs;
        this.simCurrentTime = this.simStartTime + timeOffset;

        if (this.asteroids.length > 0 && this.maxDistInDataset === 1) this.calculateScale();
        
        this.drawFrame();
    },

    drawFrame() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        const cx = this.width / 2;
        const cy = this.height / 2;

        const currentRange = Math.round((this.maxDistInDataset / this.zoomLevel) / 1000000);
        const hudRange = document.getElementById('hud-range');
        if(hudRange) hudRange.innerText = `${currentRange}M km`;

        this.drawGrid(cx, cy);

        // Draw Earth (Slow rotation for effect)
        this.rotation += 0.002;
        this.ctx.save();
        this.ctx.translate(cx, cy);
        this.ctx.rotate(this.rotation);
        
        if (this.earthImg.complete) this.ctx.drawImage(this.earthImg, -30, -30, 60, 60);
        else { this.ctx.fillStyle = '#00f0ff'; this.ctx.beginPath(); this.ctx.arc(0,0,20,0,Math.PI*2); this.ctx.fill(); }
        this.ctx.restore();

        this.asteroids.forEach(ast => {
            this.drawAsteroidSimulated(ast, cx, cy);
        });
    },

    drawGrid(cx, cy) {
        this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
        this.ctx.lineWidth = 1;
        const maxRad = (this.maxDistInDataset * this.baseScaleFactor) * this.zoomLevel;
        
        // Draw 4 rings for better visibility of outer objects
        [0.25, 0.5, 0.75, 1].forEach(r => {
            this.ctx.beginPath(); this.ctx.arc(cx, cy, 30 + (maxRad * r), 0, Math.PI*2); this.ctx.stroke();
        });
        
        // Crosshairs
        this.ctx.beginPath(); this.ctx.moveTo(0, cy); this.ctx.lineTo(this.width, cy); this.ctx.stroke();
        this.ctx.beginPath(); this.ctx.moveTo(cx, 0); this.ctx.lineTo(cx, this.height); this.ctx.stroke();
    },

    drawAsteroidSimulated(ast, cx, cy) {
        // 1. Time & Radial Distance Logic
        const deltaT_Hours = (this.simCurrentTime - ast.epoch_close) / (1000 * 60 * 60);
        const visualSpeedFactor = 0.5; 
        const addedDistKm = Math.abs(deltaT_Hours * ast.velocity * visualSpeedFactor);
        const currentDistanceKm = ast.miss_distance + addedDistKm;
        const pixelRadius = (currentDistanceKm * this.baseScaleFactor * this.zoomLevel) + 30;

        // 2. ORBITAL ROTATION FIX: Angle changes over time
        // The rotation rate is inversely proportional to the radius (Kepler's third law approximation)
        // We use the orbital angle (ast.angle) as a starting point.
        const orbitalPeriodFactor = 1 / Math.sqrt(currentDistanceKm); // Inverse square root of distance
        const timeFactor = (Date.now() - this.simStartTime) / 5000000; // Small constant animation speed
        const currentAngle = ast.angle + (timeFactor * orbitalPeriodFactor * 100) + (this.simCurrentTime / 1000000000); 

        const x = cx + Math.cos(currentAngle) * pixelRadius;
        const y = cy + Math.sin(currentAngle) * pixelRadius;
        
        // Update screen coords for clicking
        ast.screenX = x; ast.screenY = y; 
        
        // NEW: SIZE FIX - Make selected asteroid much larger
        const baseR = ast.is_hazardous ? 6 : 4;
        ast.screenR = (ast.id === this.selectedId) ? (baseR + 8) : baseR; // Selected is 10-14px radius

        // 3. Draw Trajectory/Tail
        if (this.selectedId === ast.id || ast.is_hazardous) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = ast.is_hazardous ? 'rgba(255, 0, 85, 0.15)' : 'rgba(0, 240, 255, 0.15)';
            // Draw a faint trail behind the current position (using past angle)
            this.ctx.lineWidth = ast.screenR / 3;
            this.ctx.arc(cx, cy, pixelRadius, currentAngle - 0.2, currentAngle); 
            this.ctx.stroke();
            this.ctx.lineWidth = 1; // Reset line width
        }

        // 4. Draw Body
        this.ctx.beginPath();
        this.ctx.arc(x, y, ast.screenR, 0, Math.PI * 2);

        let isClosest = Math.abs(deltaT_Hours) < 1; 
        
        if (ast.id === this.selectedId) {
            this.ctx.fillStyle = '#fff'; 
            this.ctx.shadowBlur = 20; // BRIGHTER GLOW
            this.ctx.shadowColor = '#fff';
            
            // Connector Line
            this.ctx.beginPath(); this.ctx.strokeStyle = 'rgba(255,255,255,0.7)'; 
            this.ctx.setLineDash([4,4]); this.ctx.moveTo(cx,cy); this.ctx.lineTo(x,y); this.ctx.stroke(); this.ctx.setLineDash([]);
        } else if (ast.is_hazardous) {
            this.ctx.fillStyle = isClosest ? '#ff0000' : '#ff0055'; 
            this.ctx.shadowBlur = 12; this.ctx.shadowColor = this.ctx.fillStyle; // BRIGHTER GLOW
        } else {
            this.ctx.fillStyle = isClosest ? '#aaffff' : '#00f0ff';
            this.ctx.shadowBlur = 5; this.ctx.shadowColor = this.ctx.fillStyle;
        }
        this.ctx.fill(); 
        this.ctx.shadowBlur = 0;

        // 5. Draw Text Label
        if (ast.id === this.selectedId || isClosest) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px ' + 'var(--font-mono)'; // LARGER FONT
            
            // Draw Name
            this.ctx.fillText(ast.name, x + 10, y - 5);
            
            // Draw Closest Approach Time
            if (ast.id === this.selectedId) {
                 this.ctx.fillStyle = ast.is_hazardous ? '#ffaaaa' : '#ccffff';
                 const [date, time] = ast.approach_full.split(' ');
                 this.ctx.fillText(`Closest: ${date} ${time}`, x + 10, y + 12);
            }
        }
    },

    getAsteroidAt(clickX, clickY) {
        // INCREASED HIT AREA
        return this.asteroids.find(ast => Utils.isPointInCircle(clickX, clickY, ast.screenX, ast.screenY, ast.screenR + 10));
    }
};