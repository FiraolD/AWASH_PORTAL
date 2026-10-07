# Awash Customer Mobile App

Expo app for Awash Insurance customers. It supports customer sign-in, policy browsing and applications, claim tracking and filing for active policies, payment reference history, support tickets and replies, and profile updates.

## Configure the API

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to the backend base URL ending in `/api`. For a physical phone on a development network, use the computer's LAN IP address instead of `localhost`. For a production build, use the same deployed HTTPS API URL as the web portal (`https://awash-portal.onrender.com/api`).

The local backend prefers `DEPLOYED_DATABASE_URL` over `DATABASE_URL`, so local app testing uses the same Neon database as deployment. Set `DEPLOYED_DATABASE_URL` in `backend/.env` to the current Neon connection string with its active password before starting the local API. The fallback `DATABASE_URL` should only be used for a deliberate local-database development session.

The backend permits requests without a browser origin for native clients. Web deployments still need their origin included in the backend CORS allowlist.

## Run and validate

From this directory:

```sh
npm install
npm run start
npm run android
npm run ios
npm run web
npm run typecheck
npm run export:web
```

The first signed-in session is saved with Expo SecureStore on iOS and Android. The web build uses browser local storage.