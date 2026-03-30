import React, { useState, useCallback, useEffect } from 'react';
import GraphViz from './components/Graph/GraphViz';
import Sidebar from './components/Layout/Sidebar';
import SearchBar from './components/UI/SearchBar';
import RegistrationFlow from './components/Onboarding/RegistrationFlow';
import { api } from './services/api';
import { setCurrentUserId, setSelectionState } from './config/graphConfig';

function App() {
  // ── Auth & graph state ─────────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [is3D, setIs3D] = useState(true);

  // ── Selection state ────────────────────────────────────────────────────────
  const [selectedNode, setSelectedNode] = useState(null);
  const [comparisonNode, setComparisonNode] = useState(null);
  const [searchContext, setSearchContext] = useState(null);

  // ── Keep graphConfig in sync with selection state ──────────────────────────
  // setCurrentUserId drives self-node colour; setSelectionState drives link highlighting
  useEffect(() => {
    setCurrentUserId(user?.isGuest ? null : user?.id ?? null);
  }, [user]);

  useEffect(() => {
    setSelectionState(selectedNode?.id ?? null, comparisonNode?.id ?? null);
  }, [selectedNode?.id, comparisonNode?.id]);

  // ── Registration handler ───────────────────────────────────────────────────
  const handleRegistrationComplete = async (userData) => {
    try {
      let finalUser = userData;
      if (!userData.isGuest && !userData.id) {
        const response = await api.createUser(userData);
        finalUser = { ...userData, id: response.id };
      }
      setUser(finalUser);
      if (!userData.isGuest && finalUser.id) {
        setCurrentUserId(finalUser.id);
      }

      const data = await api.getGraph();

      if (!userData.isGuest) {
        const meNodeIndex = data.nodes.findIndex(n => n.id === finalUser.id || n.email === userData.email);
        if (meNodeIndex !== -1) {
          data.nodes[meNodeIndex] = {
            ...data.nodes[meNodeIndex],
            name: `${userData.firstName} ${userData.lastName}`,
            info: { major: userData.major, experience: userData.experience || [] }
          };
          // Show the logged-in user's own node in the sidebar on startup
          setSelectedNode(data.nodes[meNodeIndex]);
        }
      }
      // Guests: no node pre-selected — let them explore freely
      setGraphData(data);
    } catch (err) {
      console.error('Registration/Setup failed', err);
    }
  };

  // ── Node click ─────────────────────────────────────────────────────────────
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    setComparisonNode(null);
    setSearchContext(null);
  }, []);

  // ── Search bar callbacks ───────────────────────────────────────────────────
  // Full search (submit / category click) — refreshes graph data
  const handleSearch = useCallback(async (query) => {
    try {
      if (!query || query.trim() === '') {
        const data = await api.getGraph();
        setGraphData(data);
        return;
      }
      const data = await api.search(query);
      setGraphData(data);
      // Clear selection when a full search reloads the graph
      setSelectedNode(null);
      setComparisonNode(null);
      setSearchContext(null);
    } catch (err) {
      console.error('Search failed', err);
    }
  }, []);

  // Profile selection from dropdown — opens Sidebar without reloading graph
  const handleSelectProfile = useCallback((suggestion) => {
    // Find the node in the current graphData or construct a lightweight one from suggestion
    const existingNode = graphData.nodes.find(n => n.id === suggestion.id);
    const node = existingNode ?? {
      id: suggestion.id,
      name: suggestion.label,
      score: suggestion.score ?? 0,
      info: suggestion.profile ?? {},
      ...suggestion.profile,
    };
    setSelectedNode(node);
    setComparisonNode(null);
    setSearchContext({
      search_type: suggestion.search_type,
      matched_experience: suggestion.matched_experience,
      matched_fields: suggestion.matched_fields,
    });
  }, [graphData.nodes]);

  // ── Sidebar callbacks ──────────────────────────────────────────────────────
  const handleToggleConnection = useCallback((nodeId) => {
    setGraphData(prev => {
      const nodes = prev.nodes.map(n =>
        n.id === nodeId ? { ...n, isConnected: !n.isConnected } : n
      );
      return { ...prev, nodes };
    });
    setSelectedNode(prev => prev?.id === nodeId ? { ...prev, isConnected: !prev.isConnected } : prev);
  }, []);

  const handleSelectComparison = useCallback((suggestion) => {
    // Find the node in current graph data or build a lightweight one from suggestion profile
    const existingNode = graphData.nodes.find(n => n.id === suggestion.id);
    const node = existingNode ?? {
      id: suggestion.id,
      name: suggestion.label,
      score: 0,
      info: suggestion.profile ?? {},
      ...suggestion.profile,
    };
    setComparisonNode(node);
  }, [graphData.nodes]);

  const handleClearComparison = useCallback(() => {
    setComparisonNode(null);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSelectedNode(null);
    setComparisonNode(null);
    setSearchContext(null);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!user) {
    return <RegistrationFlow onComplete={handleRegistrationComplete} />;
  }

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden text-slate-100 font-sans">
      <SearchBar onSearch={handleSearch} onSelectProfile={handleSelectProfile} />

      {/* View Toggle */}
      <button
        onClick={() => setIs3D(!is3D)}
        className="absolute top-4 left-4 z-20 bg-slate-800/80 backdrop-blur text-white px-4 py-2 rounded-lg border border-slate-600 hover:bg-slate-700 transition font-medium text-sm flex items-center gap-2"
      >
        <div className={`w-3 h-3 rounded-full ${is3D ? 'bg-emerald-500' : 'bg-slate-500'}`} />
        {is3D ? '3D View' : '2D View'}
      </button>

      {/* Graph */}
      <div className="absolute inset-0 z-0">
        <GraphViz
          data={graphData}
          onNodeClick={handleNodeClick}
          focusNode={selectedNode}
          secondNode={comparisonNode}
          selectedNodeId={selectedNode?.id ?? null}
          comparisonNodeId={comparisonNode?.id ?? null}
          is3D={is3D}
        />
      </div>

      {/* Sidebar */}
      {selectedNode && (
        <Sidebar
          node={selectedNode}
          comparisonNode={comparisonNode}
          currentUserId={user?.isGuest ? null : user?.id}
          isGuest={!!user?.isGuest}
          onClose={handleCloseSidebar}
          onToggleConnection={handleToggleConnection}
          onEditProfile={() => { /* TODO: open edit modal */ }}
          onSelectComparison={handleSelectComparison}
          onClearComparison={handleClearComparison}
          searchContext={searchContext}
        />
      )}

      {/* Branding */}
      <div className="absolute bottom-4 left-4 pointer-events-none opacity-50">
        <h1 className="text-xl font-bold tracking-tighter">Mc<span className="text-blue-500">Finder</span></h1>
        <p className="text-xs">McGill University • Hackathon Demo</p>
      </div>
    </div>
  );
}

export default App;
