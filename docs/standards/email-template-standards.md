# Email Template Standards & Guidelines

## Critical Updates Required

### 1. **Personalization & Greeting**
- **Current**: `Hi {{ .Email }}`
- **Update to**: `Hi {{ .FirstName | default "there" }}`
- **Why**: Using email addresses in greetings is a spam signal. First names are more personal and trusted.
- **Implementation**: 
  ```html
  <!-- If Supabase doesn't support this syntax, use: -->
  Hi {{ if .FirstName }}{{ .FirstName }}{{ else }}there{{ end }},
  ```

### 2. **Preview Text**
Add hidden preview text immediately after the `<body>` tag:
```html
<body>
  <!-- Preview Text: Confirm your email to start using MixerAI -->
  <div style="display:none;font-size:1px;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
    Confirm your email to start using MixerAI - AI-powered content creation platform
  </div>
```

### 3. **Mailing Address Consideration**
MixerAI operates as a digital service without a physical office address. While CAN-SPAM Act typically requires a physical mailing address, digital-only businesses may need to:
- Consider obtaining a registered business address or P.O. Box
- Consult legal counsel for jurisdiction-specific requirements
- Note: Current templates do not include a physical address line

### 4. **Contact Email**
All templates must use the official support email:
```html
<p style="font-size: 11px; color: #999;">Questions? Email us at peter.pitcher@genmills.com</p>
<p style="font-size: 11px; color: #999;">Reply to this email or contact us at peter.pitcher@genmills.com</p>
```

**Official Support Email**: `peter.pitcher@genmills.com`

### 5. **Image Best Practices**
- **Logo Usage**: All templates must use the MixerAI logo in the header:
  ```html
  <img src="https://mixerai.orangejelly.co.uk/Mixerai2.0Logo.png" alt="MixerAI Logo" />
  ```
- **Alt Text**: Keep alt text simple and descriptive
- **Image-to-Text Ratio**: Maintain 60% text to 40% images maximum
- **Logo serves as the only image** to maintain good text-to-image ratio
- **Note**: Logo URL is hard-coded to ensure it always loads correctly

### 6. **Email Layout**
- **Maximum width**: 600px (already implemented ✓)
- **Single column layout**: Best for mobile responsiveness (already implemented ✓)
- **Font size**: Minimum 14px for body text, 12px for footer

## Technical Configuration

### SPF/DKIM/DMARC Setup

#### For Supabase Email Service:
1. **SPF Record**:
   ```
   v=spf1 include:_spf.supabase.co ~all
   ```

2. **DKIM**: 
   - Go to Supabase Dashboard > Authentication > Email Settings
   - Copy DKIM records and add to your DNS

3. **DMARC Record**:
   ```
   v=DMARC1; p=quarantine; rua=mailto:peter.pitcher@genmills.com; pct=100
   ```

#### For Custom SMTP (SendGrid/Postmark/etc):
- Follow your provider's specific SPF/DKIM setup guide
- Links:
  - [SendGrid Authentication](https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication)
  - [Postmark Authentication](https://postmarkapp.com/support/article/1046-how-do-i-verify-a-domain)
  - [Amazon SES Authentication](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication.html)

### From/Reply-To Consistency
- **From Name**: "MixerAI" or "MixerAI Support"
- **From Email**: `noreply@mixerai.orangejelly.co.uk` or `peter.pitcher@genmills.com`
- **Reply-To**: `peter.pitcher@genmills.com` (monitored)
- **Consistency**: Use the same from/reply-to across all transactional emails

## Avoid These Spam Triggers

1. **URL Shorteners**: Never use bit.ly, tinyurl, etc. Always use full URLs
2. **Excessive punctuation**: Avoid multiple exclamation marks!!!
3. **ALL CAPS**: Never use in subject lines or body
4. **Spam words**: free, guarantee, act now, limited time
5. **Hidden text**: Same color as background
6. **Excessive links**: Limit to 2-3 links per email

## Avoiding Phishing Signals (URI_PHISH)

Email change and security-related emails are particularly sensitive:

1. **Frame as Security Alert**: Use "Security Alert" or "Account Security" in title
2. **Provide Context**: Clearly explain why the email was sent
3. **Include Request Details**: Show when and from where the request originated
4. **Offer Both Options**: Explain what to do if they DID and DID NOT make the request
5. **Less Urgent Language**: Avoid "Action Required" or "Urgent" which are phishing red flags
6. **Security Warnings**: Make it clear that ignoring the email keeps their account safe
7. **Professional Tone**: Maintain a security-focused rather than marketing tone

## Monitoring & Maintenance

### Blacklist Monitoring
Regularly check your domain/IP reputation:
- [MXToolbox Blacklist Check](https://mxtoolbox.com/blacklists.aspx)
- [Spamhaus Lookup](https://check.spamhaus.org/)
- [Barracuda Reputation Check](https://www.barracudacentral.org/lookups)
- [MultiRBL Check](http://multirbl.valli.org/)

### Sender Reputation Tools
- [Google Postmaster Tools](https://postmaster.google.com/)
- [Microsoft SNDS](https://sendersupport.olc.protection.outlook.com/snds/)
- [Sender Score](https://senderscore.org/)

### Email Testing Tools
- [Mail-tester.com](https://www.mail-tester.com/) - Free spam score check
- [Litmus Spam Testing](https://litmus.com/spam-filter-tests) - Comprehensive testing
- [GlockApps](https://glockapps.com/) - Inbox placement testing
- [Email on Acid](https://www.emailonacid.com/) - Rendering tests

## Implementation Checklist

- [ ] Update all greetings to use FirstName with fallback
- [ ] Add preview text to all templates
- [ ] Consider mailing address requirements for your jurisdiction
- [ ] Add monitored support email to footers
- [ ] Add alt text to all images
- [ ] Configure SPF records
- [ ] Configure DKIM authentication
- [ ] Set up DMARC policy
- [ ] Test with spam checking tools
- [ ] Monitor blacklists weekly
- [ ] Set up reputation monitoring

## Design Standards for Email Templates

### Visual Hierarchy
1. **Header**
   - MixerAI logo: `https://mixerai.orangejelly.co.uk/Mixerai2.0Logo.png` (hard-coded)
   - Blue background (#13599f) with 30px padding
   - Logo dimensions: max-width 250px, max-height 60px
   - Logo positioned above title with 20px bottom margin
   - Clear, descriptive titles (24px font size, white text, font-weight: 600)

2. **Body Content**
   - Max width: 600px centered
   - Padding: 30px for content areas
   - Font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif
   - Base font size: 14px for body text
   - Line height: 1.6 for readability
   - Text color: #333333 on white background

3. **Buttons**
   - Primary color: #13599f
   - Text color: #ffffff
   - Padding: 12px 24px
   - Border radius: 4px
   - Font weight: 600
   - Center-aligned in content area

4. **Footer**
   - Background: #f9f9f9
   - Padding: 15px 30px
   - Font size: 11-12px
   - Text color: #666
   - Include: copyright, contact info

### Color Palette
- **Primary Blue**: #13599f (buttons, headers)
- **Text Primary**: #333333
- **Text Secondary**: #666666
- **Text Muted**: #999999
- **Background**: #ffffff (content), #f5f5f5 (page), #f9f9f9 (footer)
- **Warning**: #fff3cd background, #856404 text
- **Error**: #fee background, #721c24 text

### Spacing Guidelines
- Paragraph margins: 15px 0
- Section spacing: 30px between major sections
- Button margins: 20px 0
- List line height: 1.8

### Responsive Design
- Single column layout
- Max width: 600px
- Mobile-friendly padding
- Minimum font size: 12px (footer only)

### Accessibility
- Alt text required for all images
- Sufficient color contrast (4.5:1 minimum)
- Clear link text (avoid "click here")
- Logical heading structure

## Supabase-Specific Variables

Note: Supabase email templates have limited variables. Available options:
- `{{ .Email }}` - Recipient's email
- `{{ .ConfirmationURL }}` - Action link
- `{{ .SiteURL }}` - Your site URL
- `{{ .Now.Year }}` - Current year

For FirstName personalization, you may need to:
1. Store first_name in user metadata during signup
2. Use a custom SMTP service that supports more variables
3. Or use the "Hi there" fallback for all emails

## Language Requirements

**All email templates must be written in British English**. Common differences:
- organised (not organized)
- personalised (not personalized)  
- recognise (not recognize)
- colour (not color) - except in CSS properties
- centre (not center) - except in CSS properties
- behaviour (not behavior)
- unauthorised (not unauthorized)

## Template Checklist for New Emails

- [ ] Preview text added after `<body>` tag
- [ ] Greeting uses "Hi there" (Supabase limitation)
- [ ] Max width set to 600px
- [ ] Header uses MixerAI logo with alt="MixerAI Logo"
- [ ] All content written in British English
- [ ] Primary action button is prominent and centered
- [ ] Footer includes peter.pitcher@genmills.com
- [ ] Footer includes contact email (peter.pitcher@genmills.com)
- [ ] Text-to-image ratio is at least 60/40
- [ ] All links are full URLs (no shorteners)
- [ ] Colours match brand palette
- [ ] Font sizes follow standards (14px body, 11px footer)
- [ ] Tested in multiple email clients