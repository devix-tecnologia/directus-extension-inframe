# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- Re-enabled the URL security validation that blocks `$token`/`$refresh_token` in non-HTTPS URLs. It had been left
  disabled for debugging since v2.1.5, so v2.1.5 to v2.2.0 sent the Directus access token to `http://` iframes in clear
  text. There is no exception for `http://localhost`/`127.0.0.1`.
- `$token` is now also blocked in the URL host name, the scheme check is case-insensitive and the final URL is checked
  again after the variables are replaced.
- Removed `[inFrame DEBUG]` console logs (one of them could print the `/inframe-token` response, including the token)
  and the log of the processed URL (personal data such as the user e-mail).

### Added

- Comprehensive test suite with Vitest
- Integration tests for multiple Directus versions (9.x, 10.x, 11.x, latest)
- Docker-based testing environment
- Automated CI/CD pipeline with GitHub Actions
- Semantic release automation
- Dependabot configuration for dependency updates
- Automated Directus version updates
- Test coverage reporting
- Comprehensive testing documentation

### Changed

- Updated package.json with test scripts and new dependencies
- Enhanced README with testing instructions
- Improved error handling in extension components

### Fixed

- Improved compatibility across different Directus versions
- Better error handling for edge cases

## [2.0.2] - Previous Release

### Added

- Navigation persistence functionality
- Advanced iframe content visualization
- Integration with Directus routing system

### Changed

- Improved user experience with persistent navigation
- Enhanced component structure

### Fixed

- Various bug fixes and improvements
