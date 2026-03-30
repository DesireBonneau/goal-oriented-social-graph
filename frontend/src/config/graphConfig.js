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
        // Selection / comparison states
        selected: '#F472B6',    // Pink - the profile currently focused
        selfHighlighted: '#34D399', // Brighter emerald when logged-in user is part of comparison
        comparison: '#FB923C',  // Orange - the second node in a comparison pair
        highlightedEdge: '#F472B6', // Pink - edge between two compared profiles
        virtualEdge: '#FB923C',    // Orange dashed - virtual edge drawn for comparison
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
        focusDistance: 200,     // Distance when focusing on a node (higher = less zoom)
        focusZoom2D: 2.5,       // Zoom level when focusing on a node in 2D
        animationDuration: 500, // ms for zoom animations
        minZoom3D: 80,          // Closest zoom in 3D (lower z = closer)
        maxZoom3D: 500,         // Farthest zoom in 3D (higher z = farther)
        minZoom2D: 0.5,         // Minimum zoom level in 2D
        maxZoom2D: 8,           // Maximum zoom level in 2D
    },

    // Node sizing
    sizing: {
        baseRadius3D: 2,        // Base radius multiplier for 3D nodes
        baseRadius2D: 1,        // Base radius multiplier for 2D nodes
        auraMultiplier: 2.5,    // Aura size relative to node
    },

    // User identification (the logged-in user's node ID)
    // Set dynamically via setCurrentUserId() after login
    selfId: null,

    // Selection state: nodes currently being compared
    // Set dynamically via setSelectionState()
    selectedNodeId: null,    // Primary selected node (clicked from graph or search)
    comparisonNodeId: null,  // Second node in comparison mode
};

/**
 * Set the current user's ID for graph highlighting.
 * Call this after login/register with the user's actual ID.
 * @param {string | null} id - The user's MongoDB _id
 */
export function setCurrentUserId(id) {
    graphConfig.selfId = id;
}

/**
 * Set the active selection / comparison state.
 * @param {string|null} selectedId - Primary selected node ID
 * @param {string|null} comparisonId - Comparison node ID (optional)
 */
export function setSelectionState(selectedId, comparisonId = null) {
    graphConfig.selectedNodeId = selectedId;
    graphConfig.comparisonNodeId = comparisonId;
}

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
 * Get node color incorporating selection/comparison state.
 * Priority: comparisonNode > selectedNode > selfHighlighted (when in comparison) > base color
 * @param {Object} node
 * @returns {string} Hex color string
 */
export function getNodeColorWithState(node) {
    const { selectedNodeId, comparisonNodeId, selfId, colors } = graphConfig;
    const isInComparisonMode = selectedNodeId !== null || comparisonNodeId !== null;

    if (comparisonNodeId && node.id === comparisonNodeId) {
        return colors.comparison;
    }
    if (selectedNodeId && node.id === selectedNodeId) {
        return colors.selected;
    }
    // Brighten self node when it's part of an active comparison (logged-in vs target)
    if (selfId && node.id === selfId && isInComparisonMode) {
        return colors.selfHighlighted;
    }
    return getNodeColor(node);
}

/**
 * Get the color for a link based on selection state.
 * Returns highlighted colour for the edge between selected/compared nodes.
 * @param {Object} link - Link object with source.id / target.id
 * @param {boolean} isVirtual - Whether this is a virtual comparison edge
 * @returns {{ color: string, width: number, dashed: boolean }}
 */
export function getLinkStyle(link, isVirtual = false) {
    const { selectedNodeId, comparisonNodeId, selfId, colors } = graphConfig;
    const sourceId = link.source?.id ?? link.source;
    const targetId = link.target?.id ?? link.target;

    if (isVirtual) {
        return { color: colors.virtualEdge, width: 2, dashed: true };
    }

    // A link is highlighted if it directly connects (selected ↔ self) or (selected ↔ comparison)
    const pairs = [
        [selectedNodeId, selfId],
        [selectedNodeId, comparisonNodeId],
        [comparisonNodeId, selfId],
    ];
    const isHighlighted = pairs.some(([a, b]) =>
        a && b && (
            (sourceId === a && targetId === b) ||
            (sourceId === b && targetId === a)
        )
    );

    if (isHighlighted) {
        return { color: colors.highlightedEdge, width: 3, dashed: false };
    }
    return { color: 'rgba(255,255,255,0.2)', width: 0.5, dashed: link.type === 'fuzzy' };
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
