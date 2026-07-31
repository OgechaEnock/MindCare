import React, { useEffect, useState } from "react";
import { Container, Card, Form, Button, Row, Col, Spinner, Modal, Badge, Accordion } from "react-bootstrap";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [histories, setHistories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    diagnosis: "",
    conditions: "",
    allergies: "",
    notes: ""
  });

  useEffect(() => {
    fetchMedicalHistories();
  }, []);

  const fetchMedicalHistories = async () => {
    try {
      const res = await api.get("/api/profile/medical-history");
      setHistories(res.data);
    } catch (err) {
      console.error("Fetch medical histories error:", err);
      toast.error("Failed to load medical histories");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (history = null) => {
    if (history) {
      setEditingId(history.id);
      setForm({
        diagnosis: history.diagnosis,
        conditions: history.conditions,
        allergies: history.allergies,
        notes: history.notes
      });
    } else {
      setEditingId(null);
      setForm({
        diagnosis: "",
        conditions: "",
        allergies: "",
        notes: ""
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm({
      diagnosis: "",
      conditions: "",
      allergies: "",
      notes: ""
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.diagnosis && !form.conditions && !form.allergies && !form.notes) {
      toast.error("Please fill at least one field");
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        await api.put(`/api/profile/medical-history/${editingId}`, form);
        toast.success("Medical history updated successfully");
      } else {
        await api.post("/api/profile/medical-history", form);
        toast.success("Medical history added successfully");
      }
      
      handleCloseModal();
      fetchMedicalHistories();
    } catch (err) {
      console.error("Save medical history error:", err);
      toast.error(err.response?.data?.error || "Failed to save medical history");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this medical history entry?")) {
      return;
    }

    try {
      await api.delete(`/api/profile/medical-history/${id}`);
      toast.success("Medical history deleted");
      fetchMedicalHistories();
    } catch (err) {
      console.error("Delete medical history error:", err);
      toast.error("Failed to delete medical history");
    }
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Container className="mt-4 text-center py-5">
        <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
        <p className="mt-3 text-muted">Loading profile...</p>
      </Container>
    );
  }

  return (
    <Container className="mt-4 mb-5">
      {/* Page Header */}
      <div className="mc-section-title">
        <h2 className="mb-0">
          <i className="bi bi-person-circle me-2 text-primary"></i>
          Profile & Medical History
        </h2>
        <p className="text-muted mb-0 mt-1">Manage your personal health information</p>
      </div>

      <Row>
        {/* User Profile Card */}
        <Col md={4} className="mb-4">
          <Card className="mb-4 border-0 shadow-sm" style={{ borderRadius: 'var(--mc-radius-xl)' }}>
            <Card.Body className="text-center p-4">
              <div className="mb-3">
                <div 
                  className="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3 mx-auto shadow-sm"
                  style={{ width: '90px', height: '90px', fontSize: '2.5rem', color: 'white' }}
                >
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <h4 className="mt-2 mb-1 fw-bold">{user?.name}</h4>
                <p className="text-muted mb-0">{user?.email}</p>
              </div>
              <hr className="my-4" />
              <div className="text-start">
                <p className="mb-3">
                  <i className="bi bi-shield-lock text-success me-2 fs-5"></i>
                  <span>All data is encrypted</span>
                </p>
                <p className="mb-3">
                  <i className="bi bi-calendar text-info me-2 fs-5"></i>
                  <span>Member since {new Date().getFullYear()}</span>
                </p>
                <p className="mb-0">
                  <i className="bi bi-clipboard2-pulse text-warning me-2 fs-5"></i>
                  <span>{histories.length} medical {histories.length === 1 ? 'entry' : 'entries'}</span>
                </p>
              </div>
            </Card.Body>
          </Card>

          {/* Latest Medical History Summary */}
          {histories.length > 0 && (
            <Card className="border-0 shadow-sm" style={{ borderRadius: 'var(--mc-radius-xl)' }}>
              <Card.Header className="border-0 py-3" style={{ 
                background: 'linear-gradient(135deg, var(--mc-warning) 0%, var(--mc-accent-500) 100%)'
              }}>
                <h6 className="mb-0 text-white fw-bold">
                  <i className="bi bi-clipboard2-pulse me-2"></i>
                  Latest Medical History
                </h6>
              </Card.Header>
              <Card.Body className="p-4">
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Diagnosis</small>
                  <p className="mb-0 small">
                    {histories[0].diagnosis ? (
                      histories[0].diagnosis.substring(0, 100) + (histories[0].diagnosis.length > 100 ? "..." : "")
                    ) : (
                      <span className="text-muted fst-italic">Not provided</span>
                    )}
                  </p>
                </div>
                
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Conditions</small>
                  <p className="mb-0 small">
                    {histories[0].conditions ? (
                      histories[0].conditions.substring(0, 100) + (histories[0].conditions.length > 100 ? "..." : "")
                    ) : (
                      <span className="text-muted fst-italic">Not provided</span>
                    )}
                  </p>
                </div>
                
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Allergies</small>
                  <p className="mb-0 small">
                    {histories[0].allergies ? (
                      <span className="text-danger fw-bold">{histories[0].allergies}</span>
                    ) : (
                      <span className="text-muted fst-italic">None reported</span>
                    )}
                  </p>
                </div>

                <div className="text-center pt-3 border-top">
                  <small className="text-muted">
                    <i className="bi bi-clock-history me-1"></i>
                    {formatDate(histories[0].created_at)}
                  </small>
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>

        {/* Medical History Timeline */}
        <Col md={8}>
          <Card className="border-0 shadow-sm" style={{ borderRadius: 'var(--mc-radius-xl)' }}>
            <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-clock-history me-2 text-primary"></i>
                Medical History Timeline
              </h5>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => handleOpenModal()}
                className="rounded-pill px-3"
              >
                <i className="bi bi-plus-circle me-1"></i>
                Add Entry
              </Button>
            </Card.Header>
            <Card.Body className="p-4">
              {histories.length === 0 ? (
                <div className="mc-empty-state">
                  <i className="bi bi-clipboard2-pulse mc-empty-icon"></i>
                  <h5 className="mc-empty-title">No medical history yet</h5>
                  <p className="mc-empty-text">Start tracking your medical information</p>
                  <Button 
                    variant="primary" 
                    onClick={() => handleOpenModal()}
                    className="rounded-pill px-4"
                  >
                    <i className="bi bi-plus-circle me-1"></i>
                    Add First Entry
                  </Button>
                </div>
              ) : (
                <Accordion defaultActiveKey="0">
                  {histories.map((history, index) => (
                    <Accordion.Item eventKey={index.toString()} key={history.id} className="mb-3 border-0 shadow-sm" style={{ borderRadius: 'var(--mc-radius-lg)' }}>
                      <Accordion.Header className="rounded-3">
                        <div className="d-flex justify-content-between align-items-center w-100 me-3">
                          <div>
                            <strong>Entry #{histories.length - index}</strong>
                            <small className="text-muted ms-3 d-block d-md-inline">
                              <i className="bi bi-calendar me-1"></i>
                              {formatDate(history.created_at)}
                            </small>
                          </div>
                          {index === 0 && (
                            <Badge bg="success" className="ms-2 rounded-pill">Latest</Badge>
                          )}
                        </div>
                      </Accordion.Header>
                      <Accordion.Body>
                        <div className="mb-3">
                          <strong className="d-block mb-2">
                            <i className="bi bi-clipboard-pulse me-2 text-primary"></i>
                            Diagnosis:
                          </strong>
                          <p className="ms-4 mb-0">
                            {history.diagnosis || <span className="text-muted fst-italic">Not provided</span>}
                          </p>
                        </div>

                        <div className="mb-3">
                          <strong className="d-block mb-2">
                            <i className="bi bi-heart-pulse me-2 text-info"></i>
                            Conditions:
                          </strong>
                          <p className="ms-4 mb-0">
                            {history.conditions || <span className="text-muted fst-italic">Not provided</span>}
                          </p>
                        </div>

                        <div className="mb-3">
                          <strong className="d-block mb-2">
                            <i className="bi bi-exclamation-triangle me-2" style={{ color: 'var(--mc-danger)' }}></i>
                            Allergies:
                          </strong>
                          <p className="ms-4 mb-0">
                            {history.allergies ? (
                              <span className="text-danger fw-bold">{history.allergies}</span>
                            ) : (
                              <span className="text-muted fst-italic">None reported</span>
                            )}
                          </p>
                        </div>

                        <div className="mb-3">
                          <strong className="d-block mb-2">
                            <i className="bi bi-journal-text me-2 text-secondary"></i>
                            Notes:
                          </strong>
                          <p className="ms-4 mb-0">
                            {history.notes || <span className="text-muted fst-italic">No additional notes</span>}
                          </p>
                        </div>

                        <hr className="my-4" />

                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">
                            <i className="bi bi-clock me-1"></i>
                            Last updated: {formatDate(history.updated_at)}
                          </small>
                          <div>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2 rounded-pill"
                              onClick={() => handleOpenModal(history)}
                            >
                              <i className="bi bi-pencil me-1"></i>
                              Edit
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="rounded-pill"
                              onClick={() => handleDelete(history.id)}
                            >
                              <i className="bi bi-trash me-1"></i>
                              Delete
                            </Button>
                          </div>
                        </div>
                      </Accordion.Body>
                    </Accordion.Item>
                  ))}
                </Accordion>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">
            <i className="bi bi-clipboard2-pulse me-2 text-primary"></i>
            {editingId ? "Edit Medical History" : "Add Medical History"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="pt-3">
            <div className="alert alert-info small mb-4 rounded-3">
              <i className="bi bi-info-circle me-2"></i>
              This information is encrypted and only visible to you.
              Fill in any fields that are relevant to your current health status.
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">
                <i className="bi bi-clipboard-pulse me-2"></i>Diagnosis
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="diagnosis"
                placeholder="Enter any diagnoses..."
                value={form.diagnosis}
                onChange={handleChange}
                className="rounded-3"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">
                <i className="bi bi-heart-pulse me-2"></i>Medical Conditions
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="conditions"
                placeholder="List any ongoing medical conditions..."
                value={form.conditions}
                onChange={handleChange}
                className="rounded-3"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">
                <i className="bi bi-exclamation-triangle me-2" style={{ color: 'var(--mc-danger)' }}></i>Allergies
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="allergies"
                placeholder="List any allergies (very important!)..."
                value={form.allergies}
                onChange={handleChange}
                className="rounded-3"
              />
              <Form.Text className="text-danger">
                <i className="bi bi-info-circle me-1"></i>
                This information is critical for your safety
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">
                <i className="bi bi-journal-text me-2"></i>Additional Notes
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="notes"
                placeholder="Any additional medical notes, symptoms, or observations..."
                value={form.notes}
                onChange={handleChange}
                className="rounded-3"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button 
              variant="outline-secondary" 
              onClick={handleCloseModal} 
              disabled={saving}
              className="rounded-pill px-4"
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              type="submit" 
              disabled={saving}
              className="rounded-pill px-4"
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Saving...
                </>
              ) : (
                <>
                  <i className="bi bi-save me-2"></i>
                  {editingId ? "Update Entry" : "Add Entry"}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}

export default Profile;