from collections import defaultdict, deque

# -----------------------------
# Data model
# -----------------------------


class Person:
    """
    Minimal profile container for a student.

    Purpose:
        Holds structured data for scoring and graph visualization. This is the
        central record that other functions read from, but does not compute
        scores by itself.

    Used by:
        - Scoring: attribute_score, success_score, intent_score, bridge_score,
          reciprocity_score, and recommend.
        - Graph: propagate_scores (via connections) and build_visualization.
    """

    def __init__(
        self,
        name,
        major,
        grad_year,
        internships,
        topics,
        clubs,
        courses,
        offers,
        seeks,
        availability_hours,
        leadership,
        awards,
        projects,
        open_to_intro=True,
    ):
        """
        Initialize a Person with profile data and availability.

        Notes:
            - Sets collections as sets to simplify overlap logic in scoring.
            - Connections are stored as a dict to preserve trust weights.

        Used in this file:
            See the example dataset section where several Person objects are
            instantiated for the demo.
        """
        self.name = name
        self.major = major
        self.grad_year = grad_year
        self.internships = set(internships)
        self.topics = set(topics)
        self.clubs = set(clubs)
        self.courses = set(courses)
        self.offers = set(offers)
        self.seeks = set(seeks)
        self.availability_hours = availability_hours
        self.leadership = set(leadership)
        self.awards = set(awards)
        self.projects = set(projects)
        self.open_to_intro = open_to_intro
        self.connections = {}

    def connect(self, other, trust=1.0):
        """
        Create a bidirectional, trust-weighted edge between two people.

        Why this matters:
            Graph influence is weighted by trust, so connections can represent
            strength of relationship rather than a binary link.

        Used in this file:
            The example dataset connects nodes with different trust values.
        """
        self.connections[other] = trust
        other.connections[self] = trust


# -----------------------------
# Scoring logic (opportunity-first)
# -----------------------------

DEFAULT_WEIGHTS = {
    "attribute": 1.0,
    "reciprocity": 1.2,
    "graph": 0.9,
    "success": 0.4,
    "intent": 0.7,
    "bridge": 0.6,
    "serendipity": 0.5,
}


def attribute_score(person, goal):
    """
    Measure how closely a person's profile matches the user's goal.

    Rationale:
        Goal matching captures direct relevance (major, internships, topics,
        courses) rather than social proximity.

    Used by:
        recommend (as the "attribute" component).
    """
    score = 0.0
    if person.major in goal["majors"]:
        score += 2.0
    score += len(person.internships & goal["internships"]) * 2.5
    score += len(person.topics & goal["topics"]) * 1.0
    score += len(person.courses & goal["courses"]) * 0.8
    if person.grad_year <= goal["grad_year"]:
        score += 0.5
    return score


def reciprocity_score(user, person):
    """
    Estimate mutual value by comparing "offers" and "seeks".

    Why this is distinct from LinkedIn:
        It prioritizes two-way benefit, not just profile similarity, which is
        closer to matchmaking for opportunities than résumé browsing.

    Used by:
        recommend (as the "reciprocity" component and for serendipity).
    """
    give = len(user.offers & person.seeks)
    take = len(user.seeks & person.offers)
    return 2.0 * min(give, take) + 1.0 * (give + take)


def success_score(person):
    """
    Proxy for "track record" based on internships, leadership, awards, projects.

    Notes:
        - The prestige map is an intentionally small heuristic for the demo.
        - In a real system, this should be learned or parameterized per campus.

    Used by:
        recommend (as the "success" component) and build_visualization
        (for node sizing).
    """
    prestige = {
        "Jane Street": 4.0,
        "Google": 3.5,
        "Amazon": 3.0,
        "Nvidia": 3.0,
        "CERN": 3.2,
        "Morgan Stanley": 2.8,
    }
    score = sum(prestige.get(i, 1.0) for i in person.internships)
    score += 0.8 * len(person.leadership)
    score += 0.6 * len(person.awards)
    score += 0.4 * len(person.projects)
    return score


def intent_score(person):
    """
    Measure likelihood of responsiveness based on availability and opt-in.

    Why it exists:
        Opportunity matching fails if the other person is not open to intros.
        This nudges the recommender toward actionable connections.

    Used by:
        recommend (as the "intent" component).
    """
    availability = min(person.availability_hours / 4.0, 2.0)
    return availability + (1.0 if person.open_to_intro else 0.0)


def bridge_score(user, person):
    """
    Reward people who introduce new topics or majors to the user's network.

    Why it matters:
        This favors weak ties and cross-circle discovery, which differentiates
        the product from purely similarity-driven recommendations.

    Used by:
        recommend (as the "bridge" component).
    """
    network_topics = set()
    network_majors = set()
    for friend in user.connections:
        network_topics |= friend.topics
        network_majors.add(friend.major)
    novel_topics = len(person.topics - network_topics)
    novel_major = 1.0 if person.major not in network_majors else 0.0
    return 0.6 * novel_topics + 1.2 * novel_major


def propagate_scores(start, max_depth=3, decay=0.6):
    """
    Breadth-first influence propagation from the user out to N degrees.

    How it works:
        BFS explores neighbors by distance. Influence decays with depth and is
        scaled by trust strength along each edge.

    External reference:
        https://en.wikipedia.org/wiki/Breadth-first_search

    Used by:
        recommend (as the "graph" component).
    """
    scores = defaultdict(float)
    visited = {start}
    queue = deque([(start, 0, 1.0)])

    while queue:
        current, depth, strength = queue.popleft()
        if depth >= max_depth:
            continue

        for neighbor, trust in current.connections.items():
            if neighbor in visited:
                continue
            visited.add(neighbor)
            influence = (decay ** (depth + 1)) * strength * trust
            scores[neighbor] += influence
            queue.append((neighbor, depth + 1, strength * trust))

    return scores


def recommend(user, people, goal, weights=None):
    """
    Produce a ranked list of recommended connections with score breakdowns.

    Output:
        List of (person, total_score, components), sorted descending.

    Used by:
        - The print loop in the demo.
        - build_visualization, which colors nodes based on this score.

    Notes:
        Direct friends are excluded so recommendations focus on new intros.
    """
    weights = weights or DEFAULT_WEIGHTS
    graph_scores = propagate_scores(user)
    results = []

    for person in people:
        if person is user or person in user.connections:
            continue

        components = {
            "attribute": attribute_score(person, goal),
            "reciprocity": reciprocity_score(user, person),
            "graph": graph_scores.get(person, 0.0),
            "success": success_score(person),
            "intent": intent_score(person),
            "bridge": bridge_score(user, person),
            "serendipity": 1.0 if person.major != user.major and reciprocity_score(user, person) > 0 else 0.0,
        }
        total = sum(components[k] * weights.get(k, 1.0) for k in components)
        results.append((person, total, components))

    return sorted(results, key=lambda x: x[1], reverse=True)


def top_reasons(components, max_items=2):
    """
    Convert numeric component scores into short, user-facing rationales.

    Why this exists:
        Hackathon demos benefit from explainability: it shows "why" a match
        happened rather than only showing a rank.

    Used by:
        The print loop in the demo output.
    """
    labels = {
        "attribute": "shared background",
        "reciprocity": "mutual give/take",
        "graph": "close in your graph",
        "success": "strong track record",
        "intent": "high intent/availability",
        "bridge": "bridges new circles",
        "serendipity": "useful weak tie",
    }
    ranked = sorted(components.items(), key=lambda x: x[1], reverse=True)
    return [labels[k] for k, v in ranked if v > 0][:max_items]


def intro_card(user, person):
    """
    Generate a short, actionable intro prompt based on offers and seeks.

    Behavior:
        If there is overlap, it produces a concrete sentence. Otherwise it
        falls back to a generic line to avoid empty output.

    Used by:
        The print loop in the demo output.
    """
    give = list(user.offers & person.seeks)
    take = list(user.seeks & person.offers)
    lines = []
    if take:
        lines.append(f"{person.name} can help with {take[0]}")
    if give:
        lines.append(f"{user.name} can help with {give[0]}")
    return " / ".join(lines) if lines else "Potential shared interests"


# -----------------------------
# Visualization (PyVis)
# -----------------------------

MAJOR_BORDER_COLORS = {
    "CS": "#2D6BBA",
    "Math": "#2E8B57",
    "EE": "#C27C2C",
    "Physics": "#8C4A9E",
}


def _normalize(value, min_value, max_value):
    """
    Normalize a scalar to 0..1 for color/size mapping.

    Used by:
        build_visualization to scale colors and sizes.
    """
    if max_value - min_value < 1e-6:
        return 0.5
    return (value - min_value) / (max_value - min_value)


def _lerp_color(color_a, color_b, t):
    """
    Linear interpolation between two hex colors.

    Used by:
        build_visualization to map scores to a color gradient.
    """
    t = max(0.0, min(1.0, t))
    a = int(color_a[1:], 16)
    b = int(color_b[1:], 16)
    ar, ag, ab = (a >> 16) & 255, (a >> 8) & 255, a & 255
    br, bg, bb = (b >> 16) & 255, (b >> 8) & 255, b & 255
    rr = int(ar + (br - ar) * t)
    rg = int(ag + (bg - ag) * t)
    rb = int(ab + (bb - ab) * t)
    return f"#{rr:02X}{rg:02X}{rb:02X}"


def build_visualization(user, people, goal, output_html, weights=None):
    """
    Render the graph to an interactive HTML file using PyVis.

    Visual encodings:
        - Node fill color: recommendation score (blue -> orange).
        - Node border color: major.
        - Node size: success score.
        - Edge width: trust strength.

    External reference:
        https://pyvis.readthedocs.io/

    Used by:
        The demo runner at the end of the file.
    """
    try:
        from pyvis.network import Network
    except ImportError:
        print("PyVis not installed. Run: python -m pip install pyvis")
        return

    results = recommend(user, people, goal, weights=weights)
    score_map = {person: score for person, score, _ in results}
    min_score = min(score_map.values()) if score_map else 0.0
    max_score = max(score_map.values()) if score_map else 1.0

    success_map = {person: success_score(person) for person in people}
    min_success = min(success_map.values()) if success_map else 0.0
    max_success = max(success_map.values()) if success_map else 1.0

    net = Network(height="700px", width="100%", bgcolor="#0E1117", font_color="#E6E6E6")
    net.force_atlas_2based(gravity=-35, central_gravity=0.02, spring_length=140, spring_strength=0.06)

    for person in people:
        if person is user:
            node_color = "#F5F5F5"
        else:
            t = _normalize(score_map.get(person, min_score), min_score, max_score)
            node_color = _lerp_color("#2D6BBA", "#F28E2B", t)

        border = MAJOR_BORDER_COLORS.get(person.major, "#9E9E9E")
        size_t = _normalize(success_map.get(person, 0.0), min_success, max_success)
        size = 18 + size_t * 18

        title_lines = [
            f"Name: {person.name}",
            f"Major: {person.major}",
            f"Grad: {person.grad_year}",
            f"Internships: {', '.join(sorted(person.internships))}",
            f"Topics: {', '.join(sorted(person.topics))}",
            f"Offers: {', '.join(sorted(person.offers))}",
            f"Seeks: {', '.join(sorted(person.seeks))}",
        ]

        net.add_node(
            person.name,
            label=person.name,
            title="<br>".join(title_lines),
            color={"background": node_color, "border": border},
            borderWidth=2,
            size=size,
            shape="star" if person is user else "dot",
        )

    added_edges = set()
    for person in people:
        for neighbor, trust in person.connections.items():
            edge_key = tuple(sorted([person.name, neighbor.name]))
            if edge_key in added_edges:
                continue
            added_edges.add(edge_key)
            width = 1 + trust * 3
            net.add_edge(person.name, neighbor.name, value=trust, width=width, color="#607D8B")

    net.write_html(output_html)
    print(f"Graph saved to {output_html}")


# -----------------------------
# Example dataset (McGill demo)
# -----------------------------

alice = Person(
    "Alice",
    "CS",
    2026,
    ["Google"],
    {"ml", "systems"},
    {"McGill AI Society"},
    {"COMP 250", "COMP 251"},
    {"python tutoring", "ml research feedback"},
    {"quant internship prep", "research lab"},
    3,
    {"TA"},
    {"deans list"},
    {"ml pipeline"},
)

bob = Person(
    "Bob",
    "CS",
    2025,
    ["Amazon"],
    {"backend", "systems"},
    {"CodeJam"},
    {"COMP 310"},
    {"backend mentoring"},
    {"ml research"},
    2,
    set(),
    {"hackathon winner"},
    {"api gateway"},
)

cara = Person(
    "Cara",
    "EE",
    2025,
    ["Nvidia"],
    {"hardware", "ml"},
    {"Robotics Club"},
    {"ECSE 429"},
    {"gpu optimization"},
    {"systems design"},
    5,
    {"club lead"},
    set(),
    {"embedded vision"},
)

dan = Person(
    "Dan",
    "Physics",
    2024,
    ["CERN"],
    {"simulation", "hpc"},
    {"Physics Society"},
    {"PHYS 350"},
    {"hpc guidance"},
    {"fintech networking"},
    4,
    set(),
    {"research poster"},
    {"monte carlo"},
)

emma = Person(
    "Emma",
    "CS",
    2024,
    ["Jane Street"],
    {"quant", "math"},
    {"Finance Club"},
    {"MATH 240"},
    {"quant internship prep", "quant interview prep"},
    {"ml research feedback"},
    2,
    {"club exec"},
    {"math olympiad"},
    {"pricing models"},
)

farah = Person(
    "Farah",
    "Math",
    2026,
    ["Morgan Stanley"],
    {"stats", "quant"},
    {"Women in Tech"},
    {"MATH 323"},
    {"probability tutoring"},
    {"trading internship", "python tutoring"},
    3,
    set(),
    set(),
    {"stochastic models"},
)

alice.connect(bob, trust=0.9)
bob.connect(cara, trust=0.8)
cara.connect(dan, trust=0.7)
dan.connect(emma, trust=0.9)
emma.connect(farah, trust=0.85)

people = [alice, bob, cara, dan, emma, farah]

# -----------------------------
# User goal (opportunity-first)
# -----------------------------

goal = {
    "majors": {"CS", "Math"},
    "grad_year": 2026,
    "internships": {"Jane Street", "Google"},
    "topics": {"quant", "ml"},
    "courses": {"COMP 251", "MATH 240"},
}

# -----------------------------
# Run recommendation
# -----------------------------

results = recommend(alice, people, goal)
for person, score, components in results:
    reasons = ", ".join(top_reasons(components))
    card = intro_card(alice, person)
    print(f"{person.name}: {score:.2f} | {reasons}")
    print(f"  Intro: {card}")

build_visualization(alice, people, goal, "network_graph.html")
