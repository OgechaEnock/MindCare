import React, { useState, useEffect } from 'react';
import { Dropdown, Badge, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { 
  getNotifications, 
  getUnreadCount, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification 
} from '../services/api';

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetchNotifications();
    
    // Check for new notifications every minute
    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
      
      const unread = data.filter(n => !n.is_read).length;
      const previousUnread = unreadCount;
      setUnreadCount(unread);

      // Show browser notification only for NEW unread notifications
      if (unread > previousUnread && unread > 0 && Notification.permission === "granted") {
        const latestUnread = data.find(n => !n.is_read);
        if (latestUnread) {
          showBrowserNotification(
            getNotificationTitle(latestUnread.type),
            latestUnread.message
          );
        }
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
  };

  const getNotificationTitle = (type) => {
    const titles = {
      'appointment_created': '📅 New Appointment',
      'appointment_updated': '📝 Appointment Updated',
      'appointment_cancelled': ' Appointment Cancelled',
      'forum_post_published': ' Post Published',
      'forum_post_pending': '⏳ Post Pending Review',
      'forum_post_deleted': '🗑️ Post Deleted',
      'medication_reminder': '💊 Medication Reminder'
    };
    return titles[type] || '🔔 Notification';
  };

  const getNotificationIcon = (type) => {
    const icons = {
      'appointment_created': 'bi-calendar-plus text-success',
      'appointment_updated': 'bi-calendar-check text-primary',
      'appointment_cancelled': 'bi-calendar-x text-danger',
      'forum_post_published': 'bi-chat-dots text-info',
      'forum_post_pending': 'bi-clock text-warning',
      'forum_post_deleted': 'bi-trash text-danger',
      'medication_reminder': 'bi-capsule text-primary'
    };
    return icons[type] || 'bi-bell text-secondary';
  };

  const showBrowserNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body: body,
          icon: '/logo192.png',
          badge: '/logo192.png',
          tag: 'mindcare-notification',
          requireInteraction: false
        });
      } catch (error) {
        console.error('Failed to show browser notification:', error);
      }
    }
  };

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation(); 
    try {
      await markNotificationAsRead(id);
      await fetchNotifications();
    } catch (err) {
      console.error('Mark as read error:', err);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    setLoading(true);
    try {
      await markAllNotificationsAsRead();
      await fetchNotifications();
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error('Mark all as read error:', err);
      toast.error('Failed to mark notifications as read');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      await fetchNotifications();
      toast.success('Notification deleted');
    } catch (err) {
      console.error('Delete notification error:', err);
      toast.error('Failed to delete notification');
    }
  };

  const formatTime = (dateString) => {
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
      day: 'numeric' 
    });
  };

  return (
    <Dropdown align="end" show={show} onToggle={(isOpen) => setShow(isOpen)}>
      <Dropdown.Toggle 
        variant="link" 
        id="notification-dropdown"
        className="text-white position-relative p-2 notification-bell-toggle"
        style={{ textDecoration: 'none' }}
      >
        <i className="bi bi-bell" style={{ fontSize: '1.3rem' }}></i>
        {unreadCount > 0 && (
          <Badge 
            bg="danger" 
            pill 
            className="position-absolute top-0 start-100 translate-middle notification-badge"
            style={{ fontSize: '0.7rem' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu className="notification-menu shadow">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom bg-light">
          <h6 className="mb-0 fw-bold">
            <i className="bi bi-bell me-2"></i>
            Notifications
          </h6>
          {unreadCount > 0 && (
            <Button 
              variant="link" 
              size="sm" 
              className="text-primary text-decoration-none p-0 fw-semibold"
              onClick={handleMarkAllAsRead}
              disabled={loading}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm me-1"></span>
              ) : (
                <i className="bi bi-check-all me-1"></i>
              )}
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-bell-slash" style={{ fontSize: '2.5rem' }}></i>
              <p className="mb-0 mt-3">No notifications yet</p>
              <small>You'll see updates about your appointments and posts here</small>
            </div>
          ) : (
            <>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item px-3 py-3 border-bottom ${
                    !notification.is_read ? 'notification-unread' : ''
                  }`}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => !notification.is_read && handleMarkAsRead(notification.id, e)}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-start mb-2">
                        <i className={`bi ${getNotificationIcon(notification.type)} me-2`} 
                           style={{ fontSize: '1.2rem' }}></i>
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-start">
                            <strong className="small d-block">
                              {getNotificationTitle(notification.type)}
                            </strong>
                            {!notification.is_read && (
                              <Badge bg="primary" pill style={{ fontSize: '0.65rem' }}>
                                New
                              </Badge>
                            )}
                          </div>
                          <p className="mb-1 small text-dark" style={{ lineHeight: '1.4' }}>
                            {notification.message}
                          </p>
                          <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">
                              <i className="bi bi-clock me-1"></i>
                              {formatTime(notification.created_at)}
                            </small>
                            <Button
                              variant="link"
                              size="sm"
                              className="text-danger p-0 ms-2"
                              onClick={(e) => handleDelete(notification.id, e)}
                              title="Delete notification"
                            >
                              <i className="bi bi-trash"></i>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="text-center py-2 border-top bg-light">
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              Click to mark as read • {unreadCount} unread
            </small>
          </div>
        )}
      </Dropdown.Menu>

      {/* Custom Styles */}
      <style>{`
        .notification-bell-toggle {
          transition: all 0.2s ease;
        }
        
        .notification-bell-toggle:hover {
          transform: scale(1.1);
        }

        .notification-badge {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
          }
        }

        .notification-menu {
          width: 380px !important;
          border-radius: 12px;
          border: none;
        }

        .notification-item {
          transition: background-color 0.2s ease;
        }

        .notification-item:hover {
          background-color: #f8f9fa;
        }

        .notification-unread {
          background-color: #e3f2fd;
        }

        .notification-unread:hover {
          background-color: #bbdefb;
        }

        @media (max-width: 576px) {
          .notification-menu {
            width: 320px !important;
          }
        }
      `}</style>
    </Dropdown>
  );
}

export default NotificationBell;