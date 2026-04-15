import streamlit as st
import pandas as pd
import os
import plotly.express as px

from database import init_db, insert_result, clear_competition, get_all_results
try:
    from parser import parse_any_file
    from ranker import build_medal_table
except ImportError:
    from medal_ranker.parser import parse_any_file
    from medal_ranker.ranker import build_medal_table

# ── Setup ────────────────────────────────────────────────────────────────────
st.set_page_config(page_title="🏆 Swim Meet Medal Rankings", layout="wide", page_icon="🏊")
curr_dir = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(curr_dir, "data"), exist_ok=True)
os.makedirs(os.path.join(curr_dir, "uploads"), exist_ok=True)
init_db()

# ── Sidebar ──────────────────────────────────────────────────────────────────
st.sidebar.title("⚙️ Settings")
competition_name = st.sidebar.text_input("Competition Name", "City Championships 2025")
st.sidebar.markdown("---")
uploaded_files = st.sidebar.file_uploader("Upload Files", type=["pdf", "html", "htm", "xlsx", "xls"], accept_multiple_files=True)

if uploaded_files and st.sidebar.button("🔄 Parse & Consolidate"):
    all_results = []
    with st.spinner("Processing..."):
        for uploaded_file in uploaded_files:
            save_path = os.path.join(curr_dir, "uploads", uploaded_file.name)
            with open(save_path, "wb") as f: f.write(uploaded_file.getbuffer())
            df_p = parse_any_file(save_path, competition_name)
            if not df_p.empty: all_results.append(df_p)
    if all_results:
        st.session_state['df_current'] = pd.concat(all_results, ignore_index=True)
        st.sidebar.success("✅ Files Parsed!")

if st.sidebar.button("💾 Save All to Database"):
    if 'df_current' in st.session_state:
        clear_competition(competition_name)
        for _, row in st.session_state['df_current'].iterrows():
            insert_result(row['competition'], row.get('event_name',''), row.get('event_type',''), row.get('age_group',''), row.get('gender',''), row['place'], row['swimmer_name'], row['team'])
        st.sidebar.success("✅ Saved!")

# ── Data Loading ─────────────────────────────────────────────────────────────
if 'df_current' in st.session_state:
    df = st.session_state['df_current']
else:
    rows = get_all_results(competition_name)
    df = pd.DataFrame(rows, columns=['id', 'competition', 'event_name', 'event_type', 'age_group', 'gender', 'place', 'swimmer_name', 'team']) if rows else pd.DataFrame()

# ── Main UI ──────────────────────────────────────────────────────────────────
st.title("🏊 Swim Meet Medal Rankings")
if df.empty:
    st.info("📄 Upload files to begin.")
    st.stop()

# ── Display Logic ────────────────────────────────────────────────────────────
def display_gendered_ranking(source_df, title, unique_key, club_filter=None):
    st.subheader(title)
    
    # Filter by Gender
    gender_filter = st.radio(f"Gender View ({unique_key}):", ["All", "Boys", "Girls"], key=f"gen_{unique_key}", horizontal=True)
    
    work_df = source_df
    if club_filter and club_filter != "All Clubs":
        work_df = work_df[work_df['team'] == club_filter]
        
    if gender_filter != "All":
        work_df = work_df[work_df['gender'] == gender_filter]

    if work_df.empty:
        st.warning(f"No results for current selection.")
        return

    # Call ranker
    ranked = build_medal_table(work_df, group_by_age=False)
    
    # Pre-display Table transformation
    show_df = ranked.rename(columns={'swimmer_name': 'Swimmer', 'team': 'Team', 'gender': 'Gender', 'gold': '🥇 Gold', 'silver': '🥈 Silver', 'bronze': '🥉 Bronze', 'total': 'Total'})
    
    # Add Total Row
    totals = pd.DataFrame([{
        'Swimmer': '🏆 TOTAL TALLY',
        'Team': club_filter if club_filter else 'ALL',
        'Gender': '-',
        '🥇 Gold': ranked['gold'].sum(),
        '🥈 Silver': ranked['silver'].sum(),
        '🥉 Bronze': ranked['bronze'].sum(),
        'Total': ranked['total'].sum()
    }])
    
    show_df.index.name = "Rank"
    final_df = pd.concat([show_df[['Swimmer', 'Team', 'Gender', '🥇 Gold', '🥈 Silver', '🥉 Bronze', 'Total']], totals], ignore_index=True)
    
    # Display table
    st.table(final_df)

    # Chart - Top 10
    fig = px.bar(ranked.head(10), x='swimmer_name', y=['gold', 'silver', 'bronze'], color_discrete_map={'gold': '#FFD700', 'silver': '#C0C0C0', 'bronze': '#CD7F32'}, barmode='stack', title=f"Top 10 Medals - {gender_filter}")
    st.plotly_chart(fig, use_container_width=True, key=f"cht_{unique_key}_{gender_filter}")

# ── Filter Helper ─────────────────────────────────────────────────────────────
def club_filter_section(key_id, label):
    team_list = ["All Clubs"] + sorted(df['team'].unique().tolist())
    c1, c2 = st.columns([3, 1])
    with c1:
        sel_team = st.selectbox(label, team_list, key=f"sel_{key_id}")
    with c2:
        st.markdown("<br>", unsafe_allow_html=True) # align with selectbox
        if st.button("🧹 Clear Filter", key=f"clr_{key_id}"):
            st.session_state[f"sel_{key_id}"] = "All Clubs"
            st.rerun()
    return sel_team

# ── Tabs ─────────────────────────────────────────────────────────────────────
tab1, tab2, tab3 = st.tabs(["🏅 Individual", "🔄 Relay", "🌐 Overall"])

with tab1:
    idf = df[df['event_type'] == 'individual']
    sel_team_ind = club_filter_section("ind", "Select Club (Individual):")
    
    for i, age in enumerate(sorted(idf['age_group'].unique())):
        with st.expander(f"🎂 Age Group: {age}"):
            display_gendered_ranking(idf[idf['age_group'] == age], f"Individual Rankings - {age}", f"ind_{i}", sel_team_ind)
    st.markdown("---")
    display_gendered_ranking(idf, "Overall Individual Rankings", "ind_all", sel_team_ind)

with tab2:
    rdf = df[df['event_type'] == 'relay']
    if rdf.empty: st.warning("No relay results found.")
    else:
        sel_team_rel = club_filter_section("rel", "Select Club (Relay):")
        for i, age in enumerate(sorted(rdf['age_group'].unique())):
            with st.expander(f"🎂 Age Group: {age}"):
                display_gendered_ranking(rdf[rdf['age_group'] == age], f"Relay Rankings - {age}", f"rel_{i}", sel_team_rel)
        st.markdown("---")
        display_gendered_ranking(rdf, "Overall Relay Rankings", "rel_all", sel_team_rel)

with tab3:
    sel_team_all = club_filter_section("all", "Select Club (Overall Combined):")
    for i, age in enumerate(sorted(df['age_group'].unique())):
        with st.expander(f"🎂 Age Group: {age}"):
            display_gendered_ranking(df[df['age_group'] == age], f"Combined Rankings - {age}", f"all_{i}", sel_team_all)
    st.markdown("---")
    display_gendered_ranking(df, "Overall Grand Rankings", "all_grand", sel_team_all)
