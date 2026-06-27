import React, { useState } from 'react';
import { Download, Image as ImageIcon, FileText, Database, Map, Loader2, ChevronDown } from 'lucide-react';
import { exportToPNG, exportToPDF, exportGeoJSON, exportCSV } from './utils/exportManager';

const ExportControls = ({ filteredData, filtersText, activeLayersText, mapElementId, statsElementId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState('');

    const handleExport = async (type) => {
        setIsOpen(false);
        setIsExporting(true);
        setExportStatus(`Generating ${type}...`);
        
        try {
            // Slight delay to allow UI to update and spinner to show before thread-blocking canvas ops
            await new Promise(resolve => setTimeout(resolve, 50));
            
            let success = false;
            switch(type) {
                case 'PNG':
                    success = await exportToPNG(mapElementId, filtersText, activeLayersText);
                    break;
                case 'PDF':
                    success = await exportToPDF(mapElementId, statsElementId);
                    break;
                case 'CSV':
                    success = exportCSV(filteredData, `ShomsRadar_Data_${new Date().toISOString().split('T')[0]}.csv`);
                    break;
                case 'GeoJSON':
                    // Convert points to GeoJSON FeatureCollection
                    const geojson = {
                        type: "FeatureCollection",
                        features: filteredData.map(p => ({
                            type: "Feature",
                            geometry: { type: "Point", coordinates: p.coordinates },
                            properties: { ...p }
                        }))
                    };
                    success = exportGeoJSON(geojson, `ShomsRadar_Spatial_${new Date().toISOString().split('T')[0]}.geojson`);
                    break;
            }
        } catch (error) {
            console.error("Export Error:", error);
        } finally {
            setIsExporting(false);
            setExportStatus('');
        }
    };

    return (
        <div className="absolute top-4 right-4 z-[1000] export-controls-ignore flex flex-col items-end">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="bg-white text-slate-800 shadow-xl border border-slate-200 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-colors"
            >
                <Download className="w-4 h-4 text-indigo-600" />
                Export Map
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 w-64 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-2 border-b border-slate-100 bg-slate-50">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Export Options</p>
                    </div>
                    <div className="flex flex-col">
                        <button onClick={() => handleExport('PNG')} className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 text-slate-700 text-sm font-medium transition-colors text-left border-b border-slate-100">
                            <ImageIcon className="w-4 h-4 text-indigo-500" />
                            <div>
                                <div>Download High-Res PNG</div>
                                <div className="text-[10px] text-slate-500 font-normal">Map + Watermark & Metadata</div>
                            </div>
                        </button>
                        
                        <button onClick={() => handleExport('PDF')} className="flex items-center gap-3 px-4 py-3 hover:bg-purple-50 text-slate-700 text-sm font-medium transition-colors text-left border-b border-slate-100">
                            <FileText className="w-4 h-4 text-purple-500" />
                            <div>
                                <div>Export Risk Report PDF</div>
                                <div className="text-[10px] text-slate-500 font-normal">Map + Dashboard Analytics</div>
                            </div>
                        </button>
                        
                        <button onClick={() => handleExport('CSV')} className="flex items-center gap-3 px-4 py-3 hover:bg-green-50 text-slate-700 text-sm font-medium transition-colors text-left border-b border-slate-100">
                            <Database className="w-4 h-4 text-green-500" />
                            <div>
                                <div>Download Raw Data (CSV)</div>
                                <div className="text-[10px] text-slate-500 font-normal">Current filtered data points</div>
                            </div>
                        </button>
                        
                        <button onClick={() => handleExport('GeoJSON')} className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-slate-700 text-sm font-medium transition-colors text-left">
                            <Map className="w-4 h-4 text-blue-500" />
                            <div>
                                <div>Export Spatial GeoJSON</div>
                                <div className="text-[10px] text-slate-500 font-normal">Point geometries for GIS</div>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {isExporting && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                        <div className="text-slate-800 font-bold text-center">
                            <p>{exportStatus}</p>
                            <p className="text-xs text-slate-500 font-normal mt-1">This might take a few seconds...</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExportControls;
