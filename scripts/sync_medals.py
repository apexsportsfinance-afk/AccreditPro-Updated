import os
import sys
import re
import pdfplumber
from supabase import create_client, Client

# --- CONFIGURATION ---
SUPABASE_URL = "https://dixelomafeobabahqeqg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpeGVsb21hZmVvYmFiYWhxZXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMzA4MzYsImV4cCI6MjA4NjkwNjgzNn0.YD1lj0T6kFoM2XyeYonIC3bmLiPkKBvmXEHEr5VMaGM"

def parse_hytek_pdf(pdf_path, competition_name):
    """Robust PDF table parser using pdfplumber."""
    results = []
    current_event = "Unknown"
    current_type = "individual"
    
    print(f"📖 Reading: {os.path.basename(pdf_path)}")
    
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if not text: continue
            
            lines = text.split('\n')
            for line in lines:
                line = line.strip()
                # 1. Capture Event Headers
                # Matches: "Event 101 Girls 10-11 50m Breast"
                # Matches: "Event 205 Boys 12-13 100m Free Relay"
                event_match = re.search(r"Event\s+\d+\s+(Girls|Boys|Mixed|Men|Women|Open)\s+.*", line, re.I)
                if event_match:
                    current_event = line
                    current_type = "relay" if "relay" in line.lower() else "individual"
                    continue

                # 2. Capture Result Rows (Rank, Name, Age, Team, Time)
                # We relax the regex to handle various spacing
                # Example: 1 Xia, Avril 9 Apex Swim Club 3:18.01 20
                res_match = re.search(r"^(\d+)\s+([A-Za-z\s',\-]+?)\s+(\d+)\s+(.*?)\s+(\d+[:\.]\d*[:\.]\d*|NT|DQ)", line)
                if res_match:
                    place = int(res_match.group(1))
                    if place > 3: continue # Only medals
                    
                    name = res_match.group(2).strip()
                    age = res_match.group(3).strip()
                    team = res_match.group(4).strip()
                    
                    gender = "Mixed"
                    if "girls" in current_event.lower() or "women" in current_event.lower(): gender = "Girls"
                    elif "boys" in current_event.lower() or "men" in current_event.lower(): gender = "Boys"

                    results.append({
                        "competition": competition_name,
                        "event_name": current_event,
                        "event_type": current_type,
                        "age_group": f"{age} Year Olds",
                        "gender": gender,
                        "place": place,
                        "swimmer_name": name,
                        "team": team
                    })
    return results

def sync_to_supabase(all_results):
    if not all_results:
        print("⚠️ No results found to upload.")
        return
        
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print(f"🚀 Pushing {len(all_results)} results to Supabase...")
    
    # Batch insert
    result = supabase.table("medal_results").insert(all_results).execute()
    print("✅ Sync Successful!")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: Drag & Drop PDF files onto the Batch script.")
        input("Press Enter to close...")
        sys.exit(1)
        
    comp_name = input("Enter Competition Name (e.g. Dubai Championships 2026): ").strip()
    if not comp_name:
        comp_name = "Unnamed Meet"
        
    all_competitor_medals = []
    for pdf_file in sys.argv[1:]:
        if pdf_file.lower().endswith(".pdf"):
            medals = parse_hytek_pdf(pdf_file, comp_name)
            all_competitor_medals.extend(medals)
    
    sync_to_supabase(all_competitor_medals)
    print("\n--- DONE ---")
    input("Press Enter to close and refresh your website...")
