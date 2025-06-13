#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class AgentCoordinator {
  constructor() {
    this.progressFile = 'progress-tracker.json';
    this.dashboardFile = 'coordination-dashboard.json';
  }

  loadFile(filename) {
    try {
      return JSON.parse(fs.readFileSync(filename, 'utf8'));
    } catch (error) {
      console.error(`${colors.red}Error loading ${filename}: ${error.message}${colors.reset}`);
      return null;
    }
  }

  saveFile(filename, data) {
    try {
      fs.writeFileSync(filename, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`${colors.red}Error saving ${filename}: ${error.message}${colors.reset}`);
      return false;
    }
  }

  startAgent(agentId) {
    const assignmentFile = `${agentId}-assignments.json`;
    const statusFile = `${agentId}-status.json`;
    
    if (!fs.existsSync(assignmentFile)) {
      console.error(`${colors.red}Assignment file not found: ${assignmentFile}${colors.reset}`);
      return false;
    }

    const assignments = this.loadFile(assignmentFile);
    const status = this.loadFile(statusFile);
    
    if (!assignments || !status) return false;

    // Update status to started
    status.status = 'active';
    status.startedAt = new Date().toISOString();
    status.lastUpdate = new Date().toISOString();
    
    this.saveFile(statusFile, status);
    
    console.log(`${colors.green}${colors.bold}🚀 Agent ${agentId} started!${colors.reset}\n`);
    console.log(`${colors.bold}📋 Assignment Summary:${colors.reset}`);
    console.log(`• Issues assigned: ${colors.yellow}${assignments.issues.length}${colors.reset}`);
    console.log(`• Estimated time: ${colors.cyan}${assignments.totalEstimatedTime} minutes${colors.reset}`);
    console.log(`• Status file: ${colors.blue}${statusFile}${colors.reset}\n`);
    
    console.log(`${colors.bold}🎯 Next Issues (Priority Order):${colors.reset}`);
    assignments.issues.slice(0, 5).forEach((issue, index) => {
      const priorityColor = issue.severity === 'critical' ? colors.red : 
                           issue.severity === 'high' ? colors.yellow : colors.blue;
      console.log(`${index + 1}. ${priorityColor}${issue.id}${colors.reset} - ${issue.file}:${issue.line || '?'}`);
      console.log(`   ${issue.message.substring(0, 80)}...`);
      console.log(`   ${colors.gray}Category: ${issue.category}, Time: ${issue.estimatedTimeMinutes}min${colors.reset}\n`);
    });
    
    return true;
  }

  updateIssue(agentId, issueId, newStatus, comment = '') {
    const statusFile = `${agentId}-status.json`;
    const assignmentFile = `${agentId}-assignments.json`;
    
    const status = this.loadFile(statusFile);
    const assignments = this.loadFile(assignmentFile);
    
    if (!status || !assignments) return false;

    // Find the issue
    const issue = assignments.issues.find(i => i.id === issueId);
    if (!issue) {
      console.error(`${colors.red}Issue ${issueId} not found in ${agentId} assignments${colors.reset}`);
      return false;
    }

    // Update issue status
    issue.status = newStatus;
    issue.lastUpdate = new Date().toISOString();
    if (comment) issue.comment = comment;

    // Update agent status
    status.lastUpdate = new Date().toISOString();
    
    if (newStatus === 'in-progress') {
      status.currentIssue = issueId;
    } else if (newStatus === 'resolved') {
      status.completedIssues.push({
        issueId,
        completedAt: new Date().toISOString(),
        comment
      });
      status.currentIssue = null;
    } else if (newStatus === 'blocked') {
      status.blockedIssues.push({
        issueId,
        blockedAt: new Date().toISOString(),
        reason: comment
      });
      status.currentIssue = null;
    }

    // Save updates
    this.saveFile(statusFile, status);
    this.saveFile(assignmentFile, assignments);
    
    // Update progress tracker
    this.updateProgressTracker();
    
    console.log(`${colors.green}✅ Updated ${issueId} status to: ${newStatus}${colors.reset}`);
    return true;
  }

  updateProgressTracker() {
    const progress = this.loadFile(this.progressFile);
    if (!progress) return;

    let totalResolved = 0;
    let totalInProgress = 0;
    let totalBlocked = 0;

    progress.agents.forEach(agent => {
      const statusFile = `${agent.id}-status.json`;
      const status = this.loadFile(statusFile);
      
      if (status) {
        agent.status = status.status;
        agent.completedCount = status.completedIssues.length;
        agent.currentIssue = status.currentIssue;
        agent.lastUpdate = status.lastUpdate;
        
        totalResolved += status.completedIssues.length;
        totalInProgress += status.currentIssue ? 1 : 0;
        totalBlocked += status.blockedIssues.length;
      }
    });

    progress.resolvedIssues = totalResolved;
    progress.inProgressIssues = totalInProgress;
    progress.blockedIssues = totalBlocked;
    progress.lastUpdate = new Date().toISOString();

    this.saveFile(this.progressFile, progress);
  }

  showStatus() {
    const progress = this.loadFile(this.progressFile);
    const dashboard = this.loadFile(this.dashboardFile);
    
    if (!progress || !dashboard) return;

    this.updateProgressTracker();

    console.log(`${colors.cyan}${colors.bold}📊 COORDINATION DASHBOARD${colors.reset}\n`);
    
    // Overall progress
    const completionRate = ((progress.resolvedIssues / progress.totalIssues) * 100).toFixed(1);
    console.log(`${colors.bold}📈 Overall Progress:${colors.reset}`);
    console.log(`• Total Issues: ${colors.yellow}${progress.totalIssues}${colors.reset}`);
    console.log(`• Resolved: ${colors.green}${progress.resolvedIssues}${colors.reset} (${completionRate}%)`);
    console.log(`• In Progress: ${colors.blue}${progress.inProgressIssues}${colors.reset}`);
    console.log(`• Blocked: ${colors.red}${progress.blockedIssues}${colors.reset}`);
    console.log(`• Remaining: ${colors.yellow}${progress.totalIssues - progress.resolvedIssues - progress.inProgressIssues}${colors.reset}\n`);

    // Agent status
    console.log(`${colors.bold}🤖 Agent Status:${colors.reset}`);
    progress.agents.forEach(agent => {
      const statusColor = agent.status === 'active' ? colors.green :
                         agent.status === 'ready' ? colors.yellow : colors.gray;
      
      console.log(`• ${statusColor}${agent.id}${colors.reset}: ${agent.status}`);
      console.log(`  Completed: ${colors.green}${agent.completedCount}${colors.reset}`);
      if (agent.currentIssue) {
        console.log(`  Working on: ${colors.blue}${agent.currentIssue}${colors.reset}`);
      }
      if (agent.lastUpdate) {
        const lastUpdate = new Date(agent.lastUpdate).toLocaleTimeString();
        console.log(`  Last update: ${colors.gray}${lastUpdate}${colors.reset}`);
      }
      console.log('');
    });

    // Next available issues
    const mainReport = this.loadFile('code-issues-report.json');
    if (mainReport) {
      const availableIssues = mainReport.issues
        .filter(issue => issue.status === 'open')
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 5);
      
      if (availableIssues.length > 0) {
        console.log(`${colors.bold}🎯 Next Available Issues:${colors.reset}`);
        availableIssues.forEach((issue, index) => {
          const severityColor = issue.severity === 'critical' ? colors.red :
                               issue.severity === 'high' ? colors.yellow : colors.blue;
          console.log(`${index + 1}. ${severityColor}${issue.id}${colors.reset} - ${issue.category} (${issue.estimatedTimeMinutes}min)`);
          console.log(`   ${issue.file}:${issue.line || '?'} - ${issue.message.substring(0, 60)}...`);
        });
      }
    }
  }

  listAvailableAgents() {
    const dashboard = this.loadFile(this.dashboardFile);
    if (!dashboard) return;

    console.log(`${colors.bold}🤖 Available Agents:${colors.reset}\n`);
    dashboard.agents.forEach(agent => {
      console.log(`• ${colors.cyan}${agent.id}${colors.reset}`);
      console.log(`  Assignment file: ${agent.assignmentFile}`);
      console.log(`  Status file: ${agent.statusFile}`);
      console.log(`  Issues assigned: ${agent.issueCount}\n`);
    });
  }

  showHelp() {
    console.log(`${colors.bold}🛠️  AGENT COORDINATOR COMMANDS${colors.reset}\n`);
    console.log(`${colors.cyan}node agent-coordinator.js <command> [options]${colors.reset}\n`);
    console.log(`${colors.bold}Commands:${colors.reset}`);
    console.log(`• ${colors.green}start <agent-id>${colors.reset}     - Start an agent (e.g., agent-1)`);
    console.log(`• ${colors.green}status${colors.reset}               - Show overall progress dashboard`);
    console.log(`• ${colors.green}update <agent-id> <issue-id> <status> [comment]${colors.reset}`);
    console.log(`                         - Update issue status`);
    console.log(`• ${colors.green}agents${colors.reset}               - List all available agents`);
    console.log(`• ${colors.green}help${colors.reset}                 - Show this help\n`);
    console.log(`${colors.bold}Status Values:${colors.reset}`);
    console.log(`• ${colors.yellow}in-progress${colors.reset}  - Agent is working on the issue`);
    console.log(`• ${colors.green}resolved${colors.reset}     - Issue has been fixed`);
    console.log(`• ${colors.red}blocked${colors.reset}      - Issue is blocked (needs dependency)`);
    console.log(`• ${colors.blue}open${colors.reset}         - Issue is available for assignment\n`);
    console.log(`${colors.bold}Examples:${colors.reset}`);
    console.log(`${colors.gray}node agent-coordinator.js start agent-1${colors.reset}`);
    console.log(`${colors.gray}node agent-coordinator.js update agent-1 ISSUE-001 in-progress${colors.reset}`);
    console.log(`${colors.gray}node agent-coordinator.js update agent-1 ISSUE-001 resolved "Fixed type error"${colors.reset}`);
  }
}

// CLI Handler
function main() {
  const coordinator = new AgentCoordinator();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    coordinator.showHelp();
    return;
  }

  const command = args[0];
  
  switch (command) {
    case 'start':
      if (args.length < 2) {
        console.error(`${colors.red}Error: Agent ID required${colors.reset}`);
        console.log(`Usage: node agent-coordinator.js start <agent-id>`);
        return;
      }
      coordinator.startAgent(args[1]);
      break;
      
    case 'status':
      coordinator.showStatus();
      break;
      
    case 'update':
      if (args.length < 4) {
        console.error(`${colors.red}Error: Missing required arguments${colors.reset}`);
        console.log(`Usage: node agent-coordinator.js update <agent-id> <issue-id> <status> [comment]`);
        return;
      }
      coordinator.updateIssue(args[1], args[2], args[3], args[4] || '');
      break;
      
    case 'agents':
      coordinator.listAvailableAgents();
      break;
      
    case 'help':
    default:
      coordinator.showHelp();
      break;
  }
}

main();