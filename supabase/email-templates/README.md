# Email Templates for Focus Flow AI

This directory contains polished HTML email templates for Supabase authentication emails.

## Templates

### confirm-signup.html
Professional confirmation email sent when users sign up for a new account.

**Features:**
- Dark theme matching app design (cyan/blue gradients)
- Responsive design for mobile and desktop
- Clear CTA button with alternative link fallback
- Feature highlights to engage new users
- Professional branding with logo and colors
- 24-hour expiration notice

## How to Configure in Supabase

### Method 1: Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard:**
   - Visit https://app.supabase.com
   - Select your project: `uhlgppoylqeiirpfhhqm`

2. **Navigate to Email Templates:**
   - Click `Authentication` in the left sidebar
   - Click `Email Templates`
   - Select `Confirm signup` template

3. **Update the Template:**
   - Copy the entire contents of `confirm-signup.html`
   - Paste into the template editor
   - Click `Save`

4. **Update Site URL (Important!):**
   - Go to `Authentication` → `URL Configuration`
   - Set `Site URL` to your production URL (e.g., `https://yourdomain.com`)
   - Add any redirect URLs under `Redirect URLs`

5. **Enable Email Confirmations:**
   - Go to `Authentication` → `Providers` → `Email`
   - Toggle `Enable email confirmations` to ON
   - Click `Save`

### Method 2: Update config.toml (Local Development)

Edit `/supabase/config.toml`:

```toml
[auth]
site_url = "https://yourdomain.com"  # Update to production URL

[auth.email]
enable_confirmations = true  # Change from false to true
```

Then push changes:
```bash
supabase db push
```

## Testing Locally

When running Supabase locally, emails won't be sent. Instead:

1. **Start Supabase:**
   ```bash
   supabase start
   ```

2. **View Test Emails:**
   - Open http://localhost:54324 (Inbucket)
   - All emails sent locally will appear here
   - Click to view the rendered HTML

3. **Test Signup Flow:**
   - Sign up with a test email in your app
   - Check Inbucket to see the confirmation email
   - Click the confirmation link to verify it works

## Variables Available

Supabase provides these variables in email templates:

- `{{ .ConfirmationURL }}` - The confirmation link
- `{{ .Token }}` - The raw confirmation token
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your configured site URL
- `{{ .Email }}` - User's email address

## Customization

To customize the email:

1. **Update Colors:**
   - Primary gradient: `#3b82f6` to `#06b6d4` (blue to cyan)
   - Background: `#0d1117` (dark)
   - Text: `#e6edf3` (light)

2. **Change Logo:**
   - Replace the SVG in the header section
   - Or use an `<img>` tag with a hosted logo

3. **Modify Content:**
   - Update the welcome message
   - Change feature highlights
   - Adjust footer text

## Production Checklist

Before going live:

- [ ] Update `site_url` to production domain
- [ ] Enable email confirmations
- [ ] Upload email template to Supabase dashboard
- [ ] Test signup flow in production
- [ ] Verify links work correctly
- [ ] Check email rendering in multiple clients (Gmail, Outlook, etc.)
- [ ] Set up custom SMTP (optional, for branded sender)

## Custom SMTP (Optional)

For branded emails from your own domain:

1. Go to `Project Settings` → `Auth`
2. Scroll to `SMTP Settings`
3. Enable custom SMTP
4. Configure with your email provider (SendGrid, Mailgun, etc.)
5. Update sender email and name

## Support

For issues with email delivery:
- Check Supabase logs in dashboard
- Verify DNS records for custom domains
- Test with Inbucket locally first
- Contact Supabase support if needed
