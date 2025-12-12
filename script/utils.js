const Utils = {
    // Generate a deterministic angle (0-360) based on string ID
    hashToAngle: (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        // Normalize to 0 - 2PI
        const normalized = Math.abs(hash % 360);
        return (normalized * Math.PI) / 180;
    },

    formatNumber: (num) => {
        return new Intl.NumberFormat('en-US').format(Math.round(num));
    },

    // Map a value from one range to another (e.g., Km to Screen Pixels)
    mapRange: (value, inMin, inMax, outMin, outMax) => {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    },

    // Simple collision detection (circle vs mouse point)
    isPointInCircle: (x, y, cx, cy, radius) => {
        const dx = x - cx;
        const dy = y - cy;
        return (dx * dx + dy * dy) <= (radius * radius);
    }
};