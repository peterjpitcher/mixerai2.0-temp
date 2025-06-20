const https = require('https');

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('GITHUB_TOKEN environment variable is not set');
  process.exit(1);
}

const options = {
  hostname: 'api.github.com',
  path: '/repos/gmi-common/mixerai2.0/issues?state=open&per_page=100',
  headers: {
    'User-Agent': 'MixerAI',
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json'
  }
};

https.get(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const issues = JSON.parse(data);
      
      if (!Array.isArray(issues)) {
        console.error('Unexpected response format:', data);
        return;
      }
      
      // Show all issues first to understand the labeling
      console.log(`Total open issues: ${issues.length}\n`);
      
      // Group issues by priority
      const criticalIssues = issues.filter(issue => 
        issue.labels && issue.labels.some(label => label.name === 'priority: critical')
      );
      const highIssues = issues.filter(issue => 
        issue.labels && issue.labels.some(label => label.name === 'priority: high')
      );
      const mediumIssues = issues.filter(issue => 
        issue.labels && issue.labels.some(label => label.name === 'priority: medium')
      );
      
      console.log(`Critical: ${criticalIssues.length}, High: ${highIssues.length}, Medium: ${mediumIssues.length}\n`);
      
      // Combine critical and high priority issues
      const priorityIssues = [...criticalIssues, ...highIssues];
      
      if (priorityIssues.length === 0) {
        console.log('No critical or high priority issues found.');
        console.log('\nShowing all open issues:');
        issues.forEach((issue, index) => {
          const labels = issue.labels.map(l => l.name).join(', ');
          console.log(`${index + 1}. Issue #${issue.number}: ${issue.title}`);
          console.log(`   Labels: ${labels || 'none'}`);
          console.log(`   URL: ${issue.html_url}`);
          console.log('---\n');
        });
        return;
      }
      
      console.log(`Found ${priorityIssues.length} critical/high priority issues:\n`);
      
      priorityIssues.forEach((issue, index) => {
        const priority = issue.labels.find(l => l.name.startsWith('priority:'))?.name || 'unknown';
        const type = issue.labels.find(l => l.name.startsWith('type:'))?.name || 'unknown';
        
        console.log(`${index + 1}. Issue #${issue.number}: ${issue.title}`);
        console.log(`   Priority: ${priority}`);
        console.log(`   Type: ${type}`);
        console.log(`   URL: ${issue.html_url}`);
        console.log(`   Description: ${issue.body ? issue.body.substring(0, 200) + '...' : 'No description'}`);
        console.log('---\n');
      });
      
    } catch (error) {
      console.error('Error parsing JSON:', error);
      console.error('Response:', data);
    }
  });
}).on('error', (error) => {
  console.error('Error fetching issues:', error);
});