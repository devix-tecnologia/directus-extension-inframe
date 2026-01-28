# Directus Extension - inFrame Module

[![npm version](https://raw.githubusercontent.com/devix-tecnologia/directus-extension-inframe/main/docs/badge-npm-v2-0-5.svg)](https://www.npmjs.com/package/directus-extension-inframe)
[![License](https://raw.githubusercontent.com/devix-tecnologia/directus-extension-inframe/main/docs/badge-license-gpl-3-0.svg)](https://github.com/devix-tecnologia/directus-extension-inframe/blob/main/LICENSE)

View and manage external content through iframes directly in the Directus admin panel.

![Extension preview](https://raw.githubusercontent.com/devix-tecnologia/directus-extension-inframe/main/docs/tela.jpg)

## 🎯 Why use it?

- **📊 External dashboards**: Integrate Power BI, Tableau, Metabase or any BI tool
- **📈 Real-time reports**: View updated data without leaving Directus
- **🔗 Organized links**: Centralize access to external tools in one place
- **🌍 Multilingual support**: Automatic translations for multiple languages
- **⚡ Zero configuration**: Plug-and-play installation with automatic setup

## ✨ Features

### 🚀 Automatic Setup

The extension **automatically** creates all necessary collections, fields and relations upon installation!

**No manual configuration required:**

- ✅ `inframe` collection to manage content
- ✅ `languages` collection for languages
- ✅ `inframe_translations` collection for translations
- ✅ Folder system for organization
- ✅ All fields and relations configured

**How it works:**

1. Install the extension
2. Restart Directus
3. Done! Start using immediately

### 🔄 Navigation Persistence

Resume exactly where you left off:

- 💾 Automatically saves your last view
- 🔖 Restores state when returning to the module
- 🚀 Works even after closing/reopening browser
- ⚡ Zero performance impact

## 📦 Installation

### Via NPM

```bash
npm install directus-extension-inframe
```

### Via PNPM

```bash
pnpm add directus-extension-inframe
```

### After installation

1. Restart the Directus server
2. Access the admin panel
3. The "Reports" module will be available in the sidebar

## 💡 How to Use

### 1. Access the module

In the Directus sidebar, click "Reports" (document icon).

### 2. Create a new item

1. Click "Create new"
2. Fill in the fields:
   - **URL**: Link to the content to be displayed in the iframe
   - **Status**: Published, Draft or Archived
   - **Icon**: Choose a Material Design icon
   - **Thumbnail**: Preview image (optional)
3. Add translations for different languages (optional)
4. Save

### 3. View

The content will be displayed in the iframe within the Directus panel, allowing direct interaction.

## 🔗 Dynamic URL Variables

You can use dynamic variables in your URLs to pass user context and authentication to external sites.

### Available Variables

**Authentication:**
- `$token` - Directus access token (JWT) ⚠️ **Use with caution**
- `$user_id` - Current user's ID
- `$user_email` - Current user's email

**User Identity:**
- `$user_name` - User's full name
- `$user_first_name` - User's first name
- `$user_last_name` - User's last name
- `$user_role` - User's role

**Context:**
- `$timestamp` - Current timestamp (ISO 8601)
- `$locale` - User's language preference (e.g., pt-BR, en-US)

### Examples

**Power BI with authentication:**
```
https://app.powerbi.com/view?token=$token&user_id=$user_id
```

**Metabase with user context:**
```
https://metabase.company.com/dashboard/sales?user=$user_email&role=$user_role
```

**Custom analytics:**
```
https://analytics.company.com/view?viewer=$user_email&timestamp=$timestamp
```

### ⚠️ Security Warnings for `$token`

Using the `$token` variable in URLs introduces security risks:

- ❌ **Token exposure in logs**: The token will appear in server logs of the external site
- ❌ **Browser history**: Token will be stored in browser history
- ❌ **Referrer headers**: Token may leak via HTTP Referer header
- ❌ **Session hijacking**: Anyone with the URL can impersonate the user

**Security Requirements:**
- ✅ **HTTPS only**: URLs with `$token` MUST use HTTPS (HTTP will be blocked)
- ✅ **Trusted sites only**: Only use with sites you fully control and trust
- ✅ **Review logs**: Ensure external sites don't log complete URLs
- ✅ **Compliance**: Consider LGPD/GDPR implications

**Best Practices:**
1. Avoid using `$token` in URLs when possible
2. Use non-sensitive variables like `$user_id` or `$user_email` instead
3. Consider implementing a backend proxy for better security
4. Document which sites receive tokens and why
5. Regularly audit usage of token variables

> [!WARNING]
> The extension will show console warnings and block HTTP URLs when using `$token`.
> This is not foolproof - use at your own risk and only with fully trusted external sites.

## ⚙️ Docker Configuration (Optional)

If you use Docker, configure CSP to allow iframes:

```yaml
environment:
  CONTENT_SECURITY_POLICY_DIRECTIVES__FRAME_SRC: "'self' https://your-domain.com"
```

> [!WARNING] Avoid using `'*'` in production. Specify only trusted domains.

## 🔒 Security

- Configure CSP (Content Security Policy) properly
- List only trusted domains for iframes
- Use HTTPS in production
- Review user permissions in Directus

## 🌍 Compatibility

Tested and compatible with:

- **Directus 9.x**: 9.22.4, 9.23.1, 9.24.0
- **Directus 10.x**: 10.8.3
- **Directus 11.x**: 11.13.1 and newer versions

## 🐛 Known Issues

- Some websites block iframe display by policy (X-Frame-Options)
- HTTPS content cannot be displayed in HTTP Directus

## 🤝 Contributing

Contributions are welcome! See our [Contributing Guide](CONTRIBUTING.md) for details about:

- How to set up the development environment
- Running tests
- Submitting Pull Requests
- Code standards

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Sidarta Veloso** - [GitHub](https://github.com/sidartaveloso) |
  [LinkedIn](https://www.linkedin.com/in/sidartaveloso)
- **Fernando Gatti** - [GitHub](https://github.com/gattifernando) |
  [LinkedIn](https://www.linkedin.com/in/gattifernando/)

## 🏢 Organization

[Devix Tecnologia Ltda.](https://github.com/devix-tecnologia)
