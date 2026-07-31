import React, { useEffect, useState } from "react";
import { Container, Row, Col, Button, Form, Card, Modal, Spinner, Badge } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "../services/api";

function Medications() {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMed, setSelectedMed] = useState(null);
  const [form, setForm] = useState({ 
    name: "", 
    dosage: "", 
    frequency: "",
    reminderEnabled: false,
    reminderTimes: []
  });
  const [reminderForm, setReminderForm] = useState({
    reminderEnabled: false,
    reminderTimes: []
  });
  const [newReminderTime, setNewReminderTime] = useState("");

  useEffect(() => {
    fetchMedications();
    requestNotificationPermission(); 
  }, []);

  const requestNotificationPermission = () => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          toast.success("Notifications enabled!");
        }
      });
    }
  };

  const fetchMedications = async () => {
    try {
      const res = await api.get("/api/medications");
      setMedications(res.data);
    } catch (err) {
      console.error("Fetch medications error:", err);
      toast.error("Failed to load medications");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.name || !form.dosage || !form.frequency) {
      toast.error("All fields are required");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/api/medications", form);
      toast.success("Medication added successfully");
      setForm({ name: "", dosage: "", frequency: "", reminderEnabled: false, reminderTimes: [] });
      setShowModal(false);
      fetchMedications();
    } catch (err) {
      console.error("Add medication error:", err);
      toast.error(err.response?.data?.error || "Failed to add medication");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this medication?")) {
      return;
    }

    try {
      await api.delete(`/api/medications/${id}`);
      toast.success("Medication deleted");
      fetchMedications();
    } catch (err) {
      console.error("Delete medication error:", err);
      toast.error("Failed to delete medication");
    }
  };

  const openReminderSettings = (med) => {
    setSelectedMed(med);
    setReminderForm({
      reminderEnabled: med.reminder_enabled || false,
      reminderTimes: med.reminder_times || []
    });
    setShowReminderModal(true);
  };

  const addReminderTime = () => {
    if (!newReminderTime) {
      toast.error("Please select a time");
      return;
    }

    if (reminderForm.reminderTimes.includes(newReminderTime)) {
      toast.error("This time is already added");
      return;
    }

    setReminderForm({
      ...reminderForm,
      reminderTimes: [...reminderForm.reminderTimes, newReminderTime].sort()
    });
    setNewReminderTime("");
  };

  const removeReminderTime = (time) => {
    setReminderForm({
      ...reminderForm,
      reminderTimes: reminderForm.reminderTimes.filter(t => t !== time)
    });
  };

  const saveReminderSettings = async () => {
    try {
      await api.put(`/api/medications/${selectedMed.id}/reminders`, reminderForm);
      toast.success("Reminder settings updated!");
      setShowReminderModal(false);
      fetchMedications();
    } catch (err) {
      console.error("Update reminder error:", err);
      toast.error("Failed to update reminder settings");
    }
  };

  if (loading) {
    return (
      <Container className="mt-4 text-center py-5">
        <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
        <p className="mt-3 text-muted">Loading medications...</p>
      </Container>
    );
  }

  return (
    <Container className="mt-4 mb-5">
      {/* Page Header */}
      <div className="mc-section-title">
        <h2 className="mb-0">
          <i className="bi bi-capsule me-2 text-primary"></i>
          Your Medications
        </h2>
        <p className="text-muted mb-0 mt-1">Track your prescriptions and set reminders</p>
      </div>

      <div className="d-flex justify-content-end mb-4">
        <Button 
          variant="primary" 
          onClick={() => setShowModal(true)}
          className="rounded-pill px-4"
        >
          <i className="bi bi-plus-circle me-2"></i>
          Add Medication
        </Button>
      </div>

      {/* Notification permission alert */}
      {"Notification" in window && Notification.permission === "default" && (
        <Card className="mb-4 border-0 shadow-sm" style={{ 
          background: 'linear-gradient(135deg, var(--mc-warning) 0%, var(--mc-accent-400) 100%)',
          borderRadius: 'var(--mc-radius-lg)'
        }}>
          <Card.Body className="d-flex align-items-center py-3">
            <i className="bi bi-bell text-dark me-3 fs-4"></i>
            <div className="flex-grow-1">
              <strong>Enable Notifications:</strong> Allow notifications to receive medication reminders.
            </div>
            <Button 
              size="sm" 
              variant="dark" 
              className="rounded-pill"
              onClick={requestNotificationPermission}
            >
              Enable Now
            </Button>
          </Card.Body>
        </Card>
      )}

      {medications.length === 0 ? (
        <Card className="mc-empty-state border-0 shadow-sm" style={{ borderRadius: 'var(--mc-radius-xl)' }}>
          <Card.Body className="p-5">
            <i className="bi bi-capsule display-1 text-primary opacity-50"></i>
            <h4 className="mt-3 mb-2">No medications yet</h4>
            <p className="text-muted mb-4">Start tracking your prescriptions for better health management</p>
            <Button 
              variant="primary" 
              onClick={() => setShowModal(true)}
              size="lg"
              className="rounded-pill px-4"
            >
              <i className="bi bi-plus-circle me-2"></i>
              Add Your First Medication
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-4">
          {medications.map((med) => (
            <Col key={med.id} xl={4} lg={6} md={6} sm={12}>
              <Card className="h-100 mc-lift border-0 shadow-sm" style={{ borderRadius: 'var(--mc-radius-xl)' }}>
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="d-flex align-items-center">
                      <div className="mc-med-icon me-3">
                        <i className="bi bi-capsule-pill"></i>
                      </div>
                      <h5 className="mb-0 fw-bold">{med.name}</h5>
                    </div>
                    <Badge 
                      bg={med.reminder_enabled ? "success" : "light"} 
                      text={med.reminder_enabled ? "white" : "dark"}
                      className="rounded-pill"
                      style={med.reminder_enabled ? {} : { border: '1px solid var(--mc-bg-tertiary)' }}
                    >
                      {med.reminder_enabled ? (
                        <>
                          <i className="bi bi-bell-fill me-1"></i>
                          Reminder On
                        </>
                      ) : (
                        <>
                          <i className="bi bi-bell-slash me-1"></i>
                          No Reminder
                        </>
                      )}
                    </Badge>
                  </div>
                  
                  <div className="mb-3">
                    <small className="text-muted d-block">Dosage</small>
                    <p className="mb-2 fw-medium">{med.dosage}</p>
                  </div>
                  
                  <div className="mb-4">
                    <small className="text-muted d-block">Frequency</small>
                    <p className="mb-0">{med.frequency}</p>
                  </div>

                  {med.reminder_enabled && med.reminder_times && med.reminder_times.length > 0 && (
                    <div className="mb-3 p-3 bg-light rounded-3">
                      <small className="text-muted d-block mb-2">
                        <i className="bi bi-alarm me-1"></i>
                        Reminder Times
                      </small>
                      <div>
                        {med.reminder_times.map((time, index) => (
                          <Badge key={index} bg="info" className="me-2 mb-2 rounded-pill">
                            {time}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="d-flex gap-2 mt-auto">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="flex-grow-1 rounded-pill"
                      onClick={() => openReminderSettings(med)}
                      title="Set Reminders"
                    >
                      <i className="bi bi-bell me-1"></i>
                      Reminders
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="rounded-pill"
                      onClick={() => handleDelete(med.id)}
                    >
                      <i className="bi bi-trash"></i>
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Add Medication Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">
            <i className="bi bi-plus-circle me-2 text-primary"></i>
            Add New Medication
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="pt-3">
            <div className="alert alert-info small mb-4 rounded-3">
              <i className="bi bi-info-circle me-2"></i>
              You can set up reminders after adding the medication.
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">
                <i className="bi bi-capsule me-2"></i>Medication Name
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Sertraline"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="rounded-pill py-2 px-3"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">
                <i className="bi bi-clipboard-pulse me-2"></i>Dosage
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., 50mg"
                value={form.dosage}
                onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                required
                className="rounded-pill py-2 px-3"
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-medium">
                <i className="bi bi-calendar-week me-2"></i>Frequency
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Once daily"
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                required
                className="rounded-pill py-2 px-3"
              />
            </Form.Group>
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
              variant="primary" 
              type="submit" 
              disabled={submitting}
              className="rounded-pill px-4"
            >
              {submitting ? "Adding..." : "Add Medication"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Reminder Settings Modal */}
      <Modal show={showReminderModal} onHide={() => setShowReminderModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">
            <i className="bi bi-bell me-2 text-primary"></i>
            Reminder Settings
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          {selectedMed && (
            <>
              <h6 className="mb-3">
                <strong>{selectedMed.name}</strong>
                <small className="text-muted"> ({selectedMed.dosage})</small>
              </h6>

              <Form.Check 
                type="switch"
                id="reminder-switch"
                label="Enable Reminders"
                checked={reminderForm.reminderEnabled}
                onChange={(e) => setReminderForm({ ...reminderForm, reminderEnabled: e.target.checked })}
                className="mb-4 fs-5"
              />

              {reminderForm.reminderEnabled && (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-medium">
                      <i className="bi bi-alarm me-2"></i>Add Reminder Times
                    </Form.Label>
                    <div className="d-flex gap-2">
                      <Form.Control
                        type="time"
                        value={newReminderTime}
                        onChange={(e) => setNewReminderTime(e.target.value)}
                        className="rounded-pill flex-grow-1"
                      />
                      <Button 
                        variant="success" 
                        onClick={addReminderTime}
                        className="rounded-pill px-3"
                      >
                        <i className="bi bi-plus"></i>
                      </Button>
                    </div>
                  </Form.Group>

                  {reminderForm.reminderTimes.length > 0 && (
                    <div className="mb-3">
                      <strong className="d-block mb-2">Reminder Times:</strong>
                      <div>
                        {reminderForm.reminderTimes.map((time, index) => (
                          <Badge 
                            key={index} 
                            bg="info" 
                            className="me-2 mb-2 rounded-pill p-2"
                          >
                            <i className="bi bi-clock me-1"></i>
                            {time}
                            <Button
                              variant="link"
                              size="sm"
                              className="text-white p-0 ms-2"
                              onClick={() => removeReminderTime(time)}
                            >
                              <i className="bi bi-x-circle"></i>
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {reminderForm.reminderTimes.length === 0 && (
                    <p className="text-muted small mb-3">
                      <i className="bi bi-info-circle me-1"></i>
                      Add at least one reminder time
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button 
            variant="outline-secondary" 
            onClick={() => setShowReminderModal(false)}
            className="rounded-pill px-4"
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={saveReminderSettings}
            disabled={reminderForm.reminderEnabled && reminderForm.reminderTimes.length === 0}
            className="rounded-pill px-4"
          >
            <i className="bi bi-save me-1"></i>
            Save Reminders
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Medications;