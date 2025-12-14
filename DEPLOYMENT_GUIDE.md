# SpotItNow Deployment Guide

## Overview
This document outlines the deployment process for the SpotItNow application, including the backend hosting on Render and the frontend distribution via Expo EAS.

## Backend Deployment (Render)

The backend is hosted on **Render** as a Web Service.

- **Service URL:** `https://spotitnow-backend.onrender.com`
- **Repository Mirror:** `https://github.com/NickWickboldt/spot-it-now-deploy`
  - *Note:* Since we are contributors to the main repo, we use this personal mirror to connect with Render.
- **Configuration:** Defined in `render.yaml` in the project root.
- **Database:** MongoDB Atlas (Cluster: `spotitnow`, Database Name: `test`).
  - *Network Access:* `0.0.0.0/0` (Allow from anywhere) is required for Render.

### Cost & Billing
- **Plan:** Render Individual / Hobby
- **Cost:** ~$7.00 / month
- **Billing Contact:** Nicholas Wickboldt (Card ending in **6180**)

### How to Deploy Backend Updates
1.  **Sync Changes to Mirror:**
    Push your local changes to the deployment mirror repository.
    ```bash
    git push deploy main
    ```
    *(Ensure you have added the remote: `git remote add deploy https://github.com/NickWickboldt/spot-it-now-deploy.git`)*

2.  **Automatic Deployment:**
    Render detects the push to `main` and automatically builds and deploys the new version.
    - Monitor status at: [dashboard.render.com](https://dashboard.render.com)

## Frontend Deployment (Expo EAS)

The frontend is distributed using **Expo Application Services (EAS)**.

### Prerequisites
- Run commands from the `frontend/` directory.
- Ensure `app.config.js` and `eas.json` are correctly configured.

### How to Publish an Update
To publish a new Over-The-Air (OTA) update to the `preview` channel:

```bash
cd frontend
eas update --branch preview --message "your update message here"
```

### Important Configuration Notes
- **API URL:** The frontend is hardcoded to use the production Render URL in `frontend/api/client.ts`.
  ```typescript
  export let BASE_URL = 'https://spotitnow-backend.onrender.com/api/v1';
  ```
  *Do not revert this to localhost unless you are strictly developing locally and not publishing.*

## Troubleshooting
- **Login Fails:** Check Render logs for server-side errors. Ensure MongoDB Network Access allows `0.0.0.0/0`.
- **Update Not Visible:** Force close and reopen the Expo Go app. Ensure you are scanning the QR code for the `preview` channel.
