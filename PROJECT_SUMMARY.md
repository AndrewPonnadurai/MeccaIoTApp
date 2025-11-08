# 🎯 MECCA Portal Wrapper - Project Summary

## 📋 Project Overview

**Goal:** Create an Azure Static Web App that automatically authenticates users to the MECCA Portal and displays the Work Orders page without requiring manual login.

**Final Solution:** Silent background authentication with iframe embedding on a custom domain to bypass cross-origin restrictions.

---

## 🏗️ Architecture

### Components

1. **Azure Static Web App** (`calm-mushroom-05694e500.3.azurestaticapps.net`)
   - Hosts the wrapper application
   - Custom domain: `meccaiot.platinumfm.com.au`

2. **Azure Functions (Node.js 18)**
   - `/api/auth-proxy` - Handles authentication and API proxying
   - Stores credentials securely in Application Settings

3. **Frontend (index.html)**
   - Silent authentication loader
   - Iframe wrapper for portal
   - Token management and auto-refresh

### Data Flow

```
User visits custom domain
        ↓
Frontend checks for valid token
        ↓
If no token → Call Azure Function
        ↓
Azure Function authenticates with MECCA API
        ↓
Token stored in localStorage + cookies set
        ↓
Portal loads in iframe
        ↓
Portal uses cookies for authenticated session
        ↓
User sees Work Orders page (logged in)
```

---

## 🔑 Key Technical Solutions

### 1. **Authentication System**

**Challenge:** MECCA portal requires JWT token-based authentication with 7-day expiry.

**Solution:**
- Azure Function makes POST request to `api-mecca.platinumfm.com.au/api/Users/Login`
- Stores username/password in Azure Application Settings
- Returns token to frontend
- Token cached in browser localStorage
- Auto-refreshes every 6 hours

### 2. **Cross-Origin Issue**

**Challenge:** Default Azure domain couldn't share cookies with portal domain.

**Solution:**
- Configured custom domain `meccaiot.platinumfm.com.au` 
- Both wrapper and portal share `platinumfm.com.au` parent domain
- Cookies set on API domain accessible by both
- Iframe can access authenticated session

### 3. **Seamless User Experience**

**Challenge:** Users shouldn't see authentication process.

**Solution:**
- Minimal loading screen (gray background, spinner)
- Background authentication (< 2 seconds)
- Direct iframe load to `/work-orders-open` page
- No visible login prompts or redirects

---

## 📁 Project Structure

```
MeccaIoTApp/
├── src/
│   ├── index.html              # Main wrapper (silent auth + iframe)
│   ├── index-proxy.html        # Backup (same as index.html)
│   └── test.html               # Test page for debugging
├── api/
│   └── auth-proxy/
│       ├── index.js            # Azure Function (auth + proxy)
│       └── function.json       # Function configuration
├── staticwebapp.config.json    # Routing and security config
├── package.json                # Dependencies
├── PROJECT_SUMMARY.md          # This file
└── .github/
    └── workflows/              # GitHub Actions for deployment
```

---

## ⚙️ Configuration

### Azure Application Settings

```
MECCA_USERNAME = aponnadurai
MECCA_PASSWORD = [secured password]
```

### Custom Domain Setup

1. **DNS Records:**
   - CNAME: `meccaiot.platinumfm.com.au` → `calm-mushroom-05694e500.3.azurestaticapps.net`

2. **Azure Static Web App:**
   - Custom domains → Add custom domain
   - Validate and configure

### Security Headers (staticwebapp.config.json)

```json
{
  "Content-Security-Policy": "frame-src 'self' https://report-mecca.platinumfm.com.au;",
  "X-Frame-Options": "SAMEORIGIN"
}
```

---

## 🔄 Authentication Flow Details

### Initial Login

```javascript
1. User visits meccaiot.platinumfm.com.au
2. Frontend checks localStorage for token
3. If no token or expired:
   - Call /api/auth-proxy?action=login
   - Azure Function posts to MECCA API
   - Receives JWT token (7-day expiry)
   - Token stored in localStorage
   - Cookies set on api-mecca.platinumfm.com.au
4. Load portal in iframe
5. Portal sees cookies, user is authenticated
```

### Token Refresh

```javascript
// Auto-refresh every 6 hours
setInterval(async () => {
    if (!authManager.hasValidToken()) {
        await authManager.login();
        iframe.src = portalUrl; // Reload portal
    }
}, 6 * 60 * 60 * 1000);

// Refresh on tab visibility
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !authManager.hasValidToken()) {
        authManager.login();
    }
});
```

---

## 🎯 Final Configuration

### Portal URL

```javascript
portalUrl: 'https://report-mecca.platinumfm.com.au/work-orders-open'
```

Users land directly on the Work Orders - Open page.

### Access Points

- **Production:** `https://meccaiot.platinumfm.com.au`
- **Default:** `https://calm-mushroom-05694e500.3.azurestaticapps.net`
- **Test Page:** `https://meccaiot.platinumfm.com.au/test.html`

---

## 🚀 Deployment Process

### Via GitHub Actions (Automated)

```bash
git add .
git commit -m "Update description"
git push origin main
# Wait 2-3 minutes for automatic deployment
```

### Via VS Code (Manual)

1. Open Azure panel
2. Right-click Static Web App
3. "Deploy to Static Web App"
4. Select folder
5. Wait for deployment

---

## ✅ What Works

- ✅ Automatic authentication on every visit
- ✅ Silent background token acquisition
- ✅ Token validation and refresh
- ✅ Direct load to Work Orders page
- ✅ Seamless iframe integration
- ✅ Custom domain with shared cookies
- ✅ 7-day token persistence
- ✅ Auto-refresh every 6 hours
- ✅ Re-authentication on tab visibility
- ✅ Error handling with retry

---

## 🔒 Security Considerations

### Implemented

1. **Credentials in Application Settings** - Not in code
2. **HTTPS Only** - All traffic encrypted
3. **CSP Headers** - Restrict frame sources
4. **Token Expiry** - 7-day automatic expiration
5. **Secure Storage** - localStorage (HTTPS required)

### Limitations

1. **Token in localStorage** - Accessible via JS (XSS risk)
2. **No MFA Support** - Basic username/password only
3. **Shared Domain Required** - Custom domain necessary for cookies

---

## 🐛 Troubleshooting Guide

### Issue: "Authentication Failed (401)"

**Cause:** Credentials not configured or incorrect

**Fix:**
1. Azure Portal → Static Web App → Configuration
2. Verify `MECCA_USERNAME` and `MECCA_PASSWORD`
3. Save and wait 60 seconds for restart

### Issue: Portal Shows Login Page

**Cause:** Cross-origin cookie issue

**Fix:** Must use custom domain on same parent domain as portal

### Issue: Purple Page Instead of Gray Loader

**Cause:** Wrong file being served

**Fix:**
```bash
cp src/index-proxy.html src/index.html
git push origin main
```

### Issue: Deployment Not Updating

**Cause:** GitHub Actions not triggering

**Fix:**
1. Check GitHub → Actions tab
2. Verify latest workflow succeeded
3. Hard refresh browser (Ctrl+Shift+R)

---

## 📊 Performance Metrics

- **Initial Load Time:** 1-2 seconds (authentication)
- **Subsequent Visits:** < 1 second (cached token)
- **Token Refresh:** Silent, no user impact
- **Portal Load:** ~2-3 seconds (standard iframe load)

---

## 🔮 Future Enhancements

### Potential Improvements

1. **Service Worker** - Offline token caching
2. **Token Encryption** - Encrypt localStorage tokens
3. **Health Monitoring** - Azure App Insights integration
4. **Multi-Page Support** - Route to different portal pages
5. **User Preferences** - Remember last visited page
6. **Session Timeout Warning** - Alert before token expires
7. **Custom Branding** - Styled loading screen
8. **Error Reporting** - Centralized error logging

### Technical Debt

1. ~~Cross-origin issue~~ - ✅ Solved with custom domain
2. Token refresh could use exponential backoff
3. No unit tests for Azure Function
4. Hard-coded portal URL (should be env variable)

---

## 📝 Key Learnings

### What Worked

1. **Azure Functions for Backend** - Secure, scalable, serverless
2. **Custom Domain Strategy** - Essential for cookie sharing
3. **Silent Authentication** - Better UX than visible logins
4. **Token Caching** - Reduced API calls significantly
5. **Iframe Approach** - Simpler than reverse proxy

### What Didn't Work

1. **Default Azure Domain** - Cross-origin cookie restrictions
2. **Window.open() Approach** - Lost authentication context
3. **Purple Launcher Page** - Too many steps for users
4. **Token URL Parameters** - Portal didn't support it
5. **PostMessage Token Injection** - Security restrictions

### Critical Success Factors

1. ✅ Custom domain on same parent domain as portal
2. ✅ Application Settings for secure credential storage
3. ✅ localStorage for token persistence
4. ✅ Iframe for seamless embedding
5. ✅ Auto-refresh for long-running sessions

---

## 🎓 Technologies Used

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Azure Functions (Node.js 18)
- **Hosting:** Azure Static Web Apps
- **CI/CD:** GitHub Actions
- **DNS:** Custom domain configuration
- **Authentication:** JWT tokens, cookie-based sessions
- **API:** REST (fetch API)

---

## 📞 Support & Maintenance

### Regular Maintenance

- **Monthly:** Check token expiry logs
- **Quarterly:** Review Azure costs
- **Annually:** Rotate MECCA credentials
- **As Needed:** Update portal URL if changed

### Monitoring

- Azure Portal → Static Web App → Metrics
- GitHub Actions → Check deployment history
- Browser Console → Check authentication logs
- Test Page → `/test.html` for diagnostics

---

## 🎉 Project Status

**Status:** ✅ **COMPLETE AND DEPLOYED**

**Production URL:** `https://meccaiot.platinumfm.com.au`

**User Experience:**
1. User visits URL
2. Sees brief "Authenticating..." (1-2 seconds)
3. Portal loads automatically
4. Already logged in to Work Orders page
5. No manual login required

**Success Criteria Met:**
- ✅ Automatic authentication
- ✅ Direct access to Work Orders page
- ✅ Custom domain maintained
- ✅ Seamless user experience
- ✅ Secure credential management
- ✅ Token persistence (7 days)
- ✅ Auto-refresh capability

---

## 📄 Documentation Files

1. **This Summary** - High-level overview
2. **Code Comments** - Inline documentation
3. **staticwebapp.config.json** - Configuration reference
4. **Azure Application Settings** - Secure in portal
5. **GitHub Repository** - Full source control

---

## 🙏 Acknowledgments

Built using:
- Azure Static Web Apps documentation
- MECCA API endpoints analysis (HAR file)
- JWT token-based authentication patterns
- Iframe security best practices
- GitHub Actions CI/CD pipelines

---

**Project Completed:** November 8, 2025  
**Repository:** `https://github.com/AndrewPonnadurai/MeccaIoTApp`  
**Production:** `https://meccaiot.platinumfm.com.au`

🎉 **Mission Accomplished!**
