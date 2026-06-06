import React from 'react';

export default function Tabs({ tabs, activeTab, onChange, className = "tabs tabs--inline" }) {
  return (
    <div className={className}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            className={`tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            {Icon && <Icon size={16} />} {tab.label}
          </button>
        );
      })}
    </div>
  );
}
