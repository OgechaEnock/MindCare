import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, ListGroup, Badge, Spinner, Alert, ProgressBar } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    medications: 0,
    appointments: 0,
    upcomingAppointments: 0,
    forumPosts: 0,
    medicalHistoryEntries: 0
  });
  const [recentMedications, setRecentMedications] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [recentForumPosts, setRecentForumPosts] = useState([]);
  const [latestMedicalHistory, setLatestMedicalHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    fetchDashboardData();
    setGreeting(getGreeting());
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const fetchDashboardData = async () => {
    try {
      const [medsRes, aptsRes, forumRes, historyRes] = await Promise.all([
        api.get("/api/medications"),
        api.get("/api/appointments"),
        api.get("/api/forum/threads"),
        api.get("/api/profile/medical-history")
      ]);

      const medications = medsRes.data;
      const appointments = aptsRes.data;
      const forumPosts = forumRes.data;
      const medicalHistory = historyRes.data;

      const upcomingApts = appointments.filter(apt => apt.status === 'Upcoming');
      
      const sortedUpcoming = upcomingApts.sort((a, b) => {
        const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
        const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
        return dateA - dateB;
      });

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const todayApts = sortedUpcoming.filter(apt => apt.appointment_date === todayStr);

      setStats({
        medications: medications.length,
        appointments: appointments.length,
        upcomingAppointments: sortedUpcoming.length,
        forumPosts: forumPosts.length,
        medicalHistoryEntries: medicalHistory.length
      });

      setRecentMedications(medications.slice(0, 5));
      setUpcomingAppointments(sortedUpcoming.slice(0, 4));
      setTodayAppointments(todayApts);
      setRecentForumPosts(forumPosts.slice(0, 3));
      setLatestMedicalHistory(medicalHistory[0] || null);

    } catch (err) {
      console.error("Fetch dashboard data error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (date, time) => {
    if (!date || !time) return 'Date not set';
    
    try {
      let dateObj;
      if (date.includes('-')) {
        const [year, month, day] = date.split('-').map(Number);
        dateObj = new Date(year, month - 1, day);
      } else if (date.includes('/')) {
        dateObj = new Date(date);
      } else {
        dateObj = new Date(date);
      }
      
      if (isNaN(dateObj.getTime())) return `${date} at ${formatTime(time)}`;
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const aptDateOnly = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());

      const timeParts = time.split(':').map(Number);
      const aptDateTime = new Date(dateObj);
      aptDateTime.setHours(timeParts[0] || 0, timeParts[1] || 0, timeParts[2] || 0);

      const diffMs = aptDateTime - now;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor((aptDateOnly - today) / (1000 * 60 * 60 * 24));
      const timeStr = formatTime(time);
      
      if (diffHours < 1 && diffMs > 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `In ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
      } else if (diffDays === 0) {
        return `Today at ${timeStr}`;
      } else if (diffDays === 1) {
        return `Tomorrow at ${timeStr}`;
      } else if (diffDays < 7 && diffDays > 0) {
        return `In ${diffDays} day${diffDays !== 1 ? 's' : ''} at ${timeStr}`;
      } else {
        return `${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${timeStr}`;
      }
    } catch (error) {
      return `${date} at ${formatTime(time)}`;
    }
  };

  const formatTime = (time) => {
    if (!time) return 'Time not set';
    try {
      const timeParts = time.split(':');
      if (timeParts.length >= 2) {
        const hours = parseInt(timeParts[0]);
        const minutes = parseInt(timeParts[1]);
        if (isNaN(hours) || isNaN(minutes)) return time;
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
      }
      return time;
    } catch (e) {
      return time;
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

  const getHealthScore = () => {
    let score = 0;
    if (stats.medications > 0) score += 25;
    if (stats.upcomingAppointments > 0) score += 25;
    if (stats.medicalHistoryEntries > 0) score += 25;
    if (stats.forumPosts > 0) score += 25;
    return score;
  };

  const isToday = (date) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    return date === todayStr;
  };

  if (loading) {
    return (
      <Container className="mt-4 text-center py-5">
        <div className="mc-loading-content">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted">Loading your wellness dashboard...</p>
        </div>
      </Container>
    );
  }

  const healthScore = getHealthScore();
  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <Container className="mt-4 mb-5">
      {/* Welcome Header */}
      <div className="mc-section-title">
        <h2 className="mb-0">{greeting}, {user?.name || "Friend"}! 👋</h2>
        <p className="text-muted mb-0 mt-1">{todayDate}</p>
      </div>

      {/* Today's Appointments Alert */}
      {todayAppointments.length > 0 && (
        <Alert variant="warning" className="mb-4 shadow-sm border-0" style={{ borderRadius: 'var(--mc-radius-lg)' }}>
          <div className="d-flex align-items-center">
            <i className="bi bi-bell-fill me-3" style={{ fontSize: "2rem", color: 'var(--mc-warning)' }}></i>
            <div className="flex-grow-1">
              <Alert.Heading className="h6 mb-1 fw-bold">
                You have {todayAppointments.length} appointment{todayAppointments.length > 1 ? 's' : ''} today!
              </Alert.Heading>
              {todayAppointments.map(apt => (
                <div key={apt.id} className="small mb-1">
                  <strong>{apt.title}</strong> at {formatTime(apt.appointment_time)}
                </div>
              ))}
            </div>
            <Link to="/appointments" className="btn btn-warning btn-sm rounded-pill px-3">
              View Details
            </Link>
          </div>
        </Alert>
      )}

      {/* Health Profile Score */}
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm border-0 bg-white" style={{ borderRadius: 'var(--mc-radius-xl)' }}>
            <Card.Body className="p-4">
              <Row className="align-items-center">
                <Col md={8}>
                  <h5 className="mb-2 fw-bold">
                    <i className="bi bi-heart-pulse-fill me-2 text-primary"></i>
                    Health Profile Completion
                  </h5>
                  <ProgressBar 
                    now={healthScore} 
                    label={`${healthScore}%`} 
                    className="mb-2 mc-health-progress"
                  />
                  <p className="mb-0 small">
                    {healthScore === 100 
                      ? "🎉 Excellent! Your profile is complete." 
                      : `Complete your profile to get the most out of MindCare.`}
                  </p>
                </Col>
                <Col md={4} className="text-center">
                  <div style={{ fontSize: '3rem' }}>
                    {healthScore === 100 ? '🏆' : healthScore >= 75 ? '⭐' : healthScore >= 50 ? '📊' : '📝'}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Stats - Using custom styled cards */}
      <Row className="mb-4 g-3">
        <Col md={3} sm={6}>
          <Card className="mc-stats-card h-100 border-0">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="mc-stats-icon text-primary">
                  <i className="bi bi-capsule"></i>
                </div>
                <Badge bg="primary" pill className="fs-5">{stats.medications}</Badge>
              </div>
              <h5 className="mc-stats-label mb-3">Medications</h5>
              <p className="text-muted small mb-3">Active prescriptions</p>
              <Link to="/medications" className="btn btn-sm btn-outline-primary w-100 rounded-pill">
                <i className="bi bi-plus-circle me-1"></i> Manage
              </Link>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} sm={6}>
          <Card className="mc-stats-card h-100 border-0">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="mc-stats-icon text-success">
                  <i className="bi bi-calendar-event"></i>
                </div>
                <Badge bg="success" pill className="fs-5">{stats.upcomingAppointments}</Badge>
              </div>
              <h5 className="mc-stats-label mb-3">Upcoming</h5>
              <p className="text-muted small mb-3">Scheduled appointments</p>
              <Link to="/appointments" className="btn btn-sm btn-outline-success w-100 rounded-pill">
                <i className="bi bi-eye me-1"></i> View
              </Link>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} sm={6}>
          <Card className="mc-stats-card h-100 border-0">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="mc-stats-icon" style={{ color: 'var(--mc-warning)' }}>
                  <i className="bi bi-clipboard2-pulse"></i>
                </div>
                <Badge bg="warning" text="dark" pill className="fs-5">{stats.medicalHistoryEntries}</Badge>
              </div>
              <h5 className="mc-stats-label mb-3">Medical History</h5>
              <p className="text-muted small mb-3">Recorded entries</p>
              <Link to="/profile" className="btn btn-sm btn-outline-warning w-100 rounded-pill">
                <i className="bi bi-pencil me-1"></i> Update
              </Link>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} sm={6}>
          <Card className="mc-stats-card h-100 border-0">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="mc-stats-icon text-info">
                  <i className="bi bi-chat-dots"></i>
                </div>
                <Badge bg="info" pill className="fs-5">{stats.forumPosts}</Badge>
              </div>
              <h5 className="mc-stats-label mb-3">Forum</h5>
              <p className="text-muted small mb-3">Community posts</p>
              <Link to="/forum" className="btn btn-sm btn-outline-info w-100 rounded-pill">
                <i className="bi bi-chat me-1"></i> Browse
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Recent Medications */}
        <Col lg={6} className="mb-4">
          <Card className="shadow-sm border-0 h-100 mc-lift" style={{ borderRadius: 'var(--mc-radius-xl)' }}>
            <Card.Header className="bg-white border-bottom py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-capsule me-2 text-primary"></i>
                  Active Medications
                </h5>
                <Link to="/medications" className="btn btn-sm btn-primary rounded-pill px-3">
                  <i className="bi bi-plus-circle me-1"></i>
                  Add
                </Link>
              </div>
            </Card.Header>
            <Card.Body style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {recentMedications.length === 0 ? (
                <div className="mc-empty-state">
                  <i className="bi bi-capsule mc-empty-icon"></i>
                  <h5 className="mc-empty-title">No medications added yet</h5>
                  <p className="mc-empty-text">Start tracking your prescriptions</p>
                  <Link to="/medications" className="btn btn-sm btn-primary rounded-pill">
                    <i className="bi bi-plus-circle me-1"></i>
                    Add First Medication
                  </Link>
                </div>
              ) : (
                <ListGroup variant="flush">
                  {recentMedications.map((med) => (
                    <ListGroup.Item key={med.id} className="px-0 border-bottom py-3">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-1">
                            <i className="bi bi-capsule-pill text-primary me-2"></i>
                            <strong>{med.name}</strong>
                          </div>
                          <small className="text-muted d-block ms-4">
                            <i className="bi bi-clipboard-pulse me-1"></i>
                            {med.dosage}
                          </small>
                          <small className="text-muted d-block ms-4">
                            <i className="bi bi-clock me-1"></i>
                            {med.frequency}
                          </small>
                        </div>
                        <Badge bg="success" className="ms-2 rounded-pill">Active</Badge>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Upcoming Appointments */}
        <Col lg={6} className="mb-4">
          <Card className="shadow-sm border-0 h-100 mc-lift" style={{ borderRadius: 'var(--mc-radius-xl)' }}>
            <Card.Header className="bg-white border-bottom py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-calendar-event me-2 text-success"></i>
                  Next Appointments
                </h5>
                <Link to="/appointments" className="btn btn-sm btn-success rounded-pill px-3">
                  <i className="bi bi-plus-circle me-1"></i>
                  Schedule
                </Link>
              </div>
            </Card.Header>
            <Card.Body style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {upcomingAppointments.length === 0 ? (
                <div className="mc-empty-state">
                  <i className="bi bi-calendar-x mc-empty-icon"></i>
                  <h5 className="mc-empty-title">No upcoming appointments</h5>
                  <p className="mc-empty-text">Schedule your next visit</p>
                  <Link to="/appointments" className="btn btn-sm btn-success rounded-pill">
                    <i className="bi bi-calendar-plus me-1"></i>
                    Schedule Appointment
                  </Link>
                </div>
              ) : (
                <ListGroup variant="flush">
                  {upcomingAppointments.map((apt) => (
                    <ListGroup.Item key={apt.id} className="px-0 border-bottom py-3">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-1">
                            <i className="bi bi-calendar-check text-success me-2"></i>
                            <strong>{apt.title}</strong>
                          </div>
                          <small className="text-muted d-block ms-4">
                            <i className="bi bi-clock me-1"></i>
                            {formatDateTime(apt.appointment_date, apt.appointment_time)}
                          </small>
                        </div>
                        <Badge 
                          bg={isToday(apt.appointment_date) ? 'danger' : 'warning'} 
                          text={isToday(apt.appointment_date) ? 'white' : 'dark'}
                          className="ms-2 rounded-pill"
                        >
                          {isToday(apt.appointment_date) ? 'Today' : 'Upcoming'}
                        </Badge>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Latest Medical History */}
        <Col lg={6} className="mb-4">
          <Card className="shadow-sm border-0 h-100 mc-lift" style={{ borderRadius: 'var(--mc-radius-xl)' }}>
            <Card.Header className="bg-white border-bottom py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-clipboard2-pulse me-2" style={{ color: 'var(--mc-warning)' }}></i>
                  Latest Medical History
                </h5>
                <Link to="/profile" className="btn btn-sm btn-warning rounded-pill px-3">
                  <i className="bi bi-pencil me-1"></i>
                  Update
                </Link>
              </div>
            </Card.Header>
            <Card.Body>
              {!latestMedicalHistory ? (
                <div className="mc-empty-state">
                  <i className="bi bi-clipboard2-pulse mc-empty-icon"></i>
                  <h5 className="mc-empty-title">No medical history recorded</h5>
                  <p className="mc-empty-text">Add your health information</p>
                  <Link to="/profile" className="btn btn-sm btn-warning rounded-pill">
                    <i className="bi bi-plus-circle me-1"></i>
                    Add Medical History
                  </Link>
                </div>
              ) : (
                <div>
                  <div className="mb-3">
                    <small className="text-muted d-block mb-1">
                      <i className="bi bi-clipboard-pulse me-1"></i>
                      Diagnosis
                    </small>
                    <p className="mb-0">
                      {latestMedicalHistory.diagnosis ? (
                        latestMedicalHistory.diagnosis.substring(0, 100) + 
                        (latestMedicalHistory.diagnosis.length > 100 ? "..." : "")
                      ) : (
                        <span className="text-muted fst-italic">Not provided</span>
                      )}
                    </p>
                  </div>
                  
                  <div className="mb-3">
                    <small className="text-muted d-block mb-1">
                      <i className="bi bi-heart-pulse me-1"></i>
                      Conditions
                    </small>
                    <p className="mb-0">
                      {latestMedicalHistory.conditions ? (
                        latestMedicalHistory.conditions.substring(0, 100) + 
                        (latestMedicalHistory.conditions.length > 100 ? "..." : "")
                      ) : (
                        <span className="text-muted fst-italic">Not provided</span>
                      )}
                    </p>
                  </div>
                  
                  <div className="mb-3">
                    <small className="text-muted d-block mb-1">
                      <i className="bi bi-exclamation-triangle me-1" style={{ color: 'var(--mc-danger)' }}></i>
                      Allergies
                    </small>
                    <p className="mb-0">
                      {latestMedicalHistory.allergies ? (
                        <span className="text-danger fw-bold">{latestMedicalHistory.allergies}</span>
                      ) : (
                        <span className="text-muted fst-italic">None reported</span>
                      )}
                    </p>
                  </div>

                  <div className="text-center pt-3 border-top">
                    <small className="text-muted">
                      <i className="bi bi-clock-history me-1"></i>
                      Last updated {formatDate(latestMedicalHistory.updated_at)}
                    </small>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Community Forum Activity */}
        <Col lg={6} className="mb-4">
          <Card className="shadow-sm border-0 h-100 mc-lift" style={{ borderRadius: 'var(--mc-radius-xl)' }}>
            <Card.Header className="bg-white border-bottom py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-chat-dots me-2 text-info"></i>
                  Community Forum
                </h5>
                <Link to="/forum" className="btn btn-sm btn-info rounded-pill px-3">
                  <i className="bi bi-plus-circle me-1"></i>
                  Post
                </Link>
              </div>
            </Card.Header>
            <Card.Body style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {recentForumPosts.length === 0 ? (
                <div className="mc-empty-state">
                  <i className="bi bi-chat-square-text mc-empty-icon"></i>
                  <h5 className="mc-empty-title">No forum posts yet</h5>
                  <p className="mc-empty-text">Join the conversation</p>
                  <Link to="/forum" className="btn btn-sm btn-info rounded-pill">
                    <i className="bi bi-chat-left-text me-1"></i>
                    Join Community
                  </Link>
                </div>
              ) : (
                <ListGroup variant="flush">
                  {recentForumPosts.map((post) => (
                    <ListGroup.Item key={post.id} className="px-0 border-bottom py-3">
                      <div>
                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <strong className="text-truncate" style={{ maxWidth: '80%' }}>
                            {post.title || "Forum Post"}
                          </strong>
                          <Badge bg="success" className="ms-2 rounded-pill">
                            <i className="bi bi-check-circle me-1"></i>
                            Approved
                          </Badge>
                        </div>
                        <p className="mb-2 small text-muted text-truncate">
                          {post.body?.substring(0, 80)}...
                        </p>
                        <small className="text-muted">
                          <i className="bi bi-person me-1"></i>
                          {post.author_name || "Anonymous"}
                          <span className="mx-2">•</span>
                          <i className="bi bi-clock me-1"></i>
                          {formatDate(post.created_at)}
                        </small>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Dashboard;