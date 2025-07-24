// Track.lytix - Main Application Logic
class TrackLytix {
    constructor() {
        this.selectedDrivers = new Set();
        this.currentData = null;
        this.charts = {};
        this.trackCanvas = null;
        this.trackCtx = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeCanvas();
        this.updateStats();
    }

    setupEventListeners() {
        // Year selection
        document.getElementById('year').addEventListener('change', (e) => {
            this.loadGrandPrix(e.target.value);
        });

        // Grand Prix selection
        document.getElementById('grand-prix').addEventListener('change', (e) => {
            this.loadSessions(document.getElementById('year').value, e.target.value);
        });

        // Load drivers button
        document.getElementById('load-drivers').addEventListener('click', () => {
            this.loadDrivers();
        });

        // Generate analysis button
        document.getElementById('generate-analysis').addEventListener('click', () => {
            this.generateAnalysis();
        });

        // Track controls
        const toggleSpeedBtn = document.getElementById('toggle-speed');
        if (toggleSpeedBtn) {
            toggleSpeedBtn.addEventListener('click', () => {
                this.toggleSpeedOverlay();
            });
        }
    }

    initializeCanvas() {
        this.trackCanvas = document.getElementById('trackCanvas');
        if (this.trackCanvas) {
            this.trackCtx = this.trackCanvas.getContext('2d');
        }
    }

    async loadGrandPrix(year) {
        if (!year) {
            this.resetSelections(['grand-prix', 'session']);
            return;
        }

        try {
            const response = await fetch(`/get_grand_prix?year=${year}`);
            const grandPrix = await response.json();
            
            this.populateSelect('grand-prix', grandPrix, 'Select GP...');
            this.resetSelections(['session']);
            
        } catch (error) {
            this.showError('Failed to load Grand Prix data');
            console.error('Error loading Grand Prix:', error);
        }
    }

    async loadSessions(year, grandPrix) {
        if (!year || !grandPrix) {
            this.resetSelections(['session']);
            return;
        }

        try {
            const response = await fetch(`/get_sessions?year=${year}&grand_prix=${encodeURIComponent(grandPrix)}`);
            const sessions = await response.json();
            
            this.populateSelect('session', sessions, 'Select Session...');
            
            // Enable load drivers button
            document.getElementById('load-drivers').disabled = false;
            
        } catch (error) {
            this.showError('Failed to load session data');
            console.error('Error loading sessions:', error);
        }
    }

    async loadDrivers() {
        const year = document.getElementById('year').value;
        const grandPrix = document.getElementById('grand-prix').value;
        const session = document.getElementById('session').value;

        if (!year || !grandPrix || !session) {
            this.showError('Please select year, Grand Prix, and session first');
            return;
        }

        this.showLoadingState(true);

        try {
            const response = await fetch(`/get_drivers?year=${year}&grand_prix=${encodeURIComponent(grandPrix)}&session=${encodeURIComponent(session)}`);
            const drivers = await response.json();
            
            this.populateDriversGrid(drivers);
            this.showDriversSection(true);
            
        } catch (error) {
            this.showError('Failed to load drivers data');
            console.error('Error loading drivers:', error);
        } finally {
            this.showLoadingState(false);
        }
    }

    populateSelect(elementId, options, defaultText) {
        const select = document.getElementById(elementId);
        select.innerHTML = `<option value="">${defaultText}</option>`;
        
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });
        
        select.disabled = false;
    }

    populateDriversGrid(drivers) {
        const grid = document.getElementById('drivers-grid');
        grid.innerHTML = '';

        drivers.forEach(driver => {
            const driverCard = document.createElement('div');
            driverCard.className = 'driver-card';
            driverCard.dataset.driver = driver;
            
            driverCard.innerHTML = `
                <div class="driver-code">${driver}</div>
                <div class="driver-team">${this.getDriverTeam(driver)}</div>
            `;

            driverCard.addEventListener('click', () => {
                this.toggleDriverSelection(driver, driverCard);
            });

            grid.appendChild(driverCard);
        });
    }

    getDriverTeam(driver) {
        const teams = {
            'VER': 'Red Bull Racing', 'LAW': 'Red Bull Racing',
            'LEC': 'Ferrari', 'HAM': 'Ferrari',
            'NOR': 'McLaren', 'PIA': 'McLaren',
            'RUS': 'Mercedes', 'ANT': 'Mercedes',
            'ALO': 'Aston Martin', 'STR': 'Aston Martin',
            'GAS': 'Alpine', 'DOO': 'Alpine',
            'OCO': 'Haas', 'BEA': 'Haas',
            'TSU': 'Racing Bulls', 'HAD': 'Racing Bulls',
            'ALB': 'Williams', 'SAI': 'Williams',
            'HUL': 'Kick Sauber', 'BOR': 'Kick Sauber'
        };
        return teams[driver] || 'Unknown';
    }

    toggleDriverSelection(driver, cardElement) {
        if (this.selectedDrivers.has(driver)) {
            this.selectedDrivers.delete(driver);
            cardElement.classList.remove('selected');
        } else {
            this.selectedDrivers.add(driver);
            cardElement.classList.add('selected');
        }

        this.updateSelectionCounter();
        this.updateGenerateButton();
    }

    updateSelectionCounter() {
        document.getElementById('selected-count').textContent = this.selectedDrivers.size;
    }

    updateGenerateButton() {
        const generateBtn = document.getElementById('generate-analysis');
        generateBtn.disabled = this.selectedDrivers.size < 1;
    }

    async generateAnalysis() {
        const year = document.getElementById('year').value;
        const grandPrix = document.getElementById('grand-prix').value;
        const session = document.getElementById('session').value;
        const drivers = Array.from(this.selectedDrivers);

        if (!year || !grandPrix || !session || drivers.length === 0) {
            this.showError('Please complete all selections');
            return;
        }

        this.showLoadingState(true);
        this.showDashboard(false);

        try {
            const response = await fetch('/generate_analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    year: parseInt(year),
                    grand_prix: grandPrix,
                    session: session,
                    drivers: drivers
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.currentData = data;
            
            this.renderDashboard(data);
            this.showDashboard(true);
            this.updateDashboardHeader(year, grandPrix, session);
            this.updateStats();

        } catch (error) {
            this.showError(`Analysis failed: ${error.message}`);
            console.error('Error generating analysis:', error);
        } finally {
            this.showLoadingState(false);
        }
    }

    renderDashboard(data) {
        // Render track visualization
        this.renderTrackDominance(data);
        
        // Render advanced metrics
        this.renderAdvancedMetrics(data);
        
        // Render telemetry charts
        this.renderTelemetryCharts(data);
        
        // Render driver legend
        this.renderDriverLegend(data);
        
        // Show/hide race-specific sections
        const session = document.getElementById('session').value;
        this.toggleRaceSpecificSections(session === 'Race');
    }

    renderTrackDominance(data) {
        if (!this.trackCtx || !data.fastest_minisectors) return;

        const canvas = this.trackCanvas;
        const ctx = this.trackCtx;
        
        // Clear canvas
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Get all coordinates to calculate bounds
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        data.fastest_minisectors.forEach(sector => {
            sector.coords.x.forEach(x => {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
            });
            sector.coords.y.forEach(y => {
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            });
        });

        // Calculate scale and offset
        const padding = 50;
        const scaleX = (canvas.width - 2 * padding) / (maxX - minX);
        const scaleY = (canvas.height - 2 * padding) / (maxY - minY);
        const scale = Math.min(scaleX, scaleY);

        const offsetX = (canvas.width - (maxX - minX) * scale) / 2 - minX * scale;
        const offsetY = (canvas.height - (maxY - minY) * scale) / 2 - minY * scale;

        // Draw track base
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw mini-sectors with driver colors
        data.fastest_minisectors.forEach(sector => {
            if (sector.coords.x.length < 2) return;

            ctx.strokeStyle = sector.color;
            ctx.lineWidth = 6;
            ctx.beginPath();

            for (let i = 0; i < sector.coords.x.length; i++) {
                const x = sector.coords.x[i] * scale + offsetX;
                const y = sector.coords.y[i] * scale + offsetY;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        });

        // Add start/finish line
        if (data.fastest_minisectors.length > 0) {
            const firstSector = data.fastest_minisectors[0];
            if (firstSector.coords.x.length > 0) {
                const startX = firstSector.coords.x[0] * scale + offsetX;
                const startY = firstSector.coords.y[0] * scale + offsetY;

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.setLineDash([10, 5]);
                ctx.beginPath();
                ctx.moveTo(startX - 15, startY - 15);
                ctx.lineTo(startX + 15, startY + 15);
                ctx.moveTo(startX - 15, startY + 15);
                ctx.lineTo(startX + 15, startY - 15);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }

    renderAdvancedMetrics(data) {
        const container = document.getElementById('advanced-metrics');
        container.innerHTML = '';

        Object.entries(data.advanced_metrics || {}).forEach(([driver, metrics]) => {
            const driverSection = document.createElement('div');
            driverSection.className = 'driver-metrics mb-4';
            
            const driverColor = data.driver_colors[driver] || '#cccccc';
            
            // Enhanced metrics display with all requested data points
            driverSection.innerHTML = `
                <div class="driver-header">
                    <h5 style="color: ${driverColor}; border-bottom: 2px solid ${driverColor}; padding-bottom: 0.5rem; margin-bottom: 1rem;">
                        <i class="fas fa-user-circle"></i> ${driver} - ${this.getDriverTeam(driver)}
                    </h5>
                </div>
                
                <div class="metrics-grid">
                    ${metrics.session_best ? `
                    <div class="metric-item session-best">
                        <div class="metric-icon"><i class="fas fa-trophy"></i></div>
                        <div class="metric-content">
                            <div class="metric-title">Session Best</div>
                            <div class="metric-value">${this.formatLapTime(metrics.session_best)}</div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${metrics.theoretical_best ? `
                    <div class="metric-item theoretical-best">
                        <div class="metric-icon"><i class="fas fa-calculator"></i></div>
                        <div class="metric-content">
                            <div class="metric-title">Theoretical Best</div>
                            <div class="metric-value">${this.formatLapTime(metrics.theoretical_best)}</div>
                            <div class="metric-subtitle">
                                <span class="sector-time">S1: ${metrics.best_sectors[0] ? this.formatSectorTime(metrics.best_sectors[0]) : '--:---.---'}</span>
                                <span class="sector-time">S2: ${metrics.best_sectors[1] ? this.formatSectorTime(metrics.best_sectors[1]) : '--:---.---'}</span>
                                <span class="sector-time">S3: ${metrics.best_sectors[2] ? this.formatSectorTime(metrics.best_sectors[2]) : '--:---.---'}</span>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="metric-item consistency">
                        <div class="metric-icon"><i class="fas fa-chart-line"></i></div>
                        <div class="metric-content">
                            <div class="metric-title">Consistency Score</div>
                            <div class="metric-value">${metrics.consistency_score ? metrics.consistency_score.toFixed(1) : '0.0'}%</div>
                            <div class="metric-subtitle">Std Dev: ${metrics.std_dev ? metrics.std_dev.toFixed(3) : '0.000'}s</div>
                        </div>
                    </div>
                    
                    <div class="metric-item max-speed">
                        <div class="metric-icon"><i class="fas fa-tachometer-alt"></i></div>
                        <div class="metric-content">
                            <div class="metric-title">Maximum Speed</div>
                            <div class="metric-value">${metrics.max_speed ? Math.round(metrics.max_speed) : '0'} km/h</div>
                        </div>
                    </div>
                    
                    ${metrics.gear_strategy ? `
                    <div class="metric-item gear-strategy">
                        <div class="metric-icon"><i class="fas fa-cogs"></i></div>
                        <div class="metric-content">
                            <div class="metric-title">Gear Strategy</div>
                            <div class="metric-value">Max: ${metrics.gear_strategy.max_gear || 0}</div>
                            <div class="metric-subtitle">Changes: ${metrics.gear_strategy.gear_changes || 0}</div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${metrics.strongest_sector ? `
                    <div class="metric-item strongest-sector">
                        <div class="metric-icon"><i class="fas fa-flag-checkered"></i></div>
                        <div class="metric-content">
                            <div class="metric-title">Strongest Sector</div>
                            <div class="metric-value">${metrics.strongest_sector}</div>
                            <div class="metric-subtitle">+${metrics.sector_advantage ? metrics.sector_advantage.toFixed(3) : '0.000'}s advantage</div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${metrics.grid_position ? `
                    <div class="metric-item grid-position">
                        <div class="metric-icon"><i class="fas fa-sort-numeric-up"></i></div>
                        <div class="metric-content">
                            <div class="metric-title">Grid Position</div>
                            <div class="metric-value">P${metrics.grid_position}</div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${metrics.gap_to_leader !== null && metrics.gap_to_leader !== undefined ? `
                    <div class="metric-item gap-leader">
                        <div class="metric-icon"><i class="fas fa-stopwatch"></i></div>
                        <div class="metric-content">
                            <div class="metric-title">Gap to Leader</div>
                            <div class="metric-value">${metrics.gap_to_leader > 0 ? '+' : ''}${metrics.gap_to_leader.toFixed(3)}s</div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
            
            container.appendChild(driverSection);
        });
    }

    renderTelemetryCharts(data) {
        // Speed vs Distance Chart
        this.renderSpeedChart(data);
        
        // Throttle & Brake Chart
        this.renderThrottleBrakeChart(data);
        
        // Gear Strategy Chart
        this.renderGearChart(data);
        
        // Sector Analysis Chart
        this.renderSectorChart(data);
        
        // Lap Times Chart (Race only)
        const session = document.getElementById('session').value;
        if (session === 'Race' && data.lap_by_lap_data) {
            this.renderLapTimesChart(data);
        }
    }

    renderSpeedChart(data) {
        const ctx = document.getElementById('speedChart').getContext('2d');
        
        if (this.charts.speedChart) {
            this.charts.speedChart.destroy();
        }

        const datasets = Object.entries(data.telemetry).map(([driver, telemetry]) => ({
            label: driver,
            data: telemetry.Distance.map((dist, i) => ({
                x: dist * 100, // Convert to percentage
                y: telemetry.Speed[i]
            })),
            borderColor: data.driver_colors[driver],
            backgroundColor: data.driver_colors[driver] + '20',
            borderWidth: 2,
            fill: false,
            tension: 0.1
        }));

        this.charts.speedChart = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#ffffff' }
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
                        title: {
                            display: true,
                            text: 'Speed (km/h)',
                            color: '#ffffff'
                        },
                        ticks: { color: '#cccccc' },
                        grid: { color: '#333333' }
                    }
                }
            }
        });
    }

    renderThrottleBrakeChart(data) {
        const ctx = document.getElementById('throttleBrakeChart').getContext('2d');
        
        if (this.charts.throttleBrakeChart) {
            this.charts.throttleBrakeChart.destroy();
        }

        const datasets = [];
        
        // Add throttle data for each driver
        Object.entries(data.telemetry).forEach(([driver, telemetry]) => {
            datasets.push({
                label: `${driver} Throttle`,
                data: telemetry.Distance.map((dist, i) => ({
                    x: dist * 100,
                    y: telemetry.Throttle[i]
                })),
                borderColor: data.driver_colors[driver],
                backgroundColor: data.driver_colors[driver] + '40',
                borderWidth: 2,
                fill: true,
                yAxisID: 'y'
            });
            
            datasets.push({
                label: `${driver} Brake`,
                data: telemetry.Distance.map((dist, i) => ({
                    x: dist * 100,
                    y: telemetry.Brake[i] ? 100 : 0
                })),
                borderColor: '#ff453a',
                backgroundColor: '#ff453a40',
                borderWidth: 1,
                fill: true,
                yAxisID: 'y1'
            });
        });

        this.charts.throttleBrakeChart = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#ffffff' }
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
                        grid: { color: '#333333' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Brake',
                            color: '#ffffff'
                        },
                        ticks: { color: '#cccccc' },
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });
    }

    renderGearChart(data) {
        const ctx = document.getElementById('gearChart').getContext('2d');
        
        if (this.charts.gearChart) {
            this.charts.gearChart.destroy();
        }

        const datasets = Object.entries(data.telemetry).map(([driver, telemetry]) => ({
            label: driver,
            data: telemetry.Distance.map((dist, i) => ({
                x: dist * 100,
                y: telemetry.Gear[i]
            })),
            borderColor: data.driver_colors[driver],
            backgroundColor: data.driver_colors[driver] + '20',
            borderWidth: 2,
            fill: false,
            stepped: true
        }));

        this.charts.gearChart = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#ffffff' }
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
                        title: {
                            display: true,
                            text: 'Gear',
                            color: '#ffffff'
                        },
                        ticks: { 
                            color: '#cccccc',
                            stepSize: 1
                        },
                        grid: { color: '#333333' }
                    }
                }
            }
        });
    }

    renderSectorChart(data) {
        const ctx = document.getElementById('sectorChart').getContext('2d');
        
        if (this.charts.sectorChart) {
            this.charts.sectorChart.destroy();
        }

        const drivers = Object.keys(data.sector_times);
        const sectorData = {
            labels: drivers,
            datasets: [
                {
                    label: 'Sector 1',
                    data: drivers.map(driver => {
                        const sectors = data.sector_times[driver];
                        return sectors[0] ? parseFloat(sectors[0].replace('s', '')) : 0;
                    }),
                    backgroundColor: '#00ff88',
                    borderColor: '#00ff88',
                    borderWidth: 1
                },
                {
                    label: 'Sector 2',
                    data: drivers.map(driver => {
                        const sectors = data.sector_times[driver];
                        return sectors[1] ? parseFloat(sectors[1].replace('s', '')) : 0;
                    }),
                    backgroundColor: '#007aff',
                    borderColor: '#007aff',
                    borderWidth: 1
                },
                {
                    label: 'Sector 3',
                    data: drivers.map(driver => {
                        const sectors = data.sector_times[driver];
                        return sectors[2] ? parseFloat(sectors[2].replace('s', '')) : 0;
                    }),
                    backgroundColor: '#ff9500',
                    borderColor: '#ff9500',
                    borderWidth: 1
                }
            ]
        };

        this.charts.sectorChart = new Chart(ctx, {
            type: 'bar',
            data: sectorData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#ffffff' }
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
                        ticks: { color: '#cccccc' },
                        grid: { color: '#333333' }
                    }
                }
            }
        });
    }

    renderLapTimesChart(data) {
        const ctx = document.getElementById('lapTimesChart').getContext('2d');
        
        if (this.charts.lapTimesChart) {
            this.charts.lapTimesChart.destroy();
        }

        const datasets = Object.entries(data.lap_by_lap_data || {}).map(([driver, laps]) => ({
            label: driver,
            data: laps.map(lap => ({
                x: lap.lap_number,
                y: lap.lap_time
            })),
            borderColor: data.driver_colors[driver],
            backgroundColor: data.driver_colors[driver] + '20',
            borderWidth: 2,
            fill: false,
            tension: 0.1
        }));

        this.charts.lapTimesChart = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#ffffff' }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Lap Number',
                            color: '#ffffff'
                        },
                        ticks: { color: '#cccccc' },
                        grid: { color: '#333333' }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Lap Time (seconds)',
                            color: '#ffffff'
                        },
                        ticks: { color: '#cccccc' },
                        grid: { color: '#333333' }
                    }
                }
            }
        });
    }

    renderDriverLegend(data) {
        const legend = document.getElementById('driver-legend');
        legend.innerHTML = '';

        Object.entries(data.driver_colors).forEach(([driver, color]) => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            
            legendItem.innerHTML = `
                <div class="legend-color" style="background-color: ${color}"></div>
                <span class="legend-driver">${driver} - ${this.getDriverTeam(driver)}</span>
            `;
            
            legend.appendChild(legendItem);
        });
    }

    toggleRaceSpecificSections(isRace) {
        const lapTimesSection = document.getElementById('lap-times-section');
        const sectorSection = document.getElementById('sector-analysis-section');
        
        if (isRace) {
            lapTimesSection.style.display = 'block';
            sectorSection.classList.remove('col-lg-8');
            sectorSection.classList.add('col-lg-4');
        } else {
            lapTimesSection.style.display = 'none';
            sectorSection.classList.remove('col-lg-4');
            sectorSection.classList.add('col-lg-8');
        }
    }

    // Utility methods
    formatLapTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toFixed(3).padStart(6, '0')}`;
    }

    formatSectorTime(seconds) {
        return seconds.toFixed(3) + 's';
    }

    resetSelections(elements) {
        elements.forEach(elementId => {
            const element = document.getElementById(elementId);
            element.innerHTML = `<option value="">Select ${elementId.replace('-', ' ')}...</option>`;
            element.disabled = true;
        });
        
        if (elements.includes('session')) {
            document.getElementById('load-drivers').disabled = true;
            this.showDriversSection(false);
        }
    }

    showDriversSection(show) {
        const driversCard = document.getElementById('drivers-card');
        driversCard.style.display = show ? 'block' : 'none';
        
        if (show) {
            driversCard.classList.add('fade-in');
        }
    }

    showDashboard(show) {
        const dashboard = document.getElementById('dashboard-section');
        dashboard.style.display = show ? 'block' : 'none';
        
        if (show) {
            dashboard.classList.add('fade-in');
            dashboard.scrollIntoView({ behavior: 'smooth' });
        }
    }

    showLoadingState(show) {
        const loading = document.getElementById('loading-section');
        loading.style.display = show ? 'block' : 'none';
    }

    showError(message) {
        const errorAlert = document.getElementById('error-alert');
        const errorMessage = document.getElementById('error-message');
        
        errorMessage.textContent = message;
        errorAlert.style.display = 'block';
        
        setTimeout(() => {
            errorAlert.style.display = 'none';
        }, 5000);
    }

    updateDashboardHeader(year, grandPrix, session) {
        document.getElementById('race-title').textContent = `${grandPrix} ${year}`;
        document.getElementById('session-badge').textContent = session;
        document.getElementById('year-badge').textContent = year;
    }

    updateStats() {
        const dataPointsEl = document.getElementById('data-points');
        const driversCountEl = document.getElementById('drivers-count');
        
        if (this.currentData && this.currentData.telemetry) {
            const totalPoints = Object.values(this.currentData.telemetry)
                .reduce((total, telemetry) => total + telemetry.Speed.length, 0);
            dataPointsEl.textContent = totalPoints.toLocaleString();
        }
        
        driversCountEl.textContent = this.selectedDrivers.size;
    }

    toggleSpeedOverlay() {
        // Implementation for speed overlay toggle
        console.log('Speed overlay toggle - to be implemented');
    }

    getDriverTeam(driver) {
        // Map driver codes to team names
        const driverTeams = {
            'VER': 'Red Bull Racing',
            'PER': 'Red Bull Racing',
            'HAM': 'Mercedes',
            'RUS': 'Mercedes',
            'LEC': 'Ferrari',
            'SAI': 'Ferrari',
            'NOR': 'McLaren',
            'PIA': 'McLaren',
            'ALO': 'Aston Martin',
            'STR': 'Aston Martin',
            'OCO': 'Alpine',
            'GAS': 'Alpine',
            'TSU': 'AlphaTauri',
            'RIC': 'AlphaTauri',
            'ALB': 'Williams',
            'SAR': 'Williams',
            'MAG': 'Haas',
            'HUL': 'Haas',
            'BOT': 'Alfa Romeo',
            'ZHO': 'Alfa Romeo'
        };
        return driverTeams[driver] || 'Unknown Team';
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not available. Please check the CDN connection.');
        alert('Unable to load charting library. Please refresh the page.');
        return;
    }
    
    // Initialize the Track.lytix application
    new TrackLytix();
});
