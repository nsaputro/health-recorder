# Health Recorder Add-on

Track body weight, lab results (cholesterol, glucose, uric acid), blood pressure, and heart rate — all from your Home Assistant sidebar.

Data is stored locally in `/data/health_recorder.db` and can optionally be synced to **Google Health** and **Google Sheets**.

---

## Installation

1. In Home Assistant, go to **Settings → Add-ons → Add-on Store**
2. Click the **⋮ menu → Repositories**
3. Add this repository URL: `https://github.com/nsaputro/health-recorder`
4. Find **Health Recorder** and click **Install**
5. Start the add-on — the panel appears in the HA sidebar as **Health**

---

## Google Sync (optional)

To sync data to Google Health and Google Sheets:

### 1. Create Google Cloud credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select an existing one
3. Enable these APIs:
   - **Google Health API**
   - **Google Sheets API**
   - **Google Drive API**
4. Go to **Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Add authorized redirect URI:
     ```
     http://<your-ha-ip>:8099/auth/google/callback
     ```
5. Copy the **Client ID** and **Client Secret**

### 2. Configure the add-on

In the add-on **Configuration** tab, set:

| Option | Value |
|--------|-------|
| `google_client_id` | Your Client ID |
| `google_client_secret` | Your Client Secret |
| `google_redirect_uri` | `http://<ha-ip>:8099/auth/google/callback` |

Restart the add-on, then open the **Health** panel → **Settings** → **Connect Google Account**.

---

## What syncs where

| Metric | Google Health | Google Sheets |
|--------|--------------|---------------|
| Body weight | ✅ | ✅ |
| Blood pressure | — ¹ | ✅ |
| Heart rate | ✅ | ✅ |
| Blood glucose (fasting/random) | ✅ | ✅ |
| Cholesterol (LDL/HDL/Total) | — | ✅ |
| Triglycerides | — | ✅ |
| HbA1c | — | ✅ |
| Uric acid | — | ✅ |

¹ The Google Health API v4 has no blood pressure data type. All metrics including blood pressure are always synced to Google Sheets.

---

## Data

All health data is stored in `/data/health_recorder.db` (SQLite). This file persists across addon restarts and updates. Back it up via the HA backup system.

The API is accessible directly at `http://<ha-ip>:8099` — full Swagger docs at `http://<ha-ip>:8099/docs`.
