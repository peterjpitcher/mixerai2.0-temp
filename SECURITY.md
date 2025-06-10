# Security Policy for MixerAI 2.0

## Introduction

The MixerAI 2.0 team takes the security of our application very seriously. We appreciate the security community's efforts in keeping our project and users safe. This document outlines our policy for reporting security vulnerabilities.

We encourage the responsible disclosure of security vulnerabilities and are committed to working with the community to verify and address any potential issues.

## Supported Versions

As a web-based application, only the latest deployed version of MixerAI 2.0 is supported. Vulnerabilities should be tested against the current version accessible at our primary domain.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it to us privately to protect the project and its users. **Please do not report security vulnerabilities through public GitHub issues.**

Instead, please send an email to **`security@mixerai.com`** (please replace with your actual security contact email).

### What to Include in a Report

To help us triage and resolve the issue quickly, please include the following information in your report:

*   **Type of vulnerability:** (e.g., Cross-Site Scripting, SQL Injection, Remote Code Execution)
*   **Detailed description:** A clear and concise description of the vulnerability.
*   **Steps to reproduce:** Provide a step-by-step guide to reproduce the issue, including any URLs, request/response captures, or sample code.
*   **Impact:** A description of the potential impact of the vulnerability.
*   **Proof-of-Concept:** Any scripts, screenshots, or other evidence that demonstrates the vulnerability.
*   **Contact Information:** Your name and a way to contact you.

We will acknowledge receipt of your report within 48 hours and provide a more detailed response within 72 hours, indicating the next steps in our investigation.

## Disclosure Policy

Once a vulnerability report is received and confirmed, we are committed to the following process:

1.  **Confirmation:** We will confirm the vulnerability and determine its impact.
2.  **Remediation:** Our team will work on a fix for the vulnerability.
3.  **Communication:** We will maintain an open line of communication with the reporter, providing updates on our progress.
4.  **Disclosure:** Once the fix is deployed, we will coordinate with the reporter to make a public disclosure. We may create a GitHub Security Advisory for the vulnerability and will credit the reporter for their discovery, unless they prefer to remain anonymous.

We aim to resolve critical vulnerabilities within 30 days of confirmation.

## Security Practices

We follow a number of best practices to ensure the security of our application:

*   **Dependency Scanning:** We use tools like Dependabot to scan our dependencies for known vulnerabilities.
*   **Secure Authentication:** We leverage Supabase for robust and secure user authentication and management.
*   **Credential Management:** All sensitive keys and credentials are stored securely in environment variables and are not hard-coded in the application.
*   **Code Reviews:** All code changes go through a review process to identify potential security flaws.
*   **Principle of Least Privilege:** We grant only the necessary permissions for different parts of our system to function.

## Safe Harbor

We consider security research and vulnerability disclosure activities conducted under this policy to be authorized and in good faith. We will not pursue legal action against individuals who report vulnerabilities in accordance with this policy.

We thank you for helping to keep MixerAI 2.0 secure. 
