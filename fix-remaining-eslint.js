const fs = require('fs');
const path = require('path');

// Fix patterns for common ESLint errors
const fixes = [
  // Fix unescaped entities
  {
    pattern: /([^\\])'(?![a-zA-Z])/g,
    replacement: '$1&apos;'
  },
  {
    pattern: /([^\\])"(?![a-zA-Z])/g,
    replacement: '$1&quot;'
  },
  // Remove unused imports - need to be careful
  {
    file: '/src/components/dashboard/dashboard-metrics.tsx',
    pattern: /import.*Loader2.*from.*lucide-react.*\n/,
    replacement: ''
  },
  {
    file: '/src/components/dashboard/mobile-notification-panel.tsx',
    pattern: /import Link from "next\/link"\n/,
    replacement: ''
  },
  {
    file: '/src/components/dashboard/mobile-notification-panel.tsx',
    pattern: /import { Separator } from "@\/components\/ui\/separator"\n/,
    replacement: ''
  },
  {
    file: '/src/components/dashboard/most-aged-content.tsx',
    pattern: /import { Button } from "@\/components\/ui\/button"\n/,
    replacement: ''
  },
  {
    file: '/src/components/dashboard/my-tasks.tsx',
    pattern: /import { Button } from "@\/components\/ui\/button"\n/,
    replacement: ''
  },
  {
    file: '/src/components/dashboard/notification-center.tsx',
    pattern: /, useEffect/,
    replacement: ''
  },
  {
    file: '/src/components/dashboard/notifications.tsx',
    pattern: /, X/,
    replacement: ''
  },
  {
    file: '/src/components/icons.tsx',
    pattern: /  ClipboardCheck,\n/,
    replacement: ''
  },
  {
    file: '/src/components/icons.tsx',
    pattern: /  LucideProps,\n/,
    replacement: ''
  },
  {
    file: '/src/components/icons.tsx',
    pattern: /  MoreHorizontal,\n/,
    replacement: ''
  },
  {
    file: '/src/components/icons.tsx',
    pattern: /  Pizza,\n/,
    replacement: ''
  },
  {
    file: '/src/components/layout/root-layout-wrapper.tsx',
    pattern: /, LogOut/,
    replacement: ''
  },
  {
    file: '/src/components/layout/top-navigation.tsx',
    pattern: /, Bell/,
    replacement: ''
  },
  {
    file: '/src/components/template/brand-claims-select.tsx',
    pattern: /,\s*SelectItem/,
    replacement: ''
  }
];

// Files to fix
const filesToFix = [
  '/src/components/dashboard/jump-back-in.tsx',
  '/src/components/dashboard/mobile-notification-panel.tsx',
  '/src/components/dashboard/most-aged-content.tsx',
  '/src/components/feedback/FeedbackSubmitForm.tsx',
  '/src/components/input.tsx',
  '/src/components/login-form.tsx',
  '/src/components/skeleton.tsx',
  '/src/components/template/brand-claims-select.tsx'
];

// Fix unescaped entities in specific files
filesToFix.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix unescaped quotes
    content = content.replace(/([^\\])'/g, '$1&apos;');
    content = content.replace(/([^\\])"/g, '$1&quot;');
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed unescaped entities in ${file}`);
  }
});

// Apply specific fixes
fixes.forEach(fix => {
  if (fix.file) {
    const filePath = path.join(__dirname, fix.file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      content = content.replace(fix.pattern, fix.replacement);
      fs.writeFileSync(filePath, content);
      console.log(`Applied fix to ${fix.file}`);
    }
  }
});

console.log('ESLint fixes applied!');