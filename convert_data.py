import pandas as pd
import json
import os
import glob

def convert_csv_to_json(input_pattern='survey_data*.xlsx', output_file='realData.json'):
    """
    Converts survey CSV/Excel data into the specific JSON format required for the Fearscape Analyzer app.
    It loads coordinates from survey_data(1).xlsx sheets and merges them with the survey responses in survey_data(2).xlsx.
    """
    
    # 1. LOAD COORDINATES (survey_data(1).xlsx)
    print("Loading coordinates from survey_data(1).xlsx...")
    try:
        xl1 = pd.ExcelFile('survey_data(1).xlsx')
        points_dfs = []
        for sheet in xl1.sheet_names:
            if sheet in ['PHOTOS', 'TRACKS', 'TRACK_POINTS', 'FEATURE_POINTS']:
                continue
            df = xl1.parse(sheet)
            if 'ID' in df.columns and ('Latitude' in df.columns or 'Lat' in df.columns):
                # Unify columns to ID, Latitude, Longitude, Remarks
                df_clean = df[['ID', 'Latitude', 'Longitude', 'Remarks']].copy() if 'Latitude' in df.columns else df[['ID', 'Lat', 'Lon', 'Remarks']].copy()
                df_clean.columns = ['ID', 'Latitude', 'Longitude', 'Remarks']
                df_clean['sheet'] = sheet
                points_dfs.append(df_clean)
        
        df_coords = pd.concat(points_dfs, ignore_index=True)
        # Convert ID to numeric
        df_coords['ID'] = pd.to_numeric(df_coords['ID'], errors='coerce')
        df_coords = df_coords.dropna(subset=['ID'])
        df_coords['ID'] = df_coords['ID'].astype(int)
        print(f"Successfully loaded {len(df_coords)} coordinate points from {len(points_dfs)} sheets.")
    except Exception as e:
        print(f"Error loading coordinates: {e}")
        return

    # 2. LOAD SURVEY RESPONSES (survey_data(2).xlsx)
    print("Loading survey responses from survey_data(2).xlsx...")
    try:
        # Skip the second row (which contains the question texts as labels)
        df_survey = pd.read_excel('survey_data(2).xlsx', skiprows=[1])
        # Convert SN to numeric
        df_survey['SN'] = pd.to_numeric(df_survey['SN'], errors='coerce')
        df_survey = df_survey.dropna(subset=['SN'])
        df_survey['SN'] = df_survey['SN'].astype(int)
        print(f"Successfully loaded {len(df_survey)} survey responses.")
    except Exception as e:
        print(f"Error loading survey responses: {e}")
        return

    # 3. MERGE DATAFRAMES
    print("Merging coordinates and survey responses...")
    df_merged = pd.merge(df_coords, df_survey, left_on='ID', right_on='SN', how='inner')
    print(f"Merged dataset has {len(df_merged)} records.")

    # 4. BUILD JSON STRUCTURE
    json_data = []

    def safe_int(val):
        try:
            return int(float(val)) if pd.notnull(val) else 0
        except:
            return 0

    def safe_float(val):
        try:
            return float(val) if pd.notnull(val) else 0.0
        except:
            return 0.0

    def safe_str(val):
        if pd.isna(val):
            return "Unknown"
        return str(val).strip()

    for index, row in df_merged.iterrows():
        # Clean gender/demographics
        gender = safe_str(row.get('B2', "Unknown"))
        if gender in ['SURULERE', 'ABULE OJA', 'IKEJA LGA']:
            gender = "Unknown"

        # Get visible disorder lists (J7 is comma-separated string)
        disorder_raw = row.get('J7')
        disorder_list = []
        if isinstance(disorder_raw, str):
            # Split by comma and strip whitespace from each item
            disorder_list = [item.strip() for item in disorder_raw.split(',') if item.strip()]
        
        # Clean streetlight
        streetlight_raw = safe_str(row.get('J1', "No"))
        if streetlight_raw in ['Yes', 'No']:
            streetlight = streetlight_raw
        elif streetlight_raw.lower().startswith('yes'):
            streetlight = 'Yes'
        else:
            streetlight = 'No'
            
        # Clean street type
        street_type_raw = safe_str(row.get('J3', "Unknown"))
        if 'alley' in street_type_raw.lower():
            street_type = 'Alleyway'
        elif 'footpath' in street_type_raw.lower() or 'foot path' in street_type_raw.lower():
            street_type = 'Footpath'
        else:
            street_type = street_type_raw

        # Clean proximity to market
        market_raw = safe_str(row.get('J9', "No"))
        market = 'Yes' if 'market' in market_raw.lower() else 'No'

        # Vigilante proximity: E4 is agreement 1-5. Let's make it true if E4 >= 3
        vigilante_val = safe_int(row.get('E4', 0))
        vigilante_present = True if vigilante_val >= 3 else False

        # Social cohesion: H2 is willing to help each other, 1-5.
        cohesion = safe_int(row.get('H2', 0))

        # Fear indicators:
        # safety_day is derived as 6 - C3 (where C3 is avoided daytime, 1 is never, mapping to 5)
        avoid_day_val = safe_int(row.get('C3', 1))
        safety_day = max(1, min(5, 6 - avoid_day_val))

        record = {
            "id": safe_int(row.get('ID')),
            "street_name": safe_str(row.get('A2', "Unknown")),
            "coordinates": [
                safe_float(row.get('Latitude', 0.0)), 
                safe_float(row.get('Longitude', 0.0))
            ],
            "demographics": {
                "age": safe_int(row.get('B1', 0)),
                "gender": gender
            },
            "fear_indicators": {
                "fear_robbery_street": safe_int(row.get('C2', 0)),
                "avoid_night": safe_int(row.get('C4', 0)),
                "safety_night": safe_int(row.get('D4', 0)),
                "safety_day": safety_day
            },
            "victimization": {
                "stolen_from": safe_str(row.get('F2', "No"))
            },
            "observed_environment": {
                "has_streetlight": streetlight,
                "street_type": street_type,
                "visible_disorder": disorder_list,
                "proximity_to_market": market
            },
            "social": {
                "vigilante_proximity": vigilante_present,
                "social_cohesion": cohesion
            }
        }
        json_data.append(record)

    # 5. SAVE OUTPUT
    # Save both locally and directly to src/realData.json
    with open(output_file, 'w') as f:
        json.dump(json_data, f, indent=2)
    
    src_output = os.path.join('src', 'realData.json')
    with open(src_output, 'w') as f:
        json.dump(json_data, f, indent=2)
        
    print(f"Conversion complete! Saved {len(json_data)} records to {output_file} and {src_output}")

if __name__ == "__main__":
    convert_csv_to_json()
