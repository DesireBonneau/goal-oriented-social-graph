// Faker removed in favor of simple arrays

const MAJORS = [
    "Computer Science", "Software Engineering", "Electrical Engineering",
    "Psychology", "Economics", "Mathematics", "Physics", "Cognitive Science"
];

const COMPANIES = [
    "Tesla", "Google", "Microsoft", "Amazon", "Shopify",
    "Morgan Stanley", "Ubisoft", "Mnist", "CGI"
];

/**
 * Generates a random graph with nodes and links
 * @param {number} N - Number of nodes
 * @returns {import("../utils/schema").GraphData}
 */
export function generateMockGraph(N = 30) {
    const nodes = [];
    const links = [];

    // 1. Generate Nodes
    for (let i = 0; i < N; i++) {
        const isMainUser = i === 0;
        nodes.push({
            id: `user_${i}`,
            name: isMainUser ? "You" : `Student ${i}`, // Placeholder names for now unless I add a name generator
            info: {
                major: MAJORS[Math.floor(Math.random() * MAJORS.length)],
                experience: [
                    COMPANIES[Math.floor(Math.random() * COMPANIES.length)],
                    "Research Assistant"
                ]
            },
            val: 1, // Default size
            score: 0.1, // Default low relevance
            isFuzzy: false,
            summary: "Student at McGill University"
        });
    }

    // 2. Generate Links (Randomly connect)
    // Ensure "You" (user_0) has some connections
    for (let i = 1; i < 5; i++) {
        links.push({
            source: "user_0",
            target: `user_${i}`,
            strength: 1,
            type: "direct"
        });
    }

    // Random other connections
    for (let i = 1; i < N; i++) {
        const numLinks = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < numLinks; j++) {
            const target = Math.floor(Math.random() * N);
            if (target !== i) {
                links.push({
                    source: `user_${i}`,
                    target: `user_${target}`,
                    strength: 0.5,
                    type: "direct"
                });
            }
        }
    }

    return { nodes, links };
}

/**
 * Simulates a "Search" by updating scores based on query match (primitive mock)
 * @param {import("../utils/schema").GraphData} graph 
 * @param {string} query 
 */
export function simulateSearch(graph, query) {
    const lowerQuery = query.toLowerCase();

    return {
        ...graph,
        nodes: graph.nodes.map(node => {
            // Random "match" probability if query is present, else low score
            // In real app, this is Vector Search
            let matchScore = 0.1;

            if (query.trim() === "") {
                matchScore = 0.1;
            } else {
                const relevant = node.info.major.toLowerCase().includes(lowerQuery) ||
                    node.info.experience.some(e => e.toLowerCase().includes(lowerQuery));

                if (relevant) {
                    matchScore = 0.8 + Math.random() * 0.2; // 0.8 - 1.0
                } else {
                    matchScore = Math.random() * 0.3; // 0.0 - 0.3
                }
            }

            return {
                ...node,
                score: matchScore,
                val: matchScore * 10 + 1 // visual size
            };
        })
    };
}
