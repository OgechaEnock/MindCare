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
      <Container className="mt-4 text-center py-5">
        <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
        <p className="mt-3 text-muted">Loading appointments...</p>
      </Container>
    );
  }

  // Group appointments by status
  const upcomingAppointments = appointments.filter(apt => apt.status === 'Upcoming');
  const pastAppointments = appointments.filter(apt => apt.status !== 'Upcoming');

  return (
    <Container className="mt-4 mb-5">
      {/* Page Header */}
      <div className="mc-section-title d-flex justify-content-between align-items-end">
        <div>
          <h2 className="mb-0">
            <i className="bi bi-calendar-event me-2 text-success"></i>
            Your Appointments
          </h2>
          <p className="text-muted mb-0 mt-1">Manage your healthcare visits and reminders</p>
        </div>
        <Button 
          variant="success" 
          onClick={() => setShowModal(true)}
          className="rounded-pill px-4"
        >
          <i className="bi bi-plus-circle me-2"></i>
          Add Appointment
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
              <strong>Enable Notifications:</strong> Allow notifications to receive appointment reminders.
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

      {appointments.length === 0 ? (
        <Card className="mc-empty-state border-0 shadow-sm" style={{ borderRadius: 'var(--mc-radius-xl)' }}>
          <Card.Body className="p-5">
            <i className="bi bi-calendar-event display-1 text-success opacity-50"></i>
            <h4 className="mt-3 mb-2">No appointments scheduled</h4>
            <p className="text-muted mb-4">Start scheduling your healthcare visits</p>
            <Button 
              variant="success" 
              onClick={() => setShowModal(true)}
              size="lg"
              className="rounded-pill px-4"
            >
              <i className="bi bi-calendar-plus me-2"></i>
              Schedule First Appointment
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <>
          {/* Upcoming Appointments */}
          {upcomingAppointments.length > 0 && (
            <Card className="mb-4 border-0 shadow-sm" style={{ borderRadius: 'var(--mc-radius-xl)' }}>
              <Card.Header className="bg-white border-bottom py-3">
                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-calendar-check me-2 text-success"></i>
                  Upcoming ({upcomingAppointments.length})
                </h5>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-responsive-xl">
                  <Table responsive hover className="mb-0 d-none d-md-table">
                    <thead className="table-light">
                      <tr>
                        <th>Title</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Notes</th>
                        <th>Reminders</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingAppointments.map((apt) => (
                        <tr key={apt.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <i className="bi bi-calendar-event text-success me-2"></i>
                              <strong>{apt.title}</strong>
                            </div>
                          </td>
                          <td>{new Date(apt.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                          <td>{apt.appointment_time}</td>
                          <td>{apt.notes || "-"}</td>
                          <td>
                            {apt.reminder_24h && (
                              <Badge bg="info" className="me-1 rounded-pill">24h</Badge>
                            )}
                            {apt.reminder_1h && (
                              <Badge bg="warning" text="dark" className="rounded-pill">1h</Badge>
                            )}
                            {!apt.reminder_24h && !apt.reminder_1h && (
                              <Badge bg="secondary" className="rounded-pill">None</Badge>
                            )}
                          </td>
                          <td>
                            <Button 
                              variant="outline-danger" 
                              size="sm" 
                              onClick={() => handleDelete(apt.id)}
                              className="rounded-pill"
                            >
                              <i className="bi bi-trash me-1"></i>
                              Cancel
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  {/* Mobile card view */}
                  <div className="d-md-none">
                    {upcomingAppointments.map((apt) => (
                      <div key={apt.id} className="p-3 border-bottom">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="d-flex align-items-center">
                            <i className="bi bi-calendar-event text-success me-2"></i>
                            <strong>{apt.title}</strong>
                          </div>
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            onClick={() => handleDelete(apt.id)}
                            className="rounded-pill ms-2 flex-shrink-0"
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </div>
                        <div className="small text-muted mb-1">
                          <i className="bi bi-calendar me-1"></i>
                          {new Date(apt.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          <span className="mx-2">•</span>
                          <i className="bi bi-clock me-1"></i>
                          {apt.appointment_time}
                        </div>
                        {apt.notes && (
                          <div className="small text-muted mb-2">
                            <i className="bi bi-journal-text me-1"></i>
                            {apt.notes}
                          </div>
                        )}
                        <div>
                          {apt.reminder_24h && (
                            <Badge bg="info" className="me-1 rounded-pill">24h reminder</Badge>
                          )}
                          {apt.reminder_1h && (
                            <Badge bg="warning" text="dark" className="rounded-pill">1h reminder</Badge>
                          )}
                          {!apt.reminder_24h && !apt.reminder_1h && (
                            <Badge bg="secondary" className="rounded-pill">No reminders</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Past Appointments */}
          {pastAppointments.length > 0 && (
            <Card className="border-0 shadow-sm" style={{ borderRadius: 'var(--mc-radius-xl)' }}>
              <Card.Header className="bg-white border-bottom py-3">
                <h5 className="mb-0 fw-bold text-muted">
                  <i className="bi bi-calendar-x me-2"></i>
                  Past Appointments ({pastAppointments.length})
                </h5>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-responsive-xl">
                  <Table responsive hover className="mb-0 d-none d-md-table">
                    <thead className="table-light">
                      <tr>
                        <th>Title</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Notes</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastAppointments.slice(0, 5).map((apt) => (
                        <tr key={apt.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <i className="bi bi-calendar-check text-muted me-2"></i>
                              {apt.title}
                            </div>
                          </td>
                          <td className="text-muted">{new Date(apt.appointment_date).toLocaleDateString()}</td>
                          <td className="text-muted">{apt.appointment_time}</td>
                          <td className="text-muted">{apt.notes || "-"}</td>
                          <td>
                            <Button 
                              variant="outline-danger" 
                              size="sm" 
                              onClick={() => handleDelete(apt.id)}
                              className="rounded-pill"
                            >
                              <i className="bi bi-trash"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  {/* Mobile card view for past appointments */}
                  <div className="d-md-none">
                    {pastAppointments.slice(0, 5).map((apt) => (
                      <div key={apt.id} className="p-3 border-bottom">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="d-flex align-items-center">
                            <i className="bi bi-calendar-check text-muted me-2"></i>
                            <span className="text-muted">{apt.title}</span>
                          </div>
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            onClick={() => handleDelete(apt.id)}
                            className="rounded-pill ms-2 flex-shrink-0"
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </div>
                        <div className="small text-muted">
                          <i className="bi bi-calendar me-1"></i>
                          {new Date(apt.appointment_date).toLocaleDateString()}
                          <span className="mx-2">•</span>
                          <i className="bi bi-clock me-1"></i>
                          {apt.appointment_time}
                        </div>
                        {apt.notes && (
                          <div className="small text-muted mt-1">
                            <i className="bi bi-journal-text me-1"></i>
                            {apt.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {pastAppointments.length > 5 && (
                  <div className="text-center py-3">
                    <small className="text-muted">
                      + {pastAppointments.length - 5} more past appointments
                    </small>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}
        </>
      )}

      {/* Add Appointment Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">
            <i className="bi bi-calendar-plus me-2 text-success"></i>
            Schedule New Appointment
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="pt-3">
            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">
                <i className="bi bi-bookmark me-2"></i>Appointment Title
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Therapy Session, Doctor Visit"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                className="rounded-pill py-2 px-3"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">
                <i className="bi bi-calendar me-2"></i>Date
              </Form.Label>
              <Form.Control
                type="date"
                value={form.appointment_date}
                onChange={(e) => setForm({ ...form, appointment_date: e.target.value })}
                required
                min={new Date().toISOString().split('T')[0]}
                className="rounded-pill py-2 px-3"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">
                <i className="bi bi-clock me-2"></i>Time
              </Form.Label>
              <Form.Control
                type="time"
                value={form.appointment_time}
                onChange={(e) => setForm({ ...form, appointment_time: e.target.value })}
                required
                className="rounded-pill py-2 px-3"
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-medium">
                <i className="bi bi-journal-text me-2"></i>Notes (Optional)
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Additional notes..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="rounded-3"
              />
            </Form.Group>

            {/* Reminder Options */}
            <Card className="mb-0 bg-light border-0 shadow-sm">
              <Card.Body className="p-3">
                <h6 className="mb-3 fw-bold">
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
              variant="success" 
              type="submit" 
              disabled={submitting}
              className="rounded-pill px-4"
            >
              {submitting ? "Scheduling..." : "Schedule Appointment"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}

export default Appointments;