import React from 'react';
import { TimeCondTester } from './components/timecondtester';
import './styles/global.css';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <TimeCondTester />
      </div>
    </div>
  );
};

export default App;
