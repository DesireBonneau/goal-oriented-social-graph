import React, { useState, useCallback } from 'react';
import GraphViz from './components/Graph/GraphViz';
import Sidebar from './components/Layout/Sidebar';
import SearchBar from './components/UI/SearchBar';
import RegistrationFlow from './components/Onboarding/RegistrationFlow';
import { api } from './services/api';
import { setCurrentUserId } from './config/graphConfig';

function App() {
  // State
  const [user, setUser] = useState(null); // If null, show registration
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [is3D, setIs3D] = useState(true);

  // Handlers
  const handleRegistrationComplete = async (userData) => {
    try {
      console.log("Registering user:", userData);

      let finalUser = userData;

      // Only create user in backend if NOT a guest and NOT already logged in (has ID)
      if (!userData.isGuest && !userData.id) {
        const response = await api.createUser(userData);
        finalUser = { ...userData, id: response.id };
      }

      setUser(finalUser);

      // Set current user ID for graph highlighting
      if (!userData.isGuest && finalUser.id) {
        setCurrentUserId(finalUser.id);
      }

      // Load initial graph
      const data = await api.getGraph();

      // If NOT a guest, find/update current user's node and center on it
      if (!userData.isGuest) {
        const meNodeIndex = data.nodes.findIndex(n => n.id === finalUser.id || n.email === userData.email);

        if (meNodeIndex !== -1) {
          // Update our node with latest profile data
          data.nodes[meNodeIndex] = {
            ...data.nodes[meNodeIndex],
            name: `${userData.firstName} ${userData.lastName}`,
            info: {
              major: userData.major,
              experience: userData.experience || []
            }
          };
          // Center camera on our node
          setSelectedNode(data.nodes[meNodeIndex]);
        }
      } else {
        // Guest mode: pick a random node to center around
        if (data.nodes.length > 0) {
          const randomNode = data.nodes[Math.floor(Math.random() * data.nodes.length)];
          setSelectedNode(randomNode);
        }
      }

      setGraphData(data);

    } catch (err) {
      console.error("Registration/Setup failed", err);
      // Fallback?
    }
  };

  // Graph Interactions
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const handleSearch = useCallback(async (query) => {
    try {
      const data = await api.search(query);
      setGraphData(data);
    } catch (err) {
      console.error("Search failed", err);
    }
  }, []);

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
    setSelectedNode(prev => prev?.id === nodeId ? { ...prev, isConnected: !prev.isConnected } : prev);
  }, []);

  // Render Logic
  if (!user) {
    return (
      <RegistrationFlow onComplete={handleRegistrationComplete} />
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
          currentUserId={user?.id}
          onClose={() => setSelectedNode(null)}
          onToggleConnection={handleToggleConnection}
        />
      )}

      <div className="absolute bottom-4 left-4 pointer-events-none opacity-50">
        <h1 className="text-xl font-bold tracking-tighter">Mc<span className="text-blue-500">Finder</span></h1>
        <p className="text-xs">McGill University • Hackathon Demo</p>
      </div>
    </div>
  );
}

export default App;
