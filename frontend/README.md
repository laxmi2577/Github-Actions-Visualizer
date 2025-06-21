# CI/CD Pipeline Visualizer for GitHub Actions

### A developer tool for visualizing complex GitHub Actions workflows as an interactive, real-time dependency graph.

This project goes beyond simple status badges, providing developers with an intuitive, graphical representation of their CI/CD pipelines to instantly identify dependencies, track real-time job progress, and quickly debug failures by accessing logs directly from the graph.

---

<!-- 
  TODO: HOW TO ADD A DEMO GIF
  1. Record a short video of you using the application (showing the login, repo selection, graph view, and clicking a node to see logs).
  2. Convert the video to a GIF. You can use a free online tool like ezgif.com.
  3. Place the GIF in your `docs/images/` folder and uncomment the line below.
-->
<!-- ![Live Demo GIF](docs/images/demo.gif) -->

**Live Demo URL:** `[Your Deployed App URL Here]`

## The Problem: Lack of Intuitive CI/CD Visibility

In modern software development, GitHub Actions pipelines can become incredibly complex, with dozens of jobs, intricate dependencies, and dynamic matrix strategies. While the standard GitHub UI shows a list of jobs, it fails to provide a clear, high-level overview of the entire workflow architecture. This makes it difficult for developers to:
-   Quickly understand the critical path of a deployment.
-   Identify performance bottlenecks.
-   Onboard new team members to the CI/CD process efficiently.
-   Debug failures without clicking through multiple pages to find the right logs.

This tool was built to solve that problem by parsing workflow files and rendering them as an interactive Directed Acyclic Graph (DAG), providing the missing "big picture" view.

## Key Features

-   **Secure GitHub Authentication:** Uses a standard OAuth2 flow to securely access repository data.
-   **Repository & Workflow Discovery:** Automatically discovers and lists all repositories and their associated workflow files.
-   **Interactive Graph Visualization:** Renders jobs and their `needs` dependencies as an interactive graph using React Flow.
-   **Real-Time Status Updates:** Polls the GitHub API to display job statuses (`success`, `failure`, `in_progress`) with color-coded nodes and icons.
-   **Direct Log Access:** Click any node on the graph to instantly view the raw logs for that specific job in a modal, streamlining the debugging process.
-   **Complex Workflow Support:** Intelligently parses and "unrolls" matrix strategy jobs, accurately visualizing parallel test configurations.

## System Design and Technical Deep-Dive

This application is built with a modern, decoupled architecture, with a distinct frontend and backend to ensure scalability and maintainability.

### Architecture

-   **Frontend:** A dynamic, single-page application (SPA) built with **React** and deployed statically.
-   **Backend:** A lightweight, high-performance **Python REST API** responsible for all business logic and communication with the GitHub API.

This separation of concerns allows for independent development, scaling, and deployment of the user interface and the core logic.

### Technical Choices & Rationale

-   **Frontend - React & Vite:** React was chosen for its component-based architecture, making it ideal for managing the complex state of an interactive UI. **React Flow** was selected for graph visualization due to its high performance and extensive customization options. The project is bundled with **Vite** for a significantly faster development experience.

-   **Backend - Python & FastAPI:** Python was selected for its rapid development speed and its world-class ecosystem for data handling. **FastAPI** was the framework of choice because its `async` capabilities are perfectly suited for an API that is heavily I/O-bound (i.e., spends most of its time waiting for responses from the GitHub API). This results in high throughput with low resource usage.

-   **YAML Parsing & Graph Generation:** The core of the backend's logic lies in the YAML parsing service. It recursively analyzes the `jobs` and `needs` keys to build an in-memory representation of the workflow's dependency graph. A key feature is its ability to expand `strategy.matrix` definitions, calculating all possible combinations and creating distinct nodes for each one, accurately reflecting how GitHub Actions executes the workflow. This ensures that even complex, fan-out/fan-in pipeline patterns are rendered correctly.

## Tech Stack

| Frontend | Backend | APIs / Libraries |
| :--- | :--- | :--- |
| ![React](https://img.shields.io/badge/-React-61DAFB?style=for-the-badge&logo=react&logoColor=black) | ![Python](https://img.shields.io/badge/-Python-3776AB?style=for-the-badge&logo=python&logoColor=white) | ![GitHub API](https://img.shields.io/badge/-GitHub%20API-181717?style=for-the-badge&logo=github&logoColor=white) |
| ![Vite](https://img.shields.io/badge/-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white) | ![FastAPI](https://img.shields.io/badge/-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white) | ![React Flow](https://img.shields.io/badge/-React%20Flow-1A192B?style=for-the-badge) |
| ![JavaScript](https://img.shields.io/badge/-JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black) | | ![React Icons](https://img.shields.io/badge/-React%20Icons-E91E63?style=for-the-badge&logo=react&logoColor=white) |
| ![CSS3](https://img.shields.io/badge/-CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white) | | |
| ![HTML5](https://img.shields.io/badge/-HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white) | | |


## Local Development

To run this project on your local machine, follow these steps:

1.  **Prerequisites:**
    -   Node.js & npm
    -   Python 3.8+ & pip
    -   Git

2.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/your-username/github-actions-visualizer.git](https://github.com/your-username/github-actions-visualizer.git)
    cd github-actions-visualizer
    ```

3.  **Setup GitHub OAuth App:**
    -   Go to your GitHub Developer settings > OAuth Apps > New OAuth App.
    -   **Homepage URL:** `http://localhost:5173`
    -   **Authorization callback URL:** `http://127.0.0.1:8000/callback`
    -   Generate a new client secret and copy your Client ID and Client Secret.

4.  **Backend Setup:**
    ```bash
    cd backend
    python -m venv venv
    # Activate the virtual environment
    # On Windows: venv\Scripts\activate
    # On macOS/Linux: source venv/bin/activate
    pip install -r requirements.txt # You would create a requirements.txt file
    # Create a .env file and add your GitHub credentials
    # GITHUB_CLIENT_ID=...
    # GITHUB_CLIENT_SECRET=...
    uvicorn main:app --reload
    ```
    *(Note: You can generate a `requirements.txt` file by running `pip freeze > requirements.txt` in your activated backend environment.)*

5.  **Frontend Setup:**
    ```bash
    # Open a new terminal
    cd frontend
    npm install
    npm run dev
    ```

6.  Open your browser to `http://localhost:5173`.

## Screenshots

<!-- 
  IMPORTANT: Make sure you have created a `docs/images` folder in your project
  and placed your screenshots inside it. Then, update the paths below.
-->
| Repository List | Workflow List |
| :---: | :---: |
| ![Repository List Screenshot](docs/images/01-repo-list.png) | ![Workflow List Screenshot](docs/images/02-workflow-list.png) |
| **Simple Graph View** | **Log Viewer Modal** |
| ![Simple Graph Screenshot](docs/images/03-simple-view.png) | ![Log Viewer Screenshot](docs/images/04-log-modal.png) |
