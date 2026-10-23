import React from 'react';

export default function Header({ activeTab = 'home', onNavigate }) {
  const tabs = [
    { key: 'home', label: 'Home' },
    { key: 'simulations', label: 'Simulations' },
    { key: 'learn', label: 'Learn' },
    { key: 'history', label: 'History' }
  ];

  const handleNavClick = (tabKey) => {
    if (typeof onNavigate === 'function') {
      onNavigate(tabKey);
    }
  };

  return (
    <header className="border-b border-gray-900 bg-[#070b12] px-6 sm:px-12 py-3 sm:py-3.5 flex items-center justify-between sticky top-0 z-50 shrink-0 select-none">
      <div
        onClick={() => handleNavClick('home')}
        className="cursor-pointer group flex flex-col justify-center"
      >
        <h1 className="text-base sm:text-lg font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors">
          AI Social Engineering Simulator
        </h1>
        <p className="text-[11px] text-gray-400">
          Interactive Attack Simulation & Cybersecurity Awareness Engine • Design and Launch Attack Simulations
        </p>
        <span className="sr-only">Autonomous Channel Prediction & Termination Rules Engine</span>
      </div>

      {/* Right Nav Links */}
      <nav className="flex items-center gap-6 sm:gap-8 text-xs font-semibold">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleNavClick(tab.key)}
              className={`pb-1 transition-all cursor-pointer relative ${
                isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
