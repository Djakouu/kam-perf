# Deployment Guide for Render.com

This project is configured to be deployed on [Render.com](https://render.com) using a Blueprint (Infrastructure as Code).

## Prerequisites

1.  **Git Repository**: Push this entire project to a GitHub or GitLab repository.
2.  **Render Account**: Create a free account on Render.com.
3.  **Database**: You need a PostgreSQL database (e.g., from Render, Neon, or Supabase).
4.  **Redis**: You need a Redis instance (e.g., from Render or Upstash).

## Deployment Steps

1.  **New Blueprint**:
    *   Go to your Render Dashboard.
    *   Click **New +** -> **Blueprint**.
    *   Connect your repository.

2.  **Configuration**:
    *   Render will detect the `render.yaml` file.
    *   It will ask you to provide values for the environment variables defined in `render.yaml`.

3.  **Environment Variables**:
    You will need to provide the following values in the Render Dashboard:

    *   `DATABASE_URL`: Your Production PostgreSQL connection string.
    *   `REDIS_HOST`: Your Production Redis host (e.g., `red-xxxx.render.com`).
    *   `REDIS_PORT`: Your Production Redis port (e.g., `6379`).
    *   `REDIS_PASSWORD`: Your Production Redis password.

    *Note: `VITE_API_URL` for the frontend is automatically handled by the Blueprint configuration.*

4.  **Deploy**:
    *   Click **Apply**. Render will create 3 services:
        *   `lighthouse-api` (Node.js API)
        *   `lighthouse-worker` (Docker Worker with Chrome)
        *   `lighthouse-web` (Static Frontend)

## Services Overview

*   **lighthouse-api**: The backend GraphQL API.
*   **lighthouse-worker**: A background worker that runs Puppeteer/Lighthouse. It uses a custom Docker image to ensure Chrome is installed.
*   **lighthouse-web**: The React frontend, built with Vite. It is served as a static site and connects to the API.

## Troubleshooting

*   **Build Failures**: Check the logs. If `prisma generate` fails, ensure the database connection string is correct (though generation usually doesn't need a live DB, just the schema).
*   **CORS Issues**: If the frontend cannot talk to the backend, check the Network tab in your browser. The API is currently configured to allow all origins (default Apollo Server behavior).
