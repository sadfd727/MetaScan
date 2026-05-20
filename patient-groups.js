const COMPARISON_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1'];

function generateId() {
    return 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getStorageKey(username) {
    return 'metascanPatientGroups_' + username;
}

import { safeGetItem, safeSetItem } from './storage.js';

function getPatientData(username) {
    return safeGetItem('metascanData_' + username, []);
}

export class PatientGroupManager {
    constructor(username) {
        this.username = username;
    }

    _getAllGroups() {
        return safeGetItem(getStorageKey(this.username), []);
    }

    _saveGroups(groups) {
        safeSetItem(getStorageKey(this.username), groups);
    }

    createGroup(name, description, tags) {
        const groups = this._getAllGroups();
        const group = {
            id: generateId(),
            name: name,
            description: description || '',
            tags: tags || [],
            patients: [],
            createdAt: new Date().toISOString()
        };
        groups.push(group);
        this._saveGroups(groups);
        return group;
    }

    deleteGroup(groupId) {
        const groups = this._getAllGroups();
        const index = groups.findIndex(g => g.id === groupId);
        if (index !== -1) {
            groups.splice(index, 1);
            this._saveGroups(groups);
            return true;
        }
        return false;
    }

    addPatient(groupId, patientUsername) {
        const groups = this._getAllGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return false;
        if (group.patients.includes(patientUsername)) return false;
        group.patients.push(patientUsername);
        this._saveGroups(groups);
        return true;
    }

    removePatient(groupId, patientUsername) {
        const groups = this._getAllGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return false;
        const index = group.patients.indexOf(patientUsername);
        if (index !== -1) {
            group.patients.splice(index, 1);
            this._saveGroups(groups);
            return true;
        }
        return false;
    }

    getGroups() {
        return this._getAllGroups();
    }

    getGroupPatients(groupId) {
        const groups = this._getAllGroups();
        const group = groups.find(g => g.id === groupId);
        return group ? group.patients.slice() : [];
    }

    filterByTag(tag) {
        const groups = this._getAllGroups();
        return groups.filter(g => g.tags && g.tags.includes(tag));
    }

    getPatientTags(patientUsername) {
        const groups = this._getAllGroups();
        const tags = [];
        groups.forEach(g => {
            if (g.patients && g.patients.includes(patientUsername) && g.tags) {
                g.tags.forEach(tag => {
                    if (!tags.includes(tag)) {
                        tags.push(tag);
                    }
                });
            }
        });
        return tags;
    }
}

export class BatchOperations {
    static batchSendNotification(patientUsernames, message) {
        if (!patientUsernames || patientUsernames.length === 0) return false;
        patientUsernames.forEach(username => {
            const notification = {
                id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                type: 'system',
                title: '健康通知',
                message: message,
                timestamp: new Date().toISOString(),
                read: false
            };
            const notifications = safeGetItem('metascanNotifications_' + username, []);
            notifications.unshift(notification);
            safeSetItem('metascanNotifications_' + username, notifications);
        });
        return true;
    }

    static batchSendHealthMaterial(patientUsernames, materialId) {
        if (!patientUsernames || patientUsernames.length === 0) return false;
        patientUsernames.forEach(username => {
            const materials = safeGetItem('metascanHealthMaterials_' + username, []);
            if (!materials.includes(materialId)) {
                materials.push(materialId);
                safeSetItem('metascanHealthMaterials_' + username, materials);
            }
            const notification = {
                id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                type: 'material',
                title: '健康宣教材料',
                message: '您收到了新的健康宣教材料，请查看。',
                materialId: materialId,
                timestamp: new Date().toISOString(),
                read: false
            };
            const notifications = safeGetItem('metascanNotifications_' + username, []);
            notifications.unshift(notification);
            safeSetItem('metascanNotifications_' + username, notifications);
        });
        return true;
    }
}

export class MultiPatientComparison {
    static renderMultiPatientComparison(containerId, patientUsernames) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const colors = COMPARISON_COLORS;
        const patientColorMap = {};
        patientUsernames.forEach((username, index) => {
            patientColorMap[username] = colors[index % colors.length];
        });

        const allRiskCategories = ['lipid', 'glucose', 'amino', 'inflammation', 'energy', 'oxidative'];
        const riskCategoryLabels = {
            lipid: '血脂',
            glucose: '血糖',
            amino: '氨基酸',
            inflammation: '炎症',
            energy: '能量',
            oxidative: '氧化应激'
        };

        const patientsData = {};
        patientUsernames.forEach(username => {
            patientsData[username] = getPatientData(username);
        });

        let html = '';

        html += '<div class="multi-patient-comparison">';

        html += '<h3 style="margin: 0 0 20px 0; color: #1a2980; font-size: 1.3rem;">多患者对比视图</h3>';

        html += '<div class="comparison-section" style="margin-bottom: 30px;">';
        html += '<h4 style="margin: 0 0 15px 0; color: #333;">综合风险评分对比</h4>';
        html += '<div style="overflow-x: auto;">';
        html += '<table style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr style="background: #f8fafc;">';
        html += '<th style="padding: 12px; border: 1px solid #e0e6ed; text-align: left;">风险类别</th>';
        patientUsernames.forEach(username => {
            html += '<th style="padding: 12px; border: 1px solid #e0e6ed; text-align: center; color: ' + patientColorMap[username] + '; font-weight: 600;">' + username + '</th>';
        });
        html += '</tr></thead><tbody>';

        allRiskCategories.forEach(category => {
            html += '<tr>';
            html += '<td style="padding: 10px 12px; border: 1px solid #e0e6ed;">' + (riskCategoryLabels[category] || category) + '</td>';
            patientUsernames.forEach(username => {
                const data = patientsData[username];
                let lastScore = '-';
                if (data && data.length > 0) {
                    const lastRecord = data[data.length - 1];
                    if (lastRecord.riskScores && lastRecord.riskScores[category] !== undefined) {
                        lastScore = Math.round(lastRecord.riskScores[category]);
                    }
                }
                html += '<td style="padding: 10px 12px; border: 1px solid #e0e6ed; text-align: center;">' + lastScore + '</td>';
            });
            html += '</tr>';
        });

        html += '<tr style="background: #f0f9ff;">';
        html += '<td style="padding: 12px; border: 1px solid #e0e6ed; font-weight: 700;">综合风险评分</td>';
        patientUsernames.forEach(username => {
            const data = patientsData[username];
            let overall = '-';
            if (data && data.length > 0) {
                const lastRecord = data[data.length - 1];
                if (lastRecord.overallRisk !== undefined) {
                    overall = Math.round(lastRecord.overallRisk);
                }
            }
            html += '<td style="padding: 12px; border: 1px solid #e0e6ed; text-align: center; font-weight: 700; color: ' + patientColorMap[username] + ';">' + overall + '</td>';
        });
        html += '</tr>';

        html += '</tbody></table>';
        html += '</div>';
        html += '</div>';

        html += '<div class="comparison-section" style="margin-bottom: 30px;">';
        html += '<h4 style="margin: 0 0 15px 0; color: #333;">趋势对比图</h4>';
        html += '<div style="position: relative; height: 350px;">';
        html += '<canvas id="multiPatientTrendChart_' + containerId + '"></canvas>';
        html += '</div>';
        html += '</div>';

        html += '<div class="comparison-section" style="margin-bottom: 30px;">';
        html += '<h4 style="margin: 0 0 15px 0; color: #333;">亚型分布汇总</h4>';
        html += '<div style="overflow-x: auto;">';
        html += '<table style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr style="background: #f8fafc;">';
        html += '<th style="padding: 12px; border: 1px solid #e0e6ed; text-align: left;">患者</th>';
        html += '<th style="padding: 12px; border: 1px solid #e0e6ed; text-align: left;">亚型分布</th>';
        html += '<th style="padding: 12px; border: 1px solid #e0e6ed; text-align: center;">亚型数量</th>';
        html += '</tr></thead><tbody>';

        patientUsernames.forEach(username => {
            const data = patientsData[username];
            let subtypes = [];
            let subtypeStr = '-';
            let subtypeCount = '-';

            if (data && data.length > 0) {
                const lastRecord = data[data.length - 1];
                if (lastRecord.subtypes) {
                    subtypes = lastRecord.subtypes;
                    subtypeStr = subtypes.join(', ');
                    subtypeCount = subtypes.length;
                }
            }

            html += '<tr>';
            html += '<td style="padding: 10px 12px; border: 1px solid #e0e6ed; color: ' + patientColorMap[username] + '; font-weight: 600;">' + username + '</td>';
            html += '<td style="padding: 10px 12px; border: 1px solid #e0e6ed;">' + subtypeStr + '</td>';
            html += '<td style="padding: 10px 12px; border: 1px solid #e0e6ed; text-align: center;">' + subtypeCount + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table>';
        html += '</div>';
        html += '</div>';

        html += '</div>';

        container.innerHTML = html;

        const chartCanvas = document.getElementById('multiPatientTrendChart_' + containerId);
        if (chartCanvas) {
            const datasets = [];
            const allDates = new Set();

            patientUsernames.forEach((username, index) => {
                const data = patientsData[username];
                const dateScoreMap = [];
                if (data && data.length > 0) {
                    data.forEach(record => {
                        const dateLabel = record.date || new Date(record.timestamp).toLocaleDateString('zh-CN');
                        allDates.add(dateLabel);
                        dateScoreMap.push({ x: dateLabel, y: Math.round(record.overallRisk || 0) });
                    });
                }

                datasets.push({
                    label: username,
                    data: dateScoreMap,
                    borderColor: colors[index % colors.length],
                    backgroundColor: colors[index % colors.length] + '20',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false,
                    pointRadius: 4,
                    pointHoverRadius: 6
                });
            });

            new Chart(chartCanvas, {
                type: 'line',
                data: {
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'category',
                            title: {
                                display: true,
                                text: '日期'
                            },
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: '综合风险评分'
                            },
                            min: 0,
                            max: 100,
                            ticks: {
                                stepSize: 20
                            }
                        }
                    }
                }
            });
        }
    }
}