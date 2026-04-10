import React, { useState } from 'react';
import axios from 'axios';

const MonthlyData = () => {
    const handleFileUpload = async (e, monthId) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            alert(`Uploading data for month ${monthId}...`);
            await axios.post(`http://localhost:3001/api/upload/${monthId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert("File successfully imported to AI Database!");
        } catch (err) {
            console.error("Upload error:", err);
            alert("Error uploading file");
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '32px' }}>
            <h2 style={{ marginBottom: '16px' }}>Monthly Data Integration</h2>
            <p className="text-muted" style={{ marginBottom: '32px' }}>
                Upload your CSV/Excel exported Data Sheets into their respective months. 
                Our backend API stores this data for the voice assistant, which now answers directly from your uploaded CSV records.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '24px' }}>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((mon, idx) => (
                    <div key={mon} style={{ background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 style={{ marginBottom: '16px' }}>{mon}</h3>
                        <input 
                            type="file" 
                            id={`upload-${idx+1}`}
                            accept=".csv" 
                            hidden 
                            onChange={(e) => handleFileUpload(e, idx + 1)}
                        />
                        <button 
                            className="btn-primary" 
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => document.getElementById(`upload-${idx+1}`).click()}
                        >
                            <i className='bx bx-upload' style={{ fontSize: '20px' }}></i> Upload .CSV
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MonthlyData;
