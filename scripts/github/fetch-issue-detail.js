const https = require('https');

const token = process.env.GITHUB_TOKEN;
const issueNumber = process.argv[2];

if (!token) {
  console.error('GITHUB_TOKEN environment variable is not set');
  process.exit(1);
}

if (!issueNumber) {
  console.error('Please provide an issue number as argument');
  process.exit(1);
}

const options = {
  hostname: 'api.github.com',
  path: `/repos/gmi-common/mixerai2.0/issues/${issueNumber}`,
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
      const issue = JSON.parse(data);
      
      if (issue.message) {
        console.error('Error:', issue.message);
        return;
      }
      
      console.log(`Issue #${issue.number}: ${issue.title}`);
      console.log(`State: ${issue.state}`);
      console.log(`Labels: ${issue.labels.map(l => l.name).join(', ')}`);
      console.log(`Created: ${issue.created_at}`);
      console.log(`URL: ${issue.html_url}`);
      console.log('\nDescription:');
      console.log(issue.body || 'No description provided');
      
    } catch (error) {
      console.error('Error parsing JSON:', error);
    }
  });
}).on('error', (error) => {
  console.error('Error fetching issue:', error);
});