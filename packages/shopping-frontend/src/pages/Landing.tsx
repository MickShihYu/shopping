import React from 'react';
import { Link } from 'react-router-dom';

export const Landing: React.FC = () => {
  return (
    <div className="landing-container">
      <div className="landing-card glass">
        <div>
          <h1 className="landing-title">LoopBack 4 Shopping</h1>
          <p className="text-secondary mt-2">Example Online Shopping REST APIs</p>
        </div>

        <div className="landing-links">
          <Link to="/shoppy" className="landing-link-btn btn-primary">
            Launch Shoppy Store
          </Link>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', marginTop: '1rem' }}>
            <p className="text-secondary" style={{ marginBottom: '0.25rem' }}>Auth Service (Port 3003)</p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <a href="http://localhost:3003/openapi.json" target="_blank" rel="noreferrer" className="landing-link-btn btn-secondary">
                OpenAPI
              </a>
              <a href="http://localhost:3003/explorer" target="_blank" rel="noreferrer" className="landing-link-btn btn-secondary">
                API Explorer
              </a>
            </div>

            <p className="text-secondary" style={{ marginBottom: '0.25rem', marginTop: '0.5rem' }}>Order Service (Port 3002)</p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <a href="http://localhost:3002/openapi.json" target="_blank" rel="noreferrer" className="landing-link-btn btn-secondary">
                OpenAPI
              </a>
              <a href="http://localhost:3002/explorer" target="_blank" rel="noreferrer" className="landing-link-btn btn-secondary">
                API Explorer
              </a>
            </div>

            <p className="text-secondary" style={{ marginBottom: '0.25rem', marginTop: '0.5rem' }}>Product Service (Port 3001)</p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <a href="http://localhost:3001/openapi.json" target="_blank" rel="noreferrer" className="landing-link-btn btn-secondary">
                OpenAPI
              </a>
              <a href="http://localhost:3001/explorer" target="_blank" rel="noreferrer" className="landing-link-btn btn-secondary">
                API Explorer
              </a>
            </div>
          </div>
        </div>
      </div>

      <footer className="power-footer">
        <a href="https://loopback.io" target="_blank" rel="noreferrer">
          <img src="https://loopback.io/images/branding/powered-by-loopback/blue/powered-by-loopback-sm.png" alt="Powered by LoopBack" />
        </a>
      </footer>
    </div>
  );
};

export default Landing;
