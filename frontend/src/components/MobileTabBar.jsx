import React from 'react';
import { Folder, FileText, Edit3 } from 'lucide-react';

const TABS = [
  { id: 'folders', label: 'Carpetas', icon: Folder },
  { id: 'notes', label: 'Notas', icon: FileText },
  { id: 'editor', label: 'Editor', icon: Edit3 }
];

export default function MobileTabBar({ active, onChange }) {
  return (
    <nav className="mobile-tabbar">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`mobile-tab ${active === id ? 'active' : ''}`}
          onClick={() => onChange(id)}
          aria-label={label}
        >
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}