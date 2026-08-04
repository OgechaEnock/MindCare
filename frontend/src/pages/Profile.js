import React, { useEffect, useState } from "react";
import { Container, Card, Form, Button, Row, Col, Spinner, Modal, Badge, Accordion } from "react-bootstrap";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingEmergency, setEditingEmergency] = useState(false);
  const [histories, setHistories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    diagnosis: "",
    conditions: "",
    allergies: "",
    notes: ""
  });

  // Personal info form state
  const [personalForm, setPersonalForm] = useState({
    name: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    address: "",
    bio: ""
  });

  // Emergency contact form state
  const [emergencyForm, setEmergencyForm] = useState({
    emergency_contact_name: "",
    emergency_contact_relationship: "",
    emergency_contact_phone: "",
    emergency_contact_alt_phone: "",
    emergency_contact_email: ""
  });

  useEffect(() => {
    fetchProfile();
    fetchMedicalHistories();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/api/profile");
      setProfileData(res.data);
      setPersonalForm({
        name: res.data.name || "",
        phone: res.data.phone || "",
        date_of_birth: res.data.date_of_birth || "",
        gender: res.data.gender || "",
        address: res.data.address || "",
        bio: res.data.bio || ""
      });
      setEmergencyForm({
        emergency_contact_name: res.data.emergency_contact?.name || "",
        emergency_contact_relationship: res.data.emergency_contact?.relationship || "",
        emergency_contact_phone: res.data.emergency_contact?.phone || "",
        emergency_contact_alt_phone: res.data.emergency_contact?.alt_phone || "",
        emergency_contact_email: res.data.emergency_contact?.email || ""
      });
    } catch (err) {
      console.error("Fetch profile error:", err);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicalHistories = async () => {
    try {
      const res = await api.get("/api/profile/medical-history");
      setHistories(res.data);
    } catch (err) {
      console.error("Fetch medical histories error:", err);
      toast.error("Failed to load medical histories");
    }
  };

  const handlePersonalSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Convert empty strings to null for optional fields
    const payload = {};
    for (const [key, value] of Object.entries(personalForm)) {
      if (value === "" || value === undefined) {
        payload[key] = null;
      } else {
        payload[key] = value;
      }
    }

    try {
      await api.put("/api/profile", payload);
      toast.success("Profile updated successfully");
      setEditingPersonal(false);
      fetchProfile();
    } catch (err) {
      console.error("Update profile error:", err);
      toast.error(err.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleEmergencySubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Convert empty strings to null for optional fields
    const payload = {};
    for (const [key, value] of Object.entries(emergencyForm)) {
      if (value === "" || value === undefined) {
        payload[key] = null;
      } else {
        payload[key] = value;
      }
    }

    try {
      await api.put("/api/profile/emergency-contact", payload);
      toast.success("Emergency contact updated successfully");
      setEditingEmergency(false);
      fetchProfile();
    } catch (err) {
      console.error("Update emergency contact error:", err);
      toast.error(err.response?.data?.error || "Failed to update emergency contact");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPersonal = () => {
    setEditingPersonal(false);
    if (profileData) {
      setPersonalForm({
        name: profileData.name || "",
        phone: profileData.phone || "",
        date_of_birth: profileData.date_of_birth || "",
        gender: profileData.gender || "",
        address: profileData.address || "",
        bio: profileData.bio || ""
      });
    }
  };

  const handleCancelEmergency = () => {
    setEditingEmergency(false);
    if (profileData) {
      setEmergencyForm({
        emergency_contact_name: profileData.emergency_contact?.name || "",
        emergency_contact_relationship: profileData.emergency_contact?.relationship || "",
        emergency_contact_phone: profileData.emergency_contact?.phone || "",
        emergency_contact_alt_phone: profileData.emergency_contact?.alt_phone || "",
        emergency_contact_email: profileData.emergency_contact?.email || ""
      });
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

  const handleMedicalSubmit = async (e) => {
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

  const handlePersonalChange = (e) => {
    setPersonalForm({ ...personalForm, [e.target.name]: e.target.value });
  };

  const handleEmergencyChange = (e) => {
    setEmergencyForm({ ...emergencyForm, [e.target.name]: e.target.value });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getInitials = () => {
    return user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
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
          My Profile
        </h2>
        <p className="text-muted mb-0 mt-1">Manage your personal information and emergency contact</p>
      </div>

      <Row>
        {/* Personal Information Card */}
        <Col md={6} className="mb-4">
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: 'var(--mc-radius-xl)' }}>
            <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-person me-2 text-primary"></i>
                Personal Information
              </h5>
              {!editingPersonal && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => setEditingPersonal(true)}
                  className="rounded-pill px-3"
                >
                  <i className="bi bi-pencil me-1"></i>
                  Edit
                </Button>
              )}
            </Card.Header>
            <Card.Body className="p-4">
              {editingPersonal ? (
                <Form onSubmit={handlePersonalSubmit}>
                  <div className="text-center mb-4">
                    <div
                      className="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center mx-auto shadow-sm"
                      style={{ width: '80px', height: '80px', fontSize: '2rem', color: 'white' }}
                    >
                      {getInitials()}
                    </div>
                    <p className="text-muted mt-2 small">Profile Photo</p>
                  </div>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-medium">Full Name *</Form.Label>
                    <Form.Control
                      type="text"
                      name="name"
                      value={personalForm.name}
                      onChange={handlePersonalChange}
                      required
                      minLength={2}
                      maxLength={100}
                      className="rounded-3"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-medium">Email Address</Form.Label>
                    <Form.Control
                      type="email"
                      value={profileData?.email || ""}
                      disabled
                      className="bg-light rounded-3"
                    />
                    <Form.Text className="text-muted">Email cannot be changed</Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-medium">Phone Number</Form.Label>
                    <Form.Control
                      type="tel"
                      name="phone"
                      value={personalForm.phone}
                      onChange={handlePersonalChange}
                      maxLength={20}
                      className="rounded-3"
                      placeholder="+1 (555) 123-4567"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-medium">Date of Birth</Form.Label>
                    <Form.Control
                      type="date"
                      name="date_of_birth"
                      value={personalForm.date_of_birth}
                      onChange={handlePersonalChange}
                      className="rounded-3"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-medium">Gender</Form.Label>
                    <Form.Select
                      name="gender"
                      value={personalForm.gender}
                      onChange={handlePersonalChange}
                      className="rounded-3"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-medium">Address</Form.Label>
                    <Form.Control
                      type="text"
                      name="address"
                      value={personalForm.address}
                      onChange={handlePersonalChange}
                      className="rounded-3"
                      placeholder="123 Main St, City, Country"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-medium">Bio / About Me</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="bio"
                      value={personalForm.bio}
                      onChange={handlePersonalChange}
                      maxLength={500}
                      className="rounded-3"
                      placeholder="Tell us a little about yourself..."
                    />
                    <Form.Text className="text-muted">
                      {personalForm.bio.length}/500 characters
                    </Form.Text>
                  </Form.Group>

                  <div className="d-flex gap-2">
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
                          <i className="bi bi-check me-2"></i>
                          Save
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline-secondary"
                      type="button"
                      onClick={handleCancelPersonal}
                      disabled={saving}
                      className="rounded-pill px-4"
                    >
                      Cancel
                    </Button>
                  </div>
                </Form>
              ) : (
                <div>
                  <div className="text-center mb-4">
                    <div
                      className="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center mx-auto shadow-sm"
                      style={{ width: '80px', height: '80px', fontSize: '2rem', color: 'white' }}
                    >
                      {getInitials()}
                    </div>
                    <h4 className="mt-2 mb-0 fw-bold">{profileData?.name}</h4>
                    <p className="text-muted small">{profileData?.email}</p>
                  </div>

                  <hr className="my-4" />

                  <div className="mb-3">
                    <small className="text-muted d-block mb-1">Phone</small>
                    <p className="mb-0">{profileData?.phone || <span className="text-muted fst-italic">Not provided</span>}</p>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted d-block mb-1">Date of Birth</small>
                    <p className="mb-0">{formatDate(profileData?.date_of_birth)}</p>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted d-block mb-1">Gender</small>
                    <p className="mb-0 text-capitalize">{profileData?.gender || <span className="text-muted fst-italic">Not provided</span>}</p>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted d-block mb-1">Address</small>
                    <p className="mb-0">{profileData?.address || <span className="text-muted fst-italic">Not provided</span>}</p>
                  </div>

                  <div className="mb-0">
                    <small className="text-muted d-block mb-1">Bio</small>
                    <p className="mb-0">{profileData?.bio || <span className="text-muted fst-italic">Not provided</span>}</p>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Emergency Contact Card */}
        <Col md={6} className="mb-4">
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: 'var(--mc-radius-xl)' }}>
            <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-exclamation-triangle me-2 text-warning"></i>
                Emergency Contact
              </h5>
              {!editingEmergency && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => setEditingEmergency(true)}
                  className="rounded-pill px-3"
                >
                  <i className="bi bi-pencil me-1"></i>
                  Edit
                </Button>
              )}
            </Card.Header>
            <Card.Body className="p-4">
              {editingEmergency ? (
                <Form onSubmit={handleEmergencySubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-medium">Contact Name *</Form.Label>
                    <Form.Control
                      type="text"
                      name="emergency_contact_name"
                      value={emergencyForm.emergency_contact_name}
                      onChange={handleEmergencyChange}
                      required
                      minLength={2}
                      maxLength={255}
                      className="rounded-3"
                      placeholder="John Doe"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-medium">Relationship *</Form.Label>
                    <Form.Control
                      type="text"
                      name="emergency_contact_relationship"
                      value={emergencyForm.emergency_contact_relationship}
                      onChange={handleEmergencyChange}
                      required
                      maxLength={100}
                      className="rounded-3"
                      placeholder="Spouse, Parent, Friend, etc."
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-medium">Phone Number *</Form.Label>
                    <Form.Control
                      type="tel"
                      name="emergency_contact_phone"
                      value={emergencyForm.emergency_contact_phone}
                      onChange={handleEmergencyChange}
                      required
                      maxLength={20}
                      className="rounded-3"
                      placeholder="+1 (555) 123-4567"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-medium">Alternative Phone</Form.Label>
                    <Form.Control
                      type="tel"
                      name="emergency_contact_alt_phone"
                      value={emergencyForm.emergency_contact_alt_phone}
                      onChange={handleEmergencyChange}
                      maxLength={20}
                      className="rounded-3"
                      placeholder="+1 (555) 987-6543"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-medium">Email</Form.Label>
                    <Form.Control
                      type="email"
                      name="emergency_contact_email"
                      value={emergencyForm.emergency_contact_email}
                      onChange={handleEmergencyChange}
                      maxLength={255}
                      className="rounded-3"
                      placeholder="emergency@example.com"
                    />
                  </Form.Group>

                  <div className="d-flex gap-2">
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
                          <i className="bi bi-check me-2"></i>
                          Save
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline-secondary"
                      type="button"
                      onClick={handleCancelEmergency}
                      disabled={saving}
                      className="rounded-pill px-4"
                    >
                      Cancel
                    </Button>
                  </div>
                </Form>
              ) : (
                <div>
                  <div className="text-center mb-4">
                    <div
                      className="bg-warning rounded-circle d-inline-flex align-items-center justify-content-center mx-auto shadow-sm"
                      style={{ width: '80px', height: '80px', fontSize: '2rem', color: 'white' }}
                    >
                      <i className="bi bi-person-hearts"></i>
                    </div>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted d-block mb-1">Contact Name</small>
                    <p className="mb-0 fw-medium">{profileData?.emergency_contact?.name || <span className="text-muted fst-italic">Not provided</span>}</p>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted d-block mb-1">Relationship</small>
                    <p className="mb-0">{profileData?.emergency_contact?.relationship || <span className="text-muted fst-italic">Not provided</span>}</p>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted d-block mb-1">Phone Number</small>
                    <p className="mb-0">
                      <a href={`tel:${profileData?.emergency_contact?.phone}`} className="text-decoration-none">
                        <i className="bi bi-telephone me-1 text-success"></i>
                        {profileData?.emergency_contact?.phone || <span className="text-muted fst-italic">Not provided</span>}
                      </a>
                    </p>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted d-block mb-1">Alternative Phone</small>
                    <p className="mb-0">
                      {profileData?.emergency_contact?.alt_phone ? (
                        <a href={`tel:${profileData.emergency_contact.alt_phone}`} className="text-decoration-none">
                          <i className="bi bi-telephone me-1 text-success"></i>
                          {profileData.emergency_contact.alt_phone}
                        </a>
                      ) : (
                        <span className="text-muted fst-italic">Not provided</span>
                      )}
                    </p>
                  </div>

                  <div className="mb-0">
                    <small className="text-muted d-block mb-1">Email</small>
                    <p className="mb-0">
                      {profileData?.emergency_contact?.email ? (
                        <a href={`mailto:${profileData.emergency_contact.email}`} className="text-decoration-none">
                          <i className="bi bi-envelope me-1 text-primary"></i>
                          {profileData.emergency_contact.email}
                        </a>
                      ) : (
                        <span className="text-muted fst-italic">Not provided</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Medical History Timeline */}
      <Row>
        <Col md={12}>
          <Card className="border-0 shadow-sm mt-2" style={{ borderRadius: 'var(--mc-radius-xl)' }}>
            <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-clipboard2-pulse me-2 text-primary"></i>
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

      {/* Medical History Add/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">
            <i className="bi bi-clipboard2-pulse me-2 text-primary"></i>
            {editingId ? "Edit Medical History" : "Add Medical History"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleMedicalSubmit}>
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
                onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
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
                onChange={(e) => setForm({ ...form, conditions: e.target.value })}
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
                onChange={(e) => setForm({ ...form, allergies: e.target.value })}
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
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
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