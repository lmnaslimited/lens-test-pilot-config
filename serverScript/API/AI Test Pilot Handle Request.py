# Get request parameters from form input
test_lab_id = frappe.form_dict.get("i_test_lab")
action = frappe.form_dict.get("i_action")

# Initialize response
response_data = {}

# Action: Fetch or create Test Run and Master Data
if action == "get_test_data" and test_lab_id:
    # Check for existing active Test Run
    active_runs = frappe.get_list(
        "Test Run",
        filters={"test_lab": test_lab_id, "is_active_run": 1},
        fields=["name"],
        limit=1
    )
    if active_runs:
        test_run_name = active_runs[0].name
    else:
        test_run_doc = frappe.get_doc({
            "doctype": "Test Run",
            "test_lab": test_lab_id
        })
        test_run_doc.insert()
        frappe.db.commit()
        test_run_name = test_run_doc.name

    test_run = frappe.get_doc("Test Run", test_run_name)
    test_lab = frappe.get_doc("Test Lab", test_lab_id)

    # Build master_data_map from test_run.test_log
    master_data_map = {}
    for log in test_run.get("test_log", []):
        if log.master_data:
            doc = frappe.get_doc("Master Data", log.master_data)
            master_data_map[log.master_data] = doc.as_dict()

    ordered_rows = test_lab.get("test_lab_script", [])
    merged_data = []

    for row in ordered_rows:
        if not row.master_data or row.master_data not in master_data_map:
            continue

        current_doc = master_data_map[row.master_data]
        current_data = current_doc.get("actual_test_data", [])

        if not row.is_connection:
            # Non-connection: add directly
            merged_data.append(current_doc)
        else:
            if merged_data and merged_data[-1].get("is_connection_group"):
                # Merge with previous connection group
                prev_doc = merged_data[-1]
                prev_data = prev_doc["actual_test_data"]
                last_pos = max((item.get("pos", 0) for item in prev_data), default=0)
                offset = last_pos + 10
                for i, item in enumerate(current_data):
                    item["pos"] = offset + i * 10
                prev_data.extend(current_data)
                prev_doc["actual_test_data"] = prev_data
                prev_doc["name"] = prev_doc["name"] + f"${current_doc['name']}"
            else:
                # Start a new connection group
                for i, item in enumerate(current_data):
                    item["pos"] = i * 10
                new_doc = current_doc.copy()
                new_doc["is_connection_group"] = True  # Helper flag
                merged_data.append(new_doc)

    # Remove helper flags if needed
    for doc in merged_data:
        doc.pop("is_connection_group", None)

    # Build response
    response_data = {
        "test_run": test_run.as_dict(),
        "master_data": merged_data
    }

    # If any master data has status = "Stale"
    if any(doc.get("status") == "Stale" for doc in merged_data):
        response_data["master_data"] = {"status": "Stale Master Data"}

# Action: Fetch Test Lab document with child table
elif action == "get_test_lab" and test_lab_id:
    test_lab = frappe.get_doc("Test Lab", test_lab_id)
    response_data = {"test_lab": test_lab.as_dict()}

# Send response
frappe.response['message'] = response_data
