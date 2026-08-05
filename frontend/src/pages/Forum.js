import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Container, Form, Button, Card, Badge, Modal, Alert, Spinner } from 'react-bootstrap';
import api from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  { value: 'all', label: 'All Posts' },
  { value: 'general', label: 'General' },
  { value: 'support', label: 'Support' },
  { value: 'resources', label: 'Resources' },
  { value: 'success', label: 'Success Stories' },
  { value: 'questions', label: 'Questions' },
];

const CATEGORY_BADGE_VARIANT = {
  general: 'secondary',
  support: 'primary',
  resources: 'info',
  success: 'success',
  questions: 'warning',
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'most_liked', label: 'Most liked' },
  { value: 'most_replies', label: 'Most replies' },
];

const PAGE_SIZE = 4;
const FLAGGED_WORDS = ['kill myself', 'buy drugs', 'hate speech'];

export default function Forum() {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [replies, setReplies] = useState({});
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [expandedThread, setExpandedThread] = useState(null);
  const [replyForms, setReplyForms] = useState({});
  const [replyTexts, setReplyTexts] = useState({});
  const [editingReply, setEditingReply] = useState(null);
  const [likes, setLikes] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [loadingReplies, setLoadingReplies] = useState({});

  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingThreadId, setEditingThreadId] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [moderationError, setModerationError] = useState(null);

  const searchDebounce = useRef(null);
  const toastId = useRef(1);

  useEffect(() => {
    fetchThreads();
  }, []);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setSearchQuery(searchInput.trim().toLowerCase());
      setVisibleCount(PAGE_SIZE);
    }, 250);
    return () => clearTimeout(searchDebounce.current);
  }, [searchInput]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeCategory, sortBy]);

  const pushToast = useCallback((message, type = 'info') => {
    const id = toastId.current++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const fetchThreads = async () => {
    try {
      const res = await api.get('/api/forum/threads');
      setThreads(res.data);
      
      // Initialize like counts from thread data
      const initialLikes = {};
      res.data.forEach(thread => {
        initialLikes[thread.id] = thread.like_count || 0;
      });
      setLikeCounts(initialLikes);
    } catch (err) {
      console.error("Fetch threads error:", err);
      pushToast('Failed to load forum threads', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async (threadId) => {
    setLoadingReplies(prev => ({ ...prev, [threadId]: true }));
    try {
      const res = await api.get(`/api/forum/threads/${threadId}/replies`);
      setReplies(prev => ({ ...prev, [threadId]: res.data }));
    } catch (err) {
      console.error("Fetch replies error:", err);
    } finally {
      setLoadingReplies(prev => ({ ...prev, [threadId]: false }));
    }
  };

  const fetchLikeStatus = async (threadId) => {
    try {
      const res = await api.get(`/api/forum/threads/${threadId}/likes`);
      setLikes(prev => ({ ...prev, [threadId]: res.data.liked }));
      setLikeCounts(prev => ({ ...prev, [threadId]: res.data.count }));
    } catch (err) {
      console.error("Fetch like status error:", err);
    }
  };

  const filteredThreads = useMemo(() => {
    let result = threads;
    if (activeCategory !== 'all') result = result.filter((t) => t.category === activeCategory);
    if (searchQuery) {
      result = result.filter((t) =>
        `${t.title} ${t.body} ${t.author_name}`.toLowerCase().includes(searchQuery)
      );
    }
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return new Date(a.created_at) - new Date(b.created_at);
        case 'most_liked': return (likeCounts[b.id] || 0) - (likeCounts[a.id] || 0);
        case 'most_replies': return (b.reply_count || 0) - (a.reply_count || 0);
        default: return new Date(b.created_at) - new Date(a.created_at);
      }
    });
  }, [threads, activeCategory, searchQuery, sortBy, likeCounts]);

  const visibleThreads = filteredThreads.slice(0, visibleCount);
  const hasMore = visibleCount < filteredThreads.length;

  const resetForm = () => {
    setTitle(''); setBody(''); setCategory('general');
    setEditingThreadId(null); setModerationError(null);
  };

  const openCreate = () => { resetForm(); setShowModal(true); };
  const openEdit = (thread) => {
    setEditingThreadId(thread.id);
    setTitle(thread.title); setBody(thread.body); setCategory(thread.category);
    setModerationError(null);
    setShowModal(true);
  };

  const submitThread = async (e) => {
    e.preventDefault();
    setModerationError(null);
    if (title.length < 5) return pushToast('Title must be at least 5 characters', 'error');
    if (body.length < 10) return pushToast('Content must be at least 10 characters', 'error');

    setSubmitting(true);
    try {
      if (editingThreadId) {
        // Update existing thread
        await api.put(`/api/forum/threads/${editingThreadId}`, { title, body, category });
        setThreads((prev) => prev.map((t) =>
          t.id === editingThreadId ? { ...t, title, body, category } : t
        ));
        pushToast('Post updated successfully', 'success');
      } else {
        // Create new thread
        const res = await api.post('/api/forum/threads', { title, body, category });
        const newThread = {
          id: res.data.id,
          title,
          body,
          category,
          author_name: user?.name || 'Anonymous',
          created_at: new Date().toISOString(),
          reply_count: 0,
          approval_status: res.data.approval_status,
          user_id: user?.id,
        };
        setThreads((prev) => [newThread, ...prev]);
        setLikeCounts((prev) => ({ ...prev, [newThread.id]: 0 }));
        
        if (res.data.approval_status === 'approved') {
          pushToast('Your post has been published!', 'success');
        } else if (res.data.approval_status === 'pending') {
          pushToast('Your post is pending review', 'warning');
        }
      }

      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error("Submit thread error:", err);
      if (err.response?.status === 400) {
        const errorData = err.response.data;
        if (errorData.categories) {
          setModerationError({ categories: errorData.categories });
          pushToast('Post rejected by AI moderation', 'error');
        } else {
          pushToast(err.response.data?.error || 'Failed to create post', 'error');
        }
      } else {
        pushToast('Failed to save post', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/api/forum/threads/${deleteTarget.id}`);
      setThreads((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      pushToast('Post deleted', 'success');
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete error:", err);
      pushToast('Failed to delete post', 'error');
    }
  };

  const toggleLike = async (threadId) => {
    try {
      if (likes[threadId]) {
        await api.delete(`/api/forum/threads/${threadId}/like`);
        setLikeCounts((prev) => ({ ...prev, [threadId]: Math.max((prev[threadId] || 1) - 1, 0) }));
        setLikes((prev) => ({ ...prev, [threadId]: false }));
      } else {
        await api.post(`/api/forum/threads/${threadId}/like`);
        setLikeCounts((prev) => ({ ...prev, [threadId]: (prev[threadId] || 0) + 1 }));
        setLikes((prev) => ({ ...prev, [threadId]: true }));
        pushToast('You liked this post!', 'success');
      }
    } catch (err) {
      console.error("Like error:", err);
      pushToast(err.response?.data?.error || 'Failed to update like', 'error');
    }
  };

  const toggleThread = (threadId) => {
    setExpandedThread((prev) => (prev === threadId ? null : threadId));
    if (expandedThread !== threadId && !replies[threadId]) {
      fetchReplies(threadId);
    }
  };

  const handleReplyButtonClick = (threadId) => {
    // Always expand the thread when clicking reply button
    if (expandedThread !== threadId) {
      setExpandedThread(threadId);
      if (!replies[threadId]) {
        fetchReplies(threadId);
      }
    }
    // Toggle the reply form
    setReplyForms(prev => ({ ...prev, [threadId]: !prev[threadId] }));
  };

  const submitReply = async (threadId) => {
    const text = (replyTexts[threadId] || '').trim();
    if (text.length < 2) return pushToast('Reply must be at least 2 characters', 'error');

    try {
      const res = await api.post(`/api/forum/threads/${threadId}/replies`, { body: text });
      const newReply = {
        id: res.data.id,
        body: text,
        author_name: user?.name || 'Anonymous',
        created_at: new Date().toISOString(),
        user_id: user?.id,
      };
      setReplies((prev) => ({ ...prev, [threadId]: [...(prev[threadId] || []), newReply] }));
      setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, reply_count: (t.reply_count || 0) + 1 } : t)));
      setReplyTexts((prev) => ({ ...prev, [threadId]: '' }));
      setReplyForms((prev) => ({ ...prev, [threadId]: false }));
      pushToast('Reply added!', 'success');
    } catch (err) {
      console.error("Reply error:", err);
      pushToast(err.response?.data?.error || 'Failed to add reply', 'error');
    }
  };

  const saveReplyEdit = async (threadId, replyId) => {
    const text = (replyTexts[replyId] || '').trim();
    if (text.length < 2) return pushToast('Reply must be at least 2 characters', 'error');

    try {
      await api.put(`/api/forum/replies/${replyId}`, { body: text });
      setReplies((prev) => ({
        ...prev,
        [threadId]: prev[threadId].map((r) => (r.id === replyId ? { ...r, body: text } : r)),
      }));
      setEditingReply(null);
      pushToast('Reply updated!', 'success');
    } catch (err) {
      console.error("Edit reply error:", err);
      pushToast(err.response?.data?.error || 'Failed to update reply', 'error');
    }
  };

  const deleteReply = async (threadId, replyId) => {
    if (!window.confirm("Are you sure you want to delete this reply?")) {
      return;
    }

    try {
      await api.delete(`/api/forum/replies/${replyId}`);
      setReplies((prev) => ({ ...prev, [threadId]: prev[threadId].filter((r) => r.id !== replyId) }));
      setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, reply_count: Math.max((t.reply_count || 0) - 1, 0) } : t)));
      pushToast('Reply deleted', 'success');
    } catch (err) {
      console.error("Delete reply error:", err);
      pushToast('Failed to delete reply', 'error');
    }
  };

  const canModify = (item) => item.user_id === user?.id || user?.role === 'admin' || user?.role === 'manager';

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <Container className="mt-4 mb-5">
        <div className="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-3">
          <div>
            <h2 className="mb-0">
              <i className="bi bi-chat-dots me-2 text-info"></i>
              Community Forum
            </h2>
            <p className="text-muted mb-0 mt-1">Share experiences and support each other</p>
          </div>
        </div>
        <ThreadSkeleton />
        <ThreadSkeleton />
        <ThreadSkeleton />
      </Container>
    );
  }

  return (
    <Container className="mt-4 mb-5">
      {/* Toast notifications */}
      <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 1080 }}>
        {toasts.map((t) => (
          <div key={t.id} className={`toast show align-items-center text-bg-${t.type === 'error' ? 'danger' : t.type} border-0 mb-2 shadow-sm`} role="alert">
            <div className="d-flex">
              <div className="toast-body small">{t.message}</div>
              <button type="button" className="btn-close btn-close-white me-2 m-auto" onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} aria-label="Close"></button>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-3">
        <div>
          <h2 className="mb-0">
            <i className="bi bi-chat-dots me-2 text-info"></i>
            Community Forum
          </h2>
          <p className="text-muted mb-0 mt-1">Share experiences and support each other</p>
        </div>
        <button className="btn btn-info rounded-pill px-4 text-white" onClick={openCreate}>
          <i className="bi bi-plus-circle me-2"></i>New Thread
        </button>
      </div>

      {/* Moderation banner */}
      <div className="alert alert-info shadow-sm border-0 mb-4" style={{ borderRadius: '1rem' }}>
        <div className="d-flex align-items-start">
          <i className="bi bi-shield-check me-3" style={{ fontSize: '1.5rem' }}></i>
          <div>
            <strong>AI Moderation Active</strong>
            <p className="mb-0 mt-1 small">
              All posts are automatically checked by AI for safety before being published. Posts containing
              harmful, unsafe, or inappropriate content will be rejected with specific feedback on what was
              flagged.
            </p>
          </div>
        </div>
      </div>

      {/* Search + Sort toolbar */}
      <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
        <div className="input-group" style={{ maxWidth: 320 }}>
          <span className="input-group-text bg-white">
            <i className="bi bi-search text-muted"></i>
          </span>
          <input
            type="text"
            className="form-control"
            placeholder="Search threads..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search threads"
          />
          {searchInput && (
            <button className="btn btn-outline-secondary" onClick={() => setSearchInput('')} aria-label="Clear search">
              <i className="bi bi-x-lg"></i>
            </button>
          )}
        </div>

        <select
          className="form-select"
          style={{ maxWidth: 190 }}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          aria-label="Sort threads"
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <span className="text-muted small ms-auto">
          {filteredThreads.length} {filteredThreads.length === 1 ? 'thread' : 'threads'}
        </span>
      </div>

      {/* Category pills */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`btn btn-sm rounded-pill px-3 ${active ? 'btn-primary' : 'btn-outline-secondary'}`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Thread list */}
      {filteredThreads.length === 0 ? (
        <div className="card border-0 shadow-sm text-center" style={{ borderRadius: '1rem' }}>
          <div className="card-body p-5">
            <i className="bi bi-search display-1 text-muted opacity-50"></i>
            <h4 className="mt-3 mb-2">No matching posts</h4>
            <p className="text-muted mb-4">
              {searchQuery ? 'Try a different search term or clear the search.' : 'Try selecting a different category.'}
            </p>
            {searchQuery && (
              <button className="btn btn-outline-secondary rounded-pill px-4" onClick={() => setSearchInput('')}>
                Clear search
              </button>
            )}
          </div>
        </div>
      ) : (
        <div>
          {visibleThreads.map((thread) => {
            const expanded = expandedThread === thread.id;
            const threadReplies = replies[thread.id] || [];
            return (
              <Card
                key={thread.id}
                className="shadow-sm mb-3"
                style={{
                  borderRadius: '1rem',
                  cursor: 'pointer',
                  border: expanded ? '2px solid #4f46e5' : '2px solid transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <Card.Body className="p-4" onClick={() => toggleThread(thread.id)}>
                  <div className="d-flex align-items-center mb-2 flex-wrap gap-2">
                    <h5 className="mb-0">{thread.title}</h5>
                    {thread.category !== 'general' && (
                      <Badge bg={CATEGORY_BADGE_VARIANT[thread.category]} className="rounded-pill">
                        {thread.category}
                      </Badge>
                    )}
                    {thread.edited && <span className="text-muted small fst-italic">(edited)</span>}
                    {thread.approval_status === 'pending' && (
                      <Badge bg="warning" text="dark" className="rounded-pill">
                        <i className="bi bi-clock me-1"></i>pending review
                      </Badge>
                    )}
                  </div>
                  <p className="mb-3" style={{ whiteSpace: 'pre-wrap' }}>{thread.body}</p>
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="text-muted small">
                      <i className="bi bi-person-circle me-1"></i>
                      <strong>{thread.author_name}</strong>
                      <span className="mx-2">•</span>
                      <i className="bi bi-clock me-1"></i>
                      {formatDate(thread.created_at)}
                    </div>
                    <div className="d-flex align-items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {canModify(thread) && (
                        <>
                          <Button variant="outline-secondary" size="sm" className="rounded-pill" onClick={() => openEdit(thread)}>
                            <i className="bi bi-pencil me-1"></i>Edit
                          </Button>
                          <Button variant="outline-danger" size="sm" className="rounded-pill" onClick={() => setDeleteTarget(thread)}>
                            <i className="bi bi-trash me-1"></i>Delete
                          </Button>
                        </>
                      )}
                      <Button
                        variant={likes[thread.id] ? "outline-danger" : "outline-secondary"}
                        size="sm"
                        className="rounded-pill"
                        onClick={() => toggleLike(thread.id)}
                      >
                        <i className={`bi ${likes[thread.id] ? 'bi-heart-fill' : 'bi-heart'} me-1`}></i>
                        {likeCounts[thread.id] || 0}
                      </Button>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="rounded-pill"
                        onClick={() => handleReplyButtonClick(thread.id)}
                      >
                        <i className="bi bi-chat me-1"></i>
                        {thread.reply_count || 0}
                      </Button>
                    </div>
                  </div>
                </Card.Body>

                {/* Replies Section */}
                {expanded && (
                  <Card.Body className="border-top bg-light" style={{ borderTop: '1px solid #e5e7eb' }}>
                    <h6 className="fw-bold mb-3">
                      <i className="bi bi-chat-dots me-2 text-primary"></i>
                      {threadReplies.length} {threadReplies.length === 1 ? 'Reply' : 'Replies'}
                    </h6>

                    {loadingReplies[thread.id] ? (
                      <div className="text-center py-3">
                        <Spinner animation="border" variant="primary" size="sm" />
                        <p className="text-muted mb-0 small mt-2">Loading replies...</p>
                      </div>
                    ) : threadReplies.length === 0 ? (
                      <p className="text-muted text-center small py-2">No replies yet. Be the first to respond!</p>
                    ) : (
                      <div className="d-flex flex-column gap-3 mb-3">
                        {threadReplies.map((reply, i) => (
                          <div key={reply.id} className={i < threadReplies.length - 1 ? 'pb-3 border-bottom' : ''}>
                            <div className="d-flex align-items-center mb-2">
                              <strong className="me-2">{reply.author_name}</strong>
                              <small className="text-muted">
                                <i className="bi bi-clock me-1"></i>
                                {formatDate(reply.created_at)}
                              </small>
                            </div>
                            {editingReply === reply.id ? (
                              <div>
                                <textarea
                                  className="form-control rounded-3 mb-2"
                                  rows={3}
                                  value={replyTexts[reply.id] || ''}
                                  onChange={(e) => setReplyTexts((prev) => ({ ...prev, [reply.id]: e.target.value }))}
                                />
                                <div className="d-flex gap-2">
                                  <Button size="sm" className="rounded-pill" onClick={() => saveReplyEdit(thread.id, reply.id)}>
                                    Save
                                  </Button>
                                  <Button variant="outline-secondary" size="sm" className="rounded-pill" onClick={() => setEditingReply(null)}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="mb-2" style={{ whiteSpace: 'pre-wrap' }}>{reply.body}</p>
                                {canModify(reply) && (
                                  <div className="d-flex gap-2">
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      className="rounded-pill"
                                      onClick={() => { setEditingReply(reply.id); setReplyTexts((prev) => ({ ...prev, [reply.id]: reply.body })); }}
                                    >
                                      <i className="bi bi-pencil me-1"></i>Edit
                                    </Button>
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      className="rounded-pill"
                                      onClick={() => deleteReply(thread.id, reply.id)}
                                    >
                                      <i className="bi bi-trash me-1"></i>Delete
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply Form */}
                    {replyForms[thread.id] ? (
                      <div className="pt-3 border-top">
                        <div className="alert alert-info small rounded-3 mb-3">
                          <i className="bi bi-shield-check me-2"></i>
                          Your reply will be checked by AI moderation before publishing.
                        </div>
                        <textarea
                          className="form-control rounded-3 mb-1"
                          rows={3}
                          placeholder="Share your thoughts, support, or advice..."
                          value={replyTexts[thread.id] || ''}
                          onChange={(e) => setReplyTexts((prev) => ({ ...prev, [thread.id]: e.target.value }))}
                          maxLength={5000}
                        />
                        <p className="form-text text-muted mb-3">
                          {(replyTexts[thread.id] || '').length}/5000 characters
                          {(replyTexts[thread.id] || '').length > 0 && (replyTexts[thread.id] || '').length < 2 && (
                            <span className="text-danger ms-2">• Minimum 2 characters</span>
                          )}
                        </p>
                        <div className="d-flex gap-2">
                          <Button variant="outline-secondary" className="rounded-pill px-4" onClick={() => setReplyForms((prev) => ({ ...prev, [thread.id]: false }))}>
                            Cancel
                          </Button>
                          <Button
                            className="rounded-pill px-4"
                            disabled={(replyTexts[thread.id] || '').trim().length < 2}
                            onClick={() => submitReply(thread.id)}
                          >
                            <i className="bi bi-send me-2"></i>Post Reply
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="link" className="text-decoration-none ps-0 mt-2" onClick={() => setReplyForms((prev) => ({ ...prev, [thread.id]: true }))}>
                        <i className="bi bi-reply me-1"></i>Write a reply
                      </Button>
                    )}
                  </Card.Body>
                )}
              </Card>
            );
          })}

          {hasMore && (
            <div className="text-center mt-3">
              <Button variant="outline-primary" className="rounded-pill px-4" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                <i className="bi bi-arrow-down-circle me-2"></i>
                Load more ({filteredThreads.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.4)', zIndex: 1050 }} onClick={() => !submitting && setShowModal(false)}>
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title">
                  <i className={`bi ${editingThreadId ? 'bi-pencil-square' : 'bi-plus-circle'} me-2 text-info`}></i>
                  {editingThreadId ? 'Edit Thread' : 'Create New Thread'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} aria-label="Close"></button>
              </div>
              <form onSubmit={submitThread}>
                <div className="modal-body pt-3">
                  <div className="alert alert-info small rounded-3 mb-4">
                    <i className="bi bi-info-circle me-2"></i>
                    Your post will be automatically checked by AI moderation before publishing. Please follow our
                    community guidelines.
                  </div>

                  {moderationError && (
                    <div className="alert alert-danger rounded-3 mb-4">
                      <div className="d-flex align-items-start">
                        <i className="bi bi-shield-exclamation me-2 mt-1" style={{ fontSize: '1.2rem' }}></i>
                        <div>
                          <strong className="d-block mb-1">Post Rejected by AI Moderation</strong>
                          <div className="mt-2">
                            <strong className="small">Flagged categories:</strong>
                            <div className="d-flex flex-wrap gap-1 mt-1">
                              {moderationError.categories.map((cat, idx) => (
                                <span key={idx} className="badge rounded-pill text-bg-danger text-capitalize">
                                  {cat.replace(/-/g, ' ')}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label fw-medium">
                      <i className="bi bi-card-heading me-2"></i>Thread Title *
                    </label>
                    <input
                      type="text"
                      className="form-control rounded-pill py-2 px-3"
                      placeholder="Enter a descriptive title (5-200 characters)"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={200}
                      disabled={submitting}
                    />
                    <div className="form-text">
                      {title.length}/200 characters
                      {title.length > 0 && title.length < 5 && <span className="text-danger ms-2">• Minimum 5 characters</span>}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-medium">
                      <i className="bi bi-tag me-2"></i>Category
                    </label>
                    <select
                      className="form-select rounded-pill py-2 px-3"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      disabled={submitting}
                    >
                      <option value="general">General Discussion</option>
                      <option value="support">Support & Advice</option>
                      <option value="resources">Resources & Tips</option>
                      <option value="success">Success Stories</option>
                      <option value="questions">Questions</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-medium">
                      <i className="bi bi-chat-left-text me-2"></i>Content *
                    </label>
                    <textarea
                      className="form-control rounded-3"
                      rows={6}
                      placeholder="Share your thoughts, experiences, or questions..."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      maxLength={5000}
                      disabled={submitting}
                    />
                    <div className="form-text">
                      {body.length}/5000 characters
                      {body.length > 0 && body.length < 10 && <span className="text-danger ms-2">• Minimum 10 characters</span>}
                    </div>
                  </div>

                  <div className="alert alert-warning small rounded-3 mb-0">
                    <strong>
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      Community Guidelines:
                    </strong>
                    <ul className="mb-0 mt-2">
                      <li>Be respectful, kind, and supportive</li>
                      <li>Don't share personal medical advice</li>
                      <li>Avoid harmful or explicit content</li>
                      <li>Respect privacy - no personal information</li>
                      <li><strong>Emergency?</strong> Call 988 or emergency services</li>
                    </ul>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary rounded-pill px-4" disabled={submitting} onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-info text-white rounded-pill px-4"
                    disabled={submitting || title.length < 5 || body.length < 10}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        {editingThreadId ? 'Saving...' : 'AI Checking & Posting...'}
                      </>
                    ) : (
                      <>
                        <i className={`bi ${editingThreadId ? 'bi-check2' : 'bi-send'} me-2`}></i>
                        {editingThreadId ? 'Save Changes' : 'Post Thread'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.4)', zIndex: 1050 }} onClick={() => setDeleteTarget(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title text-danger fw-bold">
                  <i className="bi bi-exclamation-triangle me-2"></i>Confirm Delete
                </h5>
                <button type="button" className="btn-close" onClick={() => setDeleteTarget(null)} aria-label="Close"></button>
              </div>
              <div className="modal-body pt-3">
                <p>Are you sure you want to delete this post?</p>
                <div className="card bg-light border-0 rounded-3">
                  <div className="card-body">
                    <strong className="text-dark">{deleteTarget.title}</strong>
                  </div>
                </div>
                <div className="alert alert-warning mt-3 mb-0 small">
                  <i className="bi bi-info-circle me-2"></i>
                  <strong>This action cannot be undone.</strong> Your post will be permanently removed.
                </div>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button className="btn btn-outline-secondary rounded-pill px-4" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </button>
                <button className="btn btn-danger rounded-pill px-4" onClick={confirmDelete}>
                  <i className="bi bi-trash me-2"></i>Delete Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}

function ThreadSkeleton() {
  return (
    <div className="card border-0 shadow-sm mb-3 placeholder-glow" style={{ borderRadius: '1rem' }}>
      <div className="card-body p-4">
        <span className="placeholder col-4 mb-2 d-block" style={{ height: 20 }}></span>
        <span className="placeholder col-11 mb-1 d-block"></span>
        <span className="placeholder col-6 mb-3 d-block"></span>
        <span className="placeholder col-3 d-block"></span>
      </div>
    </div>
  );
}