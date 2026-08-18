import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['clean'],
  ],
};

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user')) || null);
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const saveTimeout = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchDoc();
  }, [id]);

  const fetchDoc = async () => {
    try {
      const res = await axios.get(`${API_BASE}/documents/${id}/?user_email=${user.email}`);
      setDoc(res.data);
      setTitle(res.data.title);
      setContent(res.data.content);
    } catch (err) {
      alert('Could not load document');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const saveDoc = async (newTitle, newContent) => {
    if (!doc) return;
    setSaving(true);
    try {
      await axios.put(`${API_BASE}/documents/${id}/`, {
        title: newTitle !== undefined ? newTitle : title,
        content: newContent !== undefined ? newContent : content,
        user_email: user.email,
      });
    } catch (err) {
      alert('Auto-save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleContentChange = (value) => {
    setContent(value);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveDoc(undefined, value);
    }, 1000);
  };

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveDoc(newTitle, undefined);
    }, 1000);
  };

  const handleShare = async () => {
    if (!shareEmail) return;
    try {
      await axios.post(`${API_BASE}/documents/${id}/share/`, {
        owner_email: user.email,
        target_email: shareEmail,
      });
      alert('Document shared successfully!');
      setShareEmail('');
    } catch (err) {
      alert(err.response?.data?.error || 'Sharing failed');
    }
  };

  if (loading) return <p>Loading document...</p>;
  if (!doc) return <p>Document not found.</p>;

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          style={{ fontSize: '24px', padding: '8px', width: '60%' }}
        />
        <div>
          <span style={{ marginRight: '10px', color: saving ? 'orange' : 'green' }}>
            {saving ? 'Saving...' : '✓ Saved'}
          </span>
          <button onClick={() => navigate('/')}>← Back</button>
        </div>
      </div>

      {doc.is_owner && (
        <div style={{ margin: '20px 0', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
          <h4>Share this document</h4>
          <input
            type="email"
            placeholder="Enter user email (e.g., bob@example.com)"
            value={shareEmail}
            onChange={(e) => setShareEmail(e.target.value)}
            style={{ width: '300px', padding: '6px' }}
          />
          <button onClick={handleShare} style={{ marginLeft: '8px' }}>Share</button>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Only the owner can share. Shared users get edit access.
          </p>
        </div>
      )}

      <ReactQuill
        theme="snow"
        value={content}
        onChange={handleContentChange}
        modules={modules}
        style={{ height: '400px', marginBottom: '50px' }}
      />
    </div>
  );
}