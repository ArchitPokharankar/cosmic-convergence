const Visuals = {
    canvas: null, ctx: null, asteroids: [], animationId: null, earthImg: new Image(),
    
    // Viewport State
    width: 0, height: 0, rotation: 0, selectedId: null,
    zoomLevel: 1, baseScaleFactor: 1, maxDistInDataset: 1,

    // Time Simulation State
    simStartTime: Date.now(),
    simCurrentTime: Date.now(),
    simDurationMs: 7 * 24 * 60 * 60 * 1000, 
    baseOrbitalSpeed: 0.005, 

    // MISSILE STATE
    missile: null, 

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.earthImg.src = 'assets/earth_1.png';
        
        window.addEventListener('resize', () => this.resize());
        this.resize();

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
        if(this.asteroids.length > 0) {
            this.calculateScale();
            this.drawFrame(); 
        }
    },

    zoomIn(amt) { 
        this.zoomLevel = Math.min(5, this.zoomLevel + amt); 
        this.drawFrame(); 
    },

    zoomOut(amt) { 
        this.zoomLevel = Math.max(0.5, this.zoomLevel - amt); 
        this.drawFrame(); 
    },

    calculateScale() {
        let maxDist = 0;
        this.asteroids.forEach(ast => { 
            const dist = ast.is_deflected ? (ast.miss_distance + 15000000) : ast.miss_distance;
            if (dist > maxDist) maxDist = dist; 
        });
        this.maxDistInDataset = Math.max(maxDist * 1.2, 5000000); 
        const screenRadius = Math.min(this.width, this.height) / 2;
        this.baseScaleFactor = (screenRadius - 80) / this.maxDistInDataset;
    },

    // --- MISSILE LOGIC ---
    launchMissile(targetId, onImpact) {
        this.missile = {
            targetId: targetId,
            progress: 0,
            onImpact: onImpact
        };
        this.animationLoop();
    },

    animationLoop() {
        if (this.missile) {
            this.drawFrame();
            requestAnimationFrame(() => this.animationLoop());
        }
    },

    render(data, selectedId, timeProgress0to1) {
        this.asteroids = data;
        this.selectedId = selectedId;
        
        const timeOffset = timeProgress0to1 * this.simDurationMs;
        this.simCurrentTime = this.simStartTime + timeOffset;

        if (this.asteroids.length > 0) this.calculateScale();
        
        this.drawFrame();
    },

    drawFrame() {
        if (!this.ctx || this.width === 0) return;

        this.ctx.clearRect(0, 0, this.width, this.height);
        const cx = this.width / 2;
        const cy = this.height / 2;

        const currentRange = Math.round((this.maxDistInDataset / this.zoomLevel) / 1000000);
        const hudRange = document.getElementById('hud-range');
        if(hudRange) hudRange.innerText = `${currentRange}M km`;

        this.drawGrid(cx, cy);

        // Draw Earth
        this.rotation += 0.002;
        this.ctx.save();
        this.ctx.translate(cx, cy);
        this.ctx.rotate(this.rotation);
        
        const baseSize = 60;
        const scaledSize = baseSize * this.zoomLevel;
        const offset = -scaledSize / 2;

        if (this.earthImg.complete) {
            this.ctx.drawImage(this.earthImg, offset, offset, scaledSize, scaledSize);
        } else {
            this.ctx.fillStyle = '#00f0ff'; 
            this.ctx.beginPath(); this.ctx.arc(0, 0, 20 * this.zoomLevel, 0, Math.PI*2); this.ctx.fill(); 
        }
        this.ctx.restore();

        let targetPos = null;
        this.asteroids.forEach(ast => {
            const pos = this.drawAsteroidSimulated(ast, cx, cy);
            if (this.missile && ast.id === this.missile.targetId) {
                targetPos = pos;
            }
        });

        if (this.missile && targetPos) {
            this.updateAndDrawMissile(cx, cy, targetPos.x, targetPos.y);
        }
    },

    updateAndDrawMissile(startX, startY, endX, endY) {
        this.missile.progress += 0.02; 

        if (this.missile.progress >= 1.0) {
            // FIX: Clear missile BEFORE callback to prevent loop conflict
            const callback = this.missile.onImpact;
            this.missile = null; 
            
            // Explosion Flash
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.beginPath(); this.ctx.arc(endX, endY, 60, 0, Math.PI*2); this.ctx.fill();
            
            // Execute callback (updates data)
            if (callback) callback();
            return;
        }

        const curX = startX + (endX - startX) * this.missile.progress;
        const curY = startY + (endY - startY) * this.missile.progress;

        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 200, 0, 0.8)';
        this.ctx.lineWidth = 3;
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(curX, curY);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.fillStyle = '#fff';
        this.ctx.arc(curX, curY, 5, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.shadowBlur = 10; this.ctx.shadowColor = '#ffaa00';
    },

    drawGrid(cx, cy) {
        this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
        this.ctx.lineWidth = 1;
        const maxRad = (this.maxDistInDataset * this.baseScaleFactor) * this.zoomLevel;
        const startRad = 40 * this.zoomLevel;

        [0.25, 0.5, 0.75, 1].forEach(r => {
            this.ctx.beginPath(); this.ctx.arc(cx, cy, startRad + (maxRad * r), 0, Math.PI*2); this.ctx.stroke();
        });
        
        this.ctx.beginPath(); this.ctx.moveTo(0, cy); this.ctx.lineTo(this.width, cy); this.ctx.stroke();
        this.ctx.beginPath(); this.ctx.moveTo(cx, 0); this.ctx.lineTo(cx, this.height); this.ctx.stroke();
    },

    drawAsteroidSimulated(ast, cx, cy) {
        const deltaT_Hours = (this.simCurrentTime - ast.epoch_close) / (1000 * 60 * 60);
        const visualSpeedFactor = 0.5; 
        const addedDistKm = Math.abs(deltaT_Hours * ast.velocity * visualSpeedFactor);
        
        const deflectionOffset = ast.is_deflected ? 15000000 : 0; 
        const currentDistanceKm = ast.miss_distance + addedDistKm + deflectionOffset;
        
        const earthBuffer = 40 * this.zoomLevel;
        const pixelRadius = (currentDistanceKm * this.baseScaleFactor * this.zoomLevel) + earthBuffer;

        const orbitalPeriodFactor = 1 / Math.sqrt(currentDistanceKm);
        const timeFactor = (Date.now() - this.simStartTime) / 5000000;
        const currentAngle = ast.angle + (timeFactor * orbitalPeriodFactor * 100) + (this.simCurrentTime / 1000000000); 

        const x = cx + Math.cos(currentAngle) * pixelRadius;
        const y = cy + Math.sin(currentAngle) * pixelRadius;
        
        ast.screenX = x; ast.screenY = y; 
        
        const baseR = ast.is_hazardous ? 6 : 4;
        ast.screenR = (ast.id === this.selectedId) ? (baseR + 8) : baseR; 

        if (this.selectedId === ast.id || ast.is_hazardous || ast.is_deflected) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = ast.is_deflected ? 'rgba(0, 255, 0, 0.4)' : (ast.is_hazardous ? 'rgba(255, 0, 85, 0.15)' : 'rgba(0, 240, 255, 0.15)');
            this.ctx.lineWidth = ast.screenR / 3;
            this.ctx.arc(cx, cy, pixelRadius, currentAngle - 0.2, currentAngle); 
            this.ctx.stroke();
            this.ctx.lineWidth = 1;
        }

        this.ctx.beginPath();
        this.ctx.arc(x, y, ast.screenR, 0, Math.PI * 2);

        let isClosest = Math.abs(deltaT_Hours) < 1; 
        
        if (ast.is_deflected) {
             this.ctx.fillStyle = '#0f0';
             this.ctx.shadowBlur = 20; this.ctx.shadowColor = '#0f0';
             if (ast.id === this.selectedId) {
                 this.ctx.fillStyle = '#ccffcc';
                 this.ctx.beginPath(); this.ctx.strokeStyle = 'rgba(0,255,0,0.8)'; 
                 this.ctx.setLineDash([4,4]); this.ctx.moveTo(cx,cy); this.ctx.lineTo(x,y); this.ctx.stroke(); this.ctx.setLineDash([]);
             }
        } else if (ast.id === this.selectedId) {
            this.ctx.fillStyle = '#fff'; 
            this.ctx.shadowBlur = 20; this.ctx.shadowColor = '#fff';
            this.ctx.beginPath(); this.ctx.strokeStyle = 'rgba(255,255,255,0.7)'; 
            this.ctx.setLineDash([4,4]); this.ctx.moveTo(cx,cy); this.ctx.lineTo(x,y); this.ctx.stroke(); this.ctx.setLineDash([]);
        } else if (ast.risk_score >= 60) {
            this.ctx.fillStyle = isClosest ? '#ff0000' : '#ff0055'; 
            this.ctx.shadowBlur = 15; this.ctx.shadowColor = this.ctx.fillStyle; 
        } else if (ast.risk_score >= 30) {
            this.ctx.fillStyle = isClosest ? '#ffffaa' : '#ffd700'; 
            this.ctx.shadowBlur = 10; this.ctx.shadowColor = this.ctx.fillStyle;
        } else {
            this.ctx.fillStyle = isClosest ? '#aaffff' : '#00f0ff';
            this.ctx.shadowBlur = 5; this.ctx.shadowColor = this.ctx.fillStyle;
        }

        this.ctx.fill(); 
        this.ctx.shadowBlur = 0;

        if (ast.id === this.selectedId || isClosest || ast.risk_score >= 30) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 18px ' + 'var(--font-mono)'; 
            this.ctx.fillText(ast.name, x + 12, y - 8);
            
            if (ast.id === this.selectedId) {
                 if (ast.is_deflected) {
                    this.ctx.fillStyle = '#0f0';
                    this.ctx.fillText("TRAJECTORY SAFE", x + 12, y + 15);
                 } else {
                    this.ctx.fillStyle = (ast.risk_score >= 60) ? '#ffaaaa' : ((ast.risk_score >= 30) ? '#ffffaa' : '#ccffff');
                    const [date, time] = ast.approach_full.split(' ');
                    this.ctx.fillText(`Closest: ${date} ${time}`, x + 12, y + 15);
                 }
            }
        }
        return { x, y }; 
    },

    getAsteroidAt(clickX, clickY) {
        return this.asteroids.find(ast => Utils.isPointInCircle(clickX, clickY, ast.screenX, ast.screenY, ast.screenR + 10));
    }
};