import React, { useState } from 'react';
import CredentialsForm from './components/CredentialsForm';
import ArchitectureViewer from './components/ArchitectureViewer';
import { AppStep, ConfigFormData, ArchitectureData } from './types';
import { fetchAwsResources } from './services/awsService';
import { Layout } from 'lucide-react';

const App = () => {
  const [step, setStep] = useState<AppStep>(AppStep.CONFIG);
  const [archData, setArchData] = useState<ArchitectureData | null>(null);
  const [currentConfig, setCurrentConfig] = useState<ConfigFormData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConfigSubmit = async (data: ConfigFormData) => {
    setStep(AppStep.LOADING);
    setError(null);
    setCurrentConfig(data);
    try {
      // Fetch REAL resources using custom AWS Fetcher
      const result = await fetchAwsResources(
        data.accessKey, 
        data.secretKey, 
        data.region,
        data.tagKey, 
        data.tagValue
      );

      if (result.nodes.length === 0) {
        throw new Error(`No resources found with tag ${data.tagKey}=${data.tagValue} in ${data.region}.`);
      }

      setArchData(result);
      setStep(AppStep.VISUALIZE);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch architecture.");
      setStep(AppStep.CONFIG);
    }
  };

  const handleReset = () => {
    setStep(AppStep.CONFIG);
    setArchData(null);
    setCurrentConfig(null);
  };

  if (step === AppStep.VISUALIZE && archData && currentConfig) {
    return <ArchitectureViewer data={archData} config={currentConfig} onReset={handleReset} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[100px]"></div>
         <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="z-10 w-full max-w-4xl flex flex-col items-center">
        {step !== AppStep.VISUALIZE && (
           <div className="mb-12 flex items-center space-x-3">
               <div className="p-3 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
                  <Layout className="w-8 h-8 text-white" />
               </div>
               <div>
                 <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 tracking-tight">
                    CloudArchitect Live
                 </h1>
                 <p className="text-slate-400 text-sm tracking-wide">REAL-TIME AWS RESOURCE DISCOVERY</p>
               </div>
           </div>
        )}

        {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-800 text-red-200 rounded-lg w-full max-w-lg text-center text-sm animate-in fade-in slide-in-from-top-4">
                <span className="font-bold block mb-1 text-red-300">Connection Failed</span>
                <p>{error}</p>
                {error.includes('CORS') && (
                  <div className="mt-3 p-2 bg-slate-800/50 rounded text-xs text-slate-400">
                    <strong>Developer Note:</strong> This is a browser security feature. AWS APIs do not allow requests directly from a webpage (localhost or hosted) without a proxy. 
                    <br/><br/>
                    To use this app, you must install a browser extension like <em>"Allow CORS: Access-Control-Allow-Origin"</em> or run the browser with security disabled.
                  </div>
                )}
            </div>
        )}
        
        <CredentialsForm onSubmit={handleConfigSubmit} isLoading={step === AppStep.LOADING} />
      </div>

      <footer className="absolute bottom-4 text-center text-slate-600 text-xs">
         &copy; {new Date().getFullYear()} CloudArchitect Live. Powered by AWS Resource Groups Tagging API.
      </footer>
    </div>
  );
};

export default App;