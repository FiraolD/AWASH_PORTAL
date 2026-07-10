import pandas as pd
import numpy as np
import re
from openpyxl import load_workbook
from openpyxl.styles import numbers

# =====================================================================
# 1. Load source file and identify sheets
# =====================================================================
source_file = 'Semera Br soft copy.xlsx'
xl = pd.ExcelFile(source_file)
sheet_names = xl.sheet_names
print("Available sheets:", sheet_names)

nonlife_sheet = None
life_sheet = None
for name in sheet_names:
    stripped = name.strip()
    if 'NON Life' in stripped or 'NON LIFE' in stripped.upper():
        nonlife_sheet = name
    if stripped == 'Life' or (len(stripped) <= 6 and 'Life' in stripped):
        life_sheet = name

if nonlife_sheet is None:
    raise ValueError("Could not find a sheet containing 'NON Life'")
if life_sheet is None:
    raise ValueError("Could not find a sheet named 'Life'")

print(f"Using NON Life sheet: '{nonlife_sheet}'")
print(f"Using Life sheet: '{life_sheet}'")

nonlife_df = pd.read_excel(source_file, sheet_name=nonlife_sheet, header=None)
life_df = pd.read_excel(source_file, sheet_name=life_sheet, header=None)

# =====================================================================
# 2. Extract Branch Name
# =====================================================================
branch_cell = None
for i in range(10):
    val = nonlife_df.iloc[i, 0]
    if isinstance(val, str) and 'Branch:' in val:
        branch_cell = val
        break
if branch_cell is None:
    # fallback: look for "Semera"
    for i in range(10):
        val = nonlife_df.iloc[i, 0]
        if isinstance(val, str) and 'Semera' in val:
            branch_cell = val
            break
if branch_cell is None:
    branch_name = 'Semera Branch'
else:
    branch_name = branch_cell.replace('Branch:', '').strip()
    branch_name = ' '.join(branch_name.split())

# =====================================================================
# 3. Find header row and data in NON Life sheet
# =====================================================================
header_row_idx = None
for i in range(20):
    row_str = [str(cell) for cell in nonlife_df.iloc[i, :].values]
    if any('Month/Class' in cell for cell in row_str):
        header_row_idx = i
        break

if header_row_idx is None:
    raise ValueError("Could not find header row in NON Life sheet.")

data_start = header_row_idx + 1
months = nonlife_df.iloc[data_start:data_start+12, 0].values
data_matrix = nonlife_df.iloc[data_start:data_start+12, 1:11].values  # 12x10

cob_names_nonlife = [str(x).strip() for x in nonlife_df.iloc[header_row_idx, 1:11].values]

# =====================================================================
# 4. Find Travellers Insurance column in Life sheet
# =====================================================================
header_row_life = None
for i in range(20):
    row_str = [str(cell) for cell in life_df.iloc[i, :].values]
    if any('Month/Class' in cell for cell in row_str):
        header_row_life = i
        break

if header_row_life is None:
    raise ValueError("Could not find header row in Life sheet.")

travellers_col = None
header_row_life_str = [str(cell) for cell in life_df.iloc[header_row_life, :].values]
for col_idx, col_name in enumerate(header_row_life_str):
    if 'Travellers' in col_name or 'Travel' in col_name:
        travellers_col = col_idx
        break

if travellers_col is None:
    raise ValueError("Travellers Insurance column not found in Life sheet.")

# Extract as Series, convert to numeric, fill NaN with 0
travellers_series = life_df.iloc[header_row_life+1:header_row_life+13, travellers_col]
travellers_data = pd.to_numeric(travellers_series, errors='coerce').fillna(0).values

# =====================================================================
# 5. Build COB mapping and data dictionary
# =====================================================================
cob_mapping = {
    'Fire': 'Fire and Lightening COB',
    'Marine': 'Marine COB',
    'Motor': 'Motor COB',
    'WCGN': 'Workmens Compensation COB',
    'PVT': 'Political Violence and Terrorism',
    'Others': 'Other COBs',
    'GPA': 'Group Personal Accident COB',
    'Liabilities': 'Liability policies',
    'Bond': 'Bond COB',
    'Engineering': 'Engineering COB',
}

target_cobs = [
    'Travel Insurance-COB',
    'Bond COB',
    'Engineering COB',
    'Fire and Lightening COB',
    'Marine COB',
    'Motor COB',
    'Workmens Compensation COB',
    'Other COBs',
    'Political Violence and Terrorism',
    'Liability policies',
    'Group Personal Accident COB',
    'Agricultural and Micro-Insurance'
]

# Initialize data storage
cob_data = {cob: [0.0]*12 for cob in target_cobs}

# Populate from NON Life
for i, cob in enumerate(cob_names_nonlife):
    if cob in cob_mapping:
        target_cob = cob_mapping[cob]
        values = data_matrix[:, i].astype(float)
        cob_data[target_cob] = values.tolist()

# Populate Travel Insurance
if 'Travel Insurance-COB' in cob_data:
    cob_data['Travel Insurance-COB'] = travellers_data.tolist()

# Agricultural remains zero

# =====================================================================
# 6. Build target DataFrame
# =====================================================================
months_target = ['JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
                 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE']

rows = []
for cob in target_cobs:
    row = {
        'BranchName': branch_name,
        'ClassofBusinessName': cob,
        'FinancialPeriod': 'Financial Year 2026/27',
    }
    for i, month in enumerate(months_target):
        val = cob_data[cob][i]
        row[month] = round(val, 2)
    rows.append(row)

df = pd.DataFrame(rows)
col_order = ['BranchName', 'ClassofBusinessName', 'FinancialPeriod'] + months_target
df = df[col_order]
df.insert(0, 'SLNO', range(1, len(df)+1))

# =====================================================================
# 7. Save with number formatting
# =====================================================================
output_file = 'Semera_Upload_Ready.xlsx'
with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
    df.to_excel(writer, index=False, sheet_name='Sheet1')
    workbook = writer.book
    worksheet = writer.sheets['Sheet1']

    month_cols = {}
    for idx, col_name in enumerate(df.columns, 1):
        if col_name in months_target:
            month_cols[col_name] = idx

    for col_name, col_idx in month_cols.items():
        for row in range(2, len(df)+2):
            cell = worksheet.cell(row=row, column=col_idx)
            cell.number_format = '#,##0.00'

# =====================================================================
# 8. Report
# =====================================================================
print("\n" + "="*60)
print("✅ DATA TRANSFORMATION COMPLETE")
print("="*60)
print(f"Branch: {branch_name}")
print(f"Rows created: {len(df)}")
print(f"Output file: {output_file}")
print("\nCOB Order (as per template):")
for i, cob in enumerate(target_cobs, 1):
    print(f"  {i:2}. {cob}")
print("\nAll monetary values formatted with 2 decimal places.")
print("="*60)