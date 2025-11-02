import React, { useState, useEffect } from 'react';
import { Dropdown, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../services/api';

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
    
    // Check for new notifications every minute
    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/notifications');
      setNotifications(res.data);
      
      const unread = res.data.filter(n => !n.is_read).length;
      setUnreadCount(unread);

      // Show browser notification for new unread notifications
      if (unread > 0 && Notification.permission === "granted") {
        const latestUnread = res.data.find(n => !n.is_read);
        if (latestUnread) {
          showBrowserNotification(latestUnread.title, latestUnread.message);
        }
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
  };

  const showBrowserNotification = (title, body) => {
    if (Notification.permission === "granted") {
      new Notification(title, {
        body: body,
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: 'medication-reminder'
      });
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  const markAllAsRead = async () => {
    setLoading(true);
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      await Promise.all(
        unreadNotifications.map(n => api.put(`/api/notifications/${n.id}/read`))
      );
      fetchNotifications();
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error('Mark all as read error:', err);
      toast.error('Failed to mark notifications as read');
    } finally {
      setLoading(false);
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
    return date.toLocaleDateString();
  };

  return (
    <Dropdown align="end">
      <Dropdown.Toggle 
        variant="link" 
        id="notification-dropdown"
        className="text-white position-relative p-2"
        style={{ textDecoration: 'none' }}
      >
        <i className="bi bi-bell" style={{ fontSize: '1.3rem' }}></i>
        {unreadCount > 0 && (
          <Badge 
            bg="danger" 
            pill 
            className="position-absolute top-0 start-100 translate-middle"
            style={{ fontSize: '0.7rem' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu style={{ width: '350px', maxHeight: '500px', overflowY: 'auto' }}>
        <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
          <h6 className="mb-0">Notifications</h6>
          {unreadCount > 0 && (
            <Button 
              variant="link" 
              size="sm" 
              className="text-decoration-none p-0"
              onClick={markAllAsRead}
              disabled={loading}
            >
              Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <i className="bi bi-bell-slash" style={{ fontSize: '2rem' }}></i>
            <p className="mb-0 mt-2">No notifications</p>
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <Dropdown.Item
                key={notification.id}
                className={`px-3 py-3 ${!notification.is_read ? 'bg-light' : ''}`}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
                style={{ whiteSpace: 'normal', cursor: 'pointer' }}
              >
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center mb-1">
                      {notification.notification_type === 'medication' ? (
                        <i className="bi bi-capsule text-primary me-2"></i>
                      ) : (
                        <i className="bi bi-calendar-event text-success me-2"></i>
                      )}
                      <strong className="small">{notification.title}</strong>
                    </div>
                    <p className="mb-1 small text-muted">{notification.message}</p>
                    <small className="text-muted">{formatTime(notification.created_at)}</small>
                  </div>
                  {!notification.is_read && (
                    <Badge bg="primary" pill style={{ fontSize: '0.6rem' }}>New</Badge>
                  )}
                </div>
              </Dropdown.Item>
            ))}
          </>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default NotificationBell;