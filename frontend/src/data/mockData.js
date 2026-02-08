import { graphConfig, randomInRange } from '../config/graphConfig.js';

const FIRST_NAMES = [
    "Sarah", "Marcus", "Aisha", "David", "Priya", "James", "Mei", "Carlos",
    "Emma", "Jamal", "Sofia", "Ryan", "Fatima", "Kevin", "Olivia", "Andre",
    "Yuki", "Daniel", "Zara", "Michael", "Chloe", "Hassan", "Isabella", "Tyler",
    "Ananya", "Brandon", "Maya", "Ethan", "Layla", "Jason", "Nina", "Derek"
];

const LAST_NAMES = [
    "Chen", "Johnson", "Patel", "Williams", "Kim", "Rodriguez", "Singh", "Brown",
    "Nguyen", "Martinez", "Lee", "Thompson", "Garcia", "Wilson", "Ahmed", "Taylor",
    "Wang", "Anderson", "Sharma", "Moore", "Park", "Jackson", "Okonkwo", "White",
    "Tanaka", "Harris", "Gupta", "Martin", "Liu", "Robinson", "Khan", "Clark"
];

const MAJORS = [
    "Computer Science", "Software Engineering", "Electrical Engineering",
    "Psychology", "Economics", "Mathematics", "Physics", "Cognitive Science"
];

const COMPANIES = [
    "Tesla", "Google", "Microsoft", "Amazon", "Shopify",
    "Morgan Stanley", "Ubisoft", "Mila", "CGI"
];

/** Generates a random full name */
function generateName() {
    const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    return `${first} ${last}`;
}

/** Shuffle an array in place */
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Generates a realistic graph with nodes and links structured by connection degree.
 * @param {number} N - Number of nodes
 * @returns {import("../utils/schema").GraphData}
 */
export function generateMockGraph(N = 40) {
    const nodes = [];
    const links = [];
    const { scoreRanges, links: linkConfig } = graphConfig;

    // Create all node IDs first
    const allIds = Array.from({ length: N }, (_, i) => `user_${i}`);

    // Partition nodes by degree
    const numFirstDegree = Math.min(Math.floor(N * 0.15) + 2, 6); // 4-6 direct friends
    const numSecondDegree = Math.floor((N - 1 - numFirstDegree) * 0.5);
    const numThirdDegree = N - 1 - numFirstDegree - numSecondDegree;

    const firstDegreeIds = allIds.slice(1, 1 + numFirstDegree);
    const secondDegreeIds = allIds.slice(1 + numFirstDegree, 1 + numFirstDegree + numSecondDegree);
    const thirdDegreeIds = allIds.slice(1 + numFirstDegree + numSecondDegree);

    // 1. Create the main user node
    nodes.push({
        id: 'user_0',
        name: 'You',
        info: {
            major: MAJORS[Math.floor(Math.random() * MAJORS.length)],
            experience: [COMPANIES[Math.floor(Math.random() * COMPANIES.length)], "Research Assistant"]
        },
        val: 10,
        score: 1.0,
        isFuzzy: false,
        isConnected: false, // You are yourself
        summary: "Student at McGill University"
    });

    // 2. Create first-degree nodes (direct connections)
    firstDegreeIds.forEach((id, idx) => {
        const score = randomInRange(scoreRanges.firstDegree);
        nodes.push({
            id,
            name: generateName(),
            info: {
                major: MAJORS[Math.floor(Math.random() * MAJORS.length)],
                experience: [COMPANIES[Math.floor(Math.random() * COMPANIES.length)], "Intern"]
            },
            val: score * 8 + 2,
            score,
            isFuzzy: false,
            isConnected: idx < 3, // First 3 are friends you've added
            summary: "Student at McGill University"
        });

        // Link to user_0
        links.push({
            source: 'user_0',
            target: id,
            strength: linkConfig.direct.strength,
            type: linkConfig.direct.type
        });
    });

    // 3. Create second-degree nodes (friends of friends)
    const shuffledSecond = shuffle([...secondDegreeIds]);
    shuffledSecond.forEach((id, idx) => {
        const score = randomInRange(scoreRanges.secondDegree);
        nodes.push({
            id,
            name: generateName(),
            info: {
                major: MAJORS[Math.floor(Math.random() * MAJORS.length)],
                experience: [COMPANIES[Math.floor(Math.random() * COMPANIES.length)], "Co-op"]
            },
            val: score * 8 + 2,
            score,
            isFuzzy: false,
            isConnected: false,
            summary: "Student at McGill University"
        });

        // Link to a random first-degree node
        const parentIdx = idx % firstDegreeIds.length;
        links.push({
            source: firstDegreeIds[parentIdx],
            target: id,
            strength: linkConfig.indirect.strength,
            type: linkConfig.indirect.type
        });
    });

    // 4. Create third-degree nodes (fuzzy connections)
    const shuffledThird = shuffle([...thirdDegreeIds]);
    shuffledThird.forEach((id, idx) => {
        const score = randomInRange(scoreRanges.thirdDegree);
        nodes.push({
            id,
            name: generateName(),
            info: {
                major: MAJORS[Math.floor(Math.random() * MAJORS.length)],
                experience: [COMPANIES[Math.floor(Math.random() * COMPANIES.length)], "Volunteer"]
            },
            val: score * 8 + 2,
            score,
            isFuzzy: true,
            isConnected: false,
            summary: "Student at McGill University"
        });

        // Link to a random second-degree node
        if (secondDegreeIds.length > 0) {
            const parentIdx = idx % secondDegreeIds.length;
            links.push({
                source: secondDegreeIds[parentIdx],
                target: id,
                strength: linkConfig.fuzzy.strength,
                type: linkConfig.fuzzy.type
            });
        }
    });

    // 5. Add some cross-links for realism (within same degree)
    const addCrossLinks = (ids, count, config) => {
        const shuffled = shuffle([...ids]);
        for (let i = 0; i < Math.min(count, shuffled.length - 1); i++) {
            links.push({
                source: shuffled[i],
                target: shuffled[(i + 1) % shuffled.length],
                strength: config.strength * 0.7,
                type: config.type
            });
        }
    };

    addCrossLinks(firstDegreeIds, 2, linkConfig.direct);
    addCrossLinks(secondDegreeIds, 4, linkConfig.indirect);
    addCrossLinks(thirdDegreeIds, 3, linkConfig.fuzzy);

    return { nodes, links };
}

/**
 * Simulates a "Search" by updating scores based on query match.
 * Preserves node references to prevent graph layout reset.
 * @param {import("../utils/schema").GraphData} graph 
 * @param {string} query 
 */
export function simulateSearch(graph, query) {
    const lowerQuery = query.toLowerCase().trim();

    // Mutate nodes in place to preserve references (prevents layout reset)
    graph.nodes.forEach(node => {
        if (node.id === graphConfig.selfId) {
            // User always stays at score 1.0
            node.score = 1.0;
            node.val = 10;
            return;
        }

        let matchScore;
        if (lowerQuery === "") {
            // Reset to original degree-based scores
            if (node.isFuzzy) {
                matchScore = randomInRange(graphConfig.scoreRanges.thirdDegree);
            } else if (node.isConnected) {
                matchScore = randomInRange(graphConfig.scoreRanges.firstDegree);
            } else {
                matchScore = randomInRange(graphConfig.scoreRanges.secondDegree);
            }
        } else {
            // Check for relevance
            const relevant =
                node.info.major.toLowerCase().includes(lowerQuery) ||
                node.info.experience.some(e => e.toLowerCase().includes(lowerQuery)) ||
                node.name.toLowerCase().includes(lowerQuery);

            if (relevant) {
                matchScore = 0.8 + Math.random() * 0.2; // 0.8 - 1.0
            } else {
                matchScore = 0.1 + Math.random() * 0.2; // 0.1 - 0.3
            }
        }

        node.score = matchScore;
        node.val = matchScore * 8 + 2;
    });

    // Return the same object to preserve reference
    return graph;
}
