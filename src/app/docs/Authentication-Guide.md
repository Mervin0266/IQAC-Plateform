# IQAC Platform Authentication & Role-Based Access Control

## Overview

The IQAC platform now features a comprehensive authentication system with three distinct user roles, each with specific permissions and access levels.

## User Roles

### 1. Admin
- **Username:** `admin`
- **Password:** `admin123`
- **Access Level:** Full system access
- **Capabilities:**
  - Access all pages
  - Edit and delete content
  - Upload files
  - Manage users
  - View all departments
  - Approve content
  - Generate reports
  - Access system settings

### 2. Faculty
- **Username:** `faculty`
- **Password:** `faculty123`
- **Access Level:** Academic content access
- **Capabilities:**
  - Access: Dashboard, Achievements, Course Files, Strategic Plan, NAAC Accreditation, Research & Innovation
  - Edit content (but not delete)
  - Upload files
  - Generate reports
  - Limited to their department view

### 3. Coordinator
- **Username:** `coordinator`
- **Password:** `coordinator123`
- **Access Level:** Department coordination
- **Capabilities:**
  - Access: Dashboard, Achievements, Course Files, Strategic Plan, NBA Tracking, Event Logs, Research & Innovation
  - Edit content (but not delete)
  - Upload files
  - View all departments
  - Approve content
  - Generate reports

## Features

### Login Page
- Beautiful landing page with role selection
- Three distinct login cards for each role
- Pre-filled credentials for easy demo testing
- Christ University branding

### Role-Based Navigation
- Sidebar dynamically shows only pages accessible to current role
- Role indicator badge shows current user role
- Automatic redirect to Dashboard if user attempts to access restricted page

### Permission-Based Features
- **Upload Button:** Only visible to users with upload permissions (all roles)
- **Delete Actions:** Only visible to Admins
- **Edit Actions:** Visible to Admins, Faculty, and Coordinators
- **Add Project Button:** Visible to users with edit permissions

### Visual Indicators
- **Role Badge in Sidebar:** Shows current user role with color coding
  - Admin: Blue
  - Faculty: Green
  - Coordinator: Purple
- **Role Indicator Banner:** Appears on Dashboard with role description
- **Logout Button:** Red logout icon in sidebar footer

### User Roles Page
- Comprehensive permissions matrix
- Visual breakdown of each role's capabilities
- Page access details for each role
- Color-coded role cards

## Technical Implementation

### Files Structure
```
/contexts/AuthContext.tsx         - Authentication state management
/config/permissions.ts             - Role permissions configuration
/components/LoginPage.tsx          - Login interface
/components/PermissionGuard.tsx    - Permission wrapper component
/components/RoleIndicator.tsx      - Role display component
/components/UserRolesPage.tsx      - Role documentation page
```

### Using Permissions in Components

```typescript
// Check if user has feature access
import { useAuth } from '../contexts/AuthContext';
import { hasFeatureAccess } from '../config/permissions';

const { user } = useAuth();

if (user && hasFeatureAccess(user.role, 'canDelete')) {
  // Show delete button
}
```

### Session Management
- Authentication state persists in localStorage
- User remains logged in across page refreshes
- Logout clears session and returns to login page

## Testing Different Roles

1. **Testing Admin Access:**
   - Login as admin
   - Verify all navigation items are visible
   - Check that delete/edit buttons appear on cards
   - Access User Roles page

2. **Testing Faculty Access:**
   - Login as faculty
   - Verify limited navigation (no NBA Tracking, Event Logs, User Roles)
   - Check that edit buttons appear but delete buttons don't
   - Try accessing restricted pages

3. **Testing Coordinator Access:**
   - Login as coordinator
   - Verify coordinator-specific navigation
   - Check approval and reporting capabilities
   - Verify access to all departments

## Future Enhancements

For production use, consider:
- Integration with Supabase for real authentication
- Password reset functionality
- User profile management
- Activity logging
- Multi-factor authentication
- Department-specific user assignments
