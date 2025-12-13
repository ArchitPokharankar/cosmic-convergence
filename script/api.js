const API = {
    async fetchFeed(useLive) {
        // 1. If Live Toggle is OFF, return Fallback immediately
        if (!useLive) {
            console.log("API: Offline Mode Selected");
            return this.getFallback();
        }

        // 2. If Live Toggle is ON, try to fetch NASA Data
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 7); // Fetch 7 days to ensure we get results

        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        // Replace DEMO_KEY with your key if you have one, otherwise DEMO_KEY works (but has limits)
        const apiKey = (typeof NASA_API_KEY !== 'undefined') ? NASA_API_KEY : "DEMO_KEY";
        const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${startStr}&end_date=${endStr}&api_key=${apiKey}`;

        try {
            console.log("API: Fetching NASA Feed...");
            const response = await fetch(url);
            
            if (!response.ok) {
                // If 429 (Rate Limit) or 403 (Bad Key), throw error
                throw new Error(`NASA API Error: ${response.status}`);
            }

            const data = await response.json();
            
            // Safety check: Does it actually have objects?
            if (data.element_count === 0) {
                console.warn("API: 0 Objects Found. Switching to Fallback.");
                return this.getFallback();
            }

            return data;

        } catch (error) {
            console.warn("API Failed or Blocked:", error);
            alert("NASA Connection Issue (or Limit Reached). Switching to Simulation Mode.");
            return this.getFallback(); // FAIL-SAFE: Always return data
        }
    },

    // Guaranteed Data Generator (Never Empty)
    getFallback() {
        const today = new Date();
        const makeDate = (offsetDays) => {
            const d = new Date(today);
            d.setDate(today.getDate() + offsetDays);
            return d;
        };
        const dateStr = today.toISOString().split('T')[0];

        return {
            "element_count": 8,
            "near_earth_objects": {
                [dateStr]: [
                    this.createFakeAsteroid("2025 XG2", true, 0.4, 68000, 1500000, makeDate(1)),
                    this.createFakeAsteroid("2025 WA3", true, 0.31, 64000, 3400000, makeDate(2)),
                    this.createFakeAsteroid("2021 AB", false, 0.05, 22000, 8000000, makeDate(0)),
                    this.createFakeAsteroid("Apophis (Sim)", true, 0.34, 55000, 200000, makeDate(3)),
                    this.createFakeAsteroid("2025 YY", false, 0.02, 18000, 12000000, makeDate(4)),
                    this.createFakeAsteroid("Voyager Rock", false, 0.01, 15000, 500000, makeDate(1)),
                    this.createFakeAsteroid("Comet Z", true, 0.8, 98000, 4500000, makeDate(6)),
                    this.createFakeAsteroid("Zeus", true, 1.2, 76000, 15000000, makeDate(5))
                ]
            }
        };
    },

    createFakeAsteroid(name, hazardous, diameter, velocity, missDist, dateObj) {
        return {
            id: String(Math.floor(Math.random() * 1000000)),
            name: name,
            is_potentially_hazardous_asteroid: hazardous,
            estimated_diameter: { kilometers: { estimated_diameter_min: diameter, estimated_diameter_max: diameter + 0.1 } },
            close_approach_data: [{
                close_approach_date_full: dateObj.toLocaleString(),
                epoch_date_close_approach: dateObj.getTime(),
                relative_velocity: { kilometers_per_hour: String(velocity) },
                miss_distance: { kilometers: String(missDist) },
                orbiting_body: "Earth"
            }]
        };
    }
};