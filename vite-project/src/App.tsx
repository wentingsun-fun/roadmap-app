import { useState } from 'react'
import RoadmapApp, { RoadmapHome, getCurrentRoadmapId, setCurrentRoadmapId, loadRoadmapsList } from './RoadmapApp'

export default function App() {
  const [view, setView] = useState<'home' | 'roadmap'>(() => {
    // Check if there's a current roadmap to resume
    const currentId = getCurrentRoadmapId();
    if (currentId) {
      const roadmaps = loadRoadmapsList();
      if (roadmaps.some(r => r.id === currentId)) {
        return 'roadmap';
      }
    }
    return 'home';
  });
  
  const [selectedRoadmap, setSelectedRoadmap] = useState<{ id: string; name: string } | null>(() => {
    const currentId = getCurrentRoadmapId();
    if (currentId) {
      const roadmaps = loadRoadmapsList();
      const found = roadmaps.find(r => r.id === currentId);
      if (found) {
        return { id: found.id, name: found.name };
      }
    }
    return null;
  });

  const handleSelectRoadmap = (id: string, name: string) => {
    setCurrentRoadmapId(id);
    setSelectedRoadmap({ id, name });
    setView('roadmap');
  };

  const handleBackToHome = () => {
    setCurrentRoadmapId(null);
    setSelectedRoadmap(null);
    setView('home');
  };

  if (view === 'roadmap' && selectedRoadmap) {
    return (
      <RoadmapApp
        roadmapId={selectedRoadmap.id}
        roadmapName={selectedRoadmap.name}
        onBack={handleBackToHome}
      />
    );
  }

  return <RoadmapHome onSelectRoadmap={handleSelectRoadmap} />;
}
