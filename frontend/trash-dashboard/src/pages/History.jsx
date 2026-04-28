import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Search, Download } from 'lucide-react';

const formatDate = (dateValue) => {
  if (!dateValue) {
    return '-';
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return String(dateValue);
  }

  return parsed.toLocaleDateString();
};

const statusBadgeStyle = (status) => {
  if (status === 'completed') {
    return {
      background: '#ecfdf3',
      color: '#15803d',
      border: '1px solid #bbf7d0'
    };
  }

  return {
    background: '#fff7ed',
    color: '#b45309',
    border: '1px solid #fed7aa'
  };
};

function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await axios.get('http://127.0.0.1:8000/history');
        const rawData = Array.isArray(response.data) ? response.data : [];

        const normalized = rawData.map((item) => ({
          id: item.id,
          date: formatDate(item.date),
          time: '-',
          location: item.site_name || 'Unknown Site',
          zone: item.zone || 'Unknown',
          source: 'AI Detection',
          worker: item.worker || 'Unassigned',
          resTime:
            item.resolution_time !== null && item.resolution_time !== undefined
              ? `${item.resolution_time} ${item.resolution_unit || 'min'}`
              : '-',
          status: 'completed'
        }));

        setHistory(normalized);
      } catch (fetchError) {
        console.error('Failed to fetch history:', fetchError);
        setError('Could not load history right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const filteredHistory = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return history.filter((item) => {
      const location = (item.location || '').toLowerCase();
      const worker = (item.worker || '').toLowerCase();

      const matchesSearch =
        !normalizedSearch || location.includes(normalizedSearch) || worker.includes(normalizedSearch);
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesSource = sourceFilter === 'all' || item.source === sourceFilter;
      const matchesZone = zoneFilter === 'all' || item.zone === zoneFilter;

      return matchesSearch && matchesStatus && matchesSource && matchesZone;
    });
  }, [history, searchQuery, statusFilter, sourceFilter, zoneFilter]);

  const zoneOptions = useMemo(() => {
    return Array.from(new Set(history.map((item) => item.zone).filter(Boolean))).sort();
  }, [history]);

  const exportCsv = () => {
    if (filteredHistory.length === 0) {
      return;
    }

    const headers = ['ID', 'Date', 'Time', 'Location', 'Zone', 'Source', 'Worker', 'Resolution Time', 'Status'];
    const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

    const rows = filteredHistory.map((item) => [
      item.id,
      item.date,
      item.time,
      item.location,
      item.zone,
      item.source,
      item.worker,
      item.resTime,
      item.status
    ]);

    const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#111827', fontSize: '22px', fontWeight: 800 }}>Task History</h3>
            <p style={{ margin: '6px 0 0', color: '#6B7280', fontSize: '13px' }}>
              {loading ? 'Loading...' : `${filteredHistory.length} result(s)`}
            </p>
          </div>

          <button
            onClick={exportCsv}
            style={{
              border: 'none',
              borderRadius: '10px',
              background: '#1b5319',
              color: 'white',
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: filteredHistory.length === 0 ? 'not-allowed' : 'pointer',
              opacity: filteredHistory.length === 0 ? 0.6 : 1
            }}
            disabled={filteredHistory.length === 0}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid #E5E7EB',
              borderRadius: '10px',
              padding: '0 10px',
              background: '#fff'
            }}
          >
            <Search size={16} color="#6B7280" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search location or worker"
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '13px',
                padding: '10px 8px',
                width: '100%'
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            style={{ border: '1px solid #E5E7EB', borderRadius: '10px', padding: '10px', fontSize: '13px' }}
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
            style={{ border: '1px solid #E5E7EB', borderRadius: '10px', padding: '10px', fontSize: '13px' }}
          >
            <option value="all">All Sources</option>
            <option value="AI Detection">AI Detection</option>
          </select>

          <select
            value={zoneFilter}
            onChange={(event) => setZoneFilter(event.target.value)}
            style={{ border: '1px solid #E5E7EB', borderRadius: '10px', padding: '10px', fontSize: '13px' }}
          >
            <option value="all">All Zones</option>
            {zoneOptions.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </div>

        <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '920px' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '12px', color: '#6B7280' }}>Date &amp; Time</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '12px', color: '#6B7280' }}>Location</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '12px', color: '#6B7280' }}>Source</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '12px', color: '#6B7280' }}>Worker</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '12px', color: '#6B7280' }}>Resolution Time</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '12px', color: '#6B7280' }}>Status</th>
                </tr>
              </thead>

              <tbody>
                {!loading && !error && filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                      No history records found.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                      Loading history...
                    </td>
                  </tr>
                )}

                {!loading && error && (
                  <tr>
                    <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#b91c1c', fontSize: '13px' }}>
                      {error}
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  filteredHistory.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: '#111827' }}>
                        <div style={{ fontWeight: 600 }}>{item.date || '-'}</div>
                        <div style={{ color: '#6B7280', marginTop: '3px' }}>{item.time}</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: '#111827' }}>{item.location}</td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: '#111827' }}>{item.source}</td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: '#111827' }}>{item.worker}</td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: '#111827' }}>{item.resTime}</td>
                      <td style={{ padding: '12px 14px', fontSize: '13px' }}>
                        <span
                          style={{
                            ...statusBadgeStyle(item.status),
                            fontSize: '12px',
                            fontWeight: 700,
                            textTransform: 'capitalize',
                            borderRadius: '999px',
                            padding: '4px 10px',
                            display: 'inline-flex'
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default History;
