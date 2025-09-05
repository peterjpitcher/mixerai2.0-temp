# QA Testing Response - 21st August 2025

Hi Priyesh,

Thank you for the comprehensive testing report. I appreciate the thorough validation effort your team has completed.

I've reviewed all the QA failures and have implemented additional fixes today. Here's the status update:

## Fixes Deployed Today (21st August)

### Critical Security Fixes
- Resolved 3 security vulnerabilities identified by GitHub security scanning (2 high, 1 medium severity)
- All security issues are now resolved and the codebase is secure

### P1 Issues - Additional Fixes
- **#267 & #268**: Enhanced AI generation to properly enforce max length and max rows constraints with retry logic and token budget calculation
- **#269**: Fixed Allow Images checkbox - now properly enforces image restrictions (defaults to disabled unless explicitly enabled)
- **#266**: Title field visibility now controlled by template's `include_title` setting - eliminates unexpected "Content Title" field
- **#274** (new): Alt text now limited to 125 characters for SEO/accessibility best practices

### Build Status
✅ All fixes have been successfully deployed to the preview environment  
✅ Build passing with no TypeScript or ESLint errors  
✅ All security vulnerabilities resolved

## Ready for Re-testing

The preview environment has been updated with all fixes: https://mixerai2-0-o751y6zsr-peter-pitchers-projects.vercel.app/

Please prioritize re-testing the following P1 issues that previously failed:
- #267, #268, #269, #266 - Should now pass with today's fixes
- #262, #260, #255, #252, #237 - Need investigation for root cause
- #261 - Noted as blocked, will investigate the deactivation error

## Next Steps

1. Please re-test the issues fixed today (#267, #268, #269, #266) and update GitHub with results
2. For issue #261 (blocked), please provide more details about the "Error deactivating user" message
3. I'll investigate the remaining P1 failures tomorrow (22nd August) and push fixes by end of day

For the P2/P3 issues that failed, I'll address these in priority order after all P1 issues are resolved.

Please update the GitHub issues with your re-test results as you complete them, so I can track progress and address any persistent issues immediately.

Thanks again for your diligent testing effort. Let's work together to get all critical issues resolved by end of week.

Best regards,  
Peter

---

**Peter Pitcher**  
Digital & Technology | AI & Martech Capabilities Lead, EUAU & North Asia  
General Mills UK, Harman House, George Street, Uxbridge. UB8 1QQ  
E: peter.pitcher@genmills.com | M: +44 7990 587 315