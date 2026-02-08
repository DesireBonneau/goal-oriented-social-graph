import React, { useState, useCallback } from 'react';
import GraphViz from './components/Graph/GraphViz';
import Sidebar from './components/Layout/Sidebar';
import SearchBar from './components/UI/SearchBar';
import RegistrationFlow from './components/Onboarding/RegistrationFlow';
import { api } from './services/api';

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
      // Create user in backend
      const response = await api.createUser(userData);
      // Backend returns { message, id }. We might want to fetch the graph here or just set user.
      // For now, let's look at the response or just trust the input userData + id
      setUser({ ...userData, id: response.id });

      // Load initial graph
      const data = await api.getGraph();

      // Find "Me" node and update it locally if needed
      // Assuming backend might not immediately index the new user in the graph response 
      // depending on implementation, but let's assume it returns a generic graph 
      // and we patch "user_0" or the new user into it.
      // For this demo, let's trust the graph response or inject "Me".

      // Injecting "Me" as user_0 for visualization purposes if not present
      const meNodeIndex = data.nodes.findIndex(n => n.id === 'user_0' || n.email === userData.email);

      if (meNodeIndex !== -1) {
        data.nodes[meNodeIndex] = {
          ...data.nodes[meNodeIndex],
          name: `${userData.firstName} ${userData.lastName}`,
          info: {
            major: userData.major,
            experience: userData.experience
          }
        };
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
