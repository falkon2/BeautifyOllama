'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Terminal, 
  Play,
  Package,
  X,
  Plus,
  Trash2,
  Power,
  PowerOff,
  Search,
  RefreshCw
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  checkOllamaStatus,
  getPlatform,
  startOllama,
  type OllamaStatus
} from '@/app/services/ollamaService';
import { invoke } from '@tauri-apps/api/core';

interface OllamaSetupOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (selectedModels: string[]) => void;
  onCommandLog?: (command: string) => string;
  onCommandUpdate?: (logId: string, status: 'success' | 'error', output?: string, error?: string) => void;
}

type SetupStep = 'check' | 'confirm' | 'ask-install' | 'install' | 'models' | 'manage' | 'complete';

const POPULAR_MODELS = [
  { name: 'llama3.2', size: '2.0GB', description: 'Latest Llama model, great for general tasks' },
  { name: 'llama2', size: '3.8GB', description: 'Stable and reliable for most use cases' },
  { name: 'codellama', size: '3.8GB', description: 'Specialized for code generation and programming' },
  { name: 'mistral', size: '4.1GB', description: 'Fast and efficient for various tasks' },
  { name: 'phi3', size: '2.2GB', description: 'Lightweight model from Microsoft' },
  { name: 'gemma', size: '5.0GB', description: 'Google\'s open-source model' },
];

export function OllamaSetupOverlay({ 
  isOpen, 
  onClose, 
  onComplete, 
  onCommandLog, 
  onCommandUpdate 
}: OllamaSetupOverlayProps) {
  const [step, setStep] = useState<SetupStep>('check');
  const [status, setStatus] = useState<OllamaStatus>({ isInstalled: false, isRunning: false });
  const [platform, setPlatform] = useState<string>('unknown');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModels, setSelectedModels] = useState<string[]>(['llama3.2']);
  const [installProgress, setInstallProgress] = useState<string>('');
  const [downloadingModels, setDownloadingModels] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});
  const [currentDownloadIndex, setCurrentDownloadIndex] = useState<number>(0);
  const [totalModels, setTotalModels] = useState<number>(0);
  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [loadedModel, setLoadedModel] = useState<string | null>(null);
  const [isOllamaRunning, setIsOllamaRunning] = useState<boolean>(false);
  const [showAddModels, setShowAddModels] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      initializeSetup();
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 'manage') {
      loadInstalledModels();
      // Check if Ollama is running
      checkOllamaStatus().then(status => {
        setIsOllamaRunning(status.isRunning);
      }).catch(() => {
        setIsOllamaRunning(false);
      });
    }
  }, [step]);

  const initializeSetup = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const detectedPlatform = await getPlatform();
      setPlatform(detectedPlatform);
      
      // Check if Ollama is installed by checking file system paths
      const isInstalled = await invoke('check_ollama_installation_paths') as boolean;
      
      if (isInstalled) {
        // Check if it's running and has models
        try {
          const ollamaStatus = await checkOllamaStatus();
          setStatus({ isInstalled: true, isRunning: ollamaStatus.isRunning });
          setIsOllamaRunning(ollamaStatus.isRunning);
          
          // Try to load installed models
          const models = await invoke('list_installed_models') as string[];
          setInstalledModels(models);
          
          if (models.length > 0) {
            // If models are installed, go directly to management
            setStep('manage');
          } else if (ollamaStatus.isRunning) {
            // If running but no models, go to model selection
            setStep('models');
          } else {
            // Installed but not running, show confirm step
            setStep('confirm');
          }
        } catch {
          // Ollama is installed but not running
          setStatus({ isInstalled: true, isRunning: false });
          setIsOllamaRunning(false);
          setStep('confirm');
        }
      } else {
        setStatus({ isInstalled: false, isRunning: false });
        setStep('ask-install');
      }
    } catch (e: any) {
      setError(e.message);
      setStep('ask-install');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstallOllama = async () => {
    setIsLoading(true);
    setError(null);
    setInstallProgress('Preparing installation...');
    
    try {
      // Use terminal installation based on platform
      if (platform === 'macos') {
        setInstallProgress('Installing Ollama via Homebrew...');
        const command = 'brew install ollama';
        const logId = onCommandLog ? onCommandLog(command) : '';
        
        try {
          await invoke('install_ollama_macos');
          if (onCommandUpdate) {
            onCommandUpdate(logId, 'success', 'Ollama installed successfully via Homebrew');
          }
        } catch (installError) {
          if (onCommandUpdate) {
            onCommandUpdate(logId, 'error', undefined, `Installation failed: ${installError}`);
          }
          throw installError;
        }
      } else if (platform === 'windows') {
        setInstallProgress('Downloading and installing Ollama...');
        const command = 'Download Ollama installer';
        const logId = onCommandLog ? onCommandLog(command) : '';
        
        try {
          await invoke('install_ollama_windows');
          if (onCommandUpdate) {
            onCommandUpdate(logId, 'success', 'Ollama installer downloaded');
          }
        } catch (installError) {
          if (onCommandUpdate) {
            onCommandUpdate(logId, 'error', undefined, `Installation failed: ${installError}`);
          }
          throw installError;
        }
      } else {
        throw new Error('Unsupported platform');
      }
      
      setInstallProgress('Installation completed! Starting Ollama service...');
      
      // Start Ollama service after installation
      try {
        const startCommand = 'ollama serve';
        const startLogId = onCommandLog ? onCommandLog(startCommand) : '';
        
        await invoke('start_ollama_service');
        
        // Wait a moment and verify the service is actually running
        setInstallProgress('Verifying Ollama service startup...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
          const isRunning = await invoke('check_ollama_service_status') as boolean;
          if (isRunning) {
            setIsOllamaRunning(true);
            setInstallProgress('Ollama service started! Ready to download models...');
            
            if (onCommandUpdate) {
              onCommandUpdate(startLogId, 'success', 'Ollama service started and verified running');
            }
          } else {
            setInstallProgress('Installation completed! Please start Ollama manually if needed.');
            if (onCommandUpdate) {
              onCommandUpdate(startLogId, 'error', undefined, 'Service start command executed but service is not responding');
            }
          }
        } catch (verifyError) {
          console.warn('Could not verify service status:', verifyError);
          setInstallProgress('Installation completed! Service started but could not verify status.');
          if (onCommandUpdate) {
            onCommandUpdate(startLogId, 'success', 'Service started (verification failed)');
          }
        }
      } catch (startError) {
        console.warn('Failed to auto-start Ollama service:', startError);
        setInstallProgress('Installation completed! Please start Ollama manually if needed.');
        
        if (onCommandUpdate && onCommandLog) {
          const startCommand = 'ollama serve';
          const startLogId = onCommandLog(startCommand);
          onCommandUpdate(startLogId, 'error', undefined, `Auto-start failed: ${startError}`);
        }
      }
      
      // After installation and service start, go directly to model selection
      setTimeout(() => {
        setStatus({ isInstalled: true, isRunning: isOllamaRunning });
        setStep('models');
        setIsLoading(false);
      }, 2000);
      
    } catch (e: any) {
      setError(e.message);
      setIsLoading(false);
    }
  };

  const handleConfirmOllama = () => {
    // User confirms they have Ollama installed, go to model selection
    setStep('models');
  };

  const handleDownloadModels = async () => {
    setIsLoading(true);
    setError(null);
    setTotalModels(selectedModels.length);
    setCurrentDownloadIndex(0);
    setDownloadProgress({});
    
    try {
      // Ensure Ollama service is running before downloading models
      if (!isOllamaRunning) {
        setInstallProgress('Starting Ollama service...');
        const startCommand = 'ollama serve';
        const startLogId = onCommandLog ? onCommandLog(startCommand) : '';
        
        try {
          await invoke('start_ollama_service');
          
          // Wait and verify service is running
          setInstallProgress('Verifying Ollama service...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const isRunning = await invoke('check_ollama_service_status') as boolean;
          if (isRunning) {
            setIsOllamaRunning(true);
            if (onCommandUpdate) {
              onCommandUpdate(startLogId, 'success', 'Ollama service started for model downloads');
            }
          } else {
            throw new Error('Service started but is not responding');
          }
        } catch (startError) {
          if (onCommandUpdate) {
            onCommandUpdate(startLogId, 'error', undefined, `Failed to start Ollama service: ${startError}`);
          }
          throw new Error(`Failed to start Ollama service: ${startError}`);
        }
      }
      
      for (let i = 0; i < selectedModels.length; i++) {
        const model = selectedModels[i];
        setCurrentDownloadIndex(i);
        setDownloadingModels(prev => new Set([...prev, model]));
        setInstallProgress(`Downloading ${model}... (${i + 1}/${selectedModels.length})`);
        
        // Simulate progress for visual feedback since ollama pull doesn't provide real-time progress
        const progressInterval = setInterval(() => {
          setDownloadProgress(prev => ({
            ...prev,
            [model]: Math.min((prev[model] || 0) + Math.random() * 15, 95)
          }));
        }, 500);
        
        try {
          const command = `ollama pull ${model}`;
          const logId = onCommandLog ? onCommandLog(command) : '';
          
          await invoke('download_ollama_model', { modelName: model });
          
          // Complete the progress
          setDownloadProgress(prev => ({
            ...prev,
            [model]: 100
          }));
          
          if (onCommandUpdate) {
            onCommandUpdate(logId, 'success', `Model '${model}' downloaded successfully`);
          }
        } catch (downloadError) {
          if (onCommandUpdate && onCommandLog) {
            const command = `ollama pull ${model}`;
            const logId = onCommandLog(command);
            onCommandUpdate(logId, 'error', undefined, `Failed to download '${model}': ${downloadError}`);
          }
          throw downloadError;
        } finally {
          clearInterval(progressInterval);
        }
        
        setDownloadingModels(prev => {
          const newSet = new Set(prev);
          newSet.delete(model);
          return newSet;
        });
      }
      
      // After downloading models, go to management screen
      await loadInstalledModels();
      setStep('manage');
      setInstallProgress('');
      
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInstalledModels = async () => {
    try {
      const models = await invoke('list_installed_models') as string[];
      setInstalledModels(models);
    } catch (e: any) {
      console.error('Failed to load installed models:', e);
      setInstalledModels([]);
    }
  };

  const handleStartOllama = async () => {
    setIsLoading(true);
    setError(null);
    setInstallProgress('Starting Ollama service...');
    
    const command = 'ollama serve';
    const logId = onCommandLog ? onCommandLog(command) : '';
    
    try {
      await invoke('start_ollama_service');
      
      // Wait a moment and verify the service is actually running
      setInstallProgress('Verifying Ollama service startup...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      try {
        const isRunning = await invoke('check_ollama_service_status') as boolean;
        if (isRunning) {
          setIsOllamaRunning(true);
          setInstallProgress('Ollama service started successfully!');
          
          if (onCommandUpdate) {
            onCommandUpdate(logId, 'success', 'Ollama service started and verified running');
          }
        } else {
          setError('Service start command executed but service is not responding. Please try starting Ollama manually.');
          if (onCommandUpdate) {
            onCommandUpdate(logId, 'error', undefined, 'Service start command executed but service is not responding');
          }
        }
      } catch (verifyError) {
        console.warn('Could not verify service status:', verifyError);
        // Assume success if we can't verify
        setIsOllamaRunning(true);
        setInstallProgress('Ollama service started (verification failed)!');
        if (onCommandUpdate) {
          onCommandUpdate(logId, 'success', 'Service started (verification failed)');
        }
      }
      
      setTimeout(() => setInstallProgress(''), 2000);
    } catch (e: any) {
      setError(e.message);
      if (onCommandUpdate) {
        onCommandUpdate(logId, 'error', undefined, `Failed to start Ollama service: ${e.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopOllama = async () => {
    setIsLoading(true);
    setError(null);
    setInstallProgress('Stopping Ollama service...');
    
    const command = platform === 'windows' ? 'taskkill /F /IM ollama.exe' : 'pkill -f ollama';
    const logId = onCommandLog ? onCommandLog(command) : '';
    
    try {
      await invoke('stop_ollama_service');
      setIsOllamaRunning(false);
      setLoadedModel(null);
      setInstallProgress('Ollama service stopped successfully!');
      
      if (onCommandUpdate) {
        onCommandUpdate(logId, 'success', 'Ollama service stopped successfully');
      }
      
      setTimeout(() => setInstallProgress(''), 2000);
    } catch (e: any) {
      setError(e.message);
      if (onCommandUpdate) {
        onCommandUpdate(logId, 'error', undefined, `Failed to stop Ollama service: ${e.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadModel = async (modelName: string) => {
    setIsLoading(true);
    setError(null);
    setInstallProgress(`Loading ${modelName}...`);
    
    const command = `curl -X POST http://localhost:11434/api/generate -d '{"model": "${modelName}", "prompt": "hello"}'`;
    const logId = onCommandLog ? onCommandLog(`Load model: ${modelName}`) : '';
    
    try {
      // Start Ollama if not running
      if (!isOllamaRunning) {
        await invoke('start_ollama_service');
        setIsOllamaRunning(true);
      }
      
      // Load the model
      await invoke('load_ollama_model', { modelName });
      setLoadedModel(modelName);
      setInstallProgress(`${modelName} loaded successfully!`);
      
      if (onCommandUpdate) {
        onCommandUpdate(logId, 'success', `Model '${modelName}' loaded successfully`);
      }
      
      setTimeout(() => setInstallProgress(''), 2000);
    } catch (e: any) {
      setError(e.message);
      if (onCommandUpdate) {
        onCommandUpdate(logId, 'error', undefined, `Failed to load model '${modelName}': ${e.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnloadModel = async () => {
    setIsLoading(true);
    setError(null);
    setInstallProgress('Unloading model...');
    
    const command = 'Unload current model';
    const logId = onCommandLog ? onCommandLog(command) : '';
    
    try {
      await invoke('unload_ollama_model');
      const previousModel = loadedModel;
      setLoadedModel(null);
      setInstallProgress('Model unloaded successfully!');
      
      if (onCommandUpdate) {
        onCommandUpdate(logId, 'success', `Model '${previousModel}' unloaded successfully`);
      }
      
      setTimeout(() => setInstallProgress(''), 2000);
    } catch (e: any) {
      setError(e.message);
      if (onCommandUpdate) {
        onCommandUpdate(logId, 'error', undefined, `Failed to unload model: ${e.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUninstallModel = async (modelName: string) => {
    setIsLoading(true);
    setError(null);
    setInstallProgress(`Uninstalling ${modelName}...`);
    
    const command = `ollama rm ${modelName}`;
    const logId = onCommandLog ? onCommandLog(command) : '';
    
    try {
      await invoke('uninstall_ollama_model', { modelName });
      setInstalledModels(prev => prev.filter(m => m !== modelName));
      if (loadedModel === modelName) {
        setLoadedModel(null);
      }
      setInstallProgress(`${modelName} uninstalled successfully!`);
      
      if (onCommandUpdate) {
        onCommandUpdate(logId, 'success', `Model '${modelName}' uninstalled successfully`);
      }
      
      setTimeout(() => setInstallProgress(''), 2000);
    } catch (e: any) {
      setError(e.message);
      if (onCommandUpdate) {
        onCommandUpdate(logId, 'error', undefined, `Failed to uninstall model '${modelName}': ${e.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstallAdditionalModels = async () => {
    setIsLoading(true);
    setError(null);
    setTotalModels(selectedModels.length);
    setCurrentDownloadIndex(0);
    setDownloadProgress({});
    setShowAddModels(false);
    
    try {
      // Ensure Ollama service is running before downloading models
      if (!isOllamaRunning) {
        setInstallProgress('Starting Ollama service...');
        const startCommand = 'ollama serve';
        const startLogId = onCommandLog ? onCommandLog(startCommand) : '';
        
        try {
          await invoke('start_ollama_service');
          
          // Wait and verify service is running
          setInstallProgress('Verifying Ollama service...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const isRunning = await invoke('check_ollama_service_status') as boolean;
          if (isRunning) {
            setIsOllamaRunning(true);
            if (onCommandUpdate) {
              onCommandUpdate(startLogId, 'success', 'Ollama service started for additional model downloads');
            }
          } else {
            throw new Error('Service started but is not responding');
          }
        } catch (startError) {
          if (onCommandUpdate) {
            onCommandUpdate(startLogId, 'error', undefined, `Failed to start Ollama service: ${startError}`);
          }
          throw new Error(`Failed to start Ollama service: ${startError}`);
        }
      }
      
      for (let i = 0; i < selectedModels.length; i++) {
        const model = selectedModels[i];
        setCurrentDownloadIndex(i);
        setDownloadingModels(prev => new Set([...prev, model]));
        setInstallProgress(`Downloading ${model}... (${i + 1}/${selectedModels.length})`);
        
        const progressInterval = setInterval(() => {
          setDownloadProgress(prev => ({
            ...prev,
            [model]: Math.min((prev[model] || 0) + Math.random() * 15, 95)
          }));
        }, 500);
        
        try {
          const command = `ollama pull ${model}`;
          const logId = onCommandLog ? onCommandLog(command) : '';
          
          await invoke('download_ollama_model', { modelName: model });
          setDownloadProgress(prev => ({
            ...prev,
            [model]: 100
          }));
          
          if (onCommandUpdate) {
            onCommandUpdate(logId, 'success', `Model '${model}' downloaded successfully`);
          }
        } catch (downloadError) {
          if (onCommandUpdate && onCommandLog) {
            const command = `ollama pull ${model}`;
            const logId = onCommandLog(command);
            onCommandUpdate(logId, 'error', undefined, `Failed to download '${model}': ${downloadError}`);
          }
          throw downloadError;
        } finally {
          clearInterval(progressInterval);
        }
        
        setDownloadingModels(prev => {
          const newSet = new Set(prev);
          newSet.delete(model);
          return newSet;
        });
      }
      
      // Refresh installed models
      await loadInstalledModels();
      setInstallProgress('Additional models installed successfully!');
      setSelectedModels([]);
      setTimeout(() => setInstallProgress(''), 2000);
      
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualScan = async () => {
    setIsLoading(true);
    setError(null);
    setInstallProgress('Scanning for models...');
    
    const command = 'ollama list & scan model directories';
    const logId = onCommandLog ? onCommandLog(command) : '';
    
    try {
      // Force refresh the installed models list
      await loadInstalledModels();
      
      // Also try to scan for models in common locations
      const scanResult = await invoke('scan_for_models') as string[];
      if (scanResult.length > 0) {
        setInstalledModels(prev => {
          const combined = [...new Set([...prev, ...scanResult])];
          return combined;
        });
        setInstallProgress(`Found ${scanResult.length} additional model(s)!`);
        
        if (onCommandUpdate) {
          onCommandUpdate(logId, 'success', `Found ${scanResult.length} models: ${scanResult.join(', ')}`);
        }
      } else {
        setInstallProgress('No additional models found.');
        if (onCommandUpdate) {
          onCommandUpdate(logId, 'success', 'No additional models found');
        }
      }
      
      setTimeout(() => setInstallProgress(''), 3000);
    } catch (e: any) {
      setError(e.message);
      if (onCommandUpdate) {
        onCommandUpdate(logId, 'error', undefined, `Failed to scan for models: ${e.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleModelSelection = (modelName: string) => {
    setSelectedModels(prev => 
      prev.includes(modelName) 
        ? prev.filter(m => m !== modelName)
        : [...prev, modelName]
    );
  };

  const getPlatformDisplayName = () => {
    switch (platform) {
      case 'macos': return 'macOS';
      case 'windows': return 'Windows';
      default: return 'Unknown Platform';
    }
  };

  const getInstallMethod = () => {
    switch (platform) {
      case 'macos': return 'Homebrew (brew install ollama)';
      case 'windows': return 'Official installer from ollama.ai';
      default: return 'Manual installation required';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold">Ollama Setup</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {step === 'check' && (
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p>Checking Ollama installation...</p>
            </div>
          )}

          {step === 'ask-install' && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-950 rounded-full flex items-center justify-center mx-auto">
                  <XCircle className="h-8 w-8 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Ollama Not Found</h3>
                  <p className="text-muted-foreground">
                    We couldn't find Ollama in the default installation locations.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Do you have Ollama installed in a custom location, or would you like us to install it for you?
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button 
                  onClick={() => setStep('models')}
                  variant="outline"
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  I Have Ollama
                </Button>
                <Button 
                  onClick={() => setStep('install')}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Install Ollama
                </Button>
              </div>
            </div>
          )}

          {step === 'install' && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center mx-auto">
                  <Download className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Install Ollama</h3>
                  <p className="text-muted-foreground">
                    Ollama will be installed on {getPlatformDisplayName()} using {getInstallMethod()}
                  </p>
                </div>
              </div>

              {installProgress && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Terminal className="h-4 w-4 text-blue-600" />
                    <p className="text-blue-700 dark:text-blue-300 text-sm">{installProgress}</p>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleInstallOllama} 
                disabled={isLoading || platform === 'unknown'}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Installing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Install Ollama
                  </>
                )}
              </Button>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Ollama Found!</h3>
                  <p className="text-muted-foreground">
                    We found Ollama installed on your system. You can proceed to select and download AI models.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Note: You may need to start Ollama manually by running "ollama serve" in your terminal if it's not already running.
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button 
                  onClick={handleConfirmOllama} 
                  className="flex-1"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Continue to Model Selection
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setStep('install')}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Reinstall Ollama
                </Button>
              </div>
            </div>
          )}

          {step === 'models' && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-950 rounded-full flex items-center justify-center mx-auto">
                  <Package className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Select AI Models</h3>
                  <p className="text-muted-foreground">
                    Choose which AI models you'd like to download. You can always add more later.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {POPULAR_MODELS.map((model) => (
                  <div
                    key={model.name}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedModels.includes(model.name)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => toggleModelSelection(model.name)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{model.name}</h4>
                          <span className="text-xs bg-muted px-2 py-1 rounded">{model.size}</span>
                          {downloadingModels.has(model.name) && (
                            <div className="flex items-center space-x-1">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-xs text-blue-600">
                                {Math.round(downloadProgress[model.name] || 0)}%
                              </span>
                            </div>
                          )}
                          {downloadProgress[model.name] === 100 && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{model.description}</p>
                        {downloadingModels.has(model.name) && downloadProgress[model.name] && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                              <div 
                                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                                style={{ width: `${downloadProgress[model.name]}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        selectedModels.includes(model.name)
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground'
                      }`}>
                        {selectedModels.includes(model.name) && (
                          <CheckCircle className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {installProgress && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <p className="text-blue-700 dark:text-blue-300 text-sm">{installProgress}</p>
                  </div>
                  
                  {/* Overall Progress */}
                  {totalModels > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400">
                        <span>Overall Progress</span>
                        <span>{currentDownloadIndex + 1} / {totalModels} models</span>
                      </div>
                      <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${((currentDownloadIndex) / totalModels) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Individual Model Progress */}
                  {Object.entries(downloadProgress).map(([model, progress]) => (
                    <div key={model} className="space-y-1 mt-3">
                      <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400">
                        <span>{model}</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex space-x-3">
                <Button 
                  onClick={handleDownloadModels} 
                  disabled={isLoading || selectedModels.length === 0}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Downloading Models...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download {selectedModels.length} Model{selectedModels.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => setStep('manage')}
                  disabled={isLoading}
                >
                  Skip to Management
                </Button>
              </div>
            </div>
          )}

          {step === 'manage' && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto">
                  <Terminal className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Manage Models</h3>
                  <p className="text-muted-foreground">
                    Start/stop Ollama service, load/unload models, and manage your AI models.
                  </p>
                </div>
              </div>

              {/* Service Control */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium">Ollama Service</h4>
                    <p className="text-sm text-muted-foreground">
                      Status: {isOllamaRunning ? 'Running' : 'Stopped'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant={isOllamaRunning ? "outline" : "default"}
                      onClick={handleStartOllama}
                      disabled={isLoading || isOllamaRunning}
                    >
                      <Power className="h-4 w-4 mr-1" />
                      Start
                    </Button>
                    <Button
                      size="sm"
                      variant={isOllamaRunning ? "destructive" : "outline"}
                      onClick={handleStopOllama}
                      disabled={isLoading || !isOllamaRunning}
                    >
                      <PowerOff className="h-4 w-4 mr-1" />
                      Stop
                    </Button>
                  </div>
                </div>
              </div>

              {/* Loaded Model Display */}
              {loadedModel && (
                <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-green-700 dark:text-green-300">Currently Loaded</h4>
                      <p className="text-sm text-green-600 dark:text-green-400">{loadedModel}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleUnloadModel}
                      disabled={isLoading}
                    >
                      <PowerOff className="h-4 w-4 mr-1" />
                      Unload
                    </Button>
                  </div>
                </div>
              )}

              {/* Installed Models */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Installed Models</h4>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={loadInstalledModels}
                      disabled={isLoading}
                      title="Refresh model list"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Refresh
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleManualScan}
                      disabled={isLoading}
                      title="Scan for models in custom locations"
                    >
                      <Search className="h-4 w-4 mr-1" />
                      Scan
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddModels(true)}
                      disabled={isLoading}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Models
                    </Button>
                  </div>
                </div>

                {installedModels.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No models installed</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddModels(true)}
                      className="mt-2"
                    >
                      Install Your First Model
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {installedModels.map((model) => (
                      <div
                        key={model}
                        className="p-3 border rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            loadedModel === model ? 'bg-green-500' : 'bg-gray-300'
                          }`} />
                          <span className="font-medium">{model}</span>
                          {loadedModel === model && (
                            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                              Loaded
                            </span>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          {loadedModel !== model && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLoadModel(model)}
                              disabled={isLoading || loadedModel === model}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Load
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleUninstallModel(model)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Models Section */}
              {showAddModels && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Add New Models</h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowAddModels(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2 mb-3">
                    {POPULAR_MODELS.filter(model => !installedModels.includes(model.name)).map((model) => (
                      <div
                        key={model.name}
                        className={`p-3 border rounded cursor-pointer transition-colors ${
                          selectedModels.includes(model.name)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => toggleModelSelection(model.name)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h5 className="font-medium text-sm">{model.name}</h5>
                              <span className="text-xs bg-muted px-2 py-1 rounded">{model.size}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{model.description}</p>
                          </div>
                          <div className={`w-3 h-3 rounded border flex items-center justify-center ${
                            selectedModels.includes(model.name)
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground'
                          }`}>
                            {selectedModels.includes(model.name) && (
                              <CheckCircle className="h-2 w-2 text-primary-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleInstallAdditionalModels}
                    disabled={isLoading || selectedModels.length === 0}
                    className="w-full"
                    size="sm"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Installing...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Install {selectedModels.length} Model{selectedModels.length !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {installProgress && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <p className="text-blue-700 dark:text-blue-300 text-sm">{installProgress}</p>
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <Button
                  onClick={() => {
                    onComplete(installedModels);
                    onClose();
                  }}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Setup
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setStep('models')}
                >
                  Back to Models
                </Button>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Setup Complete!</h3>
                <p className="text-muted-foreground">
                  Ollama is now ready to use with your selected models.
                </p>
              </div>
              {installProgress && (
                <p className="text-sm text-green-600">{installProgress}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
