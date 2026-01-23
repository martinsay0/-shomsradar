# How to Update Your Map Data

I have already set up the **Data Pipeline** for you! You don't need to write any code.
Here is how you convert your Excel/CSV data into the App's format.

## Step 1: Prepare Your Data
1.  Export your survey data from Excel or Google Sheets as a CSV.
2.  Name the file **`survey_data.csv`**.
3.  Ensure it has these column headers (matches your questionnaire):
    *   `id`, `lat`, `lng`
    *   `B1` (Age), `B2` (Gender)
    *   `C1` (Victim?)
    *   `D2`, `D6`, `E8` (Fear Scores)
    *   `K1` (Streetlight), `K3` (Street Type), `K8` (Disorder/Graffiti), `K10_Market`

## Step 2: Run the Converter Script
I have created a Python script named **`convert_data.py`** in your project folder.

### Option A: Run Locally (If you have Python)
1.  Place `survey_data.csv` in the `BarigaCrime` folder.
2.  Open your terminal/command prompt.
3.  Run:
    ```bash
    python convert_data.py
    ```
4.  This will generate a new file called **`realData.json`**.
5.  Move `realData.json` into the `src/` folder (overwrite the existing one).
    *   *Windows Command:* `move /Y realData.json src/realData.json`

### Option B: Use Google Colab (No Python installed?)
1.  Open [Google Colab](https://colab.research.google.com/).
2.  Click **New Notebook**.
3.  Open the `convert_data.py` file in this folder, copy its text, and paste it into Colab.
4.  Upload your `survey_data.csv` to Colab (folder icon on the left).
5.  Press **Play**.
6.  Download the generated `realData.json`.
7.  Place it inside your `BarigaCrime/src/` folder.

## Step 3: See the Result
*   If your app is running (`npm run dev`), it will **automatically update** the map instantly!
*   You will see your real survey points on the map.
