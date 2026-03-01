import csv
import json

data = []
csv_path = 'h:/Analysis/Muslim Population Analysis/Muslim Population by Unique Ethnicity_Full Data_data.csv'
json_path = 'h:/Analysis/Muslim Population Analysis/insight-dashboard/src/data.json'

with open(csv_path, mode='r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row.get('Ethnicity'):
            data.append({
                'ethnicity': row['Ethnicity'],
                'languages': row['Primary Language(s)'],
                'regions': row['Primary Regions/Countries'],
                'relation': row['Regional Relation'],
                'population': float(row['Muslim Population (Million)'])
            })

with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print(f"Converted {len(data)} records to JSON.")
