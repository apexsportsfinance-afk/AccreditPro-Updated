import pdfplumber
import re
import pandas as pd
import os
from bs4 import BeautifulSoup

def parse_any_file(file_path, competition_name):
    """Factory to decide which parser to use based on file extension."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.pdf':
        return parse_hytek_pdf(file_path, competition_name)
    elif ext in ['.xlsx', '.xls']:
        return parse_excel_results(file_path, competition_name)
    elif ext in ['.html', '.htm']:
        return parse_html_results(file_path, competition_name)
    return pd.DataFrame()

def parse_hytek_pdf(pdf_path, competition_name):
    """
    Precision parser tuned for HY-TEK format: 
    Event Header -> Result rows [Place Name Age Team Time Points]
    Example: 1 Avril Xia 9 Tyneside Swim Club 3:18.01 20
    """
    results = []
    with pdfplumber.open(pdf_path) as pdf:
        current_event, current_age, current_gender, current_type = None, None, None, "individual"

        for page in pdf.pages:
            text = page.extract_text()
            if not text: continue
            
            lines = text.split('\n')
            for line in lines:
                line = line.strip()
                if not line: continue
                
                # 1. Event Header Match: "Event 109 Girls 8-9 200 LC Meter Backstroke"
                event_search = re.search(r'Event\s+(\d+)\s+(Girls|Boys|Mixed)\s+(.*?)\s+(.*)', line, re.I)
                if event_search:
                    current_gender = event_search.group(2).strip()
                    current_age = event_search.group(3).strip()
                    current_event = event_search.group(4).strip()
                    current_type = "relay" if "relay" in current_event.lower() else "individual"
                    continue

                # 2. Results Match: "1 Avril Xia 9 Tyneside Swim Club 3:18.01 20"
                # Pattern: [Place] [Name] [Age] [Team...] [Time] [Points]
                res = re.search(r'^([123])\s+([A-Za-z\s\'-]+?)\s+(\d+)\s+(.*?)\s+(\d+[:\.]\d+|DQ|NS|SCR)', line)
                if res and current_event:
                    results.append({
                        'competition': competition_name,
                        'event_name': current_event,
                        'event_type': current_type,
                        'age_group': current_age,
                        'gender': current_gender,
                        'place': int(res.group(1)),
                        'swimmer_name': res.group(2).strip(),
                        'team': res.group(4).strip()
                    })
    return pd.DataFrame(results)

def parse_excel_results(file_path, competition_name):
    """Simple Excel loader assuming standard swim meet result columns."""
    try:
        df = pd.read_excel(file_path)
        # Handle cases where column names might vary
        # (Standardizing on common names found in Meet Manager exports)
        col_map = {
            'Name': 'swimmer_name', 
            'Athlete': 'swimmer_name',
            'Full Name': 'swimmer_name',
            'Team': 'team', 
            'Club': 'team',
            'Place': 'place', 
            'Rank': 'place',
            'Age': 'age_group', # age can act as grouping
            'Gender': 'gender',
            'Event': 'event_name'
        }
        df = df.rename(columns={c: col_map[c] for c in df.columns if c in col_map})
        df['competition'] = competition_name
        df['event_type'] = df['event_name'].apply(lambda x: "relay" if "relay" in str(x).lower() else "individual")
        return df
    except: return pd.DataFrame()

def parse_html_results(file_path, competition_name):
    """Parses HTML table outputs."""
    try:
        dfs = pd.read_html(file_path)
        if not dfs: return pd.DataFrame()
        
        full_df = pd.concat(dfs, ignore_index=True)
        # (Similar mapping logic as Excel above can be added)
        full_df['competition'] = competition_name
        return full_df
    except: return pd.DataFrame()
