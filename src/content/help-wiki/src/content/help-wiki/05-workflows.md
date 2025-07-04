# Understanding Workflows

Workflows are approval processes that ensure content is reviewed before publication. Each workflow has steps that must be completed in order.

## Following a Workflow

### How do I submit content to a workflow?

When you create content:
1. Select a template
2. Choose a brand
3. The workflow is automatically assigned based on the brand and template combination
4. Content enters the workflow when you save it

**Note**: You cannot manually select a workflow - it's determined by your brand and template selection.

### How do I track my content through workflow?

1. Open your content from the Content list
2. Look for workflow information in the content details
3. You'll see:
   - Current workflow step
   - Who's assigned to review
   - Workflow status

### What happens after I submit?

1. Content goes to the first workflow step
2. Assigned reviewer gets the task in their My Tasks
3. They can either:
   - **Approve** - Moves to next step
   - **Reject** - Workflow stops, you get notified
4. Process continues until all steps complete

## Reviewing Content

### How do I review content assigned to me?

1. Click **My Tasks** in navigation
2. Find content awaiting your review
3. Click to open the content
4. Review the content
5. Choose an action:
   - **Approve** - Content advances
   - **Reject** - Workflow stops (must provide feedback)

### Important limitations:

- No "Request Changes" option - only approve or reject
- Cannot reassign to another reviewer
- Cannot skip workflow steps
- If changes are needed, you must reject with feedback

## Creating Workflows (Admin)

### How do I create a new workflow?

1. Click **Workflows** in navigation
2. Click **New Workflow**
3. Enter workflow details:
   - **Name** - Clear, descriptive name
   - **Description** - When to use this workflow
   - **Brand** - Which brand this workflow is for
   - **Template** - Which template triggers this workflow
4. Add workflow steps (see below)
5. Click **Save Workflow**

### How do I add steps to a workflow?

1. In the workflow editor, click **Add Step**
2. Configure the step:
   - **Step Name** - What happens here (e.g., "Editor Review")
   - **Assigned Users** - Select specific users who can review
   - **Order** - Steps execute in this sequence
3. Add more steps as needed
4. Save the workflow

### Workflow Assignment Rules

- Each brand can have multiple workflows
- Each workflow is tied to a specific template
- When content is created with that template for that brand, the workflow is automatically applied
- Users must be explicitly assigned to workflow steps

## Common Workflow Patterns

### Basic Review
1. Editor Review - Check quality
2. Publish

### Multi-step Approval
1. Editor Review - Content quality
2. Manager Approval - Final check
3. Publish

## Troubleshooting

### My content doesn't have a workflow

- Check if a workflow exists for your brand/template combination
- Contact your admin to create the needed workflow

### Content is stuck in workflow

- Check who's assigned to the current step
- They are the only ones who can approve/reject
- Contact them directly for status

### I can't approve content

Make sure:
- You're assigned to the current workflow step
- You're viewing the content through My Tasks
- The content is actually at your step

## Best Practices

### For Content Creators
- Understand which template triggers which workflow
- Make content as complete as possible before saving
- Respond quickly to rejection feedback

### For Reviewers
- Check My Tasks daily
- Review thoroughly before approving
- Provide specific feedback when rejecting
- Communicate directly with creators about needed changes

### For Workflow Admins
- Keep workflows simple (2-3 steps maximum)
- Assign multiple users to each step for coverage
- Name steps clearly (what's being reviewed)
- Test workflows before activating