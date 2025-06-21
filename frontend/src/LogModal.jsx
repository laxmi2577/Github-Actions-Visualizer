// File: frontend/src/LogModal.jsx

import React from 'react';
import './LogModal.css';

const LogModal = ({ jobName, logs, isLoading, onClose }) => {
  if (!jobName) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h5 className="modal-title">Logs for: {jobName}</h5>
          <button type="button" className="btn-close" onClick={onClose}></button>
        </div>
        <div className="modal-body">
          {isLoading ? (
            <div className="loader-container">
              <div className="loader"></div>
              <p>Fetching logs...</p>
            </div>
          ) : (
            <pre className="logs-pre">{logs || 'No logs available for this job.'}</pre>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogModal;
