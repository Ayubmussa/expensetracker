import React from 'react';
import './ModeStatus.css';

interface ModeStatusProps {
  isOnline: boolean;
  isAuthenticated: boolean;
}

const ModeStatus: React.FC<ModeStatusProps> = ({ isOnline, isAuthenticated }) => {
  const getStatusInfo = () => {
    if (isAuthenticated && isOnline) {
      return {
        icon: '🌐',
        text: 'Online - Data synced to cloud',
        className: 'status-online'
      };
    } else if (isOnline && !isAuthenticated) {
      return {
        icon: '📱',
        text: 'Offline Mode - Data stored locally only',
        className: 'status-offline'
      };
    } else {
      return {
        icon: '📱',
        text: 'Offline - Data stored locally only',
        className: 'status-offline'
      };
    }
  };

  const status = getStatusInfo();

  return (
    <div className={`mode-status ${status.className}`}>
      <span className="status-icon">{status.icon}</span>
      <span className="status-text">{status.text}</span>
    </div>
  );
};

export default ModeStatus;
