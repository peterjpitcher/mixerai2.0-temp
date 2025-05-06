# Workflow API Documentation

## Overview

The Workflow API manages content approval workflows in MixerAI 2.0. Workflows define how content is created, reviewed, and approved for each brand and content type.

## API Endpoints

### List All Workflows

```
GET /api/workflows
```

Returns a list of all workflows with related brand and content type information.

#### Response

```json
{
  "success": true,
  "workflows": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Standard Article Workflow",
      "brand_id": "123e4567-e89b-12d3-a456-426614174001",
      "brand_name": "TechGadgets",
      "content_type_id": "123e4567-e89b-12d3-a456-426614174002",
      "content_type_name": "Article",
      "steps": [
        {
          "id": 1,
          "name": "Author Review",
          "description": "Initial review by the content author",
          "role": "editor",
          "approvalRequired": true
        },
        {
          "id": 2,
          "name": "Brand Approval",
          "description": "Final approval by brand representative",
          "role": "admin",
          "approvalRequired": true
        }
      ],
      "steps_count": 2,
      "content_count": 5,
      "created_at": "2023-10-15T14:30:00Z",
      "updated_at": "2023-10-15T14:30:00Z"
    }
  ]
}
```

### Create Workflow

```
POST /api/workflows
```

Creates a new workflow.

#### Request Body

```json
{
  "name": "Standard Article Workflow",
  "brand_id": "123e4567-e89b-12d3-a456-426614174001",
  "content_type_id": "123e4567-e89b-12d3-a456-426614174002",
  "steps": [
    {
      "id": 1,
      "name": "Author Review",
      "description": "Initial review by the content author",
      "role": "editor",
      "approvalRequired": true
    },
    {
      "id": 2,
      "name": "Brand Approval",
      "description": "Final approval by brand representative",
      "role": "admin",
      "approvalRequired": true
    }
  ]
}
```

#### Response

```json
{
  "success": true,
  "workflow": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Standard Article Workflow",
    "brand_id": "123e4567-e89b-12d3-a456-426614174001",
    "content_type_id": "123e4567-e89b-12d3-a456-426614174002",
    "steps": [
      {
        "id": 1,
        "name": "Author Review",
        "description": "Initial review by the content author",
        "role": "editor",
        "approvalRequired": true
      },
      {
        "id": 2,
        "name": "Brand Approval",
        "description": "Final approval by brand representative",
        "role": "admin",
        "approvalRequired": true
      }
    ],
    "created_at": "2023-10-15T14:30:00Z",
    "updated_at": "2023-10-15T14:30:00Z"
  }
}
```

### Get Workflow

```
GET /api/workflows/{id}
```

Retrieves a specific workflow by ID.

#### Response

```json
{
  "success": true,
  "workflow": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Standard Article Workflow",
    "brand_id": "123e4567-e89b-12d3-a456-426614174001",
    "brand_name": "TechGadgets",
    "content_type_id": "123e4567-e89b-12d3-a456-426614174002",
    "content_type_name": "Article",
    "steps": [
      {
        "id": 1,
        "name": "Author Review",
        "description": "Initial review by the content author",
        "role": "editor",
        "approvalRequired": true
      },
      {
        "id": 2,
        "name": "Brand Approval",
        "description": "Final approval by brand representative",
        "role": "admin",
        "approvalRequired": true
      }
    ],
    "steps_count": 2,
    "created_at": "2023-10-15T14:30:00Z",
    "updated_at": "2023-10-15T14:30:00Z"
  }
}
```

### Update Workflow

```
PUT /api/workflows/{id}
```

Updates a specific workflow.

#### Request Body

```json
{
  "name": "Updated Article Workflow",
  "steps": [
    {
      "id": 1,
      "name": "Author Review",
      "description": "Initial review by the content author",
      "role": "editor",
      "approvalRequired": true
    },
    {
      "id": 2,
      "name": "Editorial Review",
      "description": "Review by an editor for language and style",
      "role": "editor",
      "approvalRequired": true
    },
    {
      "id": 3,
      "name": "Brand Approval",
      "description": "Final approval by brand representative",
      "role": "admin",
      "approvalRequired": true
    }
  ]
}
```

#### Response

```json
{
  "success": true,
  "workflow": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Updated Article Workflow",
    "brand_id": "123e4567-e89b-12d3-a456-426614174001",
    "content_type_id": "123e4567-e89b-12d3-a456-426614174002",
    "steps": [
      {
        "id": 1,
        "name": "Author Review",
        "description": "Initial review by the content author",
        "role": "editor",
        "approvalRequired": true
      },
      {
        "id": 2,
        "name": "Editorial Review",
        "description": "Review by an editor for language and style",
        "role": "editor",
        "approvalRequired": true
      },
      {
        "id": 3,
        "name": "Brand Approval",
        "description": "Final approval by brand representative",
        "role": "admin",
        "approvalRequired": true
      }
    ],
    "created_at": "2023-10-15T14:30:00Z",
    "updated_at": "2023-10-16T09:45:00Z"
  }
}
```

### Delete Workflow

```
DELETE /api/workflows/{id}
```

Deletes a specific workflow. Will fail if there is content associated with the workflow.

#### Response (Success)

```json
{
  "success": true,
  "message": "Workflow deleted successfully"
}
```

#### Response (Error - Has Associated Content)

```json
{
  "success": false,
  "error": "Cannot delete workflow that has associated content"
}
```

### Get Workflow Templates

```
GET /api/workflows/templates
```

Returns predefined workflow templates for different content types.

#### Response

```json
{
  "success": true,
  "templates": [
    {
      "id": "article-standard",
      "name": "Standard Article Workflow",
      "contentType": "article",
      "description": "A standard 3-step approval process for articles",
      "steps": [
        {
          "id": 1,
          "name": "Author Review",
          "description": "Initial review by the content author",
          "role": "editor",
          "approvalRequired": true
        },
        {
          "id": 2,
          "name": "Editorial Review",
          "description": "Review by an editor for language and style",
          "role": "editor",
          "approvalRequired": true
        },
        {
          "id": 3,
          "name": "Brand Approval",
          "description": "Final approval by brand representative",
          "role": "admin",
          "approvalRequired": true
        }
      ]
    },
    // additional templates...
  ]
}
```

## Error Handling

All API endpoints return error responses in the following format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### Common Error Status Codes

- `400 Bad Request` - Missing required fields or invalid input
- `404 Not Found` - Workflow not found
- `409 Conflict` - Unique constraint violation or cannot delete a workflow with associated content
- `500 Internal Server Error` - Server-side error

## Implementation Notes

- Each workflow is associated with a specific brand and content type
- The combination of brand_id and content_type_id must be unique
- Workflows with associated content cannot be deleted
- The steps field is stored as a JSONB array in the database 