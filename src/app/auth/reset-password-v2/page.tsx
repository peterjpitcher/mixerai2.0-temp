'use client';

// A special component to render raw HTML.
// We are using this as a last resort because the standard React/Next.js component lifecycle
// appears to be interfering with the Supabase PKCE flow. This replicates the known-good standalone HTML file.
function RawHtmlComponent({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function ResetPasswordV2Page() {
  
  // This HTML is a direct copy of the working standalone file, with environment variables injected.
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en-GB">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Reset Password</title>
      <style>
        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; flex-direction: column; }
        #form-container { display: none; }
        #output { margin-top: 1rem; background: #f5f5f5; padding: 1rem; border: 1px solid #ccc; white-space: pre-wrap; word-wrap: break-word; }
      </style>
    </head>
    <body>
      <h2>Reset Your Password</h2>
      <div id="form-container">
        <p>A secure session has been established. Please enter your new password.</p>
        <input type="password" id="new-password" placeholder="Enter new password" style="display: block; margin-bottom: 0.5rem;" />
        <button id="update-password-btn">Update Password</button>
      </div>
      <pre id="output">Loading and verifying link...</pre>

      <script type="module">
        import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

        const SUPABASE_URL = '${process.env.NEXT_PUBLIC_SUPABASE_URL}';
        const SUPABASE_ANON = '${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}';
        
        const outputEl = document.getElementById('output');
        const formContainer = document.getElementById('form-container');
        const passwordInput = document.getElementById('new-password');
        const updateBtn = document.getElementById('update-password-btn');

        if (!SUPABASE_URL || !SUPABASE_ANON) {
          outputEl.textContent = 'Error: Supabase environment variables are not configured.';
        } else {
          const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

          supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
              outputEl.textContent = 'Session successfully verified. You may now set your new password.';
              formContainer.style.display = 'block';

              updateBtn.onclick = async () => {
                const newPassword = passwordInput.value;
                if (!newPassword || newPassword.length < 6) {
                  outputEl.textContent = 'Error: Password must be at least 6 characters long.';
                  return;
                }

                outputEl.textContent = 'Updating...';
                const { error } = await supabase.auth.updateUser({ password: newPassword });

                if (error) {
                  outputEl.textContent = 'Error updating password: ' + error.message;
                } else {
                  outputEl.textContent = 'Password updated successfully! You can now close this page and log in.';
                  formContainer.style.display = 'none';
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