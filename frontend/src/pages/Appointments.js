import React, { useEffect, useState } from "react";
import { Container, Table, Button, Form, Card, Modal, Spinner, Badge } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "../services/api";

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    appointment_date: "",
    appointment_time: "",
    notes: "",
    reminder24h: true,
    reminder1h: true
  });

  useEffect(() => {
    fetchAppointments();
    requestNotificationPermission(); // ✅ Request permission on load
  }, []);

  // ✅ Request browser notification permission
  const requestNotificationPermission = () => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          toast.success("Notifications enabled!");
        }
      });
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await api.get("/api/appointments");
      setAppointments(res.data);
    } catch (err) {
      console.error("Fetch appointments error:", err);
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.appointment_date || !form.appointment_time) {
      toast.error("Title, date, and time are required");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/appointments", form);
      toast.success("Appointment added successfully");
      setForm({ 
        title: "", 
        appointment_date: "", 
        appointment_time: "", 
        notes: "",
        reminder24h: true,
        reminder1h: true
      });
      setShowModal(false);
      fetchAppointments();
    } catch (err) {
      console.error("Add appointment error:", err);
      toast.error(err.response?.data?.error || "Failed to add appointment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this appointment?")) return;

    try {
      await api.delete(`/api/appointments/${id}`);
      toast.success("Appointment deleted");
      fetchAppointments();
    } catch (err) {
      console.error("Delete appointment error:", err);
      toast.error("Failed to delete appointment");
    }
  };

  if (loading) {
    return (
      <Container className="mt-4 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Loading appointments...</p>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2><i className="bi bi-calendar-event me-2"></i>Your Appointments</h2>
          <p className="text-muted">Manage your healthcare appointments with reminders</p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-circle me-2"></i>Add Appointment
        </Button>
      </div>

      {/* ✅ Notification permission alert */}
      {Notification.permission === "default" && (
        <Card className="mb-3 border-warning">
          <Card.Body>
            <i className="bi bi-bell text-warning me-2"></i>
            <strong>Enable Notifications:</strong> Allow notifications to receive appointment reminders.
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

      {appointments.length === 0 ? (
        <Card className="text-center p-5">
          <i className="bi bi-calendar-event text-muted" style={{ fontSize: "3rem" }}></i>
          <h4 className="mt-3">No appointments scheduled</h4>
          <p className="text-muted">Schedule your first appointment</p>
          <Button variant="primary" onClick={() => setShowModal(true)}>Add First Appointment</Button>
        </Card>
      ) : (
        <Table striped bordered hover responsive>
          <thead className="table-dark">
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Time</th>
              <th>Notes</th>
              <th>Reminders</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((apt) => (
              <tr key={apt.id}>
                <td><strong>{apt.title}</strong></td>
                <td>{new Date(apt.appointment_date).toLocaleDateString()}</td>
                <td>{apt.appointment_time}</td>
                <td>{apt.notes || "-"}</td>
                <td>
                  {apt.reminder_24h && (
                    <Badge bg="info" className="me-1">24h</Badge>
                  )}
                  {apt.reminder_1h && (
                    <Badge bg="warning" text="dark">1h</Badge>
                  )}
                  {!apt.reminder_24h && !apt.reminder_1h && (
                    <Badge bg="secondary">None</Badge>
                  )}
                </td>
                <td>
                  {apt.status === "Upcoming" ? (
                    <Badge bg="success">Upcoming</Badge>
                  ) : (
                    <Badge bg="secondary">Past</Badge>
                  )}
                </td>
                <td>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(apt.id)}>
                    <i className="bi bi-trash"></i>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Add Appointment Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add New Appointment</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Appointment Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Therapy Session"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Date</Form.Label>
              <Form.Control
                type="date"
                value={form.appointment_date}
                onChange={(e) => setForm({ ...form, appointment_date: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Time</Form.Label>
              <Form.Control
                type="time"
                value={form.appointment_time}
                onChange={(e) => setForm({ ...form, appointment_time: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Notes (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Additional notes..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Form.Group>

            {/* ✅ Reminder Options */}
            <Card className="mb-3 bg-light">
              <Card.Body>
                <h6 className="mb-3">
                  <i className="bi bi-bell me-2"></i>
                  Reminder Settings
                </h6>
                <Form.Check 
                  type="checkbox"
                  id="reminder-24h"
                  label="Remind me 24 hours before"
                  checked={form.reminder24h}
                  onChange={(e) => setForm({ ...form, reminder24h: e.target.checked })}
                  className="mb-2"
                />
                <Form.Check 
                  type="checkbox"
                  id="reminder-1h"
                  label="Remind me 1 hour before"
                  checked={form.reminder1h}
                  onChange={(e) => setForm({ ...form, reminder1h: e.target.checked })}
                />
              </Card.Body>
            </Card>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>{submitting ? "Adding..." : "Add Appointment"}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}

export default Appointments;