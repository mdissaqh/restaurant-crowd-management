import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ServiceTogglePage() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:3001/api/settings').then(r => setSettings(r.data));
  }, []);

  const toggle = key => {
    const updated = {
      ...settings,
      serviceAvailability: {
        ...settings.serviceAvailability,
        [key]: !settings.serviceAvailability[key]
      }
    };
    axios.post('http://localhost:3001/api/settings', updated)
         .then(r => setSettings(r.data));
  };

  if (!settings) return null;
  return (
    <div>
      <h3>Service Availability</h3>
      {Object.entries(settings.serviceAvailability).map(([svc, on]) => (
        <div key={svc} className="form-check form-switch mb-2">
          <input
            className="form-check-input"
            type="checkbox"
            id={svc}
            checked={on}
            onChange={() => toggle(svc)}
          />
          <label className="form-check-label" htmlFor={svc}>
            {svc.charAt(0).toUpperCase() + svc.slice(1)}
          </label>
        </div>
      ))}
    </div>
  );
}
