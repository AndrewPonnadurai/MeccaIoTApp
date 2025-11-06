# MECCA Portal Wrapper - Azure Static Web App

This project provides a seamless authentication wrapper for the MECCA Platinum FM Portal, allowing users to bypass the login screen and access the portal directly through an embedded or proxied interface.

## 🎯 Project Goal

Create an Azure Static Web App that:
- Automatically handles authentication to report-mecca.platinumfm.com.au
- Provides a simplified login flow for users
- Can be integrated into other applications
- Maintains the same URL structure for easy migration when the portal is rebuilt

## 📋 Prerequisites

- Azure Account with an active subscription
- Visual Studio Code
- Node.js (v18 or higher)
- Azure Functions Core Tools
- Azure Static Web Apps CLI (optional, for local testing)
- Git

## 🏗️ Architecture

### Authentication Flow

1. User accesses your Azure Static Web App
2. App checks for valid token in localStorage
3. If no valid token, Azure Function authenticates with MECCA API
4. Token is stored locally and refreshed automatically
5. Portal is loaded (via iframe or direct proxy)

### Components

```
mecca-portal-wrapper/
├── src/                          # Frontend files
│   ├── index.html               # Simple iframe approach (may be blocked)
│   └── index-proxy.html         # Recommended proxy approach
├── api/                          # Azure Functions (backend)
│   ├── auth-proxy/
│   │   ├── index.js            # Authentication and proxy logic
│   │   └── function.json       # Function configuration
│   ├── host.json               # Functions host configuration
│   └── local.settings.json     # Local environment variables
├── staticwebapp.config.json     # Azure SWA configuration
└── package.json                 # Node.js dependencies
```

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Clone or create the project directory
cd mecca-portal-wrapper

# Install dependencies
npm install
```

### 2. Configure Local Development

Edit `api/local.settings.json`:

```json
{
  "Values": {
    "MECCA_USERNAME": "your_actual_username",
    "MECCA_PASSWORD": "your_actual_password"
  }
}
```

⚠️ **IMPORTANT**: Never commit `local.settings.json` to version control!

### 3. Test Locally

```bash
# Install Azure Static Web Apps CLI globally (if not already installed)
npm install -g @azure/static-web-apps-cli

# Install Azure Functions Core Tools (if not already installed)
# Windows (via Chocolatey):
choco install azure-functions-core-tools-4
# Or download from: https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local

# Start the development server
swa start src --api-location api
```

Visit: http://localhost:4280

## 📤 Deploy to Azure

### Option 1: Deploy via VS Code (Recommended)

1. **Install Azure Extensions**
   - Install "Azure Static Web Apps" extension in VS Code
   - Install "Azure Functions" extension in VS Code

2. **Sign in to Azure**
   - Press `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
   - Type: "Azure: Sign In"

3. **Create Static Web App**
   - Press `Ctrl+Shift+P`
   - Type: "Static Web Apps: Create Static Web App..."
   - Follow the prompts:
     - Name: `mecca-portal-wrapper`
     - Region: Choose closest to you (e.g., Australia East)
     - Build preset: Custom
     - App location: `/src`
     - Api location: `/api`
     - Output location: `` (leave empty)

4. **Configure Environment Variables**
   - Open Azure Portal: https://portal.azure.com
   - Navigate to your Static Web App
   - Go to "Configuration" → "Application settings"
   - Add:
     - `MECCA_USERNAME`: your username
     - `MECCA_PASSWORD`: your password
   - Click "Save"

5. **Deploy**
   - In VS Code, open the Azure extension
   - Find your Static Web App
   - Right-click → "Deploy to Static Web App"

### Option 2: Deploy via GitHub Actions

1. **Create GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_REPO_URL
   git push -u origin main
   ```

2. **Create Static Web App in Azure Portal**
   - Go to Azure Portal
   - Click "Create a resource" → "Static Web App"
   - Fill in the details:
     - Resource group: Create new or use existing
     - Name: `mecca-portal-wrapper`
     - Region: Australia East (or closest to you)
     - Source: GitHub
     - Sign in and authorize Azure
     - Select your repository and branch
     - Build Details:
       - App location: `/src`
       - Api location: `/api`
       - Output location: `` (leave empty)
   
3. **Configure Secrets**
   - In Azure Portal, go to your Static Web App
   - Configuration → Application settings
   - Add environment variables (same as Option 1)

4. **Automatic Deployment**
   - Azure will add a GitHub Actions workflow to your repo
   - Every push to main branch will trigger deployment

## 🔒 Security Considerations

### Current Limitations

⚠️ **The simple iframe approach (index.html) stores credentials in JavaScript** - This is NOT secure for production!

### Recommended Security Setup

1. **Use the Proxy Approach** (`index-proxy.html`)
   - Credentials stored securely in Azure
   - Never exposed to client-side code

2. **Use Azure Key Vault** (Production)
   ```bash
   # Create a Key Vault
   az keyvault create --name "mecca-portal-kv" --resource-group "your-rg" --location "australiaeast"
   
   # Add secrets
   az keyvault secret set --vault-name "mecca-portal-kv" --name "MeccaUsername" --value "your_username"
   az keyvault secret set --vault-name "mecca-portal-kv" --name "MeccaPassword" --value "your_password"
   
   # Update Function to use Key Vault references
   # In Application Settings:
   MECCA_USERNAME = @Microsoft.KeyVault(SecretUri=https://mecca-portal-kv.vault.azure.net/secrets/MeccaUsername/)
   MECCA_PASSWORD = @Microsoft.KeyVault(SecretUri=https://mecca-portal-kv.vault.azure.net/secrets/MeccaPassword/)
   ```

3. **Enable Managed Identity**
   - In Azure Portal, go to your Static Web App
   - Identity → System assigned → Turn on
   - In Key Vault → Access policies → Add
   - Select your Static Web App's managed identity
   - Give "Get" permission for secrets

## 🔧 Troubleshooting

### Problem: Portal doesn't load in iframe

**Cause**: The MECCA portal likely sets `X-Frame-Options: DENY` header

**Solution**: 
- Use the reverse proxy approach instead
- Or accept that users must click "Open Portal Directly"

### Problem: Authentication fails

**Checks**:
1. Verify credentials are correct
2. Check Azure Application Settings are set
3. Look at browser console for errors
4. Check Azure Function logs in Portal

```bash
# View function logs locally
func start --verbose
```

### Problem: CORS errors

**Solution**: Already configured in `staticwebapp.config.json`. If issues persist:
- Check that API endpoint is `/api/auth-proxy`
- Verify CSP headers in config

## 📊 API Endpoints

### POST /api/auth-proxy?action=login

Authenticates with MECCA portal and returns token.

**Response:**
```json
{
  "userId": 3,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "isValidToken": true,
  "expiredOn": "2025-11-13T06:10:03.8441288Z"
}
```

### POST /api/auth-proxy?action=proxy

Proxies requests to MECCA API with authentication.

**Parameters:**
- `path`: API path to proxy (e.g., `/api/WorkOrders/Vendors`)
- `method`: HTTP method (GET, POST, etc.)

**Headers:**
- `Authorization`: Bearer token (if available)

## 🎨 Customization

### Branding

Edit `src/index-proxy.html`:
- Change title, colors, logo
- Modify loading screen
- Add custom headers/footers

### Token Refresh

Default: 6 hours. To change:

```javascript
// In index-proxy.html, find:
setInterval(async () => {
  // ...
}, 6 * 60 * 60 * 1000); // Change this value
```

## 🔄 Migration Path

When you're ready to rebuild the portal:

1. Keep this wrapper URL unchanged
2. Update `CONFIG.portalUrl` to point to new portal
3. Or update Azure Function to proxy to new backend
4. No changes needed in consuming applications!

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MECCA_USERNAME` | MECCA portal username | Yes |
| `MECCA_PASSWORD` | MECCA portal password | Yes |

## 🛠️ Development Tips

### VS Code Extensions

Install these for better development experience:
- Azure Static Web Apps
- Azure Functions
- REST Client (for testing APIs)

### Testing Authentication

Create a `test.http` file:

```http
### Test Login
POST https://your-app.azurestaticapps.net/api/auth-proxy?action=login
Content-Type: application/json

### Test Proxy
GET https://your-app.azurestaticapps.net/api/auth-proxy?action=proxy&path=/api/Users/Roles
Authorization: Bearer YOUR_TOKEN_HERE
```

## 📚 Resources

- [Azure Static Web Apps Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [Azure Functions Documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)
- [Azure Key Vault Documentation](https://docs.microsoft.com/en-us/azure/key-vault/)

## ⚖️ Legal & Compliance

**Important**: Ensure you have authorization to:
- Access the MECCA portal programmatically
- Store and proxy authentication credentials
- Embed or proxy the portal content

Consult with your legal team and review the portal's Terms of Service.

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review Azure Function logs in the portal
3. Check browser console for errors
4. Review network tab in DevTools

## 📄 License

[Your License Here]

---

**Note**: This wrapper is designed to be temporary until you rebuild the portal. The architecture allows for seamless migration without affecting downstream applications.
