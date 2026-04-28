import React, { useEffect, useState } from 'react';

const sectionCardStyle = {
  background: 'white',
  borderRadius: '14px',
  border: '1px solid #E5E7EB',
  boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
  padding: '16px'
};

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px'
};

function Settings() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('sidebarCollapsed') === 'true'
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => localStorage.getItem('notifications') !== 'false'
  );

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem('notifications', String(notificationsEnabled));
  }, [notificationsEnabled]);

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '20px' }}>
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          padding: '20px'
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#111827', fontSize: '22px', fontWeight: 800 }}>Settings</h3>
          <p style={{ margin: '6px 0 0', color: '#6B7280', fontSize: '13px' }}>
            Personalize dashboard preferences
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
          <div style={sectionCardStyle}>
            <div style={rowStyle}>
              <div>
                <p style={{ margin: 0, fontSize: '14px', color: '#111827', fontWeight: 700 }}>Theme</p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}>
                  Switch between light and dark mode
                </p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151' }}>
                <input
                  type="checkbox"
                  checked={theme === 'dark'}
                  onChange={(event) => setTheme(event.target.checked ? 'dark' : 'light')}
                />
                {theme === 'dark' ? 'Dark' : 'Light'}
              </label>
            </div>
          </div>

          <div style={sectionCardStyle}>
            <div style={rowStyle}>
              <div>
                <p style={{ margin: 0, fontSize: '14px', color: '#111827', fontWeight: 700 }}>Sidebar Preference</p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}>
                  Open dashboard with sidebar collapsed by default
                </p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151' }}>
                <input
                  type="checkbox"
                  checked={sidebarCollapsed}
                  onChange={(event) => setSidebarCollapsed(event.target.checked)}
                />
                {sidebarCollapsed ? 'Collapsed' : 'Expanded'}
              </label>
            </div>
          </div>

          <div style={sectionCardStyle}>
            <div style={rowStyle}>
              <div>
                <p style={{ margin: 0, fontSize: '14px', color: '#111827', fontWeight: 700 }}>Notifications</p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}>
                  Enable or disable dashboard notifications
                </p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151' }}>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(event) => setNotificationsEnabled(event.target.checked)}
                />
                {notificationsEnabled ? 'Enabled' : 'Disabled'}
              </label>
            </div>
          </div>

          <div style={sectionCardStyle}>
            <p style={{ margin: 0, fontSize: '14px', color: '#111827', fontWeight: 700 }}>Account Info</p>
            <div style={{ marginTop: '10px', display: 'grid', gap: '6px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#374151' }}>
                <span style={{ color: '#6B7280' }}>Name:</span> Admin
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: '#374151' }}>
                <span style={{ color: '#6B7280' }}>Role:</span> Administrator
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
