## 0.2.0

### Added
- Multi-user support: each Home Assistant user now has their own isolated health data.
  Authentication is automatic via HA's ingress — no separate login required.
- Username display: the logged-in user's display name appears in the top status bar.

### Security
- User identity headers are only trusted when the request comes through HA ingress
  (`X-Ingress-Path` present). Direct connections to port 8099 are treated as anonymous,
  preventing impersonation via the direct port.

### Changed
- Each HA user connects their own Google account independently.

---

[All releases →](https://github.com/nsaputro/health-recorder/releases)
