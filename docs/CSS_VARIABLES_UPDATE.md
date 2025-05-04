# CSS Variables Update for MixerAI 2.0

As part of the UI standardization effort, we need to update the CSS variables in the application to align with our new color system. This document explains the changes needed to properly implement the new colors.

## Current System

The current implementation uses CSS variables for colors, defined in a global CSS file. These are then referenced in the Tailwind configuration.

## Required Changes

### 1. Update Global CSS File

Add or update the following CSS variables in the global CSS file (usually `src/app/globals.css`):

```css
:root {
  /* Base colors */
  --primary: 210 100% 40%; /* #0066CC */
  --primary-foreground: 0 0% 100%; /* White text on primary background */
  
  --accent: 0 60% 50%; /* #CC3333 */
  --accent-foreground: 0 0% 100%; /* White text on accent background */
  
  /* UI colors */
  --background: 210 33% 98%; /* #F5F7FA - Light app background */
  --foreground: 215 25% 27%; /* #323F4B - Primary text color */
  
  --card: 0 0% 100%; /* White */
  --card-foreground: 215 25% 27%; /* Same as foreground */
  
  --muted: 210 20% 92%; /* Light muted background */
  --muted-foreground: 215 16% 47%; /* #616E7C - Secondary text */
  
  --border: 214 20% 84%; /* #CBD2D9 - Border color */
  --input: 214 20% 84%; /* Same as border */
  
  --ring: 210 100% 40%; /* Same as primary */
  
  /* Status colors */
  --success: 142 70% 45%; /* #22C55E */
  --warning: 42 96% 56%; /* #FBBF24 */
  --destructive: 0 84% 60%; /* #EF4444 */
  
  /* Component specific */
  --radius: 0.5rem;
}

/* Dark mode variables - if needed */
.dark {
  --primary: 210 100% 45%; /* Slightly brighter in dark mode */
  --primary-foreground: 0 0% 100%;
  
  --accent: 0 60% 55%; /* Slightly brighter in dark mode */
  --accent-foreground: 0 0% 100%;
  
  --background: 215 28% 9%; /* #1F2933 - Dark background */
  --foreground: 210 20% 92%; /* Light text on dark background */
  
  /* Add additional dark mode variables here */
}
```

### 2. Verify Tailwind Config

The Tailwind configuration should already reference these CSS variables. Make sure the `tailwind.config.js` file properly uses them:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        // Other color definitions...
      },
    },
  },
};
```

### 3. Update Components to Use New Variables

Our components should now use these updated CSS variables. For components that need specific colors, we've extended the Tailwind config with direct hex values:

- `bg-top-nav` for the top navigation (blue)
- `bg-side-nav` for the side navigation (light blue)
- `bg-app` for the main application background
- `text-nav` for navigation text (white)
- `text-accent` for accent text (red)

Example usage:

```tsx
// Top navigation example
<header className="bg-top-nav text-nav">
  {/* Navigation content */}
</header>

// Side navigation example
<nav className="bg-side-nav">
  {/* Navigation items */}
</nav>

// Accent button example
<button className="bg-accent text-white hover:bg-accent-600">
  Delete
</button>
```

## Transition Strategy

1. Update the CSS variables in the global CSS file
2. Test the UI showcase page (`/ui-showcase`) to ensure colors are applied correctly
3. Gradually update components to use the new color classes
4. For custom components, use direct color references from our color system

## Testing

After making these changes, test the application thoroughly to ensure:

1. All components render with the correct colors
2. Text has sufficient contrast against backgrounds
3. Interactive elements (buttons, links) have clear hover/focus states
4. Status indicators (success, error messages) are clearly distinguishable

## Additional Considerations

1. **Accessibility**: Ensure all color combinations meet WCAG 2.1 AA contrast requirements
2. **Dark Mode**: If implementing dark mode, test all components in both light and dark themes
3. **Gradients**: For UI elements using gradients, use colors from the same palette (e.g., primary-400 to primary-600)

By following these guidelines, we'll achieve a consistent visual language throughout the application with our blue and red brand colors prominently featured. 