import React, { useState } from 'react';

export const AdminSettings = ({ onSave }) => {
  const [settings, setSettings] = useState({
    tradingEnabled: true,
    depositsEnabled: true,
    withdrawalsEnabled: true,
    registrationEnabled: true,
    maintenanceMode: false,
    maxLeverage: 10,
    minTrade: 10,
    maxTrade: 1000000,
  });

  const handleChange = (field) => {
    setSettings(prev => ({
      ...prev,
      [field]: typeof prev[field] === 'boolean' ? !prev[field] : prev[field]
    }));
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    onSave && onSave(settings);
  };

  return (
    <div className="admin-settings-section">
      <div className="settings-group">
        <h3>Feature Flags</h3>
        <div className="setting-item">
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              checked={settings.tradingEnabled}
              onChange={() => handleChange('tradingEnabled')}
            />
            <span>Enable Trading</span>
          </label>
        </div>
        <div className="setting-item">
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              checked={settings.depositsEnabled}
              onChange={() => handleChange('depositsEnabled')}
            />
            <span>Enable Deposits</span>
          </label>
        </div>
        <div className="setting-item">
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              checked={settings.withdrawalsEnabled}
              onChange={() => handleChange('withdrawalsEnabled')}
            />
            <span>Enable Withdrawals</span>
          </label>
        </div>
        <div className="setting-item">
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              checked={settings.registrationEnabled}
              onChange={() => handleChange('registrationEnabled')}
            />
            <span>Allow New Registrations</span>
          </label>
        </div>
        <div className="setting-item">
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              checked={settings.maintenanceMode}
              onChange={() => handleChange('maintenanceMode')}
            />
            <span>Maintenance Mode</span>
          </label>
        </div>
      </div>

      <div className="settings-group">
        <h3>Trading Configuration</h3>
        <div className="setting-item">
          <label>Max Leverage</label>
          <input 
            type="number" 
            value={settings.maxLeverage}
            onChange={(e) => handleInputChange('maxLeverage', parseInt(e.target.value))}
            min="1"
            max="100"
          />
        </div>
        <div className="setting-item">
          <label>Minimum Trade Amount (USD)</label>
          <input 
            type="number" 
            value={settings.minTrade}
            onChange={(e) => handleInputChange('minTrade', parseFloat(e.target.value))}
            step="0.01"
          />
        </div>
        <div className="setting-item">
          <label>Maximum Trade Amount (USD)</label>
          <input 
            type="number" 
            value={settings.maxTrade}
            onChange={(e) => handleInputChange('maxTrade', parseFloat(e.target.value))}
            step="0.01"
          />
        </div>
      </div>

      <button className="btn btn-primary" onClick={handleSave}>
        Save Settings
      </button>
    </div>
  );
};
