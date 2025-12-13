const Utils = {
    // Generate a deterministic angle (0-360) based on string ID
    hashToAngle: (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const normalized = Math.abs(hash % 360);
        return (normalized * Math.PI) / 180;
    },

    formatNumber: (num) => {
        return new Intl.NumberFormat('en-US').format(Math.round(num));
    },

    isPointInCircle: (x, y, cx, cy, radius) => {
        const dx = x - cx;
        const dy = y - cy;
        return (dx * dx + dy * dy) <= (radius * radius);
    },

    // --- PHYSICS ENGINE (RESTORED) ---
    calculateImpactEnergy: (diameterKm, velocityKph) => {
        // 1. Mass (Volume * Density). Approx Density = 2500 kg/m^3
        const radiusM = (diameterKm * 1000) / 2;
        const volume = (4/3) * Math.PI * Math.pow(radiusM, 3);
        const massKg = volume * 2500; 

        // 2. Velocity (m/s)
        const velocityMps = velocityKph / 3.6;

        // 3. Kinetic Energy (Joules) = 0.5 * m * v^2
        const energyJoules = 0.5 * massKg * Math.pow(velocityMps, 2);

        // 4. Megatons TNT (1 MT = 4.184e15 J)
        const megatons = energyJoules / 4.184e15;
        
        return megatons;
    },

    getImpactType: (megatons) => {
        if (megatons < 1) return "Local Crater (City Block)";
        if (megatons < 50) return "City Destroyer (Metro Area)"; 
        if (megatons < 1000) return "Regional Devastation";
        if (megatons < 100000) return "Continental Catastrophe";
        return "Global Extinction Event";
    }
};