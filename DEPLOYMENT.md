# Quick Deployment Guide - MECCA Portal Wrapper

## ⚡ Fast Track to Production (15 minutes)

### Prerequisites Checklist
- [ ] Azure account with active subscription
- [ ] VS Code installed
- [ ] Node.js 18+ installed
- [ ] Git installed

### Step 1: Install Required VS Code Extensions (2 min)

Open VS Code and install:
1. **Azure Static Web Apps** extension
2. **Azure Functions** extension
3. **Azure Account** extension (for signing in)

Or use Quick Open (`Ctrl+Shift+P`):
```
ext install ms-azuretools.vscode-azurestaticwebapps
ext install ms-azuretools.vscode-azurefunctions
ext install ms-vscode.azure-account
```

### Step 2: Extract and Open Project (1 min)

1. Extract the project files you received
2. Open folder in VS Code
3. Open terminal in VS Code (`Ctrl+` ` or View → Terminal)

### Step 3: Sign in to Azure (1 min)

In VS Code:
1. Press `F1` or `Ctrl+Shift+P`
2. Type: **Azure: Sign In**
3. Complete browser authentication
4. Verify you see your subscription in Azure extension panel

### Step 4: Create and Deploy Static Web App (5 min)

#### Option A: Using VS Code Extension (Easiest)

1. **Create the Static Web App**
   - Press `F1`
   - Type: **Static Web Apps: Create Static Web App...**
   - Follow prompts:
     ```
     Subscription: [Select your subscription]
     App name: mecca-portal-wrapper
     Region: Australia East (or closest)
     Build preset: Custom
     App location: /src
     Api location: /api
     Output location: (leave blank, just press Enter)
     ```

2. **Wait for deployment** (~3-4 minutes)
   - VS Code will show progress
   - Note the URL when deployment completes

#### Option B: Using Azure CLI (Alternative)

```bash
# Login to Azure
az login

# Create resource group (if needed)
az group create --name mecca-portal-rg --location australiaeast

# Create static web app
az staticwebapp create \
  --name mecca-portal-wrapper \
  --resource-group mecca-portal-rg \
  --location australiaeast \
  --source "." \
  --app-location "src" \
  --api-location "api" \
  --login-with-github
```

### Step 5: Configure Credentials (3 min)

1. **Open Azure Portal**
   - Go to: https://portal.azure.com
   - Navigate to: Resource Groups → [your resource group] → mecca-portal-wrapper

2. **Add Application Settings**
   - Click: **Configuration** (left sidebar)
   - Click: **Application settings** tab
   - Click: **+ New application setting**
   
   Add these two settings:
   ```
   Name: MECCA_USERNAME
   Value: aponnadurai   (or your actual username)
   
   Name: MECCA_PASSWORD
   Value: [your actual password]
   ```
   
   - Click: **Save** (top of page)
   - Click: **Continue** when prompted

3. **Wait for restart** (~1 minute)

### Step 6: Test Your App (1 min)

1. Copy your Static Web App URL from Azure Portal:
   - Should look like: `https://[name].[region].azurestaticapps.net`

2. Open in browser

3. You should see:
   - Loading spinner
   - "Authenticating..." message
   - Then either the portal loads or you see iframe blocking message

### Step 7: Verify It Works (2 min)

Open browser DevTools (F12) and check:

1. **Console tab** - Should see:
   ```
   Using existing valid token
   ```
   or
   ```
   No valid token found, logging in...
   ```

2. **Network tab** - Look for successful request to:
   ```
   /api/auth-proxy?action=login
   ```

3. **Application tab** → Local Storage - Should see:
   ```
   mecca_auth_token: [long string]
   mecca_token_expiry: [date]
   ```

## 🎯 What You Get

After deployment, you'll have:
- ✅ Public URL: `https://[name].azurestaticapps.net`
- ✅ Automatic HTTPS
- ✅ Auto-login functionality
- ✅ Token refresh every 6 hours
- ✅ Secure credential storage in Azure

## 🔄 Update Your App

### Update Code
```bash
# In VS Code
git add .
git commit -m "Update portal wrapper"

# Deploy via VS Code
F1 → Static Web Apps: Deploy to Static Web App
```

### Update Credentials
1. Go to Azure Portal → Your Static Web App
2. Configuration → Application settings
3. Edit MECCA_USERNAME or MECCA_PASSWORD
4. Save → App auto-restarts

## ⚠️ Known Issues & Solutions

### Issue: Portal shows "Cannot display in iframe"

**This is normal!** The MECCA portal blocks iframe embedding.

**Solution 1**: Accept it and use the "Open Portal Directly" button
**Solution 2**: Implement full reverse proxy (more complex, see README)

### Issue: Authentication fails

**Check**:
1. Credentials are correct in Application settings
2. Username: `aponnadurai` (from your HAR file)
3. Password is entered correctly
4. No extra spaces in the values

**Debug**:
```bash
# Check function logs in Azure Portal
Resource → Monitor → Log stream
```

### Issue: Page is blank

**Check browser console** (F12):
- Look for red errors
- Check Network tab for failed requests
- Try hard refresh: `Ctrl+Shift+R`

## 🚀 Next Steps

### For Production:

1. **Add Custom Domain** (Optional)
   - Azure Portal → Your Static Web App
   - Custom domains → Add
   - Follow DNS configuration steps

2. **Set Up Key Vault** (Recommended for security)
   - See main README.md section: "Use Azure Key Vault"

3. **Add Monitoring**
   - Application Insights is auto-configured
   - View in: Azure Portal → Your app → Monitoring

4. **Share the URL**
   - Give your app URL to your team
   - Users will auto-login when they visit

### For Integration with Another App:

Your other app can now use:
```html
<iframe src="https://[your-app].azurestaticapps.net" 
        width="100%" 
        height="800px">
</iframe>
```

Or just link to it:
```html
<a href="https://[your-app].azurestaticapps.net" target="_blank">
  Open MECCA Portal
</a>
```

## 📞 Need Help?

1. Check browser console (F12)
2. Check Azure Function logs in portal
3. Review main README.md for detailed troubleshooting
4. Verify HAR file showed correct API endpoints

## 🎉 You're Done!

Your portal wrapper is now live and handling authentication automatically. When you're ready to rebuild the portal from scratch, this wrapper URL stays the same - just point it to your new backend.
