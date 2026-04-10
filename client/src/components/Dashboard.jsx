import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const Dashboard = () => {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        try {
            const res = await axios.get('http://localhost:3001/api/data');
            setData(res.data.data || []);
        } catch (err) {
            console.error("Error fetching data", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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
            fetchData();
        } catch (err) {
            console.error("Upload error:", err);
            alert("Error uploading file");
        }
    };

    // Calculate Metrics
    let totalIncome = 0;
    let totalExpense = 0;
    const catMap = {};
    const monthIncomeStr = {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0,10:0,11:0,12:0};
    const monthExpenseStr = {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0,10:0,11:0,12:0};

    data.forEach(row => {
        const m = row.Month;
        const type = (row.Type || '').toLowerCase();
        const amt = parseFloat(row.Amount) || 0;
        const cat = row.Category || 'Other';

        if (type === 'income') {
            totalIncome += amt;
            if(monthIncomeStr[m] !== undefined) monthIncomeStr[m] += amt;
        } else if (type === 'expense') {
            totalExpense += amt;
            if(monthExpenseStr[m] !== undefined) monthExpenseStr[m] += amt;
            catMap[cat] = (catMap[cat] || 0) + amt;
        }
    });

    const profit = totalIncome - totalExpense;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            
            {/* Top Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--success)' }}>
                    <p className="text-muted" style={{ marginBottom: '8px' }}>Total Income</p>
                    <h2 style={{ fontSize: '32px' }}>${totalIncome.toLocaleString()}</h2>
                </div>
                <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--danger)' }}>
                    <p className="text-muted" style={{ marginBottom: '8px' }}>Total Expense</p>
                    <h2 style={{ fontSize: '32px' }}>${totalExpense.toLocaleString()}</h2>
                </div>
                <div className="glass-panel" style={{ padding: '24px', borderLeft: `4px solid ${profit >= 0 ? 'var(--success)' : 'var(--danger)'}` }}>
                    <p className="text-muted" style={{ marginBottom: '8px' }}>Profit / Loss</p>
                    <h2 style={{ fontSize: '32px', color: profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>${profit.toLocaleString()}</h2>
                </div>
            </div>

            {/* Charts Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '16px' }}>Income vs Expenses</h3>
                    <div style={{ height: '300px' }}>
                        <Bar 
                            data={{
                                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                                datasets: [
                                    { label: 'Income', data: Object.values(monthIncomeStr), backgroundColor: '#10b981' },
                                    { label: 'Expense', data: Object.values(monthExpenseStr), backgroundColor: '#ef4444' }
                                ]
                            }}
                            options={{ responsive: true, maintainAspectRatio: false }}
                        />
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '16px' }}>Expense Categories</h3>
                    <div style={{ height: '300px' }}>
                        <Pie 
                            data={{
                                labels: Object.keys(catMap).length > 0 ? Object.keys(catMap) : ['No Data'],
                                datasets: [{
                                    data: Object.keys(catMap).length > 0 ? Object.values(catMap) : [1],
                                    backgroundColor: ['#6366f1', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#38bdf8']
                                }]
                            }}
                            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
                        />
                    </div>
                </div>
            </div>

        </motion.div>
    );
};

export default Dashboard;
