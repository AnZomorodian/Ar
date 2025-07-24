/**
 * Simple Charts - Lightweight charting solution for Track.lytix
 * Fallback when Chart.js CDN is unavailable
 */

class SimpleChart {
    constructor(canvas, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.config = config;
        this.data = config.data;
        this.options = config.options || {};
        
        // Set canvas dimensions
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2; // High DPI
        canvas.height = rect.height * 2;
        this.ctx.scale(2, 2);
        
        this.width = rect.width;
        this.height = rect.height;
        
        this.render();
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Set background
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        if (this.config.type === 'line') {
            this.renderLineChart();
        } else if (this.config.type === 'bar') {
            this.renderBarChart();
        }
        
        this.renderLegend();
        this.renderAxes();
    }
    
    renderLineChart() {
        const datasets = this.data.datasets;
        if (!datasets || datasets.length === 0) return;
        
        // Calculate bounds
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        datasets.forEach(dataset => {
            dataset.data.forEach(point => {
                minX = Math.min(minX, point.x);
                maxX = Math.max(maxX, point.x);
                minY = Math.min(minY, point.y);
                maxY = Math.max(maxY, point.y);
            });
        });
        
        const padding = 60;
        const chartWidth = this.width - 2 * padding;
        const chartHeight = this.height - 2 * padding;
        
        // Draw datasets
        datasets.forEach(dataset => {
            this.ctx.strokeStyle = dataset.borderColor || '#00ff88';
            this.ctx.lineWidth = dataset.borderWidth || 2;
            this.ctx.beginPath();
            
            dataset.data.forEach((point, index) => {
                const x = padding + ((point.x - minX) / (maxX - minX)) * chartWidth;
                const y = this.height - padding - ((point.y - minY) / (maxY - minY)) * chartHeight;
                
                if (index === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            });
            
            this.ctx.stroke();
        });
        
        this.minX = minX;
        this.maxX = maxX;
        this.minY = minY;
        this.maxY = maxY;
        this.padding = padding;
        this.chartWidth = chartWidth;
        this.chartHeight = chartHeight;
    }
    
    renderBarChart() {
        const datasets = this.data.datasets;
        if (!datasets || datasets.length === 0) return;
        
        const labels = this.data.labels || [];
        const padding = 60;
        const chartWidth = this.width - 2 * padding;
        const chartHeight = this.height - 2 * padding;
        
        let maxY = Math.max(...datasets.flatMap(d => d.data));
        
        datasets.forEach((dataset, datasetIndex) => {
            const barWidth = chartWidth / (labels.length * datasets.length) * 0.8;
            
            dataset.data.forEach((value, index) => {
                const x = padding + (index * chartWidth / labels.length) + (datasetIndex * barWidth);
                const height = (value / maxY) * chartHeight;
                const y = this.height - padding - height;
                
                this.ctx.fillStyle = dataset.backgroundColor || dataset.borderColor || '#00ff88';
                this.ctx.fillRect(x, y, barWidth, height);
            });
        });
    }
    
    renderAxes() {
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 1;
        
        // Y-axis
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding, this.padding);
        this.ctx.lineTo(this.padding, this.height - this.padding);
        this.ctx.stroke();
        
        // X-axis
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding, this.height - this.padding);
        this.ctx.lineTo(this.width - this.padding, this.height - this.padding);
        this.ctx.stroke();
        
        // Labels
        this.ctx.fillStyle = '#ccc';
        this.ctx.font = '12px Inter, sans-serif';
        this.ctx.textAlign = 'center';
        
        if (this.minX !== undefined) {
            // X-axis labels
            for (let i = 0; i <= 5; i++) {
                const x = this.padding + (i / 5) * this.chartWidth;
                const value = this.minX + (i / 5) * (this.maxX - this.minX);
                this.ctx.fillText(value.toFixed(0), x, this.height - this.padding + 20);
            }
            
            // Y-axis labels
            this.ctx.textAlign = 'right';
            for (let i = 0; i <= 5; i++) {
                const y = this.height - this.padding - (i / 5) * this.chartHeight;
                const value = this.minY + (i / 5) * (this.maxY - this.minY);
                this.ctx.fillText(value.toFixed(0), this.padding - 10, y + 4);
            }
        }
    }
    
    renderLegend() {
        const datasets = this.data.datasets;
        if (!datasets || datasets.length <= 1) return;
        
        this.ctx.font = '12px Inter, sans-serif';
        this.ctx.textAlign = 'left';
        
        let legendY = 20;
        datasets.forEach((dataset, index) => {
            const legendX = this.width - 150;
            
            // Color box
            this.ctx.fillStyle = dataset.borderColor || dataset.backgroundColor || '#00ff88';
            this.ctx.fillRect(legendX, legendY, 12, 12);
            
            // Label
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(dataset.label || `Dataset ${index + 1}`, legendX + 20, legendY + 10);
            
            legendY += 20;
        });
    }
    
    destroy() {
        // Cleanup method
    }
    
    update() {
        this.render();
    }
}

// Global Chart-compatible interface
window.SimpleChart = SimpleChart;

// Chart.js compatible constructor
if (typeof window.Chart === 'undefined') {
    window.Chart = function(ctx, config) {
        return new SimpleChart(ctx, config);
    };
    
    // Add static properties for Chart.js compatibility
    window.Chart.version = '1.0.0-simple';
    window.Chart.defaults = {};
    
    console.log('Simple Charts fallback loaded successfully');
}