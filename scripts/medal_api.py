import os
import re
import pdfplumber
import pandas as pd
from bs4 import BeautifulSoup
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for React communication

def parse_hytek_content(pdf_stream, comp_name):
    """Robust PDF table parser using pdfplumber on a stream."""
    results = []
    current_event = "Unknown"
    current_gender = "Unknown"
    current_age_group = ""
    current_type = "individual"
    skip_round = False
    
    with pdfplumber.open(pdf_stream) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if not text: continue
            
            lines = text.split('\n')
            for line in lines:
                line = line.strip()
            
                # 0. Global Round Detection (Toggle within events)
                # If we see "Prelim Time" or "Preliminaries", we start skipping.
                # If we see "Finals Time" or "Finals", we stop skipping.
                if re.search(r"preliminaries|prelim time|heat sheet|qualifying", line, re.I):
                    skip_round = True
                if re.search(r"finals time|timed finals", line, re.I):
                    skip_round = False

                # 1. Capture Event Headers
                # Support optional parentheses e.g. (Event 103 ...) and any characters after gender
                event_match = re.search(r"\(?Event\s+\d+\s+(Girls|Boys|Mixed|Men|Women|Open)\s+(.*)", line, re.I)
                if event_match:
                    header_content = event_match.group(2).lower()
                    
                    # 1a. Detect Round from Header
                    # Default: Don't skip (handles Timed Finals)
                    skip_round = False 
                    
                    # If header specifically says prelim/semi/heat/qualifying, skip it
                    if re.search(r"prelim|semi|heat|qualifying", header_content, re.I):
                        skip_round = True
                        
                    # Except if it's a Final
                    if "final" in header_content:
                        skip_round = False
                        
                    current_event = line
                    current_gender = event_match.group(1).title()
                    current_age_group = event_match.group(2).strip()
                    current_type = "relay" if "relay" in line.lower() else "individual"
                    continue
                
                # 2. Capture Result Rows
                # Robust regex: (Place) (Name) (Age) (Team) (Result Time/Status)
                res_match = re.search(r"^(\d+)\s+([A-Za-z\s',\-]+)\s+(\d+)\s+(.*?)\s+([\d:\.]+|NT|DQ|NS|SCR)", line)
                if res_match and not skip_round:
                    place = int(res_match.group(1))
                    if place > 3: continue
                    
                    name = res_match.group(2).strip()
                    age = res_match.group(3).strip()
                    team = res_match.group(4).strip()
                    
                    try:
                        a = int(age)
                        if a <= 9:
                            display_age_group = "8-9 Years"
                        elif a >= 16:
                            display_age_group = "16 & Over"
                        else:
                            display_age_group = f"{a} Year Olds"
                    except ValueError:
                        display_age_group = current_age_group if current_age_group else f"{age} Year Olds"
                        if display_age_group.isdigit():
                            display_age_group = f"{display_age_group} Year Olds"

                    results.append({
                        "competition": comp_name,
                        "event_name": current_event,
                        "event_type": current_type,
                        "age_group": display_age_group,
                        "gender": current_gender if current_gender != "Unknown" else "Mixed",
                        "place": place,
                        "swimmer_name": name,
                        "team": team
                    })
    return results

def extract_lines(file, filename):
    ext = filename.lower().split('.')[-1]
    lines = []
    
    if ext == 'pdf':
        with pdfplumber.open(file) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    lines.extend(text.split('\n'))
                    
    elif ext in ['htm', 'html']:
        text = file.read().decode('utf-8', errors='ignore')
        soup = BeautifulSoup(text, 'html.parser')
        lines = soup.get_text(separator='\n').split('\n')
        
    elif ext in ['xls', 'xlsx', 'csv']:
        try:
            if ext == 'csv':
                df = pd.read_csv(file, header=None)
            else:
                df = pd.read_excel(file, header=None)
            
            for index, row in df.iterrows():
                r_text = "  ".join([str(x).strip() for x in row if pd.notna(x)])
                lines.append(r_text)
        except Exception as e:
            print(f"Extraction error for {ext}:", e)
            
    return lines

def parse_full_hytek(file, filename):
    """Universal parser for full heat/result processing across all formats."""
    results = []
    current_event_code = None
    current_event_name = "Unknown"
    current_heat = 1
    
    lines = extract_lines(file, filename)
    is_result_sheet = False
    if re.search(r"results|finals time|prelim time", "\n".join(lines[:100]), re.I):
        is_result_sheet = True

    for line in lines:
        line = line.strip()
        if not line: continue
        
        # Check for sheet type indicators at line level too
        if re.search(r"heat sheet|meet program", line, re.I): is_result_sheet = False
        if re.search(r"results|finals time", line, re.I): is_result_sheet = True

        # Check for Event Header
        ev_match = re.search(r"Event\s+(\d+)\s+(.+)", line, re.I)
        if ev_match:
            current_event_code = ev_match.group(1)
            current_event_name = ev_match.group(2).strip()
            continue
        
        # Check for Heat Label
        heat_match = re.search(r"Heat\s+(\d+)", line, re.I)
        if heat_match:
            current_heat = int(heat_match.group(1))
            continue
            
        # 2. Capture athlete row (Rank/Lane) (Name) (Age) (Team) (Time/Status)
        row_match = re.search(r"(?:\s|^)(\d+)\s+([A-Z][A-Za-z\s',.\-]+?)\s+(\d{1,2})\s+(.*?)\s+(\d+[:\.]\d*[:\.]\d*|NT|NS|SCR|DQ|NP)", line, re.I)
        if row_match:
            num = int(row_match.group(1))
            name = row_match.group(2).strip()
            age = int(row_match.group(3))
            team = row_match.group(4).strip()
            time_str = row_match.group(5).strip()
            
            results.append({
                "eventCode": current_event_code,
                "eventName": current_event_name,
                "athleteName": name,
                "age": age,
                "team": team,
                "resultTime": time_str if is_result_sheet else None,
                "seedTime": None if is_result_sheet else time_str,
                "rank": num if is_result_sheet else None,
                "heat": current_heat,
                "lane": None if is_result_sheet else num 
            })
            continue
    return results

@app.route('/api/index', methods=['POST'])
@app.route('/parse-full', methods=['POST'])
def handle_parse_full():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    ext = file.filename.lower().split('.')[-1]
    
    if ext in ['pdf', 'html', 'htm', 'csv', 'xls', 'xlsx']:
        results = parse_full_hytek(file, file.filename)
        return jsonify({"success": True, "results": results})
        
    return jsonify({"error": "Unsupported format. Use PDF, HTML, Excel, or CSV"}), 400

@app.route('/api/upload', methods=['POST'])
@app.route('/upload', methods=['POST'])
def upload_files():
    if 'files' not in request.files:
        return jsonify({"error": "No files provided"}), 400
    
    comp_name = request.form.get('competition_name', 'Unnamed Meet')
    files = request.files.getlist('files')
    all_results = []
    
    for file in files:
        if file.filename.lower().endswith('.pdf'):
            print(f"📄 Processing {file.filename}...")
            results = parse_hytek_content(file, comp_name)
            print(f"   -> Found {len(results)} medals in {file.filename}")
            all_results.extend(results)
            
    print(f"✅ Total medals found across all files: {len(all_results)}")
    return jsonify({
        "success": True,
        "count": len(all_results),
        "results": all_results
    })

if __name__ == '__main__':
    print("🚀 Medal API Bridge running on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=False)
