import pandas as pd
import json
import os

def convert_csv_to_json(input_file='survey_data.csv', output_file='realData.json'):
    """
    Converts survey CSV data into the specific JSON format required for the Fearscape Analyzer app.
    """
    
    # 1. LOAD DATA
    # If your CSV headers are different, you can rename them here or change the code below.
    # For example: df = pd.read_csv(input_file).rename(columns={'Q_B1_Age': 'B1'})
    try:
        df = pd.read_csv(input_file)
        print(f"Successfully loaded {len(df)} records from {input_file}")
    except FileNotFoundError:
        print(f"Error: Could not find {input_file}. Please make sure the file exists.")
        return

    # 2. DATA CLEANING & PREPARATION
    
    # Ensure numeric fields are actually numeric, filling NaNs with 0
    numeric_cols = ['B1', 'D2', 'D6', 'E8', 'lat', 'lng']
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    # 3. BUILD JSON STRUCTURE
    # We iterate through the dataframe and construct the dictionary for each row
    json_data = []

    for index, row in df.iterrows():
        
        # LOGIC: Clean 'Visible signs of disorder' (K8)
        # Check if it's a string, then split. If it's empty/NaN, use empty list.
        disorder_raw = row.get('K8')
        disorder_list = []
        if isinstance(disorder_raw, str):
            # Split by comma and strip whitespace from each item
            disorder_list = [item.strip() for item in disorder_raw.split(',')]
        
        # LOGIC: Construct the single record
        record = {
            "id": row.get('id', index + 1), # Use 'id' column or fallback to row index
            
            # Combine lat/lng into array
            "coordinates": [
                float(row.get('lat', 0)), 
                float(row.get('lng', 0))
            ],
            
            "demographics": {
                "age": int(row.get('B1', 0)),
                "gender": str(row.get('B2', "Unknown"))
            },
            
            "fear_indicators": {
                "fear_robbery_street": int(row.get('D2', 0)),
                "avoid_night": int(row.get('D6', 0)),
                "safety_street_night": int(row.get('E8', 0))
            },
            
            "victimization": {
                "stolen_from": str(row.get('C1', "No"))
            },
            
            "observed_environment": {
                "has_streetlight": str(row.get('K1', "No")),
                "street_type": str(row.get('K3', "Unknown")),
                "visible_disorder": disorder_list,
                "proximity_to_market": str(row.get('K10_Market', "No"))
            }
        }
        
        json_data.append(record)

    # 4. SAVE OUTPUT
    with open(output_file, 'w') as f:
        json.dump(json_data, f, indent=2)
        
    print(f"Conversion complete! Saved {len(json_data)} records to {output_file}")

if __name__ == "__main__":
    # Create a dummy CSV if one doesn't exist, just for testing purposes
    if not os.path.exists('survey_data.csv'):
        print("No 'survey_data.csv' found. Creating a dummy sample file for you to test...")
        dummy_data = {
            'id': [1, 2],
            'lat': [6.541, 6.543],
            'lng': [3.392, 3.394],
            'B1': [35, 28],
            'B2': ['Male', 'Female'],
            'C1': ['Yes', 'No'],
            'D2': [4, 2],
            'D6': [5, 1],
            'E8': [2, 4],
            'K1': ['No', 'Yes'],
            'K3': ['Alleyway', 'Major road'],
            'K8': ['Litter, Graffiti', 'None'],
            'K10_Market': ['Yes', 'No']
        }
        pd.DataFrame(dummy_data).to_csv('survey_data.csv', index=False)
        print("Created dictionary 'survey_data.csv'.")

    convert_csv_to_json()
