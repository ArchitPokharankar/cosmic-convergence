const DataProcessor = {
    process(nasaData) {
        const rawObjects = [];
        const neoData = nasaData.near_earth_objects;
        
        Object.keys(neoData).forEach(date => {
            rawObjects.push(...neoData[date]);
        });

        return rawObjects.map(obj => {
            const closeData = obj.close_approach_data[0];
            const missKm = parseFloat(closeData.miss_distance.kilometers);
            const diameterAvg = (obj.estimated_diameter.kilometers.estimated_diameter_min + 
                               obj.estimated_diameter.kilometers.estimated_diameter_max) / 2;
            const velocity = parseFloat(closeData.relative_velocity.kilometers_per_hour);
            const epochClose = parseFloat(closeData.epoch_date_close_approach);

            // Risk Calc
            let risk = obj.is_potentially_hazardous_asteroid ? 50 : 0;
            if (missKm < 10000000) risk += (1 - (missKm / 10000000)) * 40;
            if (diameterAvg > 0.05) risk += Math.min(20, diameterAvg * 50);
            if (velocity > 50000) risk += 5;
            risk = Math.max(1, Math.min(99, Math.round(risk)));
            
            const approachDateTime = new Date(epochClose).toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: '2-digit', 
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            });

            // --- CALCULATE IMPACT DATA ---
            const megatons = Utils.calculateImpactEnergy(diameterAvg, velocity);
            const impactType = Utils.getImpactType(megatons);

            return {
                id: obj.id,
                name: obj.name.replace(/[()]/g, ''),
                diameter: diameterAvg,
                velocity: velocity,
                miss_distance: missKm, 
                epoch_close: epochClose, 
                approach_full: approachDateTime, 
                is_hazardous: obj.is_potentially_hazardous_asteroid,
                risk_score: risk,
                angle: Utils.hashToAngle(obj.id),
                // New Fields
                impact_energy_mt: megatons,
                impact_type: impactType,
                is_deflected: false 
            };
        }).sort((a, b) => b.risk_score - a.risk_score);
    }
};