import React, { useEffect, useState } from "react";
import { Container, Table, Button, Form, Card, Modal, Spinner, Badge } from "react-bootstrap";
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

  // Request browser notification permission
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

  //  Open reminder settings modal
  const openReminderSettings = (med) => {
    setSelectedMed(med);
    setReminderForm({
      reminderEnabled: med.reminder_enabled || false,
      reminderTimes: med.reminder_times || []
    });
    setShowReminderModal(true);
  };

  //  Add reminder time
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

  // Remove reminder time
  const removeReminderTime = (time) => {
    setReminderForm({
      ...reminderForm,
      reminderTimes: reminderForm.reminderTimes.filter(t => t !== time)
    });
  };

  // Save reminder settings
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
      <Container className="mt-4 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Loading medications...</p>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>
            <i className="bi bi-capsule me-2"></i>
            Your Medications
          </h2>
          <p className="text-muted">Track your medications and set reminders</p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-circle me-2"></i>
          Add Medication
        </Button>
      </div>

      {/*  Notification permission alert */}
      {Notification.permission === "default" && (
        <Card className="mb-3 border-warning">
          <Card.Body>
            <i className="bi bi-bell text-warning me-2"></i>
            <strong>Enable Notifications:</strong> Allow notifications to receive medication reminders.
            <Button 
              size="sm" 
              variant="warning" 
              className="ms-3"
              onClick={requestNotificationPermission}
            >
              Enable Now
            </Button>
          </Card.Body>
        </Card>
      )}

      {medications.length === 0 ? (
        <Card className="text-center p-5">
          <i className="bi bi-capsule text-muted" style={{ fontSize: "3rem" }}></i>
          <h4 className="mt-3">No medications yet</h4>
          <p className="text-muted">Start tracking your medications</p>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            Add First Medication
          </Button>
        </Card>
      ) : (
        <Table striped bordered hover responsive>
          <thead className="table-dark">
            <tr>
              <th>Medication</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Reminders</th>
              <th>Added</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {medications.map((med) => (
              <tr key={med.id}>
                <td><strong>{med.name}</strong></td>
                <td>{med.dosage}</td>
                <td>{med.frequency}</td>
                <td>
                  {med.reminder_enabled ? (
                    <Badge bg="success">
                      <i className="bi bi-bell-fill me-1"></i>
                      {med.reminder_times?.length || 0} time(s)
                    </Badge>
                  ) : (
                    <Badge bg="secondary">Off</Badge>
                  )}
                </td>
                <td>{new Date(med.created_at).toLocaleDateString()}</td>
                <td>
                  <Button
                    variant="info"
                    size="sm"
                    className="me-2"
                    onClick={() => openReminderSettings(med)}
                    title="Set Reminders"
                  >
                    <i className="bi bi-bell"></i>
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(med.id)}
                  >
                    <i className="bi bi-trash"></i>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Add Medication Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Medication</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Medication Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Ibuprofen"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Dosage</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., 200mg"
                value={form.dosage}
                onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Frequency</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Twice daily"
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                required
              />
            </Form.Group>

            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              You can set up reminders after adding the medication
            </small>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? "Adding..." : "Add Medication"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/*  Reminder Settings Modal */}
      <Modal show={showReminderModal} onHide={() => setShowReminderModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-bell me-2"></i>
            Reminder Settings
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedMed && (
            <>
              <h6 className="mb-3">
                <strong>{selectedMed.name}</strong> ({selectedMed.dosage})
              </h6>

              <Form.Check 
                type="switch"
                id="reminder-switch"
                label="Enable Reminders"
                checked={reminderForm.reminderEnabled}
                onChange={(e) => setReminderForm({ ...reminderForm, reminderEnabled: e.target.checked })}
                className="mb-3"
              />

              {reminderForm.reminderEnabled && (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label>Add Reminder Times</Form.Label>
                    <div className="d-flex gap-2">
                      <Form.Control
                        type="time"
                        value={newReminderTime}
                        onChange={(e) => setNewReminderTime(e.target.value)}
                      />
                      <Button variant="success" onClick={addReminderTime}>
                        <i className="bi bi-plus"></i>
                      </Button>
                    </div>
                  </Form.Group>

                  {reminderForm.reminderTimes.length > 0 && (
                    <div>
                      <strong>Reminder Times:</strong>
                      <div className="mt-2">
                        {reminderForm.reminderTimes.map((time, index) => (
                          <Badge 
                            key={index} 
                            bg="info" 
                            className="me-2 mb-2 p-2"
                            style={{ fontSize: "0.9rem" }}
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
                    <p className="text-muted small">
                      <i className="bi bi-info-circle me-1"></i>
                      Add at least one reminder time
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReminderModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={saveReminderSettings}
            disabled={reminderForm.reminderEnabled && reminderForm.reminderTimes.length === 0}
          >
            Save Reminders
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Medications;