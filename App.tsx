import React, { useState } from 'react';
import CredentialsForm from './components/CredentialsForm';
import ArchitectureViewer from './components/ArchitectureViewer';
import { AppStep, ConfigFormData, ArchitectureData } from './types';
import { fetchAwsResources } from './services/awsService';
import { Monitor } from 'lucide-react';

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
      const result = await fetchAwsResources(
        data.accessKey, 
        data.secretKey, 
        data.region,
        data.tagKey, 
        data.tagValue
      );

      if (result.nodes.length === 0) {
        throw new Error(`No se encontraron recursos con el tag ${data.tagKey}=${data.tagValue} en la región ${data.region}.`);
      }

      setArchData(result);
      setStep(AppStep.VISUALIZE);
    } catch (err: any) {
      console.error(err);
      let message = err.message || "Error al obtener la arquitectura.";
      if (message.includes('Auth Error')) message = "Error de autenticación: Verifica tus llaves de AWS.";
      setError(message);
      setStep(AppStep.CONFIG);
    }
  };

  const handleUpdateTags = async (newTagKey: string, newTagValue: string) => {
    if (!currentConfig) return;
    
    setStep(AppStep.LOADING);
    setError(null);
    
    const updatedConfig = { ...currentConfig, tagKey: newTagKey, tagValue: newTagValue };
    setCurrentConfig(updatedConfig);
    
    try {
      const result = await fetchAwsResources(
        updatedConfig.accessKey, 
        updatedConfig.secretKey, 
        updatedConfig.region,
        updatedConfig.tagKey, 
        updatedConfig.tagValue
      );

      if (result.nodes.length === 0) {
        throw new Error(`No se encontraron recursos con el tag ${newTagKey}=${newTagValue}.`);
      }

      setArchData(result);
      setStep(AppStep.VISUALIZE);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al actualizar la arquitectura.");
      setStep(AppStep.VISUALIZE); // Volver al visor para mostrar el error ahí o permitir reintentar
    }
  };

  const handleReset = () => {
    setStep(AppStep.CONFIG);
    setArchData(null);
    setCurrentConfig(null);
  };

  if (step === AppStep.VISUALIZE && archData && currentConfig) {
    return (
      <ArchitectureViewer 
        data={archData} 
        config={currentConfig} 
        onReset={handleReset} 
        onUpdateTags={handleUpdateTags}
        error={error}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-[#4F46E5]/30">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute -top-[10%] -left-[5%] w-[60%] h-[60%] bg-[#4F46E5]/10 rounded-full blur-[120px] animate-pulse"></div>
         <div className="absolute bottom-[0%] -right-[5%] w-[40%] h-[40%] bg-[#8B5CF6]/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="z-10 w-full max-w-4xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
        <div className="mb-10 flex flex-col items-center text-center">
            <div className="p-4 bg-gradient-to-br from-[#4F46E5] to-[#8B5CF6] rounded-2xl shadow-2xl shadow-[#4F46E5]/20 mb-6">
                <Monitor className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-black text-white tracking-tight mb-2">
                CloudArchitect <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6]">Live</span>
              </h1>
              <p className="text-slate-400 text-sm font-bold tracking-[0.2em] uppercase">Visualización AWS en Tiempo Real</p>
            </div>
        </div>

        {error && step === AppStep.CONFIG && (
            <div className="mb-8 p-5 bg-red-950/20 border border-red-900/50 text-red-200 rounded-2xl w-full max-w-lg text-center text-sm shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-center mb-2">
                  <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border border-red-500/20 mr-2">Error</span>
                  <span className="font-bold text-red-300">Fallo de Conexión</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{error}</p>
            </div>
        )}
        
        {step === AppStep.LOADING ? (
          <div className="flex flex-col items-center justify-center p-12 bg-[#0A0A0B]/80 backdrop-blur-xl rounded-2xl border border-white/10 w-full max-w-lg shadow-2xl animate-pulse">
            <div className="w-16 h-16 border-4 border-[#4F46E5] border-t-transparent rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-bold text-white mb-2">Escaneando Arquitectura</h2>
            <p className="text-slate-400 text-sm">Consultando Resource Groups y Tagging API de AWS...</p>
          </div>
        ) : (
          <CredentialsForm onSubmit={handleConfigSubmit} isLoading={false} />
        )}
      </div>

      <footer className="absolute bottom-6 text-center text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">
         &copy; {new Date().getFullYear()} CloudArchitect Live. Visualización Profesional de Infraestructura.
      </footer>
    </div>
  );
};

export default App;