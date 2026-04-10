import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const ReportsAnalytics = () => {
    const [data, setData] = useState([]);
    const [filterMonth, setFilterMonth] = useState('all');
    const [filterDept, setFilterDept] = useState('all');

    useEffect(() => {
        axios.get("https://financial-jarvis-assistant.onrender.com/api/data")
             .then(res => setData(res.data.data || []))
             .catch(err => console.error(err));
    }, []);

    // Get unique departments for the dropdown
    const departments = useMemo(() => {
        const depts = new Set();
        data.forEach(r => {
            if (r.Department) depts.add(r.Department);
        });
        return Array.from(depts).sort();
    }, [data]);

    // Apply Filter Actions natively based on React state!
    const filteredData = useMemo(() => {
        return data.filter(r => {
            const matchM = filterMonth === 'all' || r.Month === parseInt(filterMonth);
            const matchD = filterDept === 'all' || r.Department === filterDept;
            return matchM && matchD;
        });
    }, [data, filterMonth, filterDept]);

    let tIncome = 0;
    let tExpense = 0;
    const catMap = {};
    const monthIncomeMap = {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0,10:0,11:0,12:0};
    const monthExpenseMap = {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0,10:0,11:0,12:0};

    filteredData.forEach(r => {
        const type = (r.Type || '').toLowerCase();
        const amt = parseFloat(r.Amount) || 0;
        const m = r.Month;
        const cat = r.Category || 'Other';

        if (type === 'income') {
            tIncome += amt;
            if (monthIncomeMap[m] !== undefined) monthIncomeMap[m] += amt;
        } else if (type === 'expense') {
            tExpense += amt;
            if (monthExpenseMap[m] !== undefined) monthExpenseMap[m] += amt;
            catMap[cat] = (catMap[cat] || 0) + amt;
        }
    });

    const profit = tIncome - tExpense;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            
            {/* Filters Section */}
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', display: 'flex', gap: '24px', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <label style={{ marginBottom: '8px', color: 'var(--text-muted)' }}>Month Filter</label>
                    <select 
                        value={filterMonth} 
                        onChange={e => setFilterMonth(e.target.value)}
                        style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}
                    >
                        <option value="all">All Months</option>
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => (
                            <option key={idx} value={idx+1}>{m}</option>
                        ))}
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <label style={{ marginBottom: '8px', color: 'var(--text-muted)' }}>Department Filter</label>
                    <select 
                        value={filterDept} 
                        onChange={e => setFilterDept(e.target.value)}
                        style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}
                    >
                        <option value="all">All Departments</option>
                        {departments.map((d, i) => (
                            <option key={i} value={d}>{d}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--success)' }}>
                    <p className="text-muted" style={{ marginBottom: '8px' }}>Total Income</p>
                    <h2 style={{ fontSize: '32px' }}>${tIncome.toLocaleString()}</h2>
                </div>
                <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--danger)' }}>
                    <p className="text-muted" style={{ marginBottom: '8px' }}>Total Expense</p>
                    <h2 style={{ fontSize: '32px' }}>${tExpense.toLocaleString()}</h2>
                </div>
                <div className="glass-panel" style={{ padding: '24px', borderLeft: `4px solid ${profit >= 0 ? 'var(--success)' : 'var(--danger)'}` }}>
                    <p className="text-muted" style={{ marginBottom: '8px' }}>Profit / Loss</p>
                    <h2 style={{ fontSize: '32px', color: profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>${profit.toLocaleString()}</h2>
                </div>
            </div>

            {/* Charts Data */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '16px' }}>Income vs Expenses</h3>
                    <div style={{ height: '300px' }}>
                        <Bar 
                            data={{
                                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                                datasets: [
                                    { label: 'Income', data: Object.values(monthIncomeMap), backgroundColor: '#10b981' },
                                    { label: 'Expense', data: Object.values(monthExpenseMap), backgroundColor: '#ef4444' }
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

export default ReportsAnalytics;
