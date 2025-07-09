#!/usr/bin/env node

/**
 * Setup script to create the issue screenshots directory in GitHub
 * This should be run once to set up the repository for screenshot uploads
 */

const https = require('https');

async function makeGitHubRequest(path, method = 'GET', body = null) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    throw new Error('Missing required environment variables: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO');
  }

  const options = {
    hostname: 'api.github.com',
    path: `/repos/${owner}/${repo}${path}`,
    method,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'MixerAI-Setup',
    },
  };

  if (body) {
    options.headers['Content-Type'] = 'application/json';
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`GitHub API error: ${res.statusCode} - ${parsed.message || data}`));
          } else {
            resolve({ status: res.statusCode, data: parsed });
          }
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function setupScreenshotDirectory() {
  console.log('Setting up issue screenshots directory...');

  try {
    // Check if .github directory exists
    const githubDirCheck = await makeGitHubRequest('/contents/.github');
    
    if (githubDirCheck.status === 404) {
      console.log('.github directory does not exist. Please create it first.');
      return;
    }

    // Check if screenshots directory already exists
    const screenshotDirCheck = await makeGitHubRequest('/contents/.github/issue-screenshots');
    
    if (screenshotDirCheck.status === 200) {
      console.log('✓ Screenshots directory already exists');
      return;
    }

    // Create README for the screenshots directory
    const readmeContent = `# Issue Screenshots

This directory contains screenshots automatically uploaded when users report issues through the in-app issue reporter.

## Important Notes

- Screenshots are automatically uploaded when users submit bug reports
- Each screenshot is named with the pattern: \`issue-[number]-[timestamp].png\`
- These files are referenced in their corresponding GitHub issues
- Do not manually delete these files unless the corresponding issue is closed

## Privacy Considerations

- Screenshots may contain sensitive information
- Ensure your repository is private if dealing with sensitive data
- Consider implementing a cleanup policy for old screenshots

## Maintenance

To clean up old screenshots from closed issues, you can run a maintenance script (coming soon).
`;

    const readmeBase64 = Buffer.from(readmeContent).toString('base64');

    console.log('Creating README.md in screenshots directory...');
    const createResult = await makeGitHubRequest(
      '/contents/.github/issue-screenshots/README.md',
      'PUT',
      {
        message: 'Setup issue screenshots directory',
        content: readmeBase64,
        branch: 'main',
      }
    );

    if (createResult.status === 201) {
      console.log('✓ Successfully created screenshots directory with README');
    } else {
      console.log('Unexpected response:', createResult);
    }

  } catch (error) {
    console.error('Error setting up screenshot directory:', error.message);
    console.log('\nPlease ensure:');
    console.log('1. GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO environment variables are set');
    console.log('2. The token has write permissions to the repository');
    console.log('3. The .github directory exists in your repository');
  }
}

// Run the setup
setupScreenshotDirectory();