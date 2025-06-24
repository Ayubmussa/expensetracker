import React from 'react';
import { useAuth } from '../hooks/useAuth';
import './Profile.css';

interface ProfileProps {
  onClose: () => void;
}

const Profile: React.FC<ProfileProps> = ({ onClose }) => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-header">
          <h2>👤 User Profile</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className="profile-content">
          <div className="profile-section">
            <h3>Account Information</h3>
            <div className="profile-field">
              <label>Email:</label>
              <span>{user.email}</span>
            </div>
            <div className="profile-field">
              <label>User ID:</label>
              <span className="user-id">{user.id}</span>
            </div>
            <div className="profile-field">
              <label>Full Name:</label>
              <span>{user.full_name || 'Not provided'}</span>
            </div>
          </div>

          <div className="profile-section">
            <h3>Account Details</h3>
            <div className="profile-field">
              <label>Account Created:</label>
              <span>{formatDate(user.created_at)}</span>
            </div>
            <div className="profile-field">
              <label>Last Updated:</label>
              <span>{formatDate(user.updated_at)}</span>
            </div>
          </div>

          <div className="profile-section">
            <h3>Account Status</h3>
            <div className="profile-field">
              <label>Status:</label>
              <span className="status-active">🟢 Active</span>
            </div>
            <div className="profile-field">
              <label>Mode:</label>
              <span className="mode-online">🌐 Online Mode</span>
            </div>
          </div>
        </div>

        <div className="profile-footer">
          <button className="close-profile-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
