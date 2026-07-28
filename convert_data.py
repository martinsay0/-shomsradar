import pandas as pd
import json
import os

def convert_csv_to_json(input_file='survey_data(4).xlsx', output_file='realData.json'):
    print(f"Loading survey responses from {input_file}...")
    try:
        # Load the file
        df = pd.read_excel(input_file)
        
        # The first row contains the short variable names (e.g., 'age', 'gender', 'Latitude', 'Longitude')
        # We will use this row as our column headers for easier data extraction.
        df.columns = df.iloc[0].fillna('Unknown_Col')
        df = df.drop(0)
        
        print(f"Successfully loaded {len(df)} survey responses.")
    except Exception as e:
        print(f"Error loading survey responses: {e}")
        return

    # BUILD JSON STRUCTURE
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

    for index, row in df.iterrows():
        # Clean gender/demographics
        gender = safe_str(row.get('gender', "Unknown"))
        if gender in ['SURULERE', 'ABULE OJA', 'IKEJA LGA']:
            gender = "Unknown"

        # Get visible disorder lists
        disorder_raw = row.get('disorder_obs')
        disorder_list = []
        if isinstance(disorder_raw, str):
            disorder_list = [item.strip() for item in disorder_raw.split(',') if item.strip()]
        
        # Clean streetlight
        streetlight_raw = safe_str(row.get('streetlight_obs', "No"))
        if streetlight_raw in ['Yes', 'No']:
            streetlight = streetlight_raw
        elif streetlight_raw.lower().startswith('yes'):
            streetlight = 'Yes'
        else:
            streetlight = 'No'
            
        # Clean street type
        street_type_raw = safe_str(row.get('street_type', "Unknown"))
        if 'alley' in street_type_raw.lower():
            street_type = 'Alleyway'
        elif 'footpath' in street_type_raw.lower() or 'foot path' in street_type_raw.lower():
            street_type = 'Footpath'
        else:
            street_type = street_type_raw

        # Clean proximity to market
        market_raw = safe_str(row.get('activity_node', "No"))
        market = 'Yes' if 'market' in market_raw.lower() else 'No'

        # Vigilante proximity: agreement 1-5. True if >= 3
        vigilante_val = safe_int(row.get('vigilante_safe', 0))
        vigilante_present = True if vigilante_val >= 3 else False

        # Social cohesion: willing to help each other, 1-5.
        cohesion = safe_int(row.get('help_neigh', 0))

        # Fear indicators:
        # safety_day is derived as 6 - avoid_day
        avoid_day_val = safe_int(row.get('avoid_day', 1))
        safety_day = max(1, min(5, 6 - avoid_day_val))

        # ID can be from SN
        record_id = safe_int(row.get('SN'))
        if not record_id:
            # Fallback to index if SN is missing
            record_id = index

        record = {
            "id": record_id,
            "street_name": safe_str(row.get('street_name_obs', "Unknown")),
            "coordinates": [
                safe_float(row.get('Latitude', 0.0)), 
                safe_float(row.get('Longitude', 0.0))
            ],
            "demographics": {
                "age": safe_int(row.get('age', 0)),
                "gender": gender
            },
            "fear_indicators": {
                "fear_robbery_street": safe_int(row.get('worry_street', 0)),
                "avoid_night": safe_int(row.get('avoid_night', 0)),
                "safety_night": safe_int(row.get('safe_street', 0)),
                "safety_day": safety_day
            },
            "victimization": {
                "stolen_from": safe_str(row.get('theft', "No"))
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

    # SAVE OUTPUT
    with open(output_file, 'w') as f:
        json.dump(json_data, f, indent=2)
    
    src_output = os.path.join('src', 'realData.json')
    with open(src_output, 'w') as f:
        json.dump(json_data, f, indent=2)
        
    print(f"Conversion complete! Saved {len(json_data)} records to {output_file} and {src_output}")

if __name__ == "__main__":
    convert_csv_to_json()
