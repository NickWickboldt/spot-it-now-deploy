# 🔔 Notification System - Backend & Frontend Alignment

## Overview

The **SpotItNow** app now has a **fully aligned notification system** that connects the database (backend) with the UI (frontend). There are two complementary notification systems:

1. **Database Notifications** - Persistent notifications stored in MongoDB
2. **UI Toast Notifications** - Temporary in-app alerts shown to users

---

## 🗄️ Database Notification System

### Purpose
Persistent notifications that can be:
- Sent to specific users
- Sent globally to all users
- Tracked for read/unread status
- Retrieved later by users

### Backend Components

#### Model (`backend/src/models/notification.model.js`)
```javascript
{
  user: ObjectId | null,        // null = global notification
  type: String,                  // e.g., 'sighting_approved', 'new_achievement'
  title: String,
  subtitle: String,
  message: String,
  mediaUrls: [String],
  location: {
    type: 'Point',
    coordinates: [Number, Number]
  },
  radius: Number,
  isRead: Boolean,               // For user-specific notifications
  readBy: [ObjectId],            // For global notifications - tracks which users read it
  createdAt: Date,
  updatedAt: Date
}
```

#### API Endpoints (`backend/src/routes/notification.routes.js`)

**User Routes:**
- `GET /notifications/my-notifications` - Get all notifications for logged-in user
- `PATCH /notifications/read/:notificationId` - Mark a notification as read
- `POST /notifications/read-all` - Mark all notifications as read

**Admin Routes:**
- `POST /notifications/send/user/:userId` - Send notification to specific user
- `POST /notifications/send/global` - Send notification to all users
- `DELETE /notifications/delete/:notificationId` - Delete a notification

### Frontend Integration

#### API Client (`frontend/api/notification.ts`)
```typescript
// User functions
apiGetMyNotifications(token): Promise<DbNotification[]>
apiMarkNotificationAsRead(token, notificationId): Promise<DbNotification>
apiMarkAllNotificationsAsRead(token): Promise<void>

// Admin functions
apiSendNotificationToUser(token, userId, notificationData): Promise<DbNotification>
apiSendGlobalNotification(token, notificationData): Promise<DbNotification>
apiDeleteNotification(token, notificationId): Promise<void>
```

#### TypeScript Types
```typescript
export interface DbNotification {
  _id: string;
  user?: string | null;
  type: string;
  title: string;
  subtitle?: string;
  message: string;
  mediaUrls?: string[];
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  radius?: number;
  isRead: boolean;
  readBy?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPayload {
  type: string;
  title: string;
  subtitle?: string;
  message: string;
  mediaUrls?: string[];
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  radius?: number;
}
```

---

## 🎨 UI Toast Notification System

### Purpose
Temporary, dismissible alerts for immediate user feedback:
- Success confirmations
- Error messages
- Warnings
- Information tips

### Components

#### Context (`frontend/context/NotificationContext.tsx`)
Global state management for toast notifications.

#### Hook (`frontend/hooks/useNotification.ts`)
Easy access to notification functions:
```typescript
const notification = useNotification();

notification.success('Title', 'Message');
notification.error('Title', 'Message');
notification.warning('Title', 'Message');
notification.info('Title', 'Message');
```

See `HOW_TO_USE_NOTIFICATIONS.md` for detailed usage guide.

---

## 🔗 How They Work Together

### Example 1: Sighting Approved
```typescript
// Backend: Admin approves a sighting
await notificationService.sendNotificationToUser(userId, {
  type: 'sighting_approved',
  title: 'Sighting Approved! 🎉',
  message: 'Your deer sighting has been verified.',
  mediaUrls: [sightingImageUrl]
});

// Frontend: User opens app and fetches notifications
const notifications = await apiGetMyNotifications(token);

// Frontend: Show UI toast for new notifications
notifications.filter(n => !n.isRead).forEach(notification => {
  toast.success(notification.title, notification.message);
});
```

### Example 2: Global Announcement
```typescript
// Backend: Admin sends global notification
await notificationService.sendGlobalNotification({
  type: 'admin_message',
  title: 'New Feature! 🚀',
  message: 'Check out the new challenges tab!'
});

// Frontend: All users receive it when they fetch notifications
const notifications = await apiGetMyNotifications(token);
// Global notifications are included automatically

// Frontend: Show UI toast
const unreadGlobal = notifications.filter(n => !n.user && !n.isRead);
unreadGlobal.forEach(n => toast.info(n.title, n.message));
```

### Example 3: Form Submission Feedback
```typescript
// Frontend: User submits a form
try {
  await apiSubmitForm(data);
  
  // UI toast - immediate feedback
  notification.success('Submitted!', 'Your form has been received');
  
  // Backend will create DB notification if needed
  // (e.g., when admin reviews the submission)
} catch (error) {
  // UI toast - error feedback
  notification.error('Submission Failed', error.message);
}
```

---

## 📋 Usage Patterns

### Pattern 1: Fetch and Display Database Notifications

**On App Launch or Tab Focus:**
```typescript
import { apiGetMyNotifications } from '../api/notification';
import { useNotification } from '../hooks/useNotification';

const MyScreen = () => {
  const notification = useNotification();
  const { token } = useAuth();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const dbNotifications = await apiGetMyNotifications(token);
        
        // Show unread notifications as toasts
        dbNotifications
          .filter(n => !n.isRead)
          .forEach(n => {
            notification.info(n.title, n.message, 5000);
          });
      } catch (error) {
        console.error('Failed to fetch notifications', error);
      }
    };

    fetchNotifications();
  }, []);
};
```

### Pattern 2: Mark Notification as Read

**When User Views a Notification:**
```typescript
const handleViewNotification = async (notificationId: string) => {
  try {
    await apiMarkNotificationAsRead(token, notificationId);
    // Update local state to reflect read status
    setNotifications(prev => 
      prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
    );
  } catch (error) {
    notification.error('Error', 'Failed to mark as read');
  }
};
```

### Pattern 3: Admin Sends Notification

**Admin Panel:**
```typescript
const sendNotificationToUser = async (userId: string) => {
  try {
    await apiSendNotificationToUser(token, userId, {
      type: 'admin_message',
      title: 'Welcome!',
      message: 'Thanks for joining SpotItNow',
    });
    
    notification.success('Sent!', 'Notification sent to user');
  } catch (error) {
    notification.error('Failed', error.message);
  }
};
```

---

## 🎯 Best Practices

### When to Use Database Notifications
✅ **Do use for:**
- Important updates users should be able to review later
- Admin messages to users
- Approval/rejection notifications
- Achievement unlocks
- System-wide announcements

❌ **Don't use for:**
- Simple form validation errors
- Immediate success confirmations (use UI toasts)
- Temporary status updates

### When to Use UI Toast Notifications
✅ **Do use for:**
- Immediate user feedback
- Form submission success/error
- Quick confirmations
- Temporary warnings
- Loading states

❌ **Don't use for:**
- Important messages that need to persist
- Messages users need to review later
- Complex messages with media

---

## 🔄 Migration Guide

If you have existing notification code, here's how to align it:

### Before (Frontend only)
```typescript
// Only temporary toast
notification.success('Sighting approved!');
```

### After (Database + UI)
```typescript
// Backend stores in database
await notificationService.sendNotificationToUser(userId, {
  type: 'sighting_approved',
  title: 'Sighting Approved!',
  message: 'Your deer sighting has been verified.',
});

// Frontend fetches and shows as toast
const notifications = await apiGetMyNotifications(token);
const unread = notifications.filter(n => !n.isRead);
unread.forEach(n => notification.success(n.title, n.message));
```

---

## 📊 Database Notification Features

### User-Specific Notifications
- Created with `user: userId`
- Only visible to that specific user
- Tracked with `isRead` boolean

### Global Notifications
- Created with `user: null`
- Visible to all users
- Tracked with `readBy` array of user IDs
- Each user sees it as unread until they mark it read

### Location-Based Notifications (Future)
```typescript
{
  type: 'nearby_sighting',
  title: 'Rare Bird Nearby!',
  message: 'A golden eagle was spotted 2km from you',
  location: {
    type: 'Point',
    coordinates: [-122.4194, 37.7749]
  },
  radius: 5000 // 5km radius
}
```

---

## 🧪 Testing

### Test Database Notifications

**Create a test notification:**
```bash
POST http://localhost:8000/api/v1/notifications/send/user/:userId
Authorization: Bearer <admin_token>

{
  "type": "test",
  "title": "Test Notification",
  "message": "This is a test"
}
```

**Fetch notifications:**
```bash
GET http://localhost:8000/api/v1/notifications/my-notifications
Authorization: Bearer <user_token>
```

### Test UI Toasts

See `components/NotificationExamples.tsx` for a test component with all notification types.

---

## 📁 File Reference

### Backend
```
backend/src/
├── models/notification.model.js
├── controllers/notification.controller.js
├── services/notification.service.js
└── routes/notification.routes.js
```

### Frontend
```
frontend/
├── api/notification.ts
├── context/NotificationContext.tsx
├── hooks/useNotification.ts
├── components/
│   ├── NotificationDisplay.tsx
│   └── NotificationExamples.tsx
└── constants/NotificationStyles.tsx
```

---

## 🚀 Quick Start

### For Users - View Notifications
```typescript
import { apiGetMyNotifications } from '../api/notification';

const notifications = await apiGetMyNotifications(token);
console.log(notifications);
```

### For Admins - Send Notifications
```typescript
import { apiSendNotificationToUser, apiSendGlobalNotification } from '../api/notification';

// To specific user
await apiSendNotificationToUser(token, userId, {
  type: 'welcome',
  title: 'Welcome!',
  message: 'Thanks for joining'
});

// To all users
await apiSendGlobalNotification(token, {
  type: 'announcement',
  title: 'Update Available',
  message: 'Version 2.0 is now live!'
});
```

### For UI Feedback - Toast Notifications
```typescript
import { useNotification } from '../hooks/useNotification';

const notification = useNotification();
notification.success('Done!');
notification.error('Failed', 'Something went wrong');
```

---

## ✅ Summary

The notification system is now **fully aligned** between backend and frontend:

✅ **Database notifications** are stored persistently in MongoDB  
✅ **Frontend API** connects to all backend endpoints  
✅ **TypeScript types** match the backend model  
✅ **Global notifications** work for all users with proper read tracking  
✅ **UI toast notifications** provide immediate feedback  
✅ **Both systems** work together seamlessly  

You can now send persistent notifications that users can review later, while also using temporary UI toasts for immediate feedback!
