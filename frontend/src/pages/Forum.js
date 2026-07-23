import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Card, Badge, Modal, Alert, Spinner, Tab, Tabs } from 'react-bootstrap';
import api from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

export default function Forum() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general');
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ show: false, postId: null, postTitle: '' });
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { value: 'all', label: 'All Posts' },
    { value: 'general', label: 'General' },
    { value: 'support', label: 'Support' },
    { value: 'resources', label: 'Resources' },
    { value: 'success', label: 'Success Stories' },
    { value: 'questions', label: 'Questions' },
  ];

  useEffect(() => {
    fetchThreads();
  }, []);

  const fetchThreads = async () => {
    try {
      const res = await api.get('/api/forum/threads');
      setThreads(res.data);
    } catch (err) {
      console.error("Fetch threads error:", err);
      toast.error('Failed to load forum threads');
    } finally {
      setLoading(false);
    }
  };

  const filteredThreads = threads.filter(thread => 
    activeCategory === 'all' || thread.category === activeCategory
  );

  const createThread = async (e) => {
    e.preventDefault();

    if (!title || !body) {
      toast.error('Title and content are required');
      return;
    }

    if (title.length < 5) {
      toast.error('Title must be at least 5 characters');
      return;
    }

    if (body.length < 10) {
      toast.error('Content must be at least 10 characters');
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.post('/api/forum/threads', { 
        title, 
        body,
        category 
      });

      const approvalStatus = res.data.approval_status;

      if (approvalStatus === 'approved') {
        toast.success('Your post has been published!');
        setTitle('');
        setBody('');
        setCategory('general');
        setShowModal(false);
        fetchThreads();
      } else if (approvalStatus === 'pending') {
        toast.warning(
          'Your post is pending review. It will appear after moderator approval.',
          { autoClose: 6000 }
        );
        setTitle('');
        setBody('');
        setCategory('general');
        setShowModal(false);
      } else {
        toast.info('Your post has been submitted.');
        setShowModal(false);
      }

    } catch (err) {
      console.error("Create thread error:", err);
      
      if (err.response?.status === 400) {
        const errorData = err.response.data;
        const reason = errorData.reason || errorData.error || 'Content did not pass moderation';
        toast.error(`${reason}`, { autoClose: 7000 });
      } else if (err.response?.status === 429) {
        const retryAfter = err.response.data?.retryAfter || 2;
        toast.error(`Too many requests. Please wait ${retryAfter} seconds and try again.`, { autoClose: 5000 });
      } else if (err.response?.status === 403) {
        const categories = err.response.data.categories || [];
        toast.error(`Post rejected by moderation. ${
          categories.length > 0 ? `Flagged: ${categories.join(', ')}` : ''
        }`, { autoClose: 5000 });
      } else {
        toast.error(err.response?.data?.error || 'Failed to create post. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (post) => {
    setDeleteModal({
      show: true,
      postId: post.id,
      postTitle: post.title
    });
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/api/forum/threads/${deleteModal.postId}`);
      toast.success('Post deleted');
      setDeleteModal({ show: false, postId: null, postTitle: '' });
      fetchThreads();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error('Failed to delete post');
    }
  };

  const isAuthor = (post) => {
    return post.author_name === user?.name;
  };

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
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  if (loading) {
    return (
      <Container className="mt-4 text-center py-5">
        <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
        <p className="mt-3 text-muted">Loading community forum...</p>
      </Container>
    );
  }

  return (
    <Container className="mt-4 mb-5">
      {/* Page Header */}
      <div className="mc-section-title d-flex justify-content-between align-items-end">
        <div>
          <h2 className="mb-0">
            <i className="bi bi-chat-dots me-2 text-info"></i>
            Community Forum
          </h2>
          <p className="text-muted mb-0 mt-1">Share experiences and support each other</p>
        </div>
        <Button 
          variant="info" 
          onClick={() => setShowModal(true)}
          className="rounded-pill px-4"
        >
          <i className="bi bi-plus-circle me-2"></i>
          New Thread
        </Button>
      </div>

      <Alert variant="info" className="mb-4 shadow-sm border-0" style={{ 
        borderRadius: 'var(--mc-radius-lg)',
        background: 'linear-gradient(135deg, var(--mc-info-light) 0%, var(--mc-info-light) 100%)'
      }}>
        <div className="d-flex align-items-start">
          <i className="bi bi-shield-check me-3" style={{ fontSize: "1.5rem", color: 'var(--mc-info)' }}></i>
          <div>
            <strong>AI Moderation Active</strong>
            <p className="mb-0 mt-1 small">
              All posts are automatically checked for safety before being published.
              Posts containing harmful, unsafe, or inappropriate content will be rejected
              or held for manual review.
            </p>
          </div>
        </div>
      </Alert>

      {/* Category Tabs */}
      <Tabs
        activeKey={activeCategory}
        onSelect={(k) => setActiveCategory(k)}
        className="mb-4 border-0"
        style={{
          '--bs-nav-tabs-border-width': '0',
          '--bs-nav-tabs-link-hover-border-color': 'transparent',
        }}
      >
        {categories.map((cat) => (
          <Tab 
            key={cat.value} 
            eventKey={cat.value} 
            title={
              <span className="rounded-pill px-3 py-2">
                {cat.label}
              </span>
            }
          />
        ))}
      </Tabs>

      {threads.length === 0 ? (
        <Card className="mc-empty-state border-0 shadow-sm" style={{ borderRadius: 'var(--mc-radius-xl)' }}>
          <Card.Body className="p-5">
            <i className="bi bi-chat-square-text display-1 text-info opacity-50"></i>
            <h4 className="mt-3 mb-2">No threads yet</h4>
            <p className="text-muted mb-4">Be the first to start a conversation!</p>
            <Button 
              variant="info" 
              onClick={() => setShowModal(true)}
              size="lg"
              className="rounded-pill px-4"
            >
              <i className="bi bi-plus-circle me-2"></i>
              Create First Thread
            </Button>
          </Card.Body>
        </Card>
      ) : filteredThreads.length === 0 ? (
        <Card className="mc-empty-state border-0 shadow-sm" style={{ borderRadius: 'var(--mc-radius-xl)' }}>
          <Card.Body className="p-5">
            <i className="bi bi-chat-square-text display-1 text-muted opacity-50"></i>
            <h4 className="mt-3 mb-2">No posts in this category</h4>
            <p className="text-muted mb-4">Try selecting a different category</p>
          </Card.Body>
        </Card>
      ) : (
        <div>
          {filteredThreads.map((thread) => (
            <Card key={thread.id} className="mb-3 shadow-sm mc-lift" style={{ borderRadius: 'var(--mc-radius-xl)' }}>
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center mb-2">
                      <h5 className="mb-0">{thread.title || "Forum Post"}</h5>
                      {thread.category && thread.category !== 'general' && (
                        <Badge bg="secondary" className="ms-2 rounded-pill small">
                          {thread.category}
                        </Badge>
                      )}
                    </div>
                    <p className="mb-3" style={{ whiteSpace: 'pre-wrap' }}>
                      {thread.body}
                    </p>
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="text-muted small">
                        <i className="bi bi-person-circle me-1"></i>
                        <strong>{thread.author_name || "Anonymous"}</strong>
                        <span className="mx-2">•</span>
                        <i className="bi bi-clock me-1"></i>
                        {formatDate(thread.created_at)}
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        {isAuthor(thread) && (
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            className="rounded-pill"
                            onClick={() => handleDeleteClick(thread)}
                          >
                            <i className="bi bi-trash me-1"></i>
                            Delete
                          </Button>
                        )}
                        <Badge 
                          bg={
                            thread.approval_status === 'approved' ? 'success' : 
                            thread.approval_status === 'pending' ? 'warning' : 
                            'secondary'
                          }
                          text={thread.approval_status === 'pending' ? 'dark' : 'white'}
                          className="rounded-pill"
                        >
                          <i className={`bi ${
                            thread.approval_status === 'approved' ? 'bi-check-circle' : 
                            thread.approval_status === 'pending' ? 'bi-clock' : 
                            'bi-question-circle'
                          } me-1`}></i>
                          {thread.approval_status || 'approved'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      {/* Create Thread Modal */}
      <Modal show={showModal} onHide={() => !submitting && setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title>
            <i className="bi bi-plus-circle me-2 text-info"></i>
            Create New Thread
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={createThread}>
          <Modal.Body className="pt-3">
            <Alert variant="info" className="small mb-4 rounded-3">
              <i className="bi bi-info-circle me-2"></i>
              Your post will be automatically checked by AI moderation before publishing.
              Please follow our community guidelines.
            </Alert>

            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">
                <i className="bi bi-card-heading me-2"></i>Thread Title *
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter a descriptive title (5-200 characters)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
                disabled={submitting}
                className="rounded-pill py-2 px-3"
              />
              <Form.Text className="text-muted">
                {title.length}/200 characters
                {title.length > 0 && title.length < 5 && (
                  <span className="text-danger ms-2">• Minimum 5 characters</span>
                )}
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">
                <i className="bi bi-tag me-2"></i>Category
              </Form.Label>
              <Form.Select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={submitting}
                className="rounded-pill py-2 px-3"
              >
                <option value="general">General Discussion</option>
                <option value="support">Support & Advice</option>
                <option value="resources">Resources & Tips</option>
                <option value="success">Success Stories</option>
                <option value="questions">Questions</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-medium">
                <i className="bi bi-chat-left-text me-2"></i>Content *
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={6}
                placeholder="Share your thoughts, experiences, or questions..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={5000}
                required
                disabled={submitting}
                className="rounded-3"
              />
              <Form.Text className="text-muted">
                {body.length}/5000 characters
                {body.length > 0 && body.length < 10 && (
                  <span className="text-danger ms-2">• Minimum 10 characters</span>
                )}
              </Form.Text>
            </Form.Group>

            <Alert variant="warning" className="small mb-0 rounded-3">
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
            </Alert>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button 
              variant="outline-secondary" 
              onClick={() => setShowModal(false)} 
              disabled={submitting}
              className="rounded-pill px-4"
            >
              Cancel
            </Button>
            <Button 
              variant="info" 
              type="submit" 
              disabled={submitting || title.length < 5 || body.length < 10}
              className="rounded-pill px-4"
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Checking & Posting...
                </>
              ) : (
                <>
                  <i className="bi bi-send me-2"></i>
                  Post Thread
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        show={deleteModal.show} 
        onHide={() => setDeleteModal({ show: false, postId: null, postTitle: '' })}
        centered
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-danger fw-bold">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Confirm Delete
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          <p>Are you sure you want to delete this post?</p>
          <Card className="bg-light border-0 rounded-3">
            <Card.Body>
              <strong className="text-dark">{deleteModal.postTitle}</strong>
            </Card.Body>
          </Card>
          <Alert variant="warning" className="mt-3 mb-0 small">
            <i className="bi bi-info-circle me-2"></i>
            <strong>This action cannot be undone.</strong> Your post will be permanently removed.
          </Alert>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button 
            variant="outline-secondary" 
            onClick={() => setDeleteModal({ show: false, postId: null, postTitle: '' })}
            className="rounded-pill px-4"
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={confirmDelete}
            className="rounded-pill px-4"
          >
            <i className="bi bi-trash me-2"></i>
            Delete Post
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Styling for Tabs */}
      <style>{`
        .nav-tabs .nav-link {
          border: none !important;
          background: var(--mc-bg-secondary);
          color: var(--mc-text-secondary);
          font-weight: 500;
          transition: all var(--mc-transition-fast);
        }

        .nav-tabs .nav-link:hover {
          background: var(--mc-primary-100);
          color: var(--mc-primary-600);
        }

        .nav-tabs .nav-link.active {
          background: var(--mc-bg-gradient) !important;
          color: white !important;
          box-shadow: var(--mc-shadow-md);
        }

        .nav-tabs {
          border-bottom: none !important;
        }
      `}</style>
    </Container>
  );
}