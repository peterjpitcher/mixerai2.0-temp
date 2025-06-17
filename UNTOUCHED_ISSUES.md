# Untouched GitHub Issues - MixerAI 2.0

## Overview
This document lists all GitHub issues that have NOT been addressed in the current PR #136.

---

## 🔴 P0: Critical Issues (Need Immediate Attention)

### #128 - Generate Content Not Working
- **Status**: UNTOUCHED
- **Type**: Bug
- **Description**: Content generation completely broken - missing brand_id in API request
- **Root Cause**: Frontend form not passing brand_id to API
- **Impact**: Core functionality blocked

---

## 🔴 P1: High Priority Issues

### #129 - AI Suggest Not Working
- **Status**: UNTOUCHED
- **Type**: Bug/Enhancement
- **Description**: AI suggestion buttons show error "not yet implemented"
- **Root Cause**: Backend implementation missing
- **Required**: New API endpoint and Azure OpenAI integration

### #113 - Alt Text Generator Color Descriptions
- **Status**: UNTOUCHED
- **Type**: Bug (Accessibility)
- **Description**: Alt text includes color descriptions, violating accessibility
- **Required**: Update AI prompts to exclude color terms

### #116 - Review Content Rejection Workflow
- **Status**: UNTOUCHED
- **Type**: Enhancement
- **Description**: Improve rejection workflow process
- **Required**: UX/workflow analysis and implementation

### #115 - Handle Workflow Reassignment
- **Status**: UNTOUCHED
- **Type**: Enhancement
- **Description**: System doesn't handle workflow reassignment when users removed
- **Impact**: Orphaned workflow tasks

### #108 - User Invites Expiring Too Quickly
- **Status**: UNTOUCHED
- **Type**: Bug
- **Description**: Invites expire too fast, should be 7 days
- **Current**: Unknown expiration time
- **Required**: Update invite expiration logic

### #107 - Claims Brand Review Deduplication Bug
- **Status**: UNTOUCHED
- **Type**: Bug
- **Description**: Claims being consolidated/deduplicated incorrectly
- **Impact**: Data accuracy and compliance issues

### #95 - Resend Invitation Button Missing
- **Status**: UNTOUCHED
- **Type**: Bug
- **Description**: No way to resend expired invitations
- **Impact**: User onboarding friction

---

## 🟡 P2: Medium Priority Issues

### UI/UX Issues

#### #132 - CTA Button Out of Container
- **Status**: UNTOUCHED
- **Type**: Bug, UI Standards
- **Description**: Call-to-action button rendering outside container

#### #109 - Brand Logo Upload
- **Status**: UNTOUCHED
- **Type**: Enhancement
- **Description**: Need ability to upload brand logos instead of using icons

#### #103 - Create New Content Navigation Bug
- **Status**: UNTOUCHED
- **Type**: Bug
- **Description**: Button navigates to wrong page

#### #94 - Touch Targets Too Small
- **Status**: UNTOUCHED
- **Type**: Enhancement, Accessibility
- **Description**: Interactive elements below 44x44px minimum

### Feature Enhancements

#### #126 - Claims Approval Flow ✅
- **Status**: IMPLEMENTED in PR #136
- **Note**: Already completed but still shows as open

#### #105 - Due Date Functionality
- **Status**: UNTOUCHED
- **Type**: Enhancement
- **Description**: Add due dates for content publishing

#### #102 - Content Regeneration at Workflow Steps
- **Status**: UNTOUCHED
- **Type**: Enhancement
- **Description**: Allow regenerating content during workflow

#### #101 - Email Notifications for Tasks
- **Status**: UNTOUCHED
- **Type**: Enhancement
- **Description**: Add email notifications for task assignments

#### #100 - Restrict Editing of Approved Content
- **Status**: UNTOUCHED
- **Type**: Enhancement
- **Description**: Lock content after approval

#### #99 - URL/Slug Generation
- **Status**: UNTOUCHED
- **Type**: Enhancement
- **Description**: Auto-generate URLs for article templates

#### #98 - Feedback Form Issues
- **Status**: UNTOUCHED
- **Type**: Bug
- **Description**: Multiple functionality issues with feedback form

#### #97 - File Attachments for Brand Guidelines
- **Status**: UNTOUCHED
- **Type**: Enhancement
- **Description**: Allow attaching files to brand guidelines

### Batch History Features

#### #112 - Content Trans-Creator Batch Grouping
- **Status**: UNTOUCHED
- **Type**: Enhancement
- **Description**: Group past runs by batch

#### #111 - Metadata Generator Batch Grouping
- **Status**: UNTOUCHED
- **Type**: Enhancement
- **Description**: Group past runs by batch

#### #110 - Alt Text Generator Batch Grouping
- **Status**: UNTOUCHED
- **Type**: Enhancement
- **Description**: Group past runs by batch

---

## 🟢 P3: Low Priority Issues

### #96 - CSV Export Single Row Bug
- **Status**: UNTOUCHED
- **Type**: Bug
- **Description**: CSV data appears in single row

### #93 - Mixed Loading Indicators
- **Status**: UNTOUCHED
- **Type**: Enhancement, UI Standards
- **Description**: Inconsistent use of spinners vs skeletons

### #92 - Data Tables Mobile Adaptation
- **Status**: UNTOUCHED
- **Type**: Enhancement, UI Standards
- **Description**: Tables don't adapt to mobile screens

### #91 - Small Touch Targets
- **Status**: UNTOUCHED
- **Type**: Enhancement, UI Standards
- **Description**: Interactive elements below minimum size

### #90 - Empty States Missing Icons
- **Status**: UNTOUCHED
- **Type**: Enhancement, UI Standards
- **Description**: Empty states need icons and centering

### #89 - Date Formatting Standards
- **Status**: UNTOUCHED
- **Type**: Enhancement, UI Standards
- **Description**: Dates not following standard format

---

## Summary Statistics

### Total Untouched Issues: 28

By Priority:
- **P0 (Critical)**: 1 issue
- **P1 (High)**: 7 issues  
- **P2 (Medium)**: 14 issues
- **P3 (Low)**: 6 issues

By Type:
- **Bugs**: 12 issues
- **Enhancements**: 16 issues
- **UI Standards**: 7 issues
- **Accessibility**: 2 issues

### Already Implemented (but still open):
- #126 - Claims Approval Flow
- #121 - Dashboard Redesign (marked as open but implemented)

### Recommended Next Sprint (Top 10):

1. **#128** - Fix content generation (CRITICAL)
2. **#129** - Implement AI suggestions
3. **#113** - Remove color from alt text
4. **#107** - Fix claims deduplication
5. **#108** - Fix invite expiration
6. **#116** - Improve rejection workflow
7. **#115** - Handle workflow reassignment
8. **#95** - Add resend invitation
9. **#132** - Fix CTA button UI
10. **#109** - Add logo upload feature