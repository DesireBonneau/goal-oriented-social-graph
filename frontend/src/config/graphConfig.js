/**
 * Central configuration for graph visualization.
 * All colors, thresholds, and styling values should be defined here.
 */

export const graphConfig = {
    // Node colors by type (priority order: self > connected > highScore > default)
    colors: {
        self: '#10B981',        // Emerald - the logged-in user
        connected: '#F59E0B',   // Amber - friends you've added
        highScore: '#60A5FA',   // Blue - high relevance nodes
        default: '#4B5563',     // Gray - everyone else
        aura: '#3b82f6',        // Blue glow for high-score nodes
    },

    // Score thresholds for visual effects
    thresholds: {
        highScore: 0.7,         // Show as "relevant" with blue color
        showLabel: 0.8,         // Always show name label (in 3D)
        showAura: 0.6,          // Show glow effect around node
    },

    // Score ranges by connection degree (for mock data generation)
    scoreRanges: {
        firstDegree: [0.85, 1.0],   // Direct connections to user
        secondDegree: [0.5, 0.7],   // Friends of friends
        thirdDegree: [0.2, 0.4],    // 3rd+ degree (fuzzy)
    },

    // Link styling by type
    links: {
        direct: { strength: 1.0, type: 'direct' },
        indirect: { strength: 0.6, type: 'direct' },
        fuzzy: { strength: 0.3, type: 'fuzzy' },
    },

    // Camera/zoom settings
    camera: {
        initialZoom3D: 150,     // Initial camera z position in 3D
        initialZoom2D: 3.5,     // Initial zoom level in 2D
        focusDistance: 120,     // Distance when focusing on a node
        animationDuration: 500, // ms for zoom animations
    },

    // Node sizing
    sizing: {
        baseRadius3D: 2,        // Base radius multiplier for 3D nodes
        baseRadius2D: 1,        // Base radius multiplier for 2D nodes
        auraMultiplier: 2.5,    // Aura size relative to node
    },

    // User identification (the logged-in user's node ID)
    selfId: 'user_0',
};

/**
 * Get the color for a node based on its properties.
 * Priority: self > connected > highScore > default
 * @param {Object} node - Node object with id, score, isConnected
 * @returns {string} Hex color string
 */
export function getNodeColor(node) {
    if (node.id === graphConfig.selfId) {
        return graphConfig.colors.self;
    }
    if (node.isConnected) {
        return graphConfig.colors.connected;
    }
    if (node.score >= graphConfig.thresholds.highScore) {
        return graphConfig.colors.highScore;
    }
    return graphConfig.colors.default;
}

/**
 * Check if a node should display its label.
 * @param {Object} node - Node object
 * @param {number} [globalScale] - Optional zoom scale for 2D
 * @returns {boolean}
 */
export function shouldShowLabel(node, globalScale = 0) {
    if (node.id === graphConfig.selfId) return true;
    if (node.score >= graphConfig.thresholds.showLabel) return true;
    if (globalScale > 2) return true; // Show labels when zoomed in (2D)
    return false;
}

/**
 * Check if a node should have an aura effect.
 * @param {Object} node - Node object
 * @returns {boolean}
 */
export function shouldShowAura(node) {
    return node.score >= graphConfig.thresholds.showAura;
}

/**
 * Generate a random score within a range.
 * @param {[number, number]} range - Min and max values
 * @returns {number}
 */
export function randomInRange([min, max]) {
    return min + Math.random() * (max - min);
}
