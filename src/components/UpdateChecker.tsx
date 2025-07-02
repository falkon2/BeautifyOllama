"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, RefreshCw, ExternalLink, X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkForUpdates, downloadUpdate, getCurrentVersion, openDownloadsFolder } from "@/app/services/updateService";

interface UpdateInfo {
  available: boolean;
  current_version: string;
  latest_version: string;
  download_url?: string;
  release_notes?: string;
  release_url?: string;
}

interface UpdateCheckerProps {
  isOpen: boolean;
  onClose: () => void;
  autoCheck?: boolean;
}

export function UpdateChecker({ isOpen, onClose, autoCheck = true }: UpdateCheckerProps) {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkForUpdatesHandler = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await checkForUpdates();
      setUpdateInfo(result);
      setLastChecked(new Date());
    } catch (err: any) {
      setError(`Failed to check for updates: ${err.message}`);
      console.error('Update check failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadUpdateHandler = async () => {
    if (!updateInfo?.download_url) {
      setError('No download URL available');
      return;
    }

    setDownloading(true);
    setError(null);

    try {
      const filePath = await downloadUpdate(updateInfo.download_url);
      
      // Show success message and open file location
      alert(`Update downloaded successfully to: ${filePath}\n\nPlease close the app and install the update.`);
      
      // Optionally open the downloads folder
      if (window.confirm('Would you like to open the Downloads folder?')) {
        await openDownloadsFolder();
      }
    } catch (err: any) {
      setError(`Failed to download update: ${err.message}`);
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const openReleaseNotes = () => {
    if (updateInfo?.release_url) {
      window.open(updateInfo.release_url, '_blank');
    }
  };

  // Auto-check on mount if enabled
  useEffect(() => {
    if (isOpen && autoCheck && !updateInfo && !loading) {
      checkForUpdatesHandler();
    }
  }, [isOpen, autoCheck, updateInfo, loading, checkForUpdatesHandler]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            App Updates
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Current Version */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Current Version:</span>
            <span className="font-mono text-gray-900 dark:text-white">
              {updateInfo?.current_version || 'Loading...'}
            </span>
          </div>

          {/* Check for Updates Button */}
          <Button
            onClick={checkForUpdatesHandler}
            disabled={loading}
            className="w-full"
            variant="outline"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Checking for updates...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Check for Updates
              </>
            )}
          </Button>

          {/* Last Checked */}
          {lastChecked && (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Last checked: {lastChecked.toLocaleString()}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-start">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              </div>
            </div>
          )}

          {/* Update Available */}
          {updateInfo?.available && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
              <div className="flex items-start">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300">
                    Update Available!
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                    Version {updateInfo.latest_version} is now available.
                  </p>
                </div>
              </div>

              {/* Download Button */}
              {updateInfo.download_url && (
                <Button
                  onClick={downloadUpdateHandler}
                  disabled={downloading}
                  className="w-full"
                >
                  {downloading ? (
                    <>
                      <Download className="h-4 w-4 mr-2 animate-pulse" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download Update
                    </>
                  )}
                </Button>
              )}

              {/* Release Notes Button */}
              {updateInfo.release_url && (
                <Button
                  onClick={openReleaseNotes}
                  variant="outline"
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Release Notes
                </Button>
              )}
            </div>
          )}

          {/* No Update Available */}
          {updateInfo && !updateInfo.available && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <div className="text-sm text-green-700 dark:text-green-400">
                  You're running the latest version ({updateInfo.current_version})
                </div>
              </div>
            </div>
          )}

          {/* Release Notes Preview */}
          {updateInfo?.available && updateInfo.release_notes && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 max-h-40 overflow-y-auto">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                What's New:
              </h4>
              <div className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {updateInfo.release_notes.length > 200 
                  ? `${updateInfo.release_notes.substring(0, 200)}...` 
                  : updateInfo.release_notes}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Updates are downloaded from{' '}
            <a
              href="https://github.com/falkon2/BeautifyOllama/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              GitHub Releases
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
