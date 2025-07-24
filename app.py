import fastf1
from fastf1 import plotting
import numpy as np
import pandas as pd
import os
from scipy.interpolate import interp1d
from flask import Flask, render_template, request, jsonify
import json
import logging
from datetime import timedelta

# Setup logging
logging.basicConfig(level=logging.DEBUG)

def convert_numpy_types(obj):
    """Convert numpy types to native Python types for JSON serialization"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    return obj

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "track_lytix_secret_key")

# Cache setup for fastf1
cache_dir = os.path.join(os.getcwd(), 'fastf1_cache')
os.makedirs(cache_dir, exist_ok=True)

try:
    fastf1.Cache.enable_cache(cache_dir)
    plotting.setup_mpl(color_scheme=None)
    logging.info(f"FastF1 cache enabled at: {cache_dir}")
except Exception as e:
    logging.warning(f"Cache setup failed: {e}")
    plotting.setup_mpl(color_scheme=None)

# Data constants
years = list(range(2025, 2017, -1))
sessions = ['Race', 'Qualifying', 'FP1', 'FP2', 'FP3', 'Sprint', 'Sprint Qualifying']

# Grand Prix calendar by year
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
    """Get team for a driver (2025 lineup)"""
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
    """Get available sessions for a specific Grand Prix and year with enhanced reliability"""
    try:
        available_sessions = []
        session_mapping = {
            'Race': 'R',
            'Qualifying': 'Q',
            'FP1': 'FP1',
            'FP2': 'FP2', 
            'FP3': 'FP3',
            'Sprint': 'S',
            'Sprint Qualifying': 'SQ'
        }
        
        for session_name, session_code in session_mapping.items():
            try:
                session = fastf1.get_session(year, grand_prix, session_code)
                # Quick validation without full load
                session_info = session.get_session_info()
                if session_info is not None and len(session_info) > 0:
                    available_sessions.append(session_name)
                    logging.debug(f"Session {session_name} available for {grand_prix} {year}")
            except Exception as e:
                logging.debug(f"Session {session_name} not available: {str(e)[:100]}")
                continue
        
        # Ensure basic sessions are always available as fallback
        if not available_sessions:
            available_sessions = ['Race', 'Qualifying']
            logging.warning(f"No sessions found for {grand_prix} {year}, using fallback")
        
        # Sort sessions in logical order
        session_order = ['FP1', 'FP2', 'FP3', 'Sprint Qualifying', 'Sprint', 'Qualifying', 'Race']
        available_sessions.sort(key=lambda x: session_order.index(x) if x in session_order else 999)
        
        return available_sessions
    except Exception as e:
        logging.error(f"Error getting available sessions: {e}")
        return ['Race', 'Qualifying']

def interpolate_track(X, Y, num_points=2000):
    """Interpolate track coordinates for smoother visualization"""
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

def calculate_consistency_score(lap_times):
    """Calculate consistency score based on lap time standard deviation"""
    if len(lap_times) < 2:
        return 0.0, 0.0
    
    # Convert lap times to seconds
    times_seconds = [lt.total_seconds() for lt in lap_times if pd.notna(lt)]
    if len(times_seconds) < 2:
        return 0.0, 0.0
    
    std_dev = np.std(times_seconds)
    mean_time = np.mean(times_seconds)
    consistency_score = max(0, 100 - (std_dev / mean_time * 100))
    
    return consistency_score, std_dev

def calculate_tyre_efficiency(lap_times, compound="Unknown"):
    """Calculate tyre efficiency score"""
    if len(lap_times) < 3:
        return 0.0, compound
    
    # Simple efficiency based on lap time degradation
    try:
        first_half = lap_times[:len(lap_times)//2]
        second_half = lap_times[len(lap_times)//2:]
        
        avg_first = np.mean([t.total_seconds() for t in first_half if pd.notna(t)])
        avg_second = np.mean([t.total_seconds() for t in second_half if pd.notna(t)])
        
        if avg_first > 0:
            degradation = ((avg_second - avg_first) / avg_first) * 100
            efficiency = max(0, 100 - abs(degradation))
            return efficiency, compound
    except:
        pass
    
    return 85.0, compound  # Default efficiency

def calculate_theoretical_best(session, driver):
    """Calculate theoretical best lap time from best sectors"""
    try:
        laps = session.laps.pick_drivers(driver)
        if laps.empty:
            return None, [None, None, None]
        
        # Get best sector times
        best_s1 = laps['Sector1Time'].min()
        best_s2 = laps['Sector2Time'].min()
        best_s3 = laps['Sector3Time'].min()
        
        if pd.isna(best_s1) or pd.isna(best_s2) or pd.isna(best_s3):
            return None, [best_s1, best_s2, best_s3]
        
        theoretical_best = best_s1 + best_s2 + best_s3
        return theoretical_best, [best_s1, best_s2, best_s3]
    except:
        return None, [None, None, None]

def analyze_gear_strategy(telemetry):
    """Analyze gear usage strategy"""
    try:
        gear_data = telemetry['nGear'].values
        gear_usage = {}
        
        for gear in range(1, 9):
            gear_time = np.sum(gear_data == gear)
            gear_usage[f'Gear_{gear}'] = gear_time
        
        most_used_gear = max(gear_usage.keys(), key=lambda k: gear_usage[k]) if gear_usage else "Gear_1"
        gear_changes = np.sum(np.diff(gear_data) != 0)
        
        return {
            'gear_usage': {k: int(v) for k, v in gear_usage.items()},
            'most_used_gear': int(most_used_gear.split('_')[1]),
            'gear_changes': int(gear_changes),
            'max_gear': int(np.max(gear_data))
        }
    except:
        return {
            'gear_usage': {},
            'most_used_gear': 0,
            'gear_changes': 0,
            'max_gear': 0
        }

def find_strongest_sector(session, driver):
    """Find driver's strongest sector compared to session average"""
    try:
        laps = session.laps.pick_drivers(driver)
        if laps.empty:
            return None, 0.0
        
        # Get driver's best sectors
        driver_s1 = laps['Sector1Time'].min()
        driver_s2 = laps['Sector2Time'].min()
        driver_s3 = laps['Sector3Time'].min()
        
        # Get session averages
        all_laps = session.laps
        session_s1_avg = all_laps['Sector1Time'].mean()
        session_s2_avg = all_laps['Sector2Time'].mean()
        session_s3_avg = all_laps['Sector3Time'].mean()
        
        if any(pd.isna([driver_s1, driver_s2, driver_s3, session_s1_avg, session_s2_avg, session_s3_avg])):
            return None, 0.0
        
        # Calculate advantages
        s1_advantage = (session_s1_avg - driver_s1).total_seconds()
        s2_advantage = (session_s2_avg - driver_s2).total_seconds()
        s3_advantage = (session_s3_avg - driver_s3).total_seconds()
        
        advantages = {'S1': s1_advantage, 'S2': s2_advantage, 'S3': s3_advantage}
        strongest_sector = max(advantages.keys(), key=lambda k: advantages[k])
        
        return strongest_sector, advantages[strongest_sector]
    except:
        return None, 0.0

def process_telemetry_data(year, grand_prix, session_name, selected_drivers):
    """Enhanced telemetry data processing with comprehensive metrics"""
    try:
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

        num_minisectors = 20  # Reduced for performance
        all_telemetry = {}
        fastest_laps = {}
        driver_colors = {}
        detailed_telemetry = {}
        advanced_metrics = {}
        lap_by_lap_data = {}

        for driver in selected_drivers:
            laps = session.laps.pick_drivers(driver)
            fastest_lap = laps.pick_fastest()
            telemetry = fastest_lap.get_telemetry().copy()
            fastest_laps[driver] = fastest_lap
            
            # Simplified processing - use raw data with basic interpolation
            telemetry = telemetry.add_distance()
            
            # Sample data points for performance (every 10th point)
            sample_rate = max(1, len(telemetry) // 500)  # Max 500 points
            telemetry = telemetry.iloc[::sample_rate]
            
            X_new = telemetry['X'].values
            Y_new = telemetry['Y'].values
            speed_new = telemetry['Speed'].values
            throttle_new = telemetry['Throttle'].values
            brake_new = telemetry['Brake'].values
            gear_new = telemetry['nGear'].values
            distance_new = telemetry['Distance'].values / np.max(telemetry['Distance'].values)  # Normalize to 0-1
            
            all_telemetry[driver] = {
                'X': X_new.tolist(),
                'Y': Y_new.tolist(),
                'Speed': speed_new.tolist(),
                'Throttle': throttle_new.tolist(),
                'Brake': brake_new.tolist(),
                'Gear': gear_new.tolist(),
                'Distance': distance_new.tolist(),
            }
            
            # Enhanced telemetry stats
            detailed_telemetry[driver] = {
                'max_speed': float(np.max(speed_new)),
                'avg_speed': float(np.mean(speed_new)),
                'max_throttle': float(np.max(throttle_new)),
                'avg_throttle': float(np.mean(throttle_new)),
                'brake_points': int(np.sum(brake_new > 10)),
                'gear_changes': int(np.sum(np.diff(gear_new) != 0)),
                'max_gear': int(np.max(gear_new))
            }

            # Simplified advanced metrics calculation  
            try:
                # Session Best 
                session_best = fastest_lap['LapTime']
                
                # Skip complex theoretical best calculation for performance
                theoretical_best = session_best  # Simplified fallback
                best_sectors = [None, None, None]
                
                # Basic consistency score using standard deviation of valid lap times
                driver_laps = session.laps.pick_driver(driver)
                valid_times = []
                for _, lap in driver_laps.iterrows():
                    if pd.notna(lap['LapTime']) and lap['LapTime'].total_seconds() > 0:
                        valid_times.append(lap['LapTime'].total_seconds())
                
                if len(valid_times) > 1:
                    std_dev = np.std(valid_times)
                    consistency_score = max(0, 100 - (std_dev * 10))  # Simple scoring
                else:
                    consistency_score = 100.0
                    std_dev = 0.0
                # Gap to session leader (simplified)
                try:
                    all_drivers_best = {}
                    for d in selected_drivers:
                        try:
                            d_laps = session.laps.pick_driver(d)
                            d_fastest = d_laps.pick_fastest()
                            if pd.notna(d_fastest['LapTime']):
                                all_drivers_best[d] = d_fastest['LapTime'].total_seconds()
                        except:
                            continue
                    
                    if all_drivers_best:
                        leader_time = min(all_drivers_best.values())
                        gap_to_leader = session_best.total_seconds() - leader_time
                    else:
                        gap_to_leader = 0.0
                except:
                    gap_to_leader = 0.0
                
                # Simplified gear strategy
                gear_strategy = f"Max gear: {int(np.max(gear_new))}"
                
                # Strongest sector (simplified to sector 1)
                strongest_sector = 1
                sector_advantage = 0.0
                
                # Grid position (default to None for simplicity)
                grid_position = None

                advanced_metrics[driver] = {
                    'session_best': float(session_best.total_seconds()) if pd.notna(session_best) else None,
                    'theoretical_best': float(theoretical_best.total_seconds()) if theoretical_best else None,
                    'best_sectors': [None, None, None],  # Simplified
                    'consistency_score': float(consistency_score),
                    'std_dev': float(std_dev),
                    'max_speed': float(np.max(speed_new)),
                    'gear_strategy': gear_strategy,
                    'strongest_sector': str(strongest_sector),
                    'sector_advantage': float(sector_advantage),
                    'grid_position': grid_position,
                    'gap_to_leader': float(gap_to_leader)
                }

                # Simplified lap by lap data (skip for performance)
                lap_by_lap_data[driver] = []
                    
            except Exception as e:
                logging.error(f"Error calculating advanced metrics for {driver}: {e}")
                advanced_metrics[driver] = {}

        # Set driver colors
        for driver in selected_drivers:
            driver_colors[driver] = team_colors.get(get_driver_team(driver), "#DDDDDD")

        # Process fastest mini-sectors
        fastest_minisectors = []
        mini_sectors = np.linspace(0, 1, num_minisectors)
        
        for i in range(num_minisectors - 1):
            fastest_driver = None
            fastest_speed = -1
            fastest_sector_coords = None
            
            for driver, tel in all_telemetry.items():
                mask_indices = []
                distances = tel['Distance']
                
                # Add safety checks to prevent infinite loops
                if not distances or len(distances) == 0:
                    continue
                    
                min_sector = mini_sectors[i]
                max_sector = mini_sectors[i+1] if i+1 < len(mini_sectors) else 1.0
                
                for j, dist in enumerate(distances):
                    if isinstance(dist, (int, float)) and min_sector <= dist < max_sector:
                        mask_indices.append(j)
                
                if not mask_indices or len(mask_indices) == 0:
                    continue
                
                try:
                    sector_speeds = [tel['Speed'][j] for j in mask_indices if j < len(tel['Speed'])]
                    if not sector_speeds:
                        continue
                        
                    mean_speed = sum(sector_speeds) / len(sector_speeds)
                    
                    if mean_speed > fastest_speed:
                        fastest_speed = mean_speed
                        fastest_driver = driver
                        fastest_sector_coords = {
                            'x': [tel['X'][j] for j in mask_indices if j < len(tel['X'])],
                            'y': [tel['Y'][j] for j in mask_indices if j < len(tel['Y'])]
                        }
                except (IndexError, KeyError, TypeError) as e:
                    logging.warning(f"Error processing sector data for {driver}: {e}")
                    continue
            
            if (fastest_sector_coords and fastest_driver and 
                fastest_driver in driver_colors and 
                fastest_sector_coords.get('x') and fastest_sector_coords.get('y')):
                fastest_minisectors.append({
                    'driver': fastest_driver,
                    'color': driver_colors[fastest_driver],
                    'coords': fastest_sector_coords,
                    'speed': float(fastest_speed)
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
            if pd.notna(lap_time):
                lap_time_str = f"{int(lap_time.total_seconds() // 60)}:{int(lap_time.total_seconds() % 60):02}.{int((lap_time.total_seconds() * 1000) % 1000):03}"
            else:
                lap_time_str = "N/A"
            lap_times[driver] = lap_time_str

        result = {
            'telemetry': all_telemetry,
            'fastest_minisectors': fastest_minisectors,
            'lap_times': lap_times,
            'sector_times': sector_times,
            'driver_colors': driver_colors,
            'detailed_telemetry': detailed_telemetry,
            'advanced_metrics': advanced_metrics,
            'lap_by_lap_data': lap_by_lap_data
        }
        
        # Convert all numpy types to native Python types for JSON serialization
        return convert_numpy_types(result)

    except Exception as e:
        logging.error(f"Error processing telemetry data: {e}")
        raise e

@app.route('/')
def index():
    """Main page"""
    return render_template('index.html', years=years, sessions=sessions)

@app.route('/get_grand_prix')
def get_grand_prix():
    """Get Grand Prix list for selected year"""
    year = request.args.get('year', type=int)
    if year in grand_prix_calendar:
        return jsonify(grand_prix_calendar[year])
    return jsonify([])

@app.route('/get_sessions')
def get_sessions():
    """Get available sessions for selected Grand Prix and year"""
    year = request.args.get('year', type=int)
    grand_prix = request.args.get('grand_prix')
    
    if year and grand_prix:
        available_sessions = get_available_sessions(year, grand_prix)
        return jsonify(available_sessions)
    return jsonify([])

@app.route('/get_drivers')
def get_drivers():
    """Get available drivers for selected session"""
    year = request.args.get('year', type=int)
    grand_prix = request.args.get('grand_prix')
    session_name = request.args.get('session')
    
    try:
        session_code = session_name
        if session_name == 'Race':
            session_code = 'R'
        elif session_name == 'Qualifying':
            session_code = 'Q'
            
        session = fastf1.get_session(year, grand_prix, session_code)
        session.load()
        
        drivers = session.laps['Driver'].unique().tolist()
        drivers = [d for d in drivers if pd.notna(d)]
        drivers.sort()
        
        return jsonify(drivers)
    except Exception as e:
        logging.error(f"Error getting drivers: {e}")
        return jsonify([])

@app.route('/generate_analysis', methods=['POST'])
def generate_analysis():
    """Generate comprehensive telemetry analysis"""
    try:
        data = request.get_json()
        year = data.get('year')
        grand_prix = data.get('grand_prix')
        session = data.get('session')
        drivers = data.get('drivers', [])
        
        if not all([year, grand_prix, session, drivers]):
            return jsonify({'error': 'Missing required parameters'}), 400
        
        if len(drivers) < 1:
            return jsonify({'error': 'At least one driver must be selected'}), 400
        
        result = process_telemetry_data(year, grand_prix, session, drivers)
        return jsonify(result)
        
    except Exception as e:
        logging.error(f"Error generating analysis: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
