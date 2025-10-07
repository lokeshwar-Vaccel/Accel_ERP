# Email Service Setup Instructions

## Issue
The quotation email service is failing with the error: "Email service is temporarily unavailable. Please try again later."

## Root Cause
The SMTP email configuration is missing. The application requires the following environment variables to be set:

## Required Environment Variables

Create a `.env` file in the `/api` directory with the following configuration:

```env
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
EMAIL_FROM_NAME=Sun Power Services
EMAIL_FROM_ADDRESS=your_email@gmail.com
```

## Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this app password (not your regular Gmail password) in `SMTP_PASS`

## Alternative Email Providers

### Outlook/Hotmail
```env
SMTP_HOST=smtp.outlook.com
SMTP_PORT=587
SMTP_USER=your_email@outlook.com
SMTP_PASS=your_password
EMAIL_FROM_NAME=Sun Power Services
EMAIL_FROM_ADDRESS=your_email@outlook.com
```

### Yahoo Mail
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your_email@yahoo.com
SMTP_PASS=your_app_password
EMAIL_FROM_NAME=Sun Power Services
EMAIL_FROM_ADDRESS=your_email@yahoo.com
```

## Testing the Configuration

After setting up the environment variables:

1. Restart the API server:
   ```bash
   cd /Users/macbook/Desktop/sun-power/sun-power-services-erp/api
   npm run dev
   ```

2. Try sending a quotation email again

## Development Mode

If you're in development mode and don't want to configure SMTP, the application will log emails to the console instead of sending them. This is controlled by the `NODE_ENV` environment variable.

## Troubleshooting

- **Authentication Error**: Make sure you're using an app password, not your regular email password
- **Connection Error**: Check your internet connection and firewall settings
- **Port Issues**: Try port 465 with SSL instead of port 587 with TLS

## Security Note

Never commit your `.env` file to version control. It contains sensitive information like passwords and API keys.
