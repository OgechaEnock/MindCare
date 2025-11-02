import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Card, Badge, Modal, Alert, Spinner } from 'react-bootstrap';
import api from '../services/api';
import { toast } from 'react-toastify';

export default function Forum() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

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
      const res = await api.post('/api/forum/threads', { title, body });

      if (res.data.status === 'approved') {
        toast.success('✅ Your post has been published!');
        setTitle('');
        setBody('');
        setShowModal(false);
        fetchThreads();
      }
    } catch (err) {
      console.error("Create thread error:", err);
      
      if (err.response?.status === 429) {
        // Rate limit error
        const retryAfter = err.response.data?.retryAfter || 2;
        toast.error(
          `⏱️ Too many requests. Please wait ${retryAfter} seconds and try again.`,
          { autoClose: 5000 }
        );
      } else if (err.response?.status === 403) {
        // Post rejected by moderation
        const categories = err.response.data.categories || [];
        toast.error(
          `🚫 Post rejected by moderation. ${
            categories.length > 0 ? `Flagged: ${categories.join(', ')}` : ''
          }`,
          { autoClose: 5000 }
        );
      } else if (err.response?.status === 503) {
        // Moderation service unavailable
        toast.error(
          '⚠️ Moderation service unavailable. The LLM API may be down. Please try again later.',
          { autoClose: 6000 }
        );
      } else {
        toast.error(err.response?.data?.error || 'Failed to post');
      }
    } finally {
      setSubmitting(false);
    }
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
    return date.toLocaleDateString();
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
    <Container className="mt-4">
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

      <Alert variant="warning" className="mb-4">
        <i className="bi bi-shield-check me-2"></i>
        <strong>AI Moderation Active:</strong> All posts are automatically checked for safety 
        before being published. Posts with harmful content will be rejected.
      </Alert>

      {threads.length === 0 ? (
        <Card className="text-center p-5">
          <i className="bi bi-chat-square-text text-muted" style={{ fontSize: "3rem" }}></i>
          <h4 className="mt-3">No threads yet</h4>
          <p className="text-muted">Be the first to start a conversation!</p>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            Create First Thread
          </Button>
        </Card>
      ) : (
        <div>
          {threads.map((thread) => (
            <Card key={thread.id} className="mb-3 shadow-sm">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <h5 className="mb-2">{thread.title || "Forum Post"}</h5>
                    <p className="text-muted mb-2">{thread.body}</p>
                    <div className="text-muted small">
                      <i className="bi bi-person me-1"></i>
                      {thread.author_name || "Anonymous"}
                      <span className="mx-2">•</span>
                      <i className="bi bi-clock me-1"></i>
                      {formatDate(thread.created_at)}
                    </div>
                  </div>
                  <Badge bg="success">
                    <i className="bi bi-check-circle me-1"></i>
                    {thread.status}
                  </Badge>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      {/* Create Thread Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create New Thread</Modal.Title>
        </Modal.Header>
        <Form onSubmit={createThread}>
          <Modal.Body>
            <Alert variant="info" className="small">
              <i className="bi bi-info-circle me-2"></i>
              Your post will be checked by AI moderation before publishing. 
              Please follow community guidelines.
            </Alert>

            <Form.Group className="mb-3">
              <Form.Label>Thread Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter a descriptive title (min 5 characters)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
              />
              <Form.Text className="text-muted">
                {title.length}/200 characters
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Content</Form.Label>
              <Form.Control
                as="textarea"
                rows={6}
                placeholder="Share your thoughts (min 10 characters)"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </Form.Group>

            <Alert variant="warning" className="small mb-0">
              <strong>Community Guidelines:</strong>
              <ul className="mb-0 mt-2">
                <li>Be respectful and supportive</li>
                <li>Don't share personal medical advice</li>
                <li>Avoid harmful or triggering content</li>
                <li>This is not for emergency situations</li>
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
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Moderating & Posting...
                </>
              ) : (
                'Create Thread'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}