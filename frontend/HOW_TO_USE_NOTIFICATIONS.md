# 🔔 How to Use the Notification System

## Overview

The notification system is a **global, accessible alert system** that displays notifications anywhere in your app. It's already integrated and ready to use!

---

## Quick Start (2 Minutes)

### 1. Import the Hook
In any component where you want to show notifications, import the hook:

```tsx
import { useNotification } from '../hooks/useNotification';
```

### 2. Use the Hook
Inside your component, initialize it:

```tsx
export default function MyScreen() {
  const notification = useNotification();
  
  return (
    // Your component code
  );
}
```

### 3. Call Notifications
Use the notification methods anywhere:

```tsx
notification.success('Success!');
notification.error('Error occurred');
notification.warning('Warning!');
notification.info('Information');
```

---

## Available Methods

### Success Notification (Green)
```tsx
notification.success('Title', 'Optional message', duration);
```
- **Color**: Green (#40743dff)
- **Use for**: Completed actions, successful operations
- **Duration**: Default 3000ms (3 seconds)

**Example**:
```tsx
notification.success('Profile Updated!', 'Your changes have been saved');
```

### Error Notification (Red)
```tsx
notification.error('Title', 'Optional message', duration);
```
- **Color**: Red (#EF4444)
- **Use for**: Errors, failed operations
- **Duration**: Default 3000ms (3 seconds)

**Example**:
```tsx
notification.error('Upload Failed', 'Please check your connection');
```

### Warning Notification (Orange)
```tsx
notification.warning('Title', 'Optional message', duration);
```
- **Color**: Orange (#F59E0B)
- **Use for**: Warnings, cautions, user awareness
- **Duration**: Default 3000ms (3 seconds)

**Example**:
```tsx
notification.warning('Slow Connection', 'Upload may take longer');
```

### Info Notification (Blue)
```tsx
notification.info('Title', 'Optional message', duration);
```
- **Color**: Blue (#3B82F6)
- **Use for**: General information, tips
- **Duration**: Default 3000ms (3 seconds)

**Example**:
```tsx
notification.info('Tip', 'Swipe left to save sightings');
```

### Generic Notification
```tsx
notification.show('Title', 'success' | 'error' | 'warning' | 'info', 'Optional message', duration);
```

**Example**:
```tsx
notification.show('Processing', 'info', 'Please wait...', 5000);
```

### Manual Control Methods

#### Hide a Specific Notification
```tsx
const id = notification.success('Action Completed', null, 0); // 0 = no auto-dismiss
// Later, manually close it:
notification.hide(id);
```

#### Clear All Notifications
```tsx
notification.clearAll();
```

---

## Duration Parameter

The `duration` parameter controls how long the notification stays visible (in milliseconds).

### Common Durations
- **Default (3000)**: `notification.success('Done!')`
  - 3 seconds, then auto-dismisses
  
- **Longer (5000)**: `notification.success('Processing', 'Loading...', 5000)`
  - 5 seconds before auto-dismiss
  
- **Persistent (0)**: `notification.info('Important', 'Click X to close', 0)`
  - Never auto-dismisses, user must click the X button

### When to Use Each Duration

| Duration | Use Case | Example |
|----------|----------|---------|
| 3000 (default) | Quick confirmations | "Saved!", "Deleted!" |
| 5000 | Medium operations | "Uploading image..." |
| 0 (persistent) | Important info, errors | "Connection lost", "Permission required" |

---

## Real-World Examples

### Example 1: Form Submission (from edit_profile.tsx)

```tsx
const handleSave = async () => {
  const radiusVal = Number(form.radius);
  
  // Validation error
  if (Number.isNaN(radiusVal) || radiusVal < 0) {
    notification.warning('Invalid Input', 'Radius must be a non-negative number.');
    return;
  }

  // No changes made
  if (Object.keys(updates).length === 0) {
    notification.info('No Changes', 'No updates were made');
    return;
  }

  try {
    // Show persistent notification while saving
    notification.info('Saving...', 'Updating your profile', 0);
    
    // API call
    await apiUpdateUserDetails(token, updates);
    if (refreshUser) await refreshUser();
    
    // Success notification
    notification.success('Profile Updated!', 'Your changes have been saved');
    router.back();
  } catch (error) {
    // Error notification
    notification.error('Update Failed', String(error?.message || error));
  }
};
```

### Example 2: Image Upload

```tsx
const handleUploadImage = async (imageUri: string) => {
  try {
    // Show persistent notification while uploading
    notification.info('Uploading...', 'Please wait', 0);
    
    const result = await uploadImage(imageUri);
    
    // Success notification
    notification.success('Upload Complete!', 'Image has been uploaded');
  } catch (error) {
    // Error notification
    notification.error('Upload Failed', error.message);
  }
};
```

### Example 3: Location Update

```tsx
const handleUseCurrentLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      notification.warning(
        'Permission Denied',
        'Location permission is required'
      );
      return;
    }

    const current = await Location.getCurrentPositionAsync();
    setLocation(current.coords);
    
    notification.success('Location Captured', 'Your location has been set');
  } catch (error) {
    notification.error('Location Error', error.message);
  }
};
```

### Example 4: Network Status

```tsx
const handleNetworkChange = (isOnline: boolean) => {
  if (!isOnline) {
    notification.warning(
      'Offline',
      'You are offline. Changes will sync when reconnected.',
      0  // Persistent
    );
  } else {
    notification.success('Back Online!');
  }
};
```

### Example 5: Achievement Unlocked

```tsx
const handleAchievementUnlocked = (achievementName: string) => {
  notification.success(
    'Achievement Unlocked! 🏆',
    `You've earned: ${achievementName}`,
    4000  // Slightly longer duration for special events
  );
};
```

---

## Integration Guide

### Where to Add Notifications

✅ **API Calls**
```tsx
try {
  await apiCall();
  notification.success('Done!');
} catch (error) {
  notification.error('Error', error.message);
}
```

✅ **Form Submissions**
```tsx
if (!isValid) {
  notification.warning('Invalid', 'Please check your input');
  return;
}
notification.success('Submitted!');
```

✅ **User Actions**
```tsx
const handleDelete = () => {
  deleteItem();
  notification.success('Deleted!');
};
```

✅ **Permission Requests**
```tsx
const { status } = await requestPermission();
if (status !== 'granted') {
  notification.warning('Permission Required', 'Enable this to continue');
}
```

---

## Visual Reference

### Notification Appearance

```
┌─────────────────────────────────────────┐
│ ✓  Success Notification                 │  X
│    Your operation completed              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ✕  Error Notification                   │  X
│    Something went wrong                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ⚠  Warning Notification                 │  X
│    Please be aware                       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ℹ  Info Notification                    │  X
│    Some information                      │
└─────────────────────────────────────────┘
```

---

## Best Practices

### ✅ Do

- ✅ Use **success** for completed actions
- ✅ Use **error** with helpful error messages
- ✅ Keep titles **short and clear**
- ✅ Use **persistent notifications (0)** for important info
- ✅ Show **loading notifications** during async operations

### ❌ Don't

- ❌ Show too many notifications at once
- ❌ Use notifications for simple confirmations (that work fine as is)
- ❌ Make notification messages too long
- ❌ Use wrong colors (success for errors, etc.)
- ❌ Forget to handle errors with error notifications

---

## File Structure

The notification system consists of:

```
frontend/
├── context/
│   └── NotificationContext.tsx          ← State management
├── components/
│   ├── NotificationDisplay.tsx          ← Renders notifications
│   └── NotificationExamples.tsx         ← Demo component
├── constants/
│   └── NotificationStyles.tsx           ← Styling
├── hooks/
│   └── useNotification.ts               ← Easy access hook
└── app/
    └── _layout.tsx                      ← Integration
```

---

## Common Patterns

### Pattern 1: Loading + Success/Error

```tsx
const handleAction = async () => {
  notification.info('Processing...', null, 0);
  try {
    const result = await someAsyncAction();
    notification.success('Done!');
  } catch (error) {
    notification.error('Failed', error.message);
  }
};
```

### Pattern 2: Validation Feedback

```tsx
const handleSubmit = () => {
  if (!email) {
    notification.warning('Missing Email', 'Please enter your email');
    return;
  }
  if (!isValidEmail(email)) {
    notification.warning('Invalid Email', 'Please enter a valid email');
    return;
  }
  notification.success('Valid!');
};
```

### Pattern 3: Undo Action

```tsx
const handleDelete = () => {
  deleteItem();
  const id = notification.success('Deleted', 'Click to undo', 0);
  
  setTimeout(() => {
    notification.hide(id);
  }, 5000);
};
```

---

## Testing

Use the `NotificationExamples` component to test all notification types:

```tsx
import { NotificationExamples } from '../components/NotificationExamples';

// In your screen:
<NotificationExamples />
```

This component has buttons for all notification types to verify they work correctly.

---

## Troubleshooting

### Notifications not showing?
- ✅ Make sure you imported the hook: `import { useNotification } from '../hooks/useNotification';`
- ✅ Make sure you initialized it: `const notification = useNotification();`
- ✅ Check that `_layout.tsx` has `NotificationProvider` and `NotificationDisplay`

### Notifications showing at wrong position?
- The system is designed to show at the **top of the screen**
- This is set in `NotificationStyles.tsx` with `top: 0` and `paddingTop: 60`
- Modify if needed for your app

### Auto-dismiss not working?
- Default duration is **3000ms (3 seconds)**
- Pass a custom duration as the last parameter: `notification.success('Title', 'Message', 5000)`
- Use `0` for no auto-dismiss: `notification.info('Title', 'Message', 0)`

---

## Color Reference

| Type | Color | Hex | Icon |
|------|-------|-----|------|
| **Success** | Green | #40743dff | ✓ Check |
| **Error** | Red | #EF4444 | ✕ X |
| **Warning** | Orange | #F59E0B | ⚠ Warning |
| **Info** | Blue | #3B82F6 | ℹ Info |

---

## Quick Reference

### Copy-Paste Templates

**Success:**
```tsx
notification.success('Title', 'Optional message');
```

**Error:**
```tsx
notification.error('Error Title', 'Error details');
```

**Warning:**
```tsx
notification.warning('Warning Title', 'Warning details');
```

**Info:**
```tsx
notification.info('Info Title', 'Info details');
```

**Loading (Persistent):**
```tsx
notification.info('Loading', 'Please wait...', 0);
```

---

## Need More Info?

- 📖 Full setup guide: `NOTIFICATION_SYSTEM_README.md`
- 📋 Quick reference: `NOTIFICATION_QUICK_REFERENCE.md`
- 🧪 Test component: `components/NotificationExamples.tsx`
- 💻 Source code: `context/NotificationContext.tsx`

---

**Happy notifying!** 🎉
