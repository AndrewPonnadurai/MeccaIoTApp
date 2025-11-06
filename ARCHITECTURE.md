# Architecture & Workflow Documentation

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User's Browser                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Your App / iframe                      │  │
│  │                           │                               │  │
│  │                           ▼                               │  │
│  │         https://your-app.azurestaticapps.net             │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ HTTPS
                                ▼
┌────────────────────────────────────────────────────────────────┐
│              Azure Static Web App (Your Wrapper)               │
│                                                                │
│  ┌──────────────────┐              ┌──────────────────────┐   │
│  │   Static Files   │              │   Azure Functions    │   │
│  │                  │              │                      │   │
│  │  - index.html    │              │  - auth-proxy/       │   │
│  │  - test.html     │◄────────────►│    * Login           │   │
│  │  - CSS/JS        │   API Calls  │    * Token Refresh   │   │
│  │                  │              │    * API Proxy       │   │
│  └──────────────────┘              └──────────────────────┘   │
│                                              │                 │
│                                              │ Credentials     │
│                                              ▼                 │
│                                   ┌──────────────────────┐    │
│                                   │  App Configuration   │    │
│                                   │  (Environment Vars)  │    │
│                                   │  - MECCA_USERNAME    │    │
│                                   │  - MECCA_PASSWORD    │    │
│                                   └──────────────────────┘    │
└────────────────────────────────────┬───────────────────────────┘
                                     │
                                     │ HTTPS/REST API
                                     ▼
┌────────────────────────────────────────────────────────────────┐
│             MECCA Platinum FM API Server                       │
│        https://api-mecca.platinumfm.com.au                    │
│                                                                │
│  - POST /api/Users/Login                                      │
│  - GET  /api/Users/Roles                                      │
│  - GET  /api/Users/GetUserProfile                             │
│  - GET  /api/WorkOrders/Vendors                               │
│  - ... (other endpoints)                                       │
└────────────────────────────────────────────────────────────────┘
```

## 🔄 Authentication Flow

### Initial Login Flow

```
User Opens App
      │
      ▼
Check localStorage
for valid token?
      │
      ├─── Yes ──► Use existing token ──► Load Portal
      │
      └─── No
            │
            ▼
      Call Azure Function
      /api/auth-proxy?action=login
            │
            ▼
      Azure Function retrieves
      credentials from App Config
            │
            ▼
      POST to MECCA API
      /api/Users/Login
            │
            ▼
      Receive JWT token
      + expiry date
            │
            ▼
      Return token to browser
            │
            ▼
      Store in localStorage:
      - mecca_auth_token
      - mecca_token_expiry
            │
            ▼
      Load Portal (iframe or proxy)
```

### Token Refresh Flow

```
Every 6 hours
      │
      ▼
Check token expiry
      │
      ├─── Valid (>1hr left) ──► Do nothing
      │
      └─── Expired or <1hr left
            │
            ▼
      Repeat login flow
            │
            ▼
      Get new token
            │
            ▼
      Update localStorage
            │
            ▼
      Reload page (optional)
```

### API Request Flow (Proxy Mode)

```
User Action in Portal
      │
      ▼
Portal makes API call
      │
      ▼
Intercepted by your wrapper
      │
      ▼
POST /api/auth-proxy?action=proxy
  &path=/api/Users/Roles
  &method=GET
      │
      ▼
Azure Function adds
Authorization header
      │
      ▼
Forward to MECCA API
api-mecca.platinumfm.com.au
      │
      ▼
Receive response
      │
      ▼
Return to browser
      │
      ▼
Display in portal
```

## 🔐 Security Model

### What's Secure ✅

1. **Credentials Storage**
   - Stored in Azure App Configuration
   - Never exposed to client browser
   - Can be rotated without code changes
   - Optional: Use Azure Key Vault for even better security

2. **Token Transmission**
   - Always over HTTPS
   - Short-lived tokens (7 days)
   - Stored in browser localStorage (cleared on logout)
   - Auto-refresh mechanism

3. **API Protection**
   - CORS configured to allow only your domain
   - Function-level authentication possible
   - Request validation in Azure Function

### Security Considerations ⚠️

1. **Browser Storage**
   - Token stored in localStorage (visible in DevTools)
   - User can extract token if they try
   - Acceptable for internal apps, review for public-facing

2. **Iframe Embedding**
   - Target site may block with X-Frame-Options
   - CSP headers may prevent embedding
   - Consider reverse proxy if this is an issue

3. **Credential Management**
   - Single set of credentials for all users
   - Consider implementing per-user auth if needed
   - Audit logging recommended for compliance

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|----------|
| Frontend | HTML5/CSS3/Vanilla JS | Simple, no build process |
| Hosting | Azure Static Web Apps | Free tier, auto-HTTPS, CDN |
| Backend | Azure Functions (Node.js) | Serverless API, auto-scaling |
| Storage | Browser localStorage | Client-side token storage |
| Config | Azure App Configuration | Secure credential storage |
| API | REST/JSON | MECCA Platinum FM API |

## 📊 Data Flow

### Login Request
```javascript
Browser                 Azure Function              MECCA API
  │                           │                          │
  ├─POST /api/auth-proxy─────►│                          │
  │  ?action=login            │                          │
  │                           │                          │
  │                           ├─POST /api/Users/Login───►│
  │                           │  {username, password}    │
  │                           │                          │
  │                           │◄─────200 OK──────────────┤
  │                           │  {token, expiry, ...}    │
  │                           │                          │
  │◄────200 OK────────────────┤                          │
  │  {token, expiry, ...}     │                          │
  │                           │                          │
  ▼                           │                          │
localStorage.setItem()        │                          │
```

### API Proxy Request
```javascript
Browser                 Azure Function              MECCA API
  │                           │                          │
  ├─POST /api/auth-proxy─────►│                          │
  │  ?action=proxy            │                          │
  │  &path=/api/Users/Roles   │                          │
  │  Authorization: Bearer XX │                          │
  │                           │                          │
  │                           ├─GET /api/Users/Roles────►│
  │                           │  Authorization: Bearer XX│
  │                           │                          │
  │                           │◄─────200 OK──────────────┤
  │                           │  [{role1}, {role2}]      │
  │                           │                          │
  │◄────200 OK────────────────┤                          │
  │  [{role1}, {role2}]       │                          │
  │                           │                          │
```

## 🎯 Use Cases

### Use Case 1: Direct Access
**Scenario**: User visits your Azure Static Web App URL directly

**Flow**:
1. User navigates to `https://your-app.azurestaticapps.net`
2. App checks for valid token
3. If none, automatically logs in via Azure Function
4. Portal loads (iframe or proxy mode)
5. User sees authenticated portal content

### Use Case 2: Embedded in Another App
**Scenario**: Your main app embeds the portal wrapper

**Implementation**:
```html
<!-- In your main app -->
<iframe 
  src="https://your-app.azurestaticapps.net" 
  width="100%" 
  height="800px"
  frameborder="0">
</iframe>
```

**Flow**:
1. Main app loads with iframe
2. Iframe loads portal wrapper
3. Wrapper handles authentication transparently
4. Portal appears authenticated inside iframe

### Use Case 3: Deep Linking
**Scenario**: Link directly to specific portal pages

**Implementation**:
```html
<a href="https://your-app.azurestaticapps.net#/workorders">
  View Work Orders
</a>
```

**Note**: Requires portal to support hash routing or path parameters

## 🔄 Migration Strategy

### Phase 1: Current (Temporary)
- Use this wrapper with existing MECCA portal
- All authentication handled automatically
- URL: `https://your-app.azurestaticapps.net`

### Phase 2: During Rebuild
- Keep wrapper running
- Start building new portal
- Test in parallel
- No changes to consuming applications

### Phase 3: Switch Over
**Option A**: Update wrapper to point to new portal
```javascript
// In index-proxy.html
const CONFIG = {
  portalUrl: 'https://new-portal.yourdomain.com'  // Change this
};
```

**Option B**: Use wrapper's Azure Function with new API
```javascript
// In auth-proxy/index.js
const options = {
  hostname: 'new-api.yourdomain.com',  // Change this
  path: '/api/auth/login'              // Update endpoints
};
```

**Result**: Consuming apps see NO change, same URL works

### Phase 4: Deprecate Wrapper (Optional)
- Once new portal is stable
- Can gradually migrate users
- Or keep wrapper for backwards compatibility

## 📈 Performance Considerations

### Cold Start
- Azure Functions: ~500ms first request
- Static Web App: ~100ms (CDN cached)
- Total: ~600ms first load

### Warm Start
- Azure Functions: ~50-100ms
- Static Web App: ~20ms (CDN)
- Total: ~70-120ms typical

### Token Lifetime
- Token valid: 7 days
- Refresh check: Every 6 hours
- Most users: No re-authentication needed

### Scaling
- Static Web App: Auto-scales globally
- Azure Functions: Auto-scales based on load
- No configuration needed for normal usage

## 🔍 Monitoring & Debugging

### Azure Portal Monitoring
```
Your Static Web App → Monitoring
  ├─ Overview (requests, errors, latency)
  ├─ Log stream (real-time logs)
  ├─ Application Insights (detailed analytics)
  └─ Alerts (set up notifications)
```

### Browser DevTools
```
F12 → Console Tab
  ├─ Check for JavaScript errors
  ├─ Look for "Using existing valid token" message
  └─ Verify token in localStorage

F12 → Network Tab
  ├─ Filter by "auth-proxy"
  ├─ Check request/response headers
  └─ Verify 200 status codes

F12 → Application Tab
  ├─ Local Storage → Check token exists
  └─ Verify expiry date is in future
```

## 📝 Maintenance Checklist

### Weekly
- [ ] Check Azure costs (should be minimal on free tier)
- [ ] Review any error logs in Azure Portal
- [ ] Verify token refresh is working

### Monthly
- [ ] Review Application Insights for usage patterns
- [ ] Check for any failed login attempts
- [ ] Update credentials if needed

### As Needed
- [ ] Rotate credentials (update in Azure App Config)
- [ ] Update to latest Node.js LTS (in staticwebapp.config.json)
- [ ] Review security best practices

## 🆘 Common Issues & Solutions

### Issue: 401 Unauthorized
**Cause**: Invalid credentials or token
**Fix**: Update MECCA_USERNAME and MECCA_PASSWORD in Azure App Config

### Issue: CORS Error
**Cause**: API blocking cross-origin requests
**Fix**: Already configured in staticwebapp.config.json, but verify CSP headers

### Issue: Iframe Blocked
**Cause**: X-Frame-Options header from MECCA portal
**Fix**: Use reverse proxy mode or accept "Open Directly" button

### Issue: Token Expired
**Cause**: Token older than 7 days
**Fix**: Auto-refresh should handle this, manually clear localStorage if needed

---

**Remember**: This architecture is designed to be temporary and easily replaceable. The key benefit is that your consuming applications don't need to change when you rebuild the portal - just update this wrapper to point to the new backend.
