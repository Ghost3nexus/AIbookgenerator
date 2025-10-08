import React from 'react';
import { MagicWandIcon } from './Icons';

const Header: React.FC = () => {
  return (
    <header className="bg-white/80 backdrop-blur-xl shadow-lg sticky top-0 z-50 border-b-2 border-white">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center shadow-inner">
            <MagicWandIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-display tracking-wider text-indigo-600">
              Story Weaver
            </h1>
            <p className="text-sm text-indigo-800/70 -mt-1 font-medium">AI絵本ジェネレーター</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;