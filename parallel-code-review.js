#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 PARALLEL CODE REVIEW - GENERATING STRUCTURED ISSUES...\n');

// Color codes for output
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

class IssueTracker {
  constructor() {
    this.issues = [];
    this.issueCounter = 1;
  }

  addIssue(type, severity, file, line, code, message, category, estimatedTime, dependencies = []) {
    const issue = {
      id: `ISSUE-${this.issueCounter.toString().padStart(3, '0')}`,
      type, // 'eslint' | 'typescript' | 'build' | 'dependency'
      severity, // 'critical' | 'high' | 'medium' | 'low'
      category, // 'performance' | 'types' | 'hooks' | 'security' | 'accessibility'
      file,
      line: line || null,
      code: code || null,
      message,
      estimatedTimeMinutes: estimatedTime,
      dependencies, // Array of issue IDs that must be resolved first
      status: 'open', // 'open' | 'assigned' | 'in-progress' | 'resolved' | 'blocked'
      assignedTo: null,
      assignedAt: null,
      resolvedAt: null,
      priority: this.calculatePriority(severity, category, dependencies.length)
    };
    
    this.issues.push(issue);
    this.issueCounter++;
    return issue.id;
  }

  calculatePriority(severity, category, dependencyCount) {
    let score = 0;
    
    // Severity scoring
    switch (severity) {
      case 'critical': score += 100; break;
      case 'high': score += 75; break;
      case 'medium': score += 50; break;
      case 'low': score += 25; break;
    }
    
    // Category scoring (blockers get higher priority)
    if (category === 'types') score += 50; // Type errors block builds
    if (category === 'hooks') score += 30; // React hooks affect functionality
    if (category === 'performance') score += 20; // Performance affects UX
    
    // Dependency scoring (issues with dependencies get lower priority)
    score -= dependencyCount * 10;
    
    return score;
  }

  assignIssue(issueId, agentName) {
    const issue = this.issues.find(i => i.id === issueId);
    if (issue && issue.status === 'open') {
      issue.status = 'assigned';
      issue.assignedTo = agentName;
      issue.assignedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  getAvailableIssues() {
    return this.issues
      .filter(issue => issue.status === 'open' && issue.dependencies.every(depId => 
        this.issues.find(i => i.id === depId)?.status === 'resolved'
      ))
      .sort((a, b) => b.priority - a.priority);
  }

  generateReport() {
    const summary = {
      total: this.issues.length,
      byType: {},
      bySeverity: {},
      byCategory: {},
      byStatus: {}
    };

    this.issues.forEach(issue => {
      summary.byType[issue.type] = (summary.byType[issue.type] || 0) + 1;
      summary.bySeverity[issue.severity] = (summary.bySeverity[issue.severity] || 0) + 1;
      summary.byCategory[issue.category] = (summary.byCategory[issue.category] || 0) + 1;
      summary.byStatus[issue.status] = (summary.byStatus[issue.status] || 0) + 1;
    });

    return {
      timestamp: new Date().toISOString(),
      summary,
      issues: this.issues,
      availableForAssignment: this.getAvailableIssues().map(i => i.id),
      estimatedTotalTime: this.issues.reduce((sum, i) => sum + i.estimatedTimeMinutes, 0)
    };
  }
}

function parseESLintOutput(output, tracker) {
  const lines = output.split('\n');
  let currentFile = null;
  
  lines.forEach(line => {
    // Match file paths
    const fileMatch = line.match(/^\.\/(.+)$/);
    if (fileMatch) {
      currentFile = fileMatch[1];
      return;
    }
    
    // Match ESLint errors/warnings
    const errorMatch = line.match(/^(\d+):(\d+)\s+(Warning|Error):\s+(.+?)\s+(.+)$/);
    if (errorMatch && currentFile) {
      const [, lineNum, col, type, message, rule] = errorMatch;
      const severity = type === 'Error' ? 'critical' : 'medium';
      let category = 'code-quality';
      let estimatedTime = 5;
      
      // Categorize based on rule
      if (rule.includes('react-hooks')) {
        category = 'hooks';
        estimatedTime = 15;
      } else if (rule.includes('no-img-element')) {
        category = 'performance';
        estimatedTime = 10;
      } else if (rule.includes('exhaustive-deps')) {
        category = 'hooks';
        estimatedTime = 20;
      }
      
      tracker.addIssue(
        'eslint',
        severity,
        currentFile,
        parseInt(lineNum),
        rule,
        message,
        category,
        estimatedTime
      );
    }
  });
}

function parseTypeScriptOutput(output, tracker) {
  const lines = output.split('\n');
  
  lines.forEach(line => {
    const errorMatch = line.match(/^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/);
    if (errorMatch) {
      const [, file, lineNum, col, code, message] = errorMatch;
      const cleanFile = file.replace(/^src\//, '');
      let category = 'types';
      let severity = 'high';
      let estimatedTime = 15;
      
      // Categorize TypeScript errors
      if (message.includes('Property') && message.includes('does not exist')) {
        category = 'types';
        severity = 'high';
        estimatedTime = 10;
      } else if (message.includes('Type') && message.includes('is not assignable')) {
        category = 'types';
        severity = 'high';
        estimatedTime = 20;
      } else if (message.includes('Cannot find name')) {
        category = 'types';
        severity = 'critical';
        estimatedTime = 15;
      } else if (message.includes('Conversion of type')) {
        category = 'types';
        severity = 'medium';
        estimatedTime = 25;
      }
      
      tracker.addIssue(
        'typescript',
        severity,
        cleanFile,
        parseInt(lineNum),
        code,
        message,
        category,
        estimatedTime
      );
    }
  });
}

function runCommand(command, description) {
  console.log(`${colors.blue}${colors.bold}Running: ${command}${colors.reset}`);
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      maxBuffer: 1024 * 1024 * 10
    });
    
    console.log(`${colors.green}✓ ${description} completed${colors.reset}`);
    return { success: true, output };
    
  } catch (error) {
    console.log(`${colors.yellow}⚠ ${description} found issues${colors.reset}`);
    return { success: false, output: error.stdout || error.message, stderr: error.stderr };
  }
}

async function main() {
  const tracker = new IssueTracker();
  
  console.log(`${colors.cyan}${colors.bold}📊 PHASE 1: COLLECTING ISSUES${colors.reset}\n`);
  
  // Run ESLint
  const eslintResult = runCommand('npx next lint', 'ESLint Analysis');
  if (eslintResult.output) {
    parseESLintOutput(eslintResult.output, tracker);
  }
  
  console.log('');
  
  // Run TypeScript
  const tscResult = runCommand('npx tsc --noEmit', 'TypeScript Analysis');
  if (tscResult.output || tscResult.stderr) {
    parseTypeScriptOutput(tscResult.output + '\n' + (tscResult.stderr || ''), tracker);
  }
  
  console.log(`\n${colors.cyan}${colors.bold}📋 PHASE 2: GENERATING STRUCTURED OUTPUT${colors.reset}\n`);
  
  // Generate structured report
  const report = tracker.generateReport();
  
  // Save main report
  const reportPath = path.join(process.cwd(), 'code-issues-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Generate agent assignment files
  const agentCount = 4; // Configurable number of agents
  const availableIssues = tracker.getAvailableIssues();
  const issuesPerAgent = Math.ceil(availableIssues.length / agentCount);
  
  for (let i = 0; i < agentCount; i++) {
    const agentIssues = availableIssues.slice(i * issuesPerAgent, (i + 1) * issuesPerAgent);
    const agentReport = {
      agentId: `agent-${i + 1}`,
      assignedAt: new Date().toISOString(),
      issues: agentIssues,
      totalEstimatedTime: agentIssues.reduce((sum, issue) => sum + issue.estimatedTimeMinutes, 0),
      instructions: {
        workflow: [
          "1. Review assigned issues in priority order",
          "2. Mark issue as 'in-progress' when starting work",
          "3. Fix the issue and test the solution",
          "4. Mark issue as 'resolved' when complete",
          "5. Update the status file with progress"
        ],
        statusFile: `agent-${i + 1}-status.json`,
        reportingFrequency: "Update status after each completed issue"
      }
    };
    
    const agentFilePath = path.join(process.cwd(), `agent-${i + 1}-assignments.json`);
    fs.writeFileSync(agentFilePath, JSON.stringify(agentReport, null, 2));
    
    // Create initial status file
    const statusFilePath = path.join(process.cwd(), `agent-${i + 1}-status.json`);
    const initialStatus = {
      agentId: `agent-${i + 1}`,
      status: 'ready',
      currentIssue: null,
      completedIssues: [],
      blockedIssues: [],
      startedAt: null,
      lastUpdate: new Date().toISOString()
    };
    fs.writeFileSync(statusFilePath, JSON.stringify(initialStatus, null, 2));
  }
  
  // Create coordination dashboard
  const dashboardData = {
    overview: {
      totalIssues: report.summary.total,
      criticalIssues: report.summary.bySeverity.critical || 0,
      estimatedTotalTime: report.estimatedTotalTime,
      agentCount,
      averageTimePerAgent: Math.round(report.estimatedTotalTime / agentCount)
    },
    agents: Array.from({ length: agentCount }, (_, i) => ({
      id: `agent-${i + 1}`,
      assignmentFile: `agent-${i + 1}-assignments.json`,
      statusFile: `agent-${i + 1}-status.json`,
      issueCount: Math.ceil(availableIssues.length / agentCount)
    })),
    files: {
      mainReport: 'code-issues-report.json',
      coordinationDashboard: 'coordination-dashboard.json',
      progressTracker: 'progress-tracker.json'
    }
  };
  
  fs.writeFileSync('coordination-dashboard.json', JSON.stringify(dashboardData, null, 2));
  
  // Create progress tracker
  const progressTracker = {
    startTime: new Date().toISOString(),
    totalIssues: report.summary.total,
    resolvedIssues: 0,
    inProgressIssues: 0,
    blockedIssues: 0,
    agents: dashboardData.agents.map(agent => ({
      ...agent,
      status: 'ready',
      completedCount: 0,
      currentIssue: null
    }))
  };
  
  fs.writeFileSync('progress-tracker.json', JSON.stringify(progressTracker, null, 2));
  
  // Display summary
  console.log(`${colors.green}${colors.bold}✅ STRUCTURED REPORT GENERATED${colors.reset}\n`);
  
  console.log(`${colors.bold}📊 SUMMARY:${colors.reset}`);
  console.log(`• Total Issues: ${colors.yellow}${report.summary.total}${colors.reset}`);
  console.log(`• Critical: ${colors.red}${report.summary.bySeverity.critical || 0}${colors.reset}`);
  console.log(`• High: ${colors.yellow}${report.summary.bySeverity.high || 0}${colors.reset}`);
  console.log(`• Medium: ${colors.blue}${report.summary.bySeverity.medium || 0}${colors.reset}`);
  console.log(`• Estimated Total Time: ${colors.cyan}${report.estimatedTotalTime} minutes${colors.reset}`);
  console.log(`• Agents: ${colors.green}${agentCount}${colors.reset}`);
  console.log(`• Avg Time per Agent: ${colors.magenta}${Math.round(report.estimatedTotalTime / agentCount)} minutes${colors.reset}\n`);
  
  console.log(`${colors.bold}📁 GENERATED FILES:${colors.reset}`);
  console.log(`• ${colors.cyan}code-issues-report.json${colors.reset} - Complete issue database`);
  console.log(`• ${colors.cyan}coordination-dashboard.json${colors.reset} - Agent coordination hub`);
  console.log(`• ${colors.cyan}progress-tracker.json${colors.reset} - Real-time progress tracking`);
  for (let i = 0; i < agentCount; i++) {
    console.log(`• ${colors.green}agent-${i + 1}-assignments.json${colors.reset} - Agent ${i + 1} task list`);
    console.log(`• ${colors.yellow}agent-${i + 1}-status.json${colors.reset} - Agent ${i + 1} status tracker`);
  }
  
  console.log(`\n${colors.bold}🚀 NEXT STEPS:${colors.reset}`);
  console.log(`1. Distribute assignment files to ${agentCount} agents`);
  console.log(`2. Each agent should start with their highest priority issues`);
  console.log(`3. Monitor progress via coordination-dashboard.json`);
  console.log(`4. Use progress-tracker.json for real-time status updates`);
  
  console.log(`\n${colors.bold}🔧 AGENT COMMANDS:${colors.reset}`);
  console.log(`• Start work: ${colors.yellow}node agent-coordinator.js start <agent-id>${colors.reset}`);
  console.log(`• Check status: ${colors.yellow}node agent-coordinator.js status${colors.reset}`);
  console.log(`• Update progress: ${colors.yellow}node agent-coordinator.js update <agent-id> <issue-id> <status>${colors.reset}`);
}

main().catch(console.error);