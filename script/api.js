const API = {
    async fetchFeed(useLive) {
        if (!useLive) {
            console.log("API: Using Fallback Data");
            return this.getFallback();
        }

        // Get Today and Today + 7 days
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 7);

        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        // NASA API allows max 7 days range
        const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${startStr}&end_date=${endStr}&api_key=${NASA_API_KEY}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("NASA API Error");
            const data = await response.json();
            return data;
        } catch (error) {
            console.warn("API Fail:", error);
            alert("NASA API Failed (Check Key/Limit). Switching to Offline Mode.");
            return this.getFallback();
        }
    },

    async getFallback() {
        const response = await fetch('data/fallback_asteroids.json');
        return await response.json();
    }
};