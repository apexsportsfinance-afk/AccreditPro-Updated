import os
from supabase import create_client, Client

# PRE-CONFIGURED WITH YOUR APEX PROJECT CREDENTIALS
SUPABASE_URL = "https://dixelomafeobabahqeqg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpeGVsb21hZmVvYmFiYWhxZXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMzA4MzYsImV4cCI6MjA4NjkwNjgzNn0.YD1lj0T6kFoM2XyeYonIC3bmLiPkKBvmXEHEr5VMaGM"

# The table name in your Supabase project
TABLE_NAME = "medal_results"

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def init_db():
    """No-op for Supabase; table is handled via the dashboard."""
    pass

def insert_result(competition, event_name, event_type,
                  age_group, gender, place, swimmer_name, team):
    """Inserts a single result into Supabase medal_results table."""
    data = {
        "competition": competition,
        "event_name": event_name,
        "event_type": event_type,
        "age_group": age_group,
        "gender": gender,
        "place": place,
        "swimmer_name": swimmer_name,
        "team": team
    }
    response = supabase.table(TABLE_NAME).insert(data).execute()
    return response

def clear_competition(competition_name):
    """Deletes all results for a specific competition from Supabase."""
    # We use a broad filter; normally dangerous, here intended to wipe the specific meet
    response = supabase.table(TABLE_NAME).delete().eq("competition", competition_name).execute()
    return response

def get_all_results(competition_name):
    """Fetches all rows for a competition from Supabase."""
    response = supabase.table(TABLE_NAME).select("*").eq("competition", competition_name).execute()
    
    # Return matches in a list of tuples to keep app logic consistent
    rows = []
    for r in response.data:
        rows.append((
            r['id'], r['competition'], r['event_name'], r['event_type'],
            r['age_group'], r['gender'], r['place'], r['swimmer_name'], r['team']
        ))
    return rows
