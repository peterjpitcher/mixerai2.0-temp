# Using Content Templates

Templates are pre-built forms that guide you through creating specific types of content. They ensure consistency and help the AI understand what kind of content to generate.

## Using Templates

### How do I create content with a template?

1. Click **Content** → **New Content**
2. Select your brand
3. In the **Template** dropdown, choose a template
4. The form updates with template-specific fields
5. Fill in all required fields (marked with *)
6. Click **Generate with AI**
7. Review and save your content

### What if there's no template for what I need?

1. Select **"No Template"** from the dropdown
2. You'll get basic fields for content creation
3. Or ask your admin to create a new template
4. You can also duplicate and modify existing content

### How do I know which template to use?

- Template names describe their purpose (e.g., "Blog Post", "Social Media")
- Click the **(i)** icon next to a template to see its description
- Ask your team lead if unsure

## Creating Templates (Admin)

### How do I create a new template?

1. Click **Templates** in the left navigation
2. Click **New Template**
3. Enter basic information:
   - **Template Name** - Clear, descriptive name
   - **Content Type** - What kind of content this creates
   - **Description** - When to use this template
4. Click **Add Field** to add form fields
5. Configure each field (see below)
6. Set up the AI prompt
7. Click **Save Template**

### How do I add fields to a template?

1. Click **Add Field**
2. Choose the field type:
   - **Text** - Single line (titles, headlines)
   - **Textarea** - Multiple lines (descriptions)
   - **Select** - Dropdown menu
   - **Product Selector** - Choose products
   - **Rich Text** - Formatted content
3. Configure the field:
   - **Field Name** - System name (no spaces)
   - **Label** - What users see
   - **Required** - Must be filled?
   - **Help Text** - Instructions for users
4. Click **Save Field**

### How do I set up AI generation?

1. In the template editor, find **AI Configuration**
2. Write instructions for the AI:
   - What to generate
   - Tone and style
   - Length requirements
   - What to include/avoid
3. Reference fields using `{{fieldName}}`
4. Example: "Write a blog post about {{topic}} that is {{length}} words long"

### How do I edit an existing template?

1. Click **Templates** in navigation
2. Click on the template name
3. Click **Edit**
4. Make your changes
5. Click **Save Changes**

**Note**: Editing a template doesn't change existing content created with it.

## Field Types Explained

### Text Field
- For short inputs like titles or names
- Single line only
- Good for: Headlines, product names, author names

### Textarea Field  
- For longer text without formatting
- Multiple lines allowed
- Good for: Descriptions, summaries, meta descriptions

### Select Field
- Dropdown with predefined options
- Users pick one option
- Good for: Categories, content types, regions

### Product Selector
- Browse and select products
- Includes product claims automatically
- Good for: Product-focused content

### Rich Text Field
- Full text editor with formatting
- Bold, italic, lists, links
- Good for: Blog posts, detailed content

## Template Best Practices

### Naming Templates
- Use clear, specific names
- Include content type (e.g., "Blog Post - Product Review")
- Avoid abbreviations

### Field Setup
- Mark truly required fields only
- Add helpful placeholder text
- Include examples in help text
- Order fields logically

### AI Instructions
- Be specific about length and format
- Reference brand guidelines
- Include dos and don'ts
- Test with sample content

## Troubleshooting

### Template not showing up?

1. Check if template is active
2. Verify you have permission to use it
3. Refresh the page
4. Contact your admin

### Fields not generating content?

1. Make sure field has AI instructions
2. Check that field name matches in prompt
3. Verify all required fields are filled
4. Try regenerating

### Need to change a template?

Only admins can edit templates. Request changes through your team lead or admin.