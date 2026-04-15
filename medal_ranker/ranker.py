import pandas as pd

def build_medal_table(df, group_by_age=True, event_type_filter=None):
    """
    Build medal table from results dataframe.

    Args:
        df: DataFrame with columns:
            [swimmer_name, team, age_group, gender, place, event_type]
        group_by_age: If True, return per-age-group rankings
        event_type_filter: 'individual', 'relay', or None (all)

    Returns:
        Ranked DataFrame
    """

    # Filter by event type if needed
    if event_type_filter:
        df = df[df['event_type'] == event_type_filter]

    # Only medals (place 1, 2, 3)
    df = df[df['place'].isin([1, 2, 3])].copy()

    # Map place to medal type
    medal_map = {1: 'gold', 2: 'silver', 3: 'bronze'}
    df['medal'] = df['place'].map(medal_map)

    # Group columns
    group_cols = ['swimmer_name', 'team', 'gender']
    if group_by_age:
        group_cols.append('age_group')

    # Pivot to count medals
    # Using groupby + unstack to get columns for gold/silver/bronze
    # Note: if there are no results for one medal type, it'll miss from columns
    medal_counts = df.groupby(group_cols + ['medal']).size().unstack(
        fill_value=0
    ).reset_index()

    # Ensure all medal columns exist
    for col in ['gold', 'silver', 'bronze']:
        if col not in medal_counts.columns:
            medal_counts[col] = 0

    # Total medals
    medal_counts['total'] = (
        medal_counts['gold'] +
        medal_counts['silver'] +
        medal_counts['bronze']
    )

    # Apply ranking logic: Gold → Silver → Bronze → Total → Name
    medal_counts = medal_counts.sort_values(
        by=['gold', 'silver', 'bronze', 'total', 'swimmer_name'],
        ascending=[False, False, False, False, True]
    ).reset_index(drop=True)

    medal_counts.index += 1  # Rank starts at 1

    return medal_counts


def rank_by_age_group(df, event_type_filter=None):
    """Returns a dict of {age_group: ranked_dataframe}"""
    results = {}
    if df.empty:
        return results
    
    age_groups = df['age_group'].unique()

    for age in sorted(age_groups):
        age_df = df[df['age_group'] == age]
        ranked = build_medal_table(age_df, group_by_age=False,
                                   event_type_filter=event_type_filter)
        results[age] = ranked

    return results


def rank_overall(df, event_type_filter=None):
    """Returns overall ranking across all age groups"""
    return build_medal_table(df, group_by_age=False,
                             event_type_filter=event_type_filter)
