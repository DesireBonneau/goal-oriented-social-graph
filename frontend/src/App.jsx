import React, { useState, useEffect, useCallback } from 'react';
import GraphViz from './components/Graph/GraphViz';
import Sidebar from './components/Layout/Sidebar';
import SearchBar from './components/UI/SearchBar';
import AuthGate from './components/Onboarding/AuthGate';
import ProfileEditor from './components/Onboarding/ProfileEditor';
import LinkedInImport from './components/Onboarding/LinkedInImport';
import { api } from './services/api';

function App() {
  // State
  const [user, setUser] = useState(null); // { email, name, info... }
  const [onboardingStep, setOnboardingStep] = useState('auth'); // 'auth', 'profile', 'import', 'graph'
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [is3D, setIs3D] = useState(true);

  // Handlers
  const handleLogin = (email) => {
    setUser({ email });
    setOnboardingStep('profile');
  };

  const handleSaveProfile = async (profileData) => {
    const updatedUser = { ...user, ...profileData };
    setUser(updatedUser);

    // Create/Update user in backend
    try {
      // We'll try to create, if it exists, maybe we update? 
      // For now let's just create and ignore "exists" error or handle it gracefully
      await api.createUser(updatedUser);
    } catch (err) {
      console.warn("Failed to sync user to backend", err);
    }

    setOnboardingStep('import');
  };

  const handleImport = async (importedConnections) => {
    // Determine if we need to send these connections to backend?
    // For now, let's just get the fresh graph from backend
    try {
      const data = await api.getGraph();

      // Update "Me" node (user_0) with real profile (client side override for now)
      // In a real app, the backend would return the graph *contextualized* to the user
      const meNode = data.nodes.find(n => n.id === 'user_0');
      if (meNode && user) {
        meNode.name = user.name;
        meNode.info = {
          major: user.major,
          experience: user.experience || []
        };
      }

      // Append imported connections (same logic as before, just appending to backend data)
      const newNodes = [...data.nodes];
      const newLinks = [...data.links];

      importedConnections.forEach((conn, i) => {
        newNodes.push(conn);
        newLinks.push({
          source: 'user_0',
          target: conn.id,
          strength: 0.8,
          type: 'direct'
        });
      });

      setGraphData({ nodes: newNodes, links: newLinks });
      setOnboardingStep('graph');

    } catch (err) {
      console.error("Failed to load graph", err);
    }
  };

  const handleSkipImport = async () => {
    try {
      const data = await api.getGraph();

      const meNode = data.nodes.find(n => n.id === 'user_0');
      if (meNode && user) {
        meNode.name = user.name;
        meNode.info = {
          major: user.major,
          experience: user.experience || []
        };
      }
      setGraphData(data);
      setOnboardingStep('graph');
    } catch (err) {
      console.error("Failed to load graph", err);
    }
  };

  // Graph Interactions
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const handleSearch = useCallback(async (query) => {
    try {
      const data = await api.search(query);
      // Restore "Me" node override if needed, or rely on backend
      // optimizing for speed, we might want to keep the "Me" node state
      // But for now, let's just use what backend gives + override "Me" name locally if we want

      // Re-apply local user override if it gets lost (since backend sends generic user_0)
      if (user) {
        const meNode = data.nodes.find(n => n.id === 'user_0');
        if (meNode) {
          meNode.name = user.name;
          meNode.info = { major: user.major, experience: user.experience || [] };
        }
      }

      setGraphData(data);
    } catch (err) {
      console.error("Search failed", err);
    }
  }, [user]);

  const handleToggleConnection = useCallback((nodeId) => {
    setGraphData(prevData => {
      const nodes = prevData.nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, isConnected: !node.isConnected };
        }
        return node;
      });
      return { ...prevData, nodes };
    });
    // Update selected node if it's the one being toggled
    setSelectedNode(prev => prev?.id === nodeId ? { ...prev, isConnected: !prev.isConnected } : prev);
  }, []);

  // Render Logic
  if (onboardingStep === 'auth') {
    return (
      <div className="w-full h-screen bg-slate-900 flex items-center justify-center">
        <AuthGate onLogin={handleLogin} />
      </div>
    );
  }

  if (onboardingStep === 'profile') {
    return (
      <div className="w-full h-screen bg-slate-900 flex items-center justify-center">
        <ProfileEditor onSave={handleSaveProfile} initialData={{ name: user?.email.split('@')[0] }} />
      </div>
    );
  }

  if (onboardingStep === 'import') {
    return (
      <div className="w-full h-screen bg-slate-900 flex items-center justify-center">
        <LinkedInImport onImport={handleImport} onSkip={handleSkipImport} />
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden text-slate-100 font-sans">
      <SearchBar onSearch={handleSearch} />

      {/* View Toggle */}
      <button
        onClick={() => setIs3D(!is3D)}
        className="absolute top-4 left-4 z-20 bg-slate-800/80 backdrop-blur text-white px-4 py-2 rounded-lg border border-slate-600 hover:bg-slate-700 transition font-medium text-sm flex items-center gap-2"
      >
        <div className={`w-3 h-3 rounded-full ${is3D ? 'bg-emerald-500' : 'bg-slate-500'}`} />
        {is3D ? "3D View" : "2D View"}
      </button>

      <div className="absolute inset-0 z-0">
        <GraphViz
          data={graphData}
          onNodeClick={handleNodeClick}
          focusNode={selectedNode}
          is3D={is3D}
        />
      </div>

      {selectedNode && (
        <Sidebar
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onToggleConnection={handleToggleConnection}
        />
      )}

      <div className="absolute bottom-4 left-4 pointer-events-none opacity-50">
        <h1 className="text-xl font-bold tracking-tighter">Goal<span className="text-blue-500">Graph</span></h1>
        <p className="text-xs">McGill University • Hackathon Demo</p>
      </div>
    </div>
  );
}

export default App;
