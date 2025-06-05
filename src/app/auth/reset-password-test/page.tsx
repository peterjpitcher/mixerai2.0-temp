'use client';

// A special component to render raw HTML, which we need for this diagnostic test.
function RawHtmlComponent({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function ResetPasswordTestPage() {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en-GB">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Supabase Password-Reset Test</title>
    </head>
    <body>
      <h2>Supabase Password-Reset Test</h2>
      <p>This is a diagnostic page. It should be replaced with a styled component once the flow is confirmed to work.</p>
      <p>After clicking the link in your password reset email, this page should detect the session and allow you to update your password.</p>
      
      <div id="password-form" style="display: none; margin-top: 1rem;">
        <h3>Set a New Password</h3>
        <input type="password" id="new-password" placeholder="Enter your new password" style="display: block; margin-bottom: 0.5rem;" />
        <button id="update-password-btn">Update Password</button>
      </div>

      <pre id="output" style="margin-top: 1rem; background: #f5f5f5; padding: 1rem; border: 1px solid #ccc;"></pre>

      <script type="module">
        import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

        const SUPABASE_URL   = '${process.env.NEXT_PUBLIC_SUPABASE_URL}';
        const SUPABASE_ANON  = '${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}';

        if (!SUPABASE_URL || !SUPABASE_ANON) {
            document.getElementById('output').textContent = 'Error: Supabase environment variables are not loaded.';
        } else {
            const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
            const outputEl = document.getElementById('output');
            const formEl = document.getElementById('password-form');
            const passwordInput = document.getElementById('new-password');
            const updateBtn = document.getElementById('update-password-btn');

            // Listen for the PASSWORD_RECOVERY event
            supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'PASSWORD_RECOVERY') {
                    outputEl.textContent = 'Session detected from recovery link. You can now set a new password.';
                    formEl.style.display = 'block';

                    updateBtn.onclick = async () => {
                        const newPassword = passwordInput.value;
                        if (newPassword.length < 6) {
                            outputEl.textContent = 'Password must be at least 6 characters long.';
                            return;
                        }

                        const { data, error } = await supabase.auth.updateUser({ password: newPassword });

                        if (error) {
                            outputEl.textContent = 'Error updating password: ' + error.message;
                        } else {
                            outputEl.textContent = 'Password updated successfully! You can now log in with your new password.';
                            formEl.style.display = 'none';
                        }
                    };
                }
            });
        }
      </script>
    </body>
    </html>
  `;

  return <RawHtmlComponent html={htmlContent} />;
} 