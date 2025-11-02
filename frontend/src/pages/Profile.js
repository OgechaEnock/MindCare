import React, { useEffect, useState } from "react";
import { Container, Card, Form, Button, Row, Col, Spinner, Modal, ListGroup, Badge, Accordion } from "react-bootstrap";
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
      // Edit existing
      setEditingId(history.id);
      setForm({
        diagnosis: history.diagnosis,
        conditions: history.conditions,
        allergies: history.allergies,
        notes: history.notes
      });
    } else {
      // Add new
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

    // Validate at least one field
    if (!form.diagnosis && !form.conditions && !form.allergies && !form.notes) {
      toast.error("Please fill at least one field");
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        // Update existing
        await api.put(`/api/profile/medical-history/${editingId}`, form);
        toast.success("Medical history updated successfully");
      } else {
        // Add new
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
      <Container className="mt-4 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Loading profile...</p>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>
            <i className="bi bi-person-circle me-2"></i>
            Profile & Medical History
          </h2>
          <p className="text-muted">Manage your personal health information</p>
        </div>
        <Button variant="primary" onClick={() => handleOpenModal()}>
          <i className="bi bi-plus-circle me-2"></i>
          Add Medical History
        </Button>
      </div>

      <Row>
        {/* User Profile Card */}
        <Col md={4}>
          <Card className="mb-4 shadow-sm">
            <Card.Body className="text-center">
              <i className="bi bi-person-circle text-primary" style={{ fontSize: "5rem" }}></i>
              <h4 className="mt-3">{user?.name}</h4>
              <p className="text-muted">{user?.email}</p>
              <hr />
              <div className="text-start">
                <p className="mb-2">
                  <i className="bi bi-shield-lock me-2 text-success"></i>
                  <small>All data is encrypted</small>
                </p>
                <p className="mb-2">
                  <i className="bi bi-calendar me-2 text-info"></i>
                  <small>Member since {new Date().getFullYear()}</small>
                </p>
                <p className="mb-0">
                  <i className="bi bi-clipboard2-pulse me-2 text-warning"></i>
                  <small>{histories.length} medical {histories.length === 1 ? 'entry' : 'entries'}</small>
                </p>
              </div>
            </Card.Body>
          </Card>

          {/* Latest Medical History Summary */}
          {histories.length > 0 && (
            <Card className="mb-4 border-info shadow-sm">
              <Card.Header className="bg-info text-white">
                <h6 className="mb-0">
                  <i className="bi bi-clipboard2-pulse me-2"></i>
                  Latest Medical History
                </h6>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Diagnosis</small>
                  <p className="mb-0">
                    {histories[0].diagnosis ? (
                      <small>{histories[0].diagnosis.substring(0, 100)}{histories[0].diagnosis.length > 100 ? "..." : ""}</small>
                    ) : (
                      <small className="text-muted fst-italic">Not provided</small>
                    )}
                  </p>
                </div>
                
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Conditions</small>
                  <p className="mb-0">
                    {histories[0].conditions ? (
                      <small>{histories[0].conditions.substring(0, 100)}{histories[0].conditions.length > 100 ? "..." : ""}</small>
                    ) : (
                      <small className="text-muted fst-italic">Not provided</small>
                    )}
                  </p>
                </div>
                
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Allergies</small>
                  <p className="mb-0">
                    {histories[0].allergies ? (
                      <small className="text-danger fw-bold">{histories[0].allergies}</small>
                    ) : (
                      <small className="text-muted fst-italic">None reported</small>
                    )}
                  </p>
                </div>

                <div className="text-center mt-3 pt-3 border-top">
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
          <Card className="shadow-sm">
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Medical History Timeline
              </h5>
            </Card.Header>
            <Card.Body>
              {histories.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-clipboard2-pulse text-muted" style={{ fontSize: "3rem" }}></i>
                  <h5 className="mt-3">No medical history yet</h5>
                  <p className="text-muted">Start tracking your medical information</p>
                  <Button variant="primary" onClick={() => handleOpenModal()}>
                    <i className="bi bi-plus-circle me-2"></i>
                    Add First Entry
                  </Button>
                </div>
              ) : (
                <Accordion defaultActiveKey="0">
                  {histories.map((history, index) => (
                    <Accordion.Item eventKey={index.toString()} key={history.id}>
                      <Accordion.Header>
                        <div className="d-flex justify-content-between align-items-center w-100 me-3">
                          <div>
                            <strong>Entry #{histories.length - index}</strong>
                            <small className="text-muted ms-3">
                              <i className="bi bi-calendar me-1"></i>
                              {formatDate(history.created_at)}
                            </small>
                          </div>
                          {index === 0 && (
                            <Badge bg="success" className="ms-2">Latest</Badge>
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
                            <i className="bi bi-exclamation-triangle me-2 text-danger"></i>
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

                        <hr />

                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">
                            <i className="bi bi-clock me-1"></i>
                            Last updated: {formatDate(history.updated_at)}
                          </small>
                          <div>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                              onClick={() => handleOpenModal(history)}
                            >
                              <i className="bi bi-pencil me-1"></i>
                              Edit
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
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
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-clipboard2-pulse me-2"></i>
            {editingId ? "Edit Medical History" : "Add Medical History"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <div className="alert alert-info small mb-4">
              <i className="bi bi-info-circle me-2"></i>
              This information is encrypted and only visible to you. 
              Fill in any fields that are relevant to your current health status.
            </div>

            <Form.Group className="mb-3">
              <Form.Label>
                <i className="bi bi-clipboard-pulse me-2"></i>
                Diagnosis
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="diagnosis"
                placeholder="Enter any diagnoses..."
                value={form.diagnosis}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                <i className="bi bi-heart-pulse me-2"></i>
                Medical Conditions
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="conditions"
                placeholder="List any ongoing medical conditions..."
                value={form.conditions}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                <i className="bi bi-exclamation-triangle me-2 text-danger"></i>
                Allergies
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="allergies"
                placeholder="List any allergies (very important!)..."
                value={form.allergies}
                onChange={handleChange}
              />
              <Form.Text className="text-danger">
                <i className="bi bi-info-circle me-1"></i>
                This information is critical for your safety
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                <i className="bi bi-journal-text me-2"></i>
                Additional Notes
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="notes"
                placeholder="Any additional medical notes, symptoms, or observations..."
                value={form.notes}
                onChange={handleChange}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
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