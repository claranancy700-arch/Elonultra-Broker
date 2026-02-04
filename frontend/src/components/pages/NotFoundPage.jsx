import React from 'react';
import { Link } from 'react-router-dom';
import './NotFoundPage.css';
import Icon from '../icons/Icon';

export const NotFoundPage = () => {
  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <div className="not-found-icon"><Icon name="link" className="icon-inline" /></div>
        <h1>404</h1>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <div className="not-found-buttons">
          <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
          <Link to="/" className="btn btn-secondary">Back to Home</Link>
        </div>
      </div>
    </div>
  );
};
