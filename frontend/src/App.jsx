import React, { useState, useEffect, useCallback } from 'react';
import GraphViz from './components/Graph/GraphViz';
import Sidebar from './components/Layout/Sidebar';
import SearchBar from './components/UI/SearchBar';
import AuthGate from './components/Onboarding/AuthGate';
import ProfileEditor from './components/Onboarding/ProfileEditor';
import LinkedInImport from './components/Onboarding/LinkedInImport';
import { generateMockGraph, simulateSearch } from './data/mockData';

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

  const handleSaveProfile = (profileData) => {
    setUser(prev => ({ ...prev, ...profileData }));
    setOnboardingStep('import');
  };

  const handleImport = (importedConnections) => {
    // Generate base graph
    const mockGraph = generateMockGraph(30);

    // Update "Me" node (user_0) with real profile
    const meNode = mockGraph.nodes.find(n => n.id === 'user_0');
    if (meNode && user) {
      meNode.name = user.name;
      meNode.info = {
        major: user.major,
        experience: user.experience || []
      };
    }

    // Append imported connections
    // For now, we just add them as unconnected nodes or connect them to "Me"
    const newNodes = [...mockGraph.nodes];
    const newLinks = [...mockGraph.links];

    importedConnections.forEach((conn, i) => {
      // Avoid duplicate IDs if logic matches
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
  };

  const handleSkipImport = () => {
    const mockGraph = generateMockGraph(40);
    // Update "Me" node (user_0) with real profile
    const meNode = mockGraph.nodes.find(n => n.id === 'user_0');
    if (meNode && user) {
      meNode.name = user.name;
      meNode.info = {
        major: user.major,
        experience: user.experience || []
      };
    }
    setGraphData(mockGraph);
    setOnboardingStep('graph');
  };

  // Graph Interactions
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const handleSearch = useCallback((query) => {
    setGraphData(prevData => simulateSearch(prevData, query));
  }, []);

  const handleCloseSidebar = () => setSelectedNode(null);

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
        <Sidebar node={selectedNode} onClose={handleCloseSidebar} />
      )}

      <div className="absolute bottom-4 left-4 pointer-events-none opacity-50">
        <h1 className="text-xl font-bold tracking-tighter">Goal<span className="text-blue-500">Graph</span></h1>
        <p className="text-xs">McGill University • Hackathon Demo</p>
      </div>
    </div>
  );
}

export default App;
