"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Save, RotateCcw, RefreshCw, Play, Square, Download, Trash2, AlertCircle, CheckCircle, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getOllamaPort, setOllamaPort, checkOllamaStatus, listOllamaModels, forceRefreshModels, type OllamaStatus } from "@/app/services/ollamaService";
import { invoke } from '@tauri-apps/api/core';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onPortChanged?: () => void;
  onOllamaStatusChange?: (status: OllamaStatus) => void;
}

interface CommandLog {
  id: string;
  command: string;
  timestamp: Date;
  status: 'running' | 'success' | 'error';
  output?: string;
  error?: string;
}

export function Settings({ isOpen, onClose, onPortChanged, onOllamaStatusChange }: SettingsProps) {
  // Port configuration state
  const [port, setPort] = useState<string>("11434");
  const [originalPort, setOriginalPort] = useState<string>("11434");
  const [portSaving, setPortSaving] = useState(false);
  const [portError, setPortError] = useState<string | null>(null);
  const [portSuccess, setPortSuccess] = useState(false);

  // Ollama service state
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>({ isInstalled: false, isRunning: false });
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [serviceLoading, setServiceLoading] = useState(false);

  // Model management state
  const [models, setModels] = useState<string[]>([]);
  const [refreshingModels, setRefreshingModels] = useState(false);
  const [selectedModelToDownload, setSelectedModelToDownload] = useState<string>("");
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null);
  const [deletingModel, setDeletingModel] = useState<string | null>(null);

  // Command logs
  const [commandLogs, setCommandLogs] = useState<CommandLog[]>([]);
  const [activeTab, setActiveTab] = useState<'connection' | 'models' | 'logs'>('connection');

  // Popular models for easy download
  const popularModels = [
    { name: "llama3.2:3b", description: "Small, fast model (3B parameters)" },
    { name: "llama3.2:1b", description: "Tiny, ultra-fast model (1B parameters)" },
    { name: "llama3.1:8b", description: "Medium model (8B parameters)" },
    { name: "codellama:7b", description: "Code-focused model (7B parameters)" },
    { name: "mistral:7b", description: "Efficient model (7B parameters)" },
    { name: "gemma:2b", description: "Google's small model (2B parameters)" },
    { name: "qwen2:7b", description: "Multilingual model (7B parameters)" },
    { name: "phi3:3b", description: "Microsoft's small model (3B parameters)" },
  ];

  useEffect(() => {
    if (isOpen) {
      loadCurrentSettings();
    }
  }, [isOpen]);

  const loadCurrentSettings = async () => {
    try {
      // Load port
      const currentPort = await getOllamaPort();
      const portStr = currentPort.toString();
      setPort(portStr);
      setOriginalPort(portStr);
      setPortError(null);

      // Load Ollama status
      await refreshOllamaStatus();

      // Load models if Ollama is running
      if (ollamaStatus.isRunning) {
        await refreshModelsList();
      }
    } catch (err: any) {
      setPortError(`Failed to load settings: ${err.message}`);
    }
  };

  const refreshOllamaStatus = async () => {
    setRefreshingStatus(true);
    try {
      const status = await checkOllamaStatus();
      setOllamaStatus(status);
      onOllamaStatusChange?.(status);
      
      if (status.isRunning) {
        await refreshModelsList();
      } else {
        setModels([]);
      }
    } catch (error: any) {
      console.error('Failed to refresh Ollama status:', error);
    } finally {
      setRefreshingStatus(false);
    }
  };

  const refreshModelsList = async () => {
    if (!ollamaStatus.isRunning) return;
    
    setRefreshingModels(true);
    try {
      const availableModels = await forceRefreshModels();
      setModels(availableModels);
    } catch (error: any) {
      console.error('Failed to refresh models:', error);
      addCommandLog(`Failed to refresh models: ${error.message}`, 'error');
    } finally {
      setRefreshingModels(false);
    }
  };

  const addCommandLog = (command: string, status: 'running' | 'success' | 'error' = 'running', output?: string, error?: string): string => {
    const logId = Date.now().toString();
    const newLog: CommandLog = {
      id: logId,
      command,
      timestamp: new Date(),
      status,
      output,
      error
    };
    setCommandLogs(prev => [...prev, newLog]);
    return logId;
  };

  const updateCommandLog = (logId: string, status: 'success' | 'error', output?: string, error?: string) => {
    setCommandLogs(prev => prev.map(log => 
      log.id === logId 
        ? { ...log, status, output, error }
        : log
    ));
  };

  const handlePortSave = async () => {
    if (!port.trim()) {
      setPortError("Port cannot be empty");
      return;
    }

    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1024 || portNum > 65535) {
      setPortError("Port must be a number between 1024 and 65535");
      return;
    }

    setPortSaving(true);
    setPortError(null);
    setPortSuccess(false);

    try {
      await setOllamaPort(portNum);
      setOriginalPort(port);
      setPortSuccess(true);
      onPortChanged?.();
      
      // Auto-hide success message after 2 seconds
      setTimeout(() => setPortSuccess(false), 2000);
    } catch (err: any) {
      setPortError(err.message);
    } finally {
      setPortSaving(false);
    }
  };

  const handlePortReset = () => {
    setPort(originalPort);
    setPortError(null);
    setPortSuccess(false);
  };

  const handlePortChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setPort(numericValue);
    setPortError(null);
    setPortSuccess(false);
  };

  const handleStartOllama = async () => {
    setServiceLoading(true);
    const logId = addCommandLog("Starting Ollama service...");
    
    try {
      await invoke('start_ollama_service');
      updateCommandLog(logId, 'success', 'Ollama service started successfully');
      
      // Wait a moment then refresh status
      setTimeout(async () => {
        await refreshOllamaStatus();
      }, 1000);
    } catch (error: any) {
      updateCommandLog(logId, 'error', '', `Failed to start Ollama: ${error.message || error}`);
    } finally {
      setServiceLoading(false);
    }
  };

  const handleStopOllama = async () => {
    setServiceLoading(true);
    const logId = addCommandLog("Stopping Ollama service...");
    
    try {
      await invoke('stop_ollama_service');
      updateCommandLog(logId, 'success', 'Ollama service stopped successfully');
      
      // Wait a moment then refresh status
      setTimeout(async () => {
        await refreshOllamaStatus();
      }, 1000);
    } catch (error: any) {
      updateCommandLog(logId, 'error', '', `Failed to stop Ollama: ${error.message || error}`);
    } finally {
      setServiceLoading(false);
    }
  };

  const handleDownloadModel = async () => {
    if (!selectedModelToDownload) return;
    
    setDownloadingModel(selectedModelToDownload);
    const logId = addCommandLog(`Downloading model: ${selectedModelToDownload}`);
    
    try {
      await invoke('download_ollama_model', { modelName: selectedModelToDownload });
      updateCommandLog(logId, 'success', `Model ${selectedModelToDownload} downloaded successfully`);
      setSelectedModelToDownload("");
      
      // Refresh models list
      await refreshModelsList();
    } catch (error: any) {
      updateCommandLog(logId, 'error', '', `Failed to download model: ${error.message || error}`);
    } finally {
      setDownloadingModel(null);
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    if (!confirm(`Are you sure you want to delete the model "${modelName}"?`)) return;
    
    setDeletingModel(modelName);
    const logId = addCommandLog(`Deleting model: ${modelName}`);
    
    try {
      await invoke('uninstall_ollama_model', { modelName });
      updateCommandLog(logId, 'success', `Model ${modelName} deleted successfully`);
      
      // Refresh models list
      await refreshModelsList();
    } catch (error: any) {
      updateCommandLog(logId, 'error', '', `Failed to delete model: ${error.message || error}`);
    } finally {
      setDeletingModel(null);
    }
  };

  const hasPortChanges = port !== originalPort;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <SettingsIcon className="h-5 w-5" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Ollama Settings
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('connection')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'connection'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Connection
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'models'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Models ({models.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'logs'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Logs ({commandLogs.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'connection' && (
            <>
              {/* Ollama Status */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Ollama Service</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshOllamaStatus}
                    disabled={refreshingStatus}
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshingStatus ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`w-3 h-3 rounded-full ${ollamaStatus.isRunning ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm">
                    {ollamaStatus.isRunning ? 'Running' : ollamaStatus.isInstalled ? 'Stopped' : 'Not Installed'}
                  </span>
                  {ollamaStatus.version && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">v{ollamaStatus.version}</span>
                  )}
                </div>

                <div className="flex space-x-2">
                  {ollamaStatus.isInstalled && (
                    <>
                      {ollamaStatus.isRunning ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleStopOllama}
                          disabled={serviceLoading}
                        >
                          <Square className="h-4 w-4 mr-2" />
                          Stop Service
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={handleStartOllama}
                          disabled={serviceLoading}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start Service
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Port Configuration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ollama Port
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={port}
                    onChange={(e) => handlePortChange(e.target.value)}
                    placeholder="11434"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Port where Ollama is running (default: 11434)
                  </p>
                </div>

                {/* Port Status Messages */}
                {portError && (
                  <div className="mt-2 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-700 dark:text-red-400">{portError}</p>
                  </div>
                )}

                {portSuccess && (
                  <div className="mt-2 p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-700 dark:text-green-400">
                      Port updated successfully!
                    </p>
                  </div>
                )}

                {/* Current URL Display */}
                <div className="mt-2 p-3 rounded-md bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Ollama URL:</p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white">
                    http://localhost:{port}
                  </p>
                </div>

                {/* Port Save Buttons */}
                {hasPortChanges && (
                  <div className="mt-3 flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePortReset}
                      disabled={portSaving}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      onClick={handlePortSave}
                      disabled={portSaving}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {portSaving ? "Saving..." : "Save Port"}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'models' && (
            <>
              {/* Download New Model */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Download Model</h3>
                <div className="flex space-x-2 mb-3">
                  <Select value={selectedModelToDownload} onValueChange={setSelectedModelToDownload}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a model to download" />
                    </SelectTrigger>
                    <SelectContent>
                      {popularModels.map((model) => (
                        <SelectItem key={model.name} value={model.name}>
                          <div>
                            <div className="font-medium">{model.name}</div>
                            <div className="text-xs text-gray-500">{model.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleDownloadModel}
                    disabled={!selectedModelToDownload || downloadingModel !== null || !ollamaStatus.isRunning}
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {downloadingModel ? "Downloading..." : "Download"}
                  </Button>
                </div>
                
                {!ollamaStatus.isRunning && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    ⚠️ Ollama service must be running to download models
                  </p>
                )}
              </div>

              {/* Installed Models */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Installed Models ({models.length})
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshModelsList}
                    disabled={refreshingModels || !ollamaStatus.isRunning}
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshingModels ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                {models.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {!ollamaStatus.isRunning ? "Start Ollama service to view models" : "No models installed"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {models.map((model) => (
                      <div
                        key={model}
                        className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-md"
                      >
                        <span className="font-mono text-sm">{model}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteModel(model)}
                          disabled={deletingModel === model}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'logs' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Command Logs ({commandLogs.length})
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCommandLogs([])}
                  disabled={commandLogs.length === 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {commandLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No commands executed yet
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {commandLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded-md border text-xs ${
                        log.status === 'running'
                          ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                          : log.status === 'success'
                          ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-semibold">{log.command}</span>
                        <div className="flex items-center space-x-1">
                          {log.status === 'running' && <RefreshCw className="h-3 w-3 animate-spin" />}
                          {log.status === 'success' && <CheckCircle className="h-3 w-3 text-green-500" />}
                          {log.status === 'error' && <AlertCircle className="h-3 w-3 text-red-500" />}
                          <span className="text-xs text-gray-500">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      {log.output && (
                        <div className="mt-1 p-1 bg-background/50 rounded text-green-700 dark:text-green-300 font-mono">
                          {log.output}
                        </div>
                      )}
                      {log.error && (
                        <div className="mt-1 p-1 bg-background/50 rounded text-red-700 dark:text-red-300 font-mono">
                          {log.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
