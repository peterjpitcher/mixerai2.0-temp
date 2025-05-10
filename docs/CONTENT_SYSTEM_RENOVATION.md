# Content System Renovation Plan

## Current State Analysis

The current content system in MixerAI 2.0 has the following components:

1. **Database Schema**:
   - `content` table with basic fields (title, body, meta_title, meta_description)
   - Simple content status enum ('draft', 'pending_review', 'approved', 'published', 'rejected')
   - Relations to brands, content_types, workflows, and profiles

2. **API Routes**:
   - `/api/content` - Basic CRUD operations
   - `/api/content/generate` - AI-powered content generation

3. **Components**:
   - `content-generator-form.tsx` - Main form for generating content
   - `content-approval-workflow.tsx` - Workflow management
   - `markdown-display.tsx` - Content display

## Renovation Goals

1. **Enhanced Content Structure**:
   - Add content versioning
   - Include SEO metrics and analytics
   - Support rich content formats (Markdown, HTML)
   - Add content categories and tags

2. **Improved Content Generation**:
   - Multi-step generation process
   - Feedback-based refinement
   - Content templates
   - Brand voice consistency checks

3. **Advanced Workflow**:
   - Granular permission controls
   - Review and approval chains
   - Content scheduling
   - Publishing to multiple channels

4. **Performance Optimization**:
   - Pagination and filtering
   - Content caching
   - Optimistic UI updates

## Implementation Plan

### Phase 1: Database Schema Updates

1. **Enhance Content Table**:
   ```sql
   ALTER TABLE content
   ADD COLUMN version INTEGER DEFAULT 1,
   ADD COLUMN published_version INTEGER,
   ADD COLUMN content_format TEXT DEFAULT 'markdown',
   ADD COLUMN seo_score INTEGER,
   ADD COLUMN categories TEXT[],
   ADD COLUMN tags TEXT[],
   ADD COLUMN scheduled_publish_date TIMESTAMP WITH TIME ZONE,
   ADD COLUMN last_published_date TIMESTAMP WITH TIME ZONE,
   ADD COLUMN analytics JSON;
   ```

2. **Create Content Versions Table**:
   ```sql
   CREATE TABLE content_versions (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     content_id UUID REFERENCES content(id) ON DELETE CASCADE,
     version_number INTEGER NOT NULL,
     title TEXT NOT NULL,
     body TEXT NOT NULL,
     meta_title TEXT,
     meta_description TEXT,
     created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     comment TEXT
   );
   ```

3. **Create Content Templates Table**:
   ```sql
   CREATE TABLE content_templates (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     name TEXT NOT NULL,
     description TEXT,
     content_type_id UUID REFERENCES content_types(id) ON DELETE CASCADE,
     template_structure JSON NOT NULL,
     created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

### Phase 2: API Route Updates

1. **Enhanced Content Routes**:
   - Update GET route to support pagination, filtering, and sorting
   - Add version control endpoints
   - Create analytics endpoints
   - Add scheduled publishing functionality

2. **Improved Generation Routes**:
   - Multi-stage generation process
   - Quality scoring
   - SEO analysis integration

### Phase 3: Component Updates

1. **Content Editor**:
   - Rich text editing
   - Version history viewer
   - SEO analysis panel
   - Scheduling interface

2. **Content Management**:
   - Content library with advanced filtering
   - Batch operations
   - Analytics dashboard

3. **Workflow Enhancements**:
   - Visual workflow builder
   - Email notifications
   - Approval chains

### Phase 4: Testing and Optimization

1. **Performance Testing**:
   - Database query optimization
   - Component rendering optimization
   - API response time benchmarking

2. **User Testing**:
   - Usability testing
   - Content creator feedback
   - Workflow efficiency analysis

## Timeline

- **Phase 1**: 1 week
- **Phase 2**: 1 week
- **Phase 3**: 2 weeks
- **Phase 4**: 1 week

Total estimated time: 5 weeks

## Migration Strategy

1. **Data Migration**:
   - Create migration scripts to convert existing content
   - Preserve all current content during schema updates
   - Add version history for existing content (v1)

2. **Rollout Plan**:
   - Deploy database changes first
   - Implement API changes with backward compatibility
   - Gradually update UI components
   - Add new features incrementally

## Success Criteria

1. All existing content preserved and accessible
2. Content creation process is 30% faster
3. SEO scores improve by 20% on average
4. Content approval time reduced by 40%
5. System supports 3x current content volume with no performance degradation 