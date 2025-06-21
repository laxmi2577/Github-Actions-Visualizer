# File: backend/main.py
# This version includes the logic to parse matrix strategy jobs.

import os
import sys
import httpx
import yaml
import base64
import itertools # We'll use this to help with the matrix combinations
from fastapi import FastAPI, Header, HTTPException
from starlette.responses import RedirectResponse, Response
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# --- Configuration & App Initialization ---
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
    print("FATAL ERROR: GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are not set in .env file.")
    sys.exit(1)
FRONTEND_URL = "http://localhost:5173"
GITHUB_API_URL = "https://api.github.com"
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=[FRONTEND_URL], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- Helper function ---
def get_auth_client(authorization: str):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    token = authorization.split(" ")[1]
    headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"}
    return httpx.AsyncClient(headers=headers, follow_redirects=True)

# --- API Endpoints ---
# (Endpoints /login, /callback, /repositories, /workflows are unchanged)
@app.get("/login/github")
async def login_github():
    github_auth_url = f"https://github.com/login/oauth/authorize?client_id={GITHUB_CLIENT_ID}&scope=repo"
    return RedirectResponse(url=github_auth_url)
@app.get("/callback")
async def callback(code: str):
    params = {"client_id": GITHUB_CLIENT_ID, "client_secret": GITHUB_CLIENT_SECRET, "code": code}
    headers = {"Accept": "application/json"}
    async with httpx.AsyncClient() as client:
        response = await client.post("https://github.com/login/oauth/access_token", params=params, headers=headers)
    access_token = response.json().get("access_token")
    return RedirectResponse(f"{FRONTEND_URL}?token={access_token}")
@app.get("/repositories")
async def get_repositories(authorization: str = Header(None)):
    async with get_auth_client(authorization) as client:
        response = await client.get(f"{GITHUB_API_URL}/user/repos?sort=updated&per_page=100")
        if response.status_code != 200: raise HTTPException(status_code=response.status_code, detail="Error fetching repositories")
        return response.json()
@app.get("/repositories/{owner}/{repo_name}/workflows")
async def get_workflows(owner: str, repo_name: str, authorization: str = Header(None)):
    async with get_auth_client(authorization) as client:
        url = f"{GITHUB_API_URL}/repos/{owner}/{repo_name}/actions/workflows"
        response = await client.get(url)
        if response.status_code != 200: raise HTTPException(status_code=response.status_code, detail="Error fetching workflows")
        return response.json().get("workflows", [])


# --- UPDATED ENDPOINT with MATRIX LOGIC ---
@app.get("/parse-workflow")
async def parse_workflow(owner: str, repo_name: str, workflow_path: str, authorization: str = Header(None)):
    async with get_auth_client(authorization) as client:
        url = f"{GITHUB_API_URL}/repos/{owner}/{repo_name}/contents/{workflow_path}"
        response = await client.get(url)
    if response.status_code != 200: raise HTTPException(status_code=response.status_code, detail="Could not fetch workflow file.")
    
    file_content_base64 = response.json()['content']
    decoded_content = base64.b64decode(file_content_base64).decode('utf-8')
    workflow_data = yaml.safe_load(decoded_content)

    nodes, edges = [], []
    if 'jobs' not in workflow_data or not isinstance(workflow_data['jobs'], dict): return {"nodes": [], "edges": []}

    # Store a map of job_id to its matrix variations
    job_matrix_map = {}
    
    # First pass: identify all jobs and their matrix variations
    for job_id, job_details in workflow_data['jobs'].items():
        if 'strategy' in job_details and 'matrix' in job_details['strategy']:
            matrix = job_details['strategy']['matrix']
            keys, values = zip(*matrix.items())
            combinations = [dict(zip(keys, v)) for v in itertools.product(*values)]
            
            matrix_node_ids = []
            for combo in combinations:
                combo_str = ", ".join(f"{v}" for v in combo.values())
                node_label = f"{job_id}\n({combo_str})"
                node_id = f"{job_id} ({combo_str})" # This matches the name GitHub uses
                matrix_node_ids.append(node_id)
            job_matrix_map[job_id] = matrix_node_ids
        else:
            job_matrix_map[job_id] = [job_id]
            
    # Second pass: create nodes and edges
    x_pos = 100
    job_positions = {}
    
    # A simple way to handle layout: determine columns by dependencies
    job_columns = {}
    def get_column(job_id):
        if job_id in job_columns:
            return job_columns[job_id]
        
        needs = workflow_data['jobs'].get(job_id, {}).get('needs', [])
        if isinstance(needs, str): needs = [needs]

        if not needs:
            job_columns[job_id] = 0
            return 0
        
        max_col = max(get_column(dep) for dep in needs) + 1
        job_columns[job_id] = max_col
        return max_col
        
    for job_id in workflow_data['jobs']:
        get_column(job_id)
        
    y_positions = [100] * (max(job_columns.values()) + 1)

    for job_id, job_details in sorted(workflow_data['jobs'].items(), key=lambda item: job_columns.get(item[0], 0)):
        col_index = job_columns.get(job_id, 0)
        x_pos = 100 + col_index * 300
        
        for node_id_variation in job_matrix_map.get(job_id, []):
            label = node_id_variation
            if len(job_matrix_map[job_id]) > 1:
                label_parts = node_id_variation.replace(f"{job_id} (", "").replace(")", "")
                label = f"{job_id}\n({label_parts})"
            
            nodes.append({"id": node_id_variation, "position": {"x": x_pos, "y": y_positions[col_index]}, "data": {"label": label}})
            job_positions[node_id_variation] = (x_pos, y_positions[col_index])
            y_positions[col_index] += 120
            
            # Create edges
            if 'needs' in job_details:
                dependencies = job_details['needs']
                if isinstance(dependencies, str): dependencies = [dependencies]
                
                for dep in dependencies:
                    # Connect from all variations of the dependency job
                    for source_node_variation in job_matrix_map.get(dep, []):
                        edges.append({"id": f"e-{source_node_variation}-to-{node_id_variation}", "source": source_node_variation, "target": node_id_variation, "animated": True, "type": "smoothstep"})

    return {"nodes": nodes, "edges": edges}


# (The /workflow-status and /jobs/{job_id}/logs endpoints are unchanged)
@app.get("/workflow-status/{owner}/{repo_name}/{workflow_id}")
async def get_workflow_status(owner: str, repo_name: str, workflow_id: int, authorization: str = Header(None)):
    job_info = {}
    async with get_auth_client(authorization) as client:
        runs_url = f"{GITHUB_API_URL}/repos/{owner}/{repo_name}/actions/workflows/{workflow_id}/runs?per_page=1"
        runs_response = await client.get(runs_url)
        if runs_response.status_code != 200 or not runs_response.json().get('workflow_runs'): return {}
        latest_run_id = runs_response.json()['workflow_runs'][0]['id']
        jobs_url = f"{GITHUB_API_URL}/repos/{owner}/{repo_name}/actions/runs/{latest_run_id}/jobs"
        jobs_response = await client.get(jobs_url)
        if jobs_response.status_code != 200: return {}
        for job in jobs_response.json().get('jobs', []):
            job_info[job['name']] = {"id": job['id'],"status": job.get('status'),"conclusion": job.get('conclusion')}
    return job_info

@app.get("/jobs/{owner}/{repo_name}/{job_id}/logs")
async def get_job_logs(owner: str, repo_name: str, job_id: int, authorization: str = Header(None)):
    async with get_auth_client(authorization) as client:
        logs_url = f"{GITHUB_API_URL}/repos/{owner}/{repo_name}/actions/jobs/{job_id}/logs"
        response = await client.get(logs_url)
    if response.status_code != 200: raise HTTPException(status_code=response.status_code, detail="Error fetching logs from GitHub.")
    return Response(content=response.text, media_type="text/plain")


  if __name__ == "__main__":
        import uvicorn
        # This will be used by Render to start the server.
        # It tells the server to be accessible from the internet ('0.0.0.0')
        # and to use the port specified by Render's PORT environment variable.
        uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))