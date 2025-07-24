// Track.lytix - Advanced Chart Configurations and Utilities

class ChartManager {
    constructor() {
        this.charts = {};
        this.setupChartDefaults();
    }

    setupChartDefaults() {
        // Global Chart.js defaults for Track.lytix theme
        Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
        Chart.defaults.font.size = 12;
        Chart.defaults.color = '#ffffff';
        Chart.defaults.backgroundColor = 'rgba(0, 255, 136, 0.1)';
        Chart.defaults.borderColor = '#00ff88';
        Chart.defaults.plugins.legend.labels.usePointStyle = true;
        Chart.defaults.plugins.legend.labels.pointStyle = 'line';
        Chart.defaults.elements.point.radius = 0;
        Chart.defaults.elements.point.hoverRadius = 6;
        Chart.defaults.elements.line.tension = 0.2;
        Chart.defaults.scale.grid.color = '#333333';
        Chart.defaults.scale.ticks.color = '#cccccc';
    }

    createAdvancedSpeedChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const datasets = Object.entries(data.telemetry).map(([driver, telemetry]) => {
            const speedGradient = ctx.createLinearGradient(0, 0, 0, 400);
            const driverColor = data.driver_colors[driver];
            speedGradient.addColorStop(0, driverColor + '80');
            speedGradient.addColorStop(1, driverColor + '10');

            return {
                label: driver,
                data: telemetry.Distance.map((dist, i) => ({
                    x: dist * 100,
                    y: telemetry.Speed[i]
                })),
                borderColor: driverColor,
                backgroundColor: speedGradient,
                borderWidth: 3,
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 8,
                pointHoverBackgroundColor: driverColor,
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 2
            };
        });

        const config = {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Speed Analysis - Fastest Lap Comparison',
                        color: '#00ff88',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#ffffff',
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'line'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 26, 26, 0.95)',
                        titleColor: '#00ff88',
                        bodyColor: '#ffffff',
                        borderColor: '#00ff88',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            title: function(context) {
                                return `Track Position: ${context[0].parsed.x.toFixed(1)}%`;
                            },
                            label: function(context) {
                                return `${context.dataset.label}: ${Math.round(context.parsed.y)} km/h`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Track Position (%)',
                            color: '#ffffff',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            color: '#cccccc',
                            callback: function(value) {
                                return value + '%';
                            }
                        },
                        grid: {
                            color: '#333333',
                            lineWidth: 1
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Speed (km/h)',
                            color: '#ffffff',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            color: '#cccccc',
                            callback: function(value) {
                                return Math.round(value) + ' km/h';
                            }
                        },
                        grid: {
                            color: '#333333',
                            lineWidth: 1
                        }
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeInOutQuart'
                }
            }
        };

        this.charts[canvasId] = new Chart(ctx, config);
        return this.charts[canvasId];
    }

    createThrottleBrakeChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const datasets = [];
        
        Object.entries(data.telemetry).forEach(([driver, telemetry]) => {
            const driverColor = data.driver_colors[driver];
            
            // Throttle gradient
            const throttleGradient = ctx.createLinearGradient(0, 0, 0, 300);
            throttleGradient.addColorStop(0, driverColor + '60');
            throttleGradient.addColorStop(1, driverColor + '20');
            
            // Brake gradient (red)
            const brakeGradient = ctx.createLinearGradient(0, 0, 0, 300);
            brakeGradient.addColorStop(0, '#ff453a80');
            brakeGradient.addColorStop(1, '#ff453a20');

            datasets.push({
                label: `${driver} Throttle`,
                data: telemetry.Distance.map((dist, i) => ({
                    x: dist * 100,
                    y: telemetry.Throttle[i]
                })),
                borderColor: driverColor,
                backgroundColor: throttleGradient,
                borderWidth: 2,
                fill: true,
                yAxisID: 'y',
                tension: 0.2
            });

            datasets.push({
                label: `${driver} Brake`,
                data: telemetry.Distance.map((dist, i) => ({
                    x: dist * 100,
                    y: telemetry.Brake[i] ? 100 : 0
                })),
                borderColor: '#ff453a',
                backgroundColor: brakeGradient,
                borderWidth: 2,
                fill: true,
                yAxisID: 'y1',
                stepped: true
            });
        });

        const config = {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Throttle & Brake Application',
                        color: '#00ff88',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#ffffff',
                            padding: 15,
                            filter: function(legendItem, chartData) {
                                return legendItem.text.includes('Throttle') || legendItem.text.includes('Brake');
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 26, 26, 0.95)',
                        titleColor: '#00ff88',
                        bodyColor: '#ffffff',
                        borderColor: '#00ff88',
                        borderWidth: 1,
                        cornerRadius: 8
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Track Position (%)',
                            color: '#ffffff'
                        },
                        ticks: { color: '#cccccc' },
                        grid: { color: '#333333' }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Throttle (%)',
                            color: '#ffffff'
                        },
                        ticks: { color: '#cccccc' },
                        grid: { color: '#333333' },
                        max: 100,
                        min: 0
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Brake Application',
                            color: '#ff453a'
                        },
                        ticks: { 
                            color: '#ff453a',
                            callback: function(value) {
                                return value > 0 ? 'ON' : 'OFF';
                            }
                        },
                        grid: { drawOnChartArea: false },
                        max: 100,
                        min: 0
                    }
                }
            }
        };

        this.charts[canvasId] = new Chart(ctx, config);
        return this.charts[canvasId];
    }

    createGearAnalysisChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        // Create gear usage summary
        const gearUsageData = {};
        Object.entries(data.advanced_metrics).forEach(([driver, metrics]) => {
            if (metrics.gear_strategy && metrics.gear_strategy.gear_usage) {
                gearUsageData[driver] = metrics.gear_strategy.gear_usage;
            }
        });

        const gearNumbers = [1, 2, 3, 4, 5, 6, 7, 8];
        const datasets = Object.entries(gearUsageData).map(([driver, usage]) => ({
            label: driver,
            data: gearNumbers.map(gear => usage[`Gear_${gear}`] || 0),
            backgroundColor: data.driver_colors[driver] + '80',
            borderColor: data.driver_colors[driver],
            borderWidth: 2,
            borderRadius: 4,
            borderSkipped: false
        }));

        const config = {
            type: 'bar',
            data: {
                labels: gearNumbers.map(g => `Gear ${g}`),
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Gear Usage Analysis',
                        color: '#00ff88',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#ffffff',
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 26, 26, 0.95)',
                        titleColor: '#00ff88',
                        bodyColor: '#ffffff',
                        borderColor: '#00ff88',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y} data points`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Gear',
                            color: '#ffffff'
                        },
                        ticks: { color: '#cccccc' },
                        grid: { color: '#333333' }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Usage Frequency',
                            color: '#ffffff'
                        },
                        ticks: { color: '#cccccc' },
                        grid: { color: '#333333' }
                    }
                }
            }
        };

        this.charts[canvasId] = new Chart(ctx, config);
        return this.charts[canvasId];
    }

    createSectorComparisonChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const drivers = Object.keys(data.sector_times);
        const sectors = ['Sector 1', 'Sector 2', 'Sector 3'];
        
        const datasets = sectors.map((sector, index) => {
            const colors = ['#00ff88', '#007aff', '#ff9500'];
            return {
                label: sector,
                data: drivers.map(driver => {
                    const sectorTimes = data.sector_times[driver];
                    return sectorTimes[index] ? parseFloat(sectorTimes[index].replace('s', '')) : 0;
                }),
                backgroundColor: colors[index] + '80',
                borderColor: colors[index],
                borderWidth: 2,
                borderRadius: 6,
                borderSkipped: false
            };
        });

        const config = {
            type: 'bar',
            data: {
                labels: drivers,
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Sector Time Comparison',
                        color: '#00ff88',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#ffffff',
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 26, 26, 0.95)',
                        titleColor: '#00ff88',
                        bodyColor: '#ffffff',
                        borderColor: '#00ff88',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(3)}s`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#cccccc' },
                        grid: { color: '#333333' }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Time (seconds)',
                            color: '#ffffff'
                        },
                        ticks: { 
                            color: '#cccccc',
                            callback: function(value) {
                                return value.toFixed(3) + 's';
                            }
                        },
                        grid: { color: '#333333' }
                    }
                }
            }
        };

        this.charts[canvasId] = new Chart(ctx, config);
        return this.charts[canvasId];
    }

    createLapProgression(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const datasets = Object.entries(data.lap_by_lap_data || {}).map(([driver, laps]) => {
            const driverColor = data.driver_colors[driver];
            
            return {
                label: driver,
                data: laps.map(lap => ({
                    x: lap.lap_number,
                    y: lap.lap_time
                })),
                borderColor: driverColor,
                backgroundColor: driverColor + '20',
                borderWidth: 3,
                fill: false,
                tension: 0.2,
                pointRadius: 4,
                pointHoverRadius: 8,
                pointBackgroundColor: driverColor,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2
            };
        });

        const config = {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Race Lap Time Progression',
                        color: '#00ff88',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#ffffff',
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 26, 26, 0.95)',
                        titleColor: '#00ff88',
                        bodyColor: '#ffffff',
                        borderColor: '#00ff88',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            title: function(context) {
                                return `Lap ${context[0].parsed.x}`;
                            },
                            label: function(context) {
                                const minutes = Math.floor(context.parsed.y / 60);
                                const seconds = (context.parsed.y % 60).toFixed(3);
                                return `${context.dataset.label}: ${minutes}:${seconds.padStart(6, '0')}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Lap Number',
                            color: '#ffffff'
                        },
                        ticks: { 
                            color: '#cccccc',
                            stepSize: 1
                        },
                        grid: { color: '#333333' }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Lap Time',
                            color: '#ffffff'
                        },
                        ticks: { 
                            color: '#cccccc',
                            callback: function(value) {
                                const minutes = Math.floor(value / 60);
                                const seconds = (value % 60).toFixed(1);
                                return `${minutes}:${seconds.padStart(4, '0')}`;
                            }
                        },
                        grid: { color: '#333333' }
                    }
                },
                animation: {
                    duration: 1500,
                    easing: 'easeInOutCubic'
                }
            }
        };

        this.charts[canvasId] = new Chart(ctx, config);
        return this.charts[canvasId];
    }

    destroyChart(canvasId) {
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
            delete this.charts[canvasId];
        }
    }

    destroyAllCharts() {
        Object.keys(this.charts).forEach(canvasId => {
            this.destroyChart(canvasId);
        });
    }

    // Utility function to create responsive chart options
    getResponsiveOptions(customOptions = {}) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#ffffff' }
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 26, 26, 0.95)',
                    titleColor: '#00ff88',
                    bodyColor: '#ffffff',
                    borderColor: '#00ff88',
                    borderWidth: 1,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    ticks: { color: '#cccccc' },
                    grid: { color: '#333333' }
                },
                y: {
                    ticks: { color: '#cccccc' },
                    grid: { color: '#333333' }
                }
            },
            ...customOptions
        };
    }
}

// Export for use in main app
window.ChartManager = ChartManager;
