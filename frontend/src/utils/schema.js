/**
 * @typedef {Object} Node
 * @property {string} id
 * @property {string} name
 * @property {Object} info
 * @property {string} info.major
 * @property {string} [info.minor]
 * @property {string[]} info.experience
 * @property {number} val - Visual size (mapped to score)
 * @property {number} score - 0.0 to 1.0 (Relevance)
 * @property {boolean} isFuzzy - true if 3rd+ degree connection
 * @property {string} [img]
 * @property {string} [summary]
 */

/**
 * @typedef {Object} Link
 * @property {string} source - ID
 * @property {string} target - ID
 * @property {number} strength
 * @property {'direct'|'fuzzy'} type
 */

/**
 * @typedef {Object} GraphData
 * @property {Node[]} nodes
 * @property {Link[]} links
 */
