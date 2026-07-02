import requests
import json
from datetime import datetime

payload = {
    "sk_id_curr": 100002,
    "requested_at": datetime.now().isoformat(),
    "raw_fields": {
        "thin_file": False,
        "age_years": 45.5,
        "income_total": 60000.0,
        "credit_amount": 150000.0,
        "dti_ratio": 0.35,
        "credit_to_income_ratio": 2.5,
        "days_employed_anomaly": False,
        "bureau": {
            "active_credits": 2,
            "closed_credits": 3,
            "total_debt": 5000.0,
            "overdue_debt": 0.0,
            "max_dpd": 0
        },
        "prior_applications": {
            "prior_app_count": 2,
            "approval_rate": 1.0,
            "refusal_rate": 0.0,
            "avg_requested_amt": 50000.0,
            "avg_granted_amt": 50000.0
        },
        "ext_source_scores": [0.65, 0.70, 0.62],
        "gender": "F",
        "age_group": "40-49"
    }
}

import time

for i in range(15):
    try:
        response = requests.post("http://localhost:8000/assess", json=payload)
        if response.status_code == 200:
            print(json.dumps(response.json(), indent=2))
            break
        else:
            print(f"Failed with status: {response.status_code}")
            print(response.text)
            break
    except Exception as e:
        print(f"Error connecting, retrying {i+1}/15...")
        time.sleep(5)
