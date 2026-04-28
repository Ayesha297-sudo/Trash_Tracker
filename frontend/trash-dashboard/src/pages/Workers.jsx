import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';

const statusBadgeStyle = (status) => {
  if (status === 'available') {
    return {
      background: '#ecfdf3',
      color: '#15803d',
      border: '1px solid #bbf7d0'
    };
  }

  return {
    background: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fecaca'
  };
};

function Workers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch('http://127.0.0.1:8000/workers');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const rawData = await response.json();
        const list = Array.isArray(rawData) ? rawData : [];

        const normalized = list.map((item) => ({
          id: item.id,
          name: item.name || 'Unknown Worker',
          status: (item.status || 'available').toLowerCase(),
          tasks: Number(item.tasks_completed || 0)
        }));

        setWorkers(normalized);
      } catch (fetchError) {
        console.error('Failed to fetch workers:', fetchError);
        setError('Could not load workers right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkers();
  }, []);

  const filteredWorkers = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return workers.filter((worker) => {
      const name = (worker.name || '').toLowerCase();
      const matchesSearch = !normalizedSearch || name.includes(normalizedSearch);
      const matchesStatus = statusFilter === 'all' || worker.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [workers, searchQuery, statusFilter]);

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
          <h3 style={{ margin: 0, color: '#111827', fontSize: '22px', fontWeight: 800 }}>Workers</h3>
          <p style={{ margin: '6px 0 0', color: '#6B7280', fontSize: '13px' }}>
            {loading ? 'Loading...' : `${filteredWorkers.length} result(s)`}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '10px', marginBottom: '16px' }}>
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
              placeholder="Search worker name"
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
            <option value="available">Available</option>
            <option value="busy">Busy</option>
          </select>
        </div>

        <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '12px', color: '#6B7280' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '12px', color: '#6B7280' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '12px', color: '#6B7280' }}>Tasks Completed</th>
                </tr>
              </thead>

              <tbody>
                {!loading && !error && filteredWorkers.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                      No workers found.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                      Loading workers...
                    </td>
                  </tr>
                )}

                {!loading && error && (
                  <tr>
                    <td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: '#b91c1c', fontSize: '13px' }}>
                      {error}
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  filteredWorkers.map((worker) => (
                    <tr key={worker.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: '#111827', fontWeight: 600 }}>
                        {worker.name}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '13px' }}>
                        <span
                          style={{
                            ...statusBadgeStyle(worker.status),
                            fontSize: '12px',
                            fontWeight: 700,
                            textTransform: 'capitalize',
                            borderRadius: '999px',
                            padding: '4px 10px',
                            display: 'inline-flex'
                          }}
                        >
                          {worker.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: '#111827' }}>{worker.tasks}</td>
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

export default Workers;
