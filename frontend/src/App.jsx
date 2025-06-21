

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import GraphView from './GraphView';
import LogModal from './LogModal';
import { FiBook, FiPlayCircle } from 'react-icons/fi'; 
import './App.css'; 
import './LogModal.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function App() {
  // --- STATE MANAGEMENT ---
  const [accessToken, setAccessToken] = useState(null);
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for the logs modal
  const [jobInfo, setJobInfo] = useState({});
  const [selectedJobName, setSelectedJobName] = useState(null);
  const [jobLogs, setJobLogs] = useState("");
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  const pollIntervalRef = useRef(null);

  // --- USEEFFECT HOOKS ---

  // Effect to check for token on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      setAccessToken(token);
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  // Effect to fetch repositories when logged in
  useEffect(() => {
    if (accessToken && !selectedRepo) {
      fetchRepositories();
    }
  }, [accessToken, selectedRepo]);

  // Effect to handle polling for status updates when a workflow is selected
  useEffect(() => {
    if (selectedWorkflow) {
      updateJobStatuses(); 
      pollIntervalRef.current = setInterval(updateJobStatuses, 60000); // Poll every 1 minute
    }
    // Cleanup function to stop polling when the view changes
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [selectedWorkflow]);

  // --- DATA FETCHING & EVENT HANDLERS ---

  const updateJobStatuses = async () => {
    if (!selectedWorkflow || !selectedRepo) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/workflow-status/${selectedRepo.owner.login}/${selectedRepo.name}/${selectedWorkflow.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const statuses = response.data;
      setJobInfo(statuses);
      
      setGraphData(prevData => ({
        ...prevData,
        nodes: prevData.nodes.map(node => ({
          ...node,
          data: { ...node.data, status: statuses[node.data.label]?.conclusion || statuses[node.data.label]?.status }
        }))
      }));
    } catch (err) {
      console.error("Failed to fetch job statuses:", err);
    }
  };
  
  const handleNodeClick = useCallback(async (event, node) => {
    const jobName = node.id;
    const info = jobInfo[jobName];
    
    if (!info || !info.id) {
        setJobLogs(`Could not retrieve logs. Job ID for '${jobName}' not found. The workflow may need to be run at least once.`);
        setSelectedJobName(jobName);
        return;
    }
    
    setSelectedJobName(jobName);
    setIsLogsLoading(true);
    setJobLogs("");

    try {
        const response = await axios.get(`${API_BASE_URL}/jobs/${selectedRepo.owner.login}/${selectedRepo.name}/${info.id}/logs`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        setJobLogs(response.data);
    } catch (err) {
        setJobLogs("Error fetching logs. The logs may have expired or are not available.");
    } finally {
        setIsLogsLoading(false);
    }
  }, [jobInfo, selectedRepo, accessToken]);

  const fetchRepositories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/repositories`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setRepositories(response.data);
    } catch (err) {
      setError("Failed to fetch repositories.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkflows = async (repo) => {
    setSelectedRepo(repo);
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/repositories/${repo.owner.login}/${repo.name}/workflows`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setWorkflows(response.data);
    } catch (err) {
      setError("Failed to fetch workflows.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectWorkflow = async (workflow) => {
    setSelectedWorkflow(workflow);
    setIsLoading(true);
    setError(null);
    setGraphData({ nodes: [], edges: [] });
    try {
      const response = await axios.get(`${API_BASE_URL}/parse-workflow`, {
        params: { owner: selectedRepo.owner.login, repo_name: selectedRepo.name, workflow_path: workflow.path },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setGraphData(response.data);
    } catch (err) {
      setError("Failed to parse workflow file.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setAccessToken(null);
    setRepositories([]);
    setSelectedRepo(null);
    setWorkflows([]);
    setSelectedWorkflow(null);
    setJobInfo({});
  };

  const handleBack = () => {
    if (selectedWorkflow) {
        setSelectedWorkflow(null);
    } else if (selectedRepo) {
        setSelectedRepo(null);
    }
    setError(null);
  };
  
  // --- RENDER LOGIC ---

  const renderContent = () => {
    // 1. Not Logged In
    if (!accessToken) {
      return (
        <div className="content-card">
          <p className="text-white-50 mb-4">Please log in with GitHub to continue.</p>
          <a href={`${API_BASE_URL}/login/github`} className="btn btn-github btn-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-github me-2" viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/></svg>
            Login with GitHub
          </a>
        </div>
      );
    }
    
    const cardClassName = selectedWorkflow ? "content-card content-card-wide" : "content-card";

    return (
      <div className={cardClassName}>
        <h1 className="app-title fw-bold fs-1 mb-2">CI/CD Pipeline Graph</h1>
        <p className="text-secondary mb-4">A GitHub Actions Visualizer</p>
        <hr className="text-secondary"/>
        <div className="mt-4">
          { selectedWorkflow ? ( 
              <div>
                <button className="btn btn-secondary mb-3" onClick={handleBack}>&larr; Back to Workflows</button>
                <h4 className="text-white">Graph for <span className="text-info">{selectedWorkflow.name}</span></h4>
                {isLoading && <div className="loader"></div>}
                {error && <p className="text-danger mt-3">{error}</p>}
                {!isLoading && !error && (
                  <GraphView 
                    initialNodes={graphData.nodes} 
                    initialEdges={graphData.edges}
                    onNodeClick={handleNodeClick}
                  />
                )}
              </div>
            ) : selectedRepo ? ( 
              <div>
                <button className="btn btn-secondary mb-3" onClick={handleBack}>&larr; Back to Repositories</button>
                <h4 className="text-white">Workflows for <span className="text-info">{selectedRepo.name}</span></h4>
                {isLoading && <div className="loader"></div>}
                {error && <p className="text-danger mt-3">{error}</p>}
                {!isLoading && !error && (
                  <ul className="item-list">
                    {workflows.length > 0 ? workflows.map(wf => (
                      <li key={wf.id} className="item" onClick={() => handleSelectWorkflow(wf)}>
                        <FiPlayCircle className="item-icon" />
                        <div className="item-content">
                          <div className="item-name">{wf.name}</div>
                          <div className="text-secondary small">{wf.path}</div>
                        </div>
                      </li>
                    )) : <li className="item-empty">No workflows found.</li>}
                  </ul>
                )}
              </div>
            ) : ( 
              <div>
                <p className="text-white-50">Select a repository to visualize its workflows.</p>
                {isLoading && <div className="loader"></div>}
                {error && <p className="text-danger mt-3">{error}</p>}
                {!isLoading && !error && (
                  <ul className="item-list">
                    {repositories.map(repo => (
                      <li key={repo.id} className="item" onClick={() => fetchWorkflows(repo)}>
                        <FiBook className="item-icon" />
                        <div className="item-content">
                          <div className="item-name">{repo.name}</div>
                          <div className="text-secondary small">{repo.full_name}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <button className="btn btn-danger mt-4" onClick={handleLogout}>Logout</button>
              </div>
            )
          }
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {renderContent()}
      <LogModal 
        jobName={selectedJobName}
        logs={jobLogs}
        isLoading={isLogsLoading}
        onClose={() => setSelectedJobName(null)}
      />
      <footer className="app-footer">
        Built with React, FastAPI, and React Flow.
      </footer>
    </div>
  );
}

export default App;
