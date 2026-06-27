import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Helper to capture map with html2canvas
 */
const captureMap = async (mapElementId) => {
    const mapElement = document.getElementById(mapElementId);
    if (!mapElement) throw new Error("Map element not found");

    return await html2canvas(mapElement, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        ignoreElements: (node) => {
            return node.classList && (node.classList.contains('leaflet-control-container') || node.classList.contains('leaflet-top') || node.classList.contains('export-controls-ignore'));
        }
    });
};

/**
 * Downloads a highly customized High-Res PNG of the map with Metadata overlays.
 */
export const exportToPNG = async (mapElementId, filtersText = "None", activeLayersText = "Base Map") => {
    try {
        const mapCanvas = await captureMap(mapElementId);
        
        // Create a new canvas to stitch everything together
        const finalCanvas = document.createElement('canvas');
        const ctx = finalCanvas.getContext('2d');
        
        // Add padding for header (80px) and footer (40px)
        const headerHeight = 90;
        const footerHeight = 50;
        
        finalCanvas.width = mapCanvas.width;
        finalCanvas.height = mapCanvas.height + headerHeight + footerHeight;
        
        // Fill background (white for metadata areas)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
        
        // Draw the captured map in the middle
        ctx.drawImage(mapCanvas, 0, headerHeight);
        
        // --- DRAW HEADER ---
        // Title
        ctx.fillStyle = '#0f172a'; // slate-900
        ctx.font = 'bold 28px Arial, sans-serif';
        ctx.fillText("ShomsRadar - Bariga Spatial Analytics", 20, 40);
        
        // Date
        ctx.fillStyle = '#64748b'; // slate-500
        ctx.font = '14px Arial, sans-serif';
        ctx.fillText(`Generated on: ${new Date().toLocaleString()}`, 20, 65);
        
        // Active Metadata (Top Right)
        ctx.textAlign = 'right';
        ctx.fillStyle = '#334155'; // slate-700
        ctx.font = 'bold 14px Arial, sans-serif';
        ctx.fillText(`Filters Applied: ${filtersText}`, finalCanvas.width - 20, 40);
        
        ctx.fillStyle = '#3b82f6'; // blue-500
        ctx.fillText(`Active Layers: ${activeLayersText}`, finalCanvas.width - 20, 65);
        
        // --- DRAW FOOTER ---
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.fillText("ShomsRadar", 20, finalCanvas.height - 20);
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'italic 12px Arial, sans-serif';
        ctx.fillText("Crime Prevention Through Environmental Design (CPTED) Engine", 150, finalCanvas.height - 20);
        
        // Trigger Download
        const imgData = finalCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `ShomsRadar_Export_${new Date().getTime()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return true;
    } catch (error) {
        console.error("Error exporting PNG:", error);
        alert("Failed to export PNG. Map tiles may have strict CORS policies.");
        return false;
    }
};

/**
 * Captures the Map and Dashboard HTML elements and generates a PDF report.
 */
export const exportToPDF = async (mapElementId, statsElementId, filename = "ShomsRadar_Report.pdf") => {
    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = doc.internal.pageSize.getHeight();
        let currentY = 10;

        doc.setFontSize(20);
        doc.text("ShomsRadar: Advanced GIS Analytics Report", 10, currentY);
        currentY += 10;
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 10, currentY);
        currentY += 10;

        // Capture Map
        const mapCanvas = await captureMap(mapElementId);
        const mapImgData = mapCanvas.toDataURL('image/jpeg', 0.9);
        const imgWidth = pdfWidth - 20;
        const imgHeight = (mapCanvas.height * imgWidth) / mapCanvas.width;
        
        doc.text("Risk Surface Map:", 10, currentY);
        currentY += 5;
        doc.addImage(mapImgData, 'JPEG', 10, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 10;

        // Capture Stats/Dashboard
        const statsElement = document.getElementById(statsElementId);
        if (statsElement) {
            if (currentY > pdfHeight - 50) {
                doc.addPage();
                currentY = 10;
            }
            
            const statsCanvas = await html2canvas(statsElement, {
                useCORS: true,
                logging: false
            });
            const statsImgData = statsCanvas.toDataURL('image/jpeg', 0.9);
            const sImgWidth = pdfWidth - 20;
            const sImgHeight = (statsCanvas.height * sImgWidth) / statsCanvas.width;
            
            doc.text("Analytics Overview:", 10, currentY);
            currentY += 5;
            
            if (currentY + sImgHeight > pdfHeight - 10) {
                doc.addPage();
                currentY = 10;
            }
            doc.addImage(statsImgData, 'JPEG', 10, currentY, sImgWidth, sImgHeight);
        }

        doc.save(filename);
        return true;
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Failed to export PDF.");
        return false;
    }
};

/**
 * Downloads a Turf FeatureCollection or basic object as a .geojson file
 */
export const exportGeoJSON = (data, filename = "layer_export.geojson") => {
    try {
        if (!data) {
            alert("No spatial data available to export.");
            return false;
        }
        const jsonStr = JSON.stringify(data);
        const blob = new Blob([jsonStr], { type: "application/geo+json" });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return true;
    } catch (error) {
        console.error("Error exporting GeoJSON:", error);
        return false;
    }
};

/**
 * Flattens JSON data and exports to CSV
 */
export const exportCSV = (dataArray, filename = "shomsradar_data.csv") => {
    try {
        if (!dataArray || dataArray.length === 0) {
            alert("No data to export.");
            return false;
        }

        // Flatten the nested objects for CSV columns
        const flattened = dataArray.map(item => {
            return {
                id: item.id,
                lat: item.coordinates[1],
                lng: item.coordinates[0],
                future_risk_score: item.future_risk_score || 0,
                street_type: item.observed_environment?.street_type,
                has_streetlight: item.observed_environment?.has_streetlight,
                visible_disorder: item.observed_environment?.visible_disorder?.join('; '),
                fear_robbery: item.fear_indicators?.fear_robbery_street,
                safety_night: item.fear_indicators?.safety_night,
                safety_day: item.fear_indicators?.safety_day,
                vigilante: item.social?.vigilante_proximity ? 'Yes' : 'No',
                social_cohesion: item.social?.social_cohesion
            };
        });

        const headers = Object.keys(flattened[0]);
        const csvRows = [];
        
        // Add headers
        csvRows.push(headers.join(','));
        
        // Add data
        for (const row of flattened) {
            const values = headers.map(header => {
                const val = row[header];
                // Escape quotes and wrap in quotes if there's a comma
                const escaped = ('' + (val ?? '')).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return true;
    } catch (error) {
        console.error("Error exporting CSV:", error);
        return false;
    }
};
