
import fastf1
from fastf1 import plotting
import numpy as np
import os
from scipy.interpolate import interp1d
from flask import Flask, render_template, request, jsonify
import json

app = Flask(__name__)

# Cache setup
plotting.setup_mpl(color_scheme=None, misc_mpl_mods=False)

# Data constants
years = list(range(2025, 2017, -1))  # 2025 at top, 2018 at bottom
sessions = ['Race', 'Qualifying', 'FP1', 'FP2', 'FP3', 'Sprint', 'Sprint Qualifying']

# Grand Prix calendar by year (in chronological order)
grand_prix_calendar = {
    2025: [
        'Australian Grand Prix', 'Chinese Grand Prix', 'Japanese Grand Prix', 'Bahrain Grand Prix', 
        'Saudi Arabian Grand Prix', 'Miami Grand Prix', 'Emilia Romagna Grand Prix', 'Monaco Grand Prix', 
        'Spanish Grand Prix', 'Canadian Grand Prix', 'Austrian Grand Prix', 'British Grand Prix', 
        'Belgian Grand Prix', 'Hungarian Grand Prix', 'Dutch Grand Prix', 'Italian Grand Prix', 
        'Azerbaijan Grand Prix', 'Singapore Grand Prix', 'United States Grand Prix', 'Mexico City Grand Prix',
        'São Paulo Grand Prix', 'Las Vegas Grand Prix', 'Qatar Grand Prix', 'Abu Dhabi Grand Prix'
    ],
    2024: [
        'Bahrain Grand Prix', 'Saudi Arabian Grand Prix', 'Australian Grand Prix', 'Japanese Grand Prix',
        'Chinese Grand Prix', 'Miami Grand Prix', 'Emilia Romagna Grand Prix', 'Monaco Grand Prix',
        'Canadian Grand Prix', 'Spanish Grand Prix', 'Austrian Grand Prix', 'British Grand Prix',
        'Hungarian Grand Prix', 'Belgian Grand Prix', 'Dutch Grand Prix', 'Italian Grand Prix',
        'Azerbaijan Grand Prix', 'Singapore Grand Prix', 'United States Grand Prix', 'Mexico City Grand Prix',
        'São Paulo Grand Prix', 'Las Vegas Grand Prix', 'Qatar Grand Prix', 'Abu Dhabi Grand Prix'
    ],
    2023: [
        'Bahrain Grand Prix', 'Saudi Arabian Grand Prix', 'Australian Grand Prix', 'Azerbaijan Grand Prix',
        'Miami Grand Prix', 'Monaco Grand Prix', 'Spanish Grand Prix', 'Canadian Grand Prix',
        'Austrian Grand Prix', 'British Grand Prix', 'Hungarian Grand Prix', 'Belgian Grand Prix',
        'Dutch Grand Prix', 'Italian Grand Prix', 'Singapore Grand Prix', 'Japanese Grand Prix',
        'Qatar Grand Prix', 'United States Grand Prix', 'Mexico City Grand Prix', 'São Paulo Grand Prix',
        'Las Vegas Grand Prix', 'Abu Dhabi Grand Prix'
    ],
    2022: [
        'Bahrain Grand Prix', 'Saudi Arabian Grand Prix', 'Australian Grand Prix', 'Emilia Romagna Grand Prix',
        'Miami Grand Prix', 'Spanish Grand Prix', 'Monaco Grand Prix', 'Azerbaijan Grand Prix',
        'Canadian Grand Prix', 'British Grand Prix', 'Austrian Grand Prix', 'Hungarian Grand Prix',
        'Belgian Grand Prix', 'Dutch Grand Prix', 'Italian Grand Prix', 'Singapore Grand Prix',
        'Japanese Grand Prix', 'United States Grand Prix', 'Mexico City Grand Prix', 'São Paulo Grand Prix',
        'Abu Dhabi Grand Prix'
    ],
    2021: [
        'Bahrain Grand Prix', 'Emilia Romagna Grand Prix', 'Portuguese Grand Prix', 'Spanish Grand Prix',
        'Monaco Grand Prix', 'Azerbaijan Grand Prix', 'Canadian Grand Prix', 'British Grand Prix',
        'Hungarian Grand Prix', 'Belgian Grand Prix', 'Dutch Grand Prix', 'Italian Grand Prix',
        'Russian Grand Prix', 'Turkish Grand Prix', 'United States Grand Prix', 'Mexico City Grand Prix',
        'São Paulo Grand Prix', 'Qatar Grand Prix', 'Saudi Arabian Grand Prix', 'Abu Dhabi Grand Prix'
    ],
    2020: [
        'Austrian Grand Prix', 'Styrian Grand Prix', 'Hungarian Grand Prix', 'British Grand Prix',
        'Spanish Grand Prix', 'Belgian Grand Prix', 'Italian Grand Prix', 'Tuscan Grand Prix',
        'Russian Grand Prix', 'Eifel Grand Prix', 'Portuguese Grand Prix', 'Emilia Romagna Grand Prix',
        'Turkish Grand Prix', 'Bahrain Grand Prix', 'Sakhir Grand Prix', 'Abu Dhabi Grand Prix'
    ],
    2019: [
        'Australian Grand Prix', 'Bahrain Grand Prix', 'Chinese Grand Prix', 'Azerbaijan Grand Prix',
        'Spanish Grand Prix', 'Monaco Grand Prix', 'Canadian Grand Prix', 'British Grand Prix',
        'German Grand Prix', 'Hungarian Grand Prix', 'Belgian Grand Prix', 'Italian Grand Prix',
        'Singapore Grand Prix', 'Russian Grand Prix', 'Japanese Grand Prix', 'Mexico City Grand Prix',
        'United States Grand Prix', 'Brazilian Grand Prix', 'Abu Dhabi Grand Prix'
    ],
    2018: [
        'Australian Grand Prix', 'Bahrain Grand Prix', 'Chinese Grand Prix', 'Azerbaijan Grand Prix',
        'Spanish Grand Prix', 'Monaco Grand Prix', 'Canadian Grand Prix', 'British Grand Prix',
        'German Grand Prix', 'Hungarian Grand Prix', 'Belgian Grand Prix', 'Italian Grand Prix',
        'Singapore Grand Prix', 'Russian Grand Prix', 'Japanese Grand Prix', 'United States Grand Prix',
        'Mexico City Grand Prix', 'Brazilian Grand Prix', 'Abu Dhabi Grand Prix'
    ]
}

team_colors = {
    'Mercedes': '#00D2BE',
    'Red Bull Racing': '#1E41FF',
    'Ferrari': '#DC0000',
    'McLaren': '#FF8700',
    'Alpine': '#0090FF',
    'Aston Martin': '#006F62',
    'Haas': '#808080',
    'Racing Bulls': '#1660AD',
    'Williams': '#87cefa',
    'Kick Sauber': '#00e701'
}

def get_driver_team(driver):
    driver_teams = {
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
    }
    return driver_teams.get(driver, 'Unknown')

def get_available_sessions(year, grand_prix):
    """Get available sessions for a specific Grand Prix and year"""
    try:
        available_sessions = []
        session_mapping = {
            'Race': 'R',
            'Qualifying': 'Q',
            'FP1': 'FP1',
            'FP2': 'FP2', 
            'FP3': 'FP3',
            'Sprint': 'Sprint',
            'Sprint Qualifying': 'Sprint Qualifying'
        }
        
        for session_name, session_code in session_mapping.items():
            try:
                session = fastf1.get_session(year, grand_prix, session_code)
                session.load()
                available_sessions.append(session_name)
            except:
                continue
                
        return available_sessions
    except:
        return []

def interpolate_track(X, Y, num_points=2000):
    mask = ~(np.isnan(X) | np.isnan(Y))
    X = X[mask]
    Y = Y[mask]
    dist = np.sqrt(np.diff(X)**2 + np.diff(Y)**2)
    cumdist = np.insert(np.cumsum(dist), 0, 0)
    fx = interp1d(cumdist, X, kind='cubic')
    fy = interp1d(cumdist, Y, kind='cubic')
    uniform_dist = np.linspace(cumdist[0], cumdist[-1], num_points)
    X_new = fx(uniform_dist)
    Y_new = fy(uniform_dist)
    return X_new, Y_new, uniform_dist

def process_telemetry_data(year, grand_prix, session_name, selected_drivers):
    try:
        # Validate session_name is not empty
        if not session_name or session_name.strip() == '':
            raise ValueError("Session name is required")
            
        # Map session names to codes
        session_code = session_name
        if session_name == 'Race':
            session_code = 'R'
        elif session_name == 'Qualifying':
            session_code = 'Q'
            
        session = fastf1.get_session(year, grand_prix, session_code)
        session.load()

        num_minisectors = 300
        mini_sectors = np.linspace(0, 1, num_minisectors)
        all_telemetry = {}
        fastest_laps = {}
        driver_colors = {}
        detailed_telemetry = {}

        for driver in selected_drivers:
            laps = session.laps.pick_drivers(driver)
            fastest_lap = laps.pick_fastest()
            telemetry = fastest_lap.get_telemetry().copy()
            fastest_laps[driver] = fastest_lap
            
            # Enhanced interpolation for smoother track
            X_new, Y_new, dist = interpolate_track(telemetry['X'].values, telemetry['Y'].values, num_points=3000)
            
            # Interpolate all telemetry data
            orig_distance = np.linspace(0, 1, len(telemetry))
            new_distance = np.linspace(0, 1, len(X_new))
            
            speed_interp = interp1d(orig_distance, telemetry['Speed'].values, kind='cubic')
            throttle_interp = interp1d(orig_distance, telemetry['Throttle'].values, kind='linear')
            brake_interp = interp1d(orig_distance, telemetry['Brake'].values, kind='linear')
            gear_interp = interp1d(orig_distance, telemetry['nGear'].values, kind='nearest')
            
            speed_new = speed_interp(new_distance)
            throttle_new = throttle_interp(new_distance)
            brake_new = brake_interp(new_distance)
            gear_new = gear_interp(new_distance)
            
            telemetry_interp = {
                'X': X_new.tolist(),
                'Y': Y_new.tolist(),
                'Speed': speed_new.tolist(),
                'Throttle': throttle_new.tolist(),
                'Brake': brake_new.tolist(),
                'Gear': gear_new.tolist(),
                'Distance': new_distance.tolist(),
            }
            all_telemetry[driver] = telemetry_interp
            
            # Detailed telemetry stats
            detailed_telemetry[driver] = {
                'max_speed': float(np.max(speed_new)),
                'avg_speed': float(np.mean(speed_new)),
                'max_throttle': float(np.max(throttle_new)),
                'avg_throttle': float(np.mean(throttle_new)),
                'brake_points': int(np.sum(brake_new > 10)),
                'gear_changes': int(np.sum(np.diff(gear_new) != 0)),
                'max_gear': int(np.max(gear_new))
            }

        for driver in selected_drivers:
            driver_colors[driver] = team_colors.get(get_driver_team(driver), "#DDDDDD")

        # Process fastest mini-sectors - simple driver dominance comparison
        fastest_minisectors = []
        
        for i in range(num_minisectors - 1):
            fastest_driver = None
            fastest_speed = -1
            fastest_sector_coords = None
            
            for driver, tel in all_telemetry.items():
                mask_indices = []
                distances = tel['Distance']
                for j, dist in enumerate(distances):
                    if mini_sectors[i] <= dist < mini_sectors[i+1]:
                        mask_indices.append(j)
                
                if not mask_indices:
                    continue
                    
                sector_speeds = [tel['Speed'][j] for j in mask_indices]
                mean_speed = sum(sector_speeds) / len(sector_speeds)
                
                if mean_speed > fastest_speed:
                    fastest_speed = mean_speed
                    fastest_driver = driver
                    fastest_sector_coords = {
                        'x': [tel['X'][j] for j in mask_indices],
                        'y': [tel['Y'][j] for j in mask_indices]
                    }
            
            if fastest_sector_coords and fastest_driver:
                fastest_minisectors.append({
                    'driver': fastest_driver,
                    'color': driver_colors[fastest_driver],
                    'coords': fastest_sector_coords,
                    'speed': fastest_speed
                })

        # Process sector times
        sector_times = {}
        try:
            for driver in selected_drivers:
                lap = fastest_laps[driver]
                sectors = []
                if hasattr(lap, 'Sector1Time') and lap['Sector1Time'] is not None:
                    sectors.append(f"{lap['Sector1Time'].total_seconds():.3f}s")
                if hasattr(lap, 'Sector2Time') and lap['Sector2Time'] is not None:
                    sectors.append(f"{lap['Sector2Time'].total_seconds():.3f}s")
                if hasattr(lap, 'Sector3Time') and lap['Sector3Time'] is not None:
                    sectors.append(f"{lap['Sector3Time'].total_seconds():.3f}s")
                sector_times[driver] = sectors
        except:
            sector_times = {driver: ['N/A', 'N/A', 'N/A'] for driver in selected_drivers}

        # Process lap times
        lap_times = {}
        for driver, lap in fastest_laps.items():
            lap_time = lap['LapTime']
            lap_time_str = f"{int(lap_time.total_seconds() // 60)}:{int(lap_time.total_seconds() % 60):02}.{int((lap_time.total_seconds() * 1000) % 1000):03}"
            lap_times[driver] = lap_time_str

        return {
            'track_outline': all_telemetry,
            'fastest_minisectors': fastest_minisectors,
            'driver_colors': driver_colors,
            'lap_times': lap_times,
            'sector_times': sector_times,
            'detailed_telemetry': detailed_telemetry,
            'selected_drivers': selected_drivers
        }
    except Exception as e:
        print(f"Error processing telemetry data: {e}")
        return None

@app.route('/')
def index():
    return render_template('index.html', years=years, grand_prix_calendar=grand_prix_calendar, sessions=sessions)

@app.route('/get_available_sessions', methods=['POST'])
def get_sessions():
    try:
        data = request.json
        year = int(data['year'])
        grand_prix = data['grand_prix']
        
        available_sessions = get_available_sessions(year, grand_prix)
        
        return jsonify({'sessions': available_sessions})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_drivers', methods=['POST'])
def get_drivers():
    try:
        data = request.json
        year = int(data['year'])
        grand_prix = data['grand_prix']
        session_name = data['session']
        
        # Map session names to codes
        session_code = session_name
        if session_name == 'Race':
            session_code = 'R'
        elif session_name == 'Qualifying':
            session_code = 'Q'
        
        session = fastf1.get_session(year, grand_prix, session_code)
        session.load()
        available_drivers = session.results['Abbreviation'].tolist()
        
        return jsonify({'drivers': available_drivers})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/generate_plot', methods=['POST'])
def generate_plot():
    try:
        data = request.json
        year = int(data['year'])
        grand_prix = data['grand_prix']
        session_name = data['session']
        selected_drivers = data['drivers']
        
        # Validate required fields
        if not session_name or session_name.strip() == '':
            return jsonify({'error': 'Please select a session.'}), 400
            
        if len(selected_drivers) < 2:
            return jsonify({'error': 'Please select at least two drivers.'}), 400
        
        telemetry_data = process_telemetry_data(year, grand_prix, session_name, selected_drivers)
        
        if telemetry_data:
            return jsonify({
                'success': True,
                'data': telemetry_data,
                'race_info': {
                    'year': year,
                    'grand_prix': grand_prix,
                    'session': session_name
                }
            })
        else:
            return jsonify({'error': 'Failed to process telemetry data'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
