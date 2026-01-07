# Mongo Scheduler API

Backend API server for the [Mongo Scheduler UI](https://github.com/darshanpatel14/mongo-job-scheduler-ui). Built with Express and [mongo-job-scheduler](https://github.com/darshanpatel14/mongo-job-scheduler).

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB running locally or remote connection string

### Setup

1.  **Install Dependencies**:

    ```bash
    npm install
    ```

2.  **Configure Environment**:
    Create a `.env` file (optional, defaults provided):

    ```env
    MONGO_URL=mongodb://localhost:27017
    DB_NAME=scheduler
    PORT=3000
    ```

3.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    The API will be available at `http://localhost:3000`.

## 🛠️ Generator Utilities

This repository includes scripts to generate sample data for testing:

- **Generate Jobs**: Creates 60+ diverse jobs (emails, reports, payments, etc.).
  ```bash
  node generate-jobs.js
  ```
- **Clear Jobs**: Wipes the job database to start fresh.
  ```bash
  node clear-jobs.js
  ```

## 🔌 API Endpoints

- `GET /jobs` - List jobs (supports pagination & filtering)
- `GET /jobs/stats` - Get job statistics
- `GET /jobs/:id` - Get job details
- `POST /jobs` - Create a new job
- `PUT /jobs/:id` - Update a job
- `DELETE /jobs/:id` - Permanently delete a job
- `POST /jobs/:id/cancel` - Cancel a pending/running job
- `POST /jobs/:id/retry` - Retry a failed job

## 🔗 Related Repositories

- **Frontend UI**: [mongo-scheduler-ui](https://github.com/darshanpatel14/mongo-job-scheduler-ui)
- **Core Library**: [mongo-job-scheduler](https://github.com/darshanpatel14/mongo-job-scheduler)

## 📄 License

MIT
