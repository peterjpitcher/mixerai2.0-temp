# Feedback Logging and Viewing System

## 1. Purpose

This system allows global administrators to log enhancement requests and bug reports. It also provides a view-only page for all authenticated users to see these logged items, promoting transparency about known issues and planned improvements.

## 2. Database Schema

A new table, `feedback_items`, will be created in the PostgreSQL database.

### Enums

The following ENUM types will be created:

*   **`feedback_type`**:
    *   `bug`
    *   `enhancement`
*   **`feedback_priority`**:
    *   `low`
    *   `medium`
    *   `high`
    *   `critical`
*   **`feedback_status`**:
    *   `open` (Default)
    *   `in_progress`
    *   `resolved`
    *   `closed`
    *   `wont_fix`

### `feedback_items` Table Schema

| Column                | Type                    | Constraints                                     | Description                                                                 |
| --------------------- | ----------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| `id`                  | `UUID`                  | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()`     | Unique identifier for the feedback item.                                    |
| `created_at`          | `TIMESTAMP WITH TIME ZONE`| `DEFAULT NOW()`                                 | Timestamp of when the item was created.                                     |
| `created_by`          | `UUID`                  | `REFERENCES public.profiles(id) ON DELETE SET NULL` | ID of the admin user's profile (`profiles.id`) who logged the item.         |
| `type`                | `feedback_type`         | `NOT NULL`                                      | Type of feedback: 'bug' or 'enhancement'.                                   |
| `title`               | `TEXT`                  |                                                 | A concise title for the item.                                               |
| `description`         | `TEXT`                  |                                                 | Detailed description of the bug or enhancement.                             |
| `priority`            | `feedback_priority`     | `NOT NULL`                                      | Priority level of the item.                                                 |
| `status`              | `feedback_status`       | `NOT NULL`, `DEFAULT 'open'`                    | Current status of the item.                                                 |
| `affected_area`       | `TEXT`                  |                                                 | Optional: e.g., "Dashboard", "Content Creation", "API".                     |
| `steps_to_reproduce`  | `TEXT`                  |                                                 | Optional: Primarily for bugs.                                               |
| `expected_behavior`   | `TEXT`                  |                                                 | Optional: Primarily for bugs.                                               |
| `actual_behavior`     | `TEXT`                  |                                                 | Optional: Primarily for bugs.                                               |
| `attachments_metadata`| `JSONB`                 |                                                 | Optional: Metadata for any attachments (e.g., filenames, storage URLs).     |
| `app_version`         | `TEXT`                  |                                                 | Optional: Application version relevant to the item.                         |
| `user_impact_details` | `TEXT`                  |                                                 | Optional: Notes on user impact or potential benefits.                       |

## 3. API Endpoints

All endpoints will be under `/api/feedback`.

### `POST /api/feedback`

*   **Method**: `POST`
*   **Purpose**: Creates a new feedback item.
*   **Authorization**: Authenticated Users. The RLS policy on the `feedback_items` table allows any authenticated user to insert new records. The API endpoint first verifies that the user is authenticated.
*   **Request Body**: JSON object matching a subset of the `feedback_items` table structure.
    *   `type` (required)
    *   `priority` (required)
    *   `title` (encouraged)
    *   Other fields are optional.
*   **Response**:
    *   Success (201 Created): The created feedback item.
    *   Error (400 Bad Request, 401 Unauthorized, 403 Forbidden, 500 Internal Server Error).

### `GET /api/feedback`

*   **Method**: `GET`
*   **Purpose**: Retrieves a list of feedback items.
*   **Authorization**: Authenticated Users. The RLS policy on `feedback_items` table allows all authenticated users to read.
*   **Query Parameters (Optional)**:
    *   `

## 6. Navigation / UI Access

*   **Submit Feedback Page**:
    *   **Path**: `/dashboard/admin/feedback-log` (Note: The route contains "admin" for historical reasons but is now accessible to all authenticated users for submission).
    *   **Access**: All authenticated users.
    *   **Purpose**: Allows users to submit new bug reports or enhancement requests.
    *   **Navigation Link**: "Submit Feedback" in the main sidebar.

*   **View Feedback Page**:
    *   **Path**: `/dashboard/feedback`
    *   **Access**: All authenticated users.
    *   **Purpose**: Provides a read-only view of all logged feedback items.
    *   **Navigation Link**: "View Feedback" in the main sidebar.

## 7. Future Enhancements (Optional)