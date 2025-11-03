import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Card, Badge, Modal, Alert, Spinner } from 'react-bootstrap';
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

  useEffect(() => {
    fetchThreads();
  }, []);

  const fetchThreads = async () => {
    try {
      const res = await api.get('/api/forum/threads');
      console.log('Fetched threads:', res.data);
      setThreads(res.data);
    } catch (err) {
      console.error("Fetch threads error:", err);
      toast.error('Failed to load forum threads');
    } finally {
      setLoading(false);
    }
  };

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
      console.log("🔍 Submitting post for moderation...");
      const res = await api.post('/api/forum/threads', { 
        title, 
        body,
        category 
      });

      console.log("Server response:", res.data);

      const approvalStatus = res.data.approval_status;
      const message = res.data.message;

      if (approvalStatus === 'approved') {
        toast.success(message || ' Your post has been published!');
        setTitle('');
        setBody('');
        setCategory('general');
        setShowModal(false);
        fetchThreads();
      } else if (approvalStatus === 'pending') {
        toast.warning(
          message || ' Your post is pending review. It will appear after moderator approval.',
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
      console.error("Error response:", err.response);
      
      if (err.response?.status === 400) {
        const errorData = err.response.data;
        const reason = errorData.reason || errorData.error || 'Content did not pass moderation';
        const message = errorData.message || '';
        
        toast.error(
          ` ${reason}${message ? ' - ' + message : ''}`,
          { autoClose: 7000 }
        );
      } else if (err.response?.status === 429) {
        const retryAfter = err.response.data?.retryAfter || 2;
        toast.error(
          `⏱Too many requests. Please wait ${retryAfter} seconds and try again.`,
          { autoClose: 5000 }
        );
      } else if (err.response?.status === 403) {
        const categories = err.response.data.categories || [];
        toast.error(
          `Post rejected by moderation. ${
            categories.length > 0 ? `Flagged: ${categories.join(', ')}` : ''
          }`,
          { autoClose: 5000 }
        );
      } else if (err.response?.status === 503) {
        toast.error(
          ' Moderation service unavailable. Please try again in a moment.',
          { autoClose: 6000 }
        );
      } else if (err.response?.status === 401) {
        toast.error('Please log in to post');
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
      console.log(` Deleting post ${deleteModal.postId}`);
      await api.delete(`/api/forum/threads/${deleteModal.postId}`);
      toast.success(' Post deleted successfully');
      setDeleteModal({ show: false, postId: null, postTitle: '' });
      fetchThreads();
    } catch (err) {
      console.error("Delete error:", err);
      if (err.response?.status === 404) {
        toast.error(' Post not found');
      } else if (err.response?.status === 403) {
        toast.error(' You can only delete your own posts');
      } else {
        toast.error(' Failed to delete post');
      }
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
      <Container className="mt-4 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Loading forum...</p>
      </Container>
    );
  }

  return (
    <Container className="mt-4 mb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>
            <i className="bi bi-chat-dots me-2"></i>
            Community Forum
          </h2>
          <p className="text-muted">Share experiences and support each other</p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-circle me-2"></i>
          New Thread
        </Button>
      </div>

      <Alert variant="info" className="mb-4 shadow-sm">
        <div className="d-flex align-items-start">
          <i className="bi bi-shield-check me-3" style={{ fontSize: "1.5rem" }}></i>
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

      {threads.length === 0 ? (
        <Card className="text-center p-5 shadow-sm">
          <i className="bi bi-chat-square-text text-muted" style={{ fontSize: "3rem" }}></i>
          <h4 className="mt-3">No threads yet</h4>
          <p className="text-muted">Be the first to start a conversation!</p>
          <Button variant="primary" onClick={() => setShowModal(true)} size="lg">
            <i className="bi bi-plus-circle me-2"></i>
            Create First Thread
          </Button>
        </Card>
      ) : (
        <div>
          {threads.map((thread) => (
            <Card key={thread.id} className="mb-3 shadow-sm hover-card">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center mb-2">
                      <h5 className="mb-0">{thread.title || "Forum Post"}</h5>
                      {thread.category && thread.category !== 'general' && (
                        <Badge bg="secondary" className="ms-2 small">
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
                      {/* Delete button  */}
                      {isAuthor(thread) && (
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => handleDeleteClick(thread)}
                          className="delete-btn"
                        >
                          <i className="bi bi-trash me-1"></i>
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                  <Badge 
                    bg={
                      thread.approval_status === 'approved' ? 'success' : 
                      thread.approval_status === 'pending' ? 'warning' : 
                      'secondary'
                    }
                    text={thread.approval_status === 'pending' ? 'dark' : 'white'}
                    className="ms-3"
                  >
                    <i className={`bi ${
                      thread.approval_status === 'approved' ? 'bi-check-circle' : 
                      thread.approval_status === 'pending' ? 'bi-clock' : 
                      'bi-question-circle'
                    } me-1`}></i>
                    {thread.approval_status || 'approved'}
                  </Badge>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      {/* Create Thread Modal */}
      <Modal show={showModal} onHide={() => !submitting && setShowModal(false)} size="lg">
        <Modal.Header closeButton={!submitting}>
          <Modal.Title>
            <i className="bi bi-plus-circle me-2"></i>
            Create New Thread
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={createThread}>
          <Modal.Body>
            <Alert variant="info" className="small">
              <i className="bi bi-info-circle me-2"></i>
              Your post will be automatically checked by AI moderation before publishing. 
              Please follow our community guidelines.
            </Alert>

            <Form.Group className="mb-3">
              <Form.Label>Thread Title *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter a descriptive title (5-200 characters)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
                disabled={submitting}
              />
              <Form.Text className="text-muted">
                {title.length}/200 characters
                {title.length > 0 && title.length < 5 && (
                  <span className="text-danger ms-2">• Minimum 5 characters</span>
                )}
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={submitting}
              >
                <option value="general">General Discussion</option>
                <option value="support">Support & Advice</option>
                <option value="resources">Resources & Tips</option>
                <option value="success">Success Stories</option>
                <option value="questions">Questions</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Content *</Form.Label>
              <Form.Control
                as="textarea"
                rows={8}
                placeholder="Share your thoughts, experiences, or questions (minimum 10 characters)"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={5000}
                required
                disabled={submitting}
              />
              <Form.Text className="text-muted">
                {body.length}/5000 characters
                {body.length > 0 && body.length < 10 && (
                  <span className="text-danger ms-2">• Minimum 10 characters</span>
                )}
              </Form.Text>
            </Form.Group>

            <Alert variant="warning" className="small mb-0">
              <strong>
                <i className="bi bi-exclamation-triangle me-2"></i>
                Community Guidelines:
              </strong>
              <ul className="mb-0 mt-2">
                <li>Be respectful, kind, and supportive to all members</li>
                <li>Don't share personal medical advice - encourage professional consultation</li>
                <li>Avoid harmful, triggering, or explicit content</li>
                <li>Respect privacy - don't share personal information</li>
                <li><strong>Emergency?</strong> Call emergency services or a crisis hotline immediately</li>
              </ul>
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => setShowModal(false)} 
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              type="submit" 
              disabled={submitting || title.length < 5 || body.length < 10}
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
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-exclamation-triangle text-danger me-2"></i>
            Confirm Delete
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this post?</p>
          <Card className="bg-light border-0">
            <Card.Body>
              <strong className="text-dark">{deleteModal.postTitle}</strong>
            </Card.Body>
          </Card>
          <Alert variant="warning" className="mt-3 mb-0 small">
            <i className="bi bi-info-circle me-2"></i>
            <strong>This action cannot be undone.</strong> Your post will be permanently removed.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setDeleteModal({ show: false, postId: null, postTitle: '' })}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={confirmDelete}
          >
            <i className="bi bi-trash me-2"></i>
            Delete Post
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Custom CSS */}
      <style>{`
        .hover-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hover-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.1) !important;
        }
        .delete-btn {
          transition: all 0.2s ease;
        }
        .delete-btn:hover {
          transform: scale(1.05);
        }
      `}</style>
    </Container>
  );
}