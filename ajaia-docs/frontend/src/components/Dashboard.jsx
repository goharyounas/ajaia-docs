import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const USERS = [
  { email: 'alice@example.com', name: 'Alice' },
  { email: 'bob@example.com', name: 'Bob' },
  { email: 'charlie@example.com', name: 'Charlie' },
];

export default function Dashboard() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : USERS[0];
  });
  const [ownedDocs, setOwnedDocs] = useState([]);
  const [sharedDocs, setSharedDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('user', JSON.stringify(user));
    fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/documents/?user_email=${user.email}`);
      setOwnedDocs(res.data.owned || []);
      setSharedDocs(res.data.shared || []);
    } catch (err) {
      console.error('Failed to fetch docs', err);
    } finally {
      setLoading(false);
    }
  };

  const createDocument = async () => {
    try {
      const res = await axios.post(`${API_BASE}/documents/`, {
        title: 'Untitled',
        content: '<p></p>',
        owner_email: user.email,
      });
      navigate(`/documents/${res.data.id}`);
    } catch (err) {
      alert('Failed to create document');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validTypes = ['text/plain', 'text/markdown'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(txt|md)$/i)) {
      alert('Only .txt and .md files are supported.');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('owner_email', user.email);
    try {
      const res = await axios.post(`${API_BASE}/documents/import/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate(`/documents/${res.data.id}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Ajaia Docs</h1>
      <div style={{ marginBottom: '20px' }}>
        <label>Logged in as: </label>
        <select value={user.email} onChange={(e) => {
          const selected = USERS.find(u => u.email === e.target.value);
          setUser(selected);
        }}>
          {USERS.map(u => (
            <option key={u.email} value={u.email}>{u.name} ({u.email})</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={createDocument}>+ New Document</button>
        <label style={{ cursor: 'pointer', background: '#eee', padding: '4px 12px', borderRadius: '4px' }}>
          {uploading ? 'Uploading...' : '📄 Upload .txt / .md'}
          <input type="file" accept=".txt,.md" onChange={handleFileUpload} disabled={uploading} style={{ display: 'none' }} />
        </label>
      </div>

      {loading && <p>Loading...</p>}

      <h2>Your Documents</h2>
      <ul>
        {ownedDocs.map(doc => (
          <li key={doc.id} onClick={() => navigate(`/documents/${doc.id}`)} style={{ cursor: 'pointer', color: 'blue' }}>
            {doc.title} (owner)
          </li>
        ))}
        {ownedDocs.length === 0 && <li>No documents yet.</li>}
      </ul>

      <h2>Shared with you</h2>
      <ul>
        {sharedDocs.map(doc => (
          <li key={doc.id} onClick={() => navigate(`/documents/${doc.id}`)} style={{ cursor: 'pointer', color: 'green' }}>
            {doc.title} (shared by {doc.owner_name || doc.owner_email})
          </li>
        ))}
        {sharedDocs.length === 0 && <li>No shared documents.</li>}
      </ul>
    </div>
  );
}