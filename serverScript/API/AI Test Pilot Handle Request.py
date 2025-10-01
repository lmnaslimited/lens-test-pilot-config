# Get request parameters from form input
l_test_lab_id = frappe.form_dict.get("i_test_lab")
l_action = frappe.form_dict.get("i_action")

# Initialize response dictionary
ld_response = {}

# Action: Fetch or create Test Run and Master Data
if l_action == "get_test_data" and l_test_lab_id:
    # Check for existing active Test Run
    la_active_runs = frappe.get_list(
        "Test Run",
        filters={"test_lab": l_test_lab_id, "is_active_run": 1},
        fields=["name"],
        limit=1
    )
    if la_active_runs:
        l_test_run_id = la_active_runs[0].name
    else:
        ld_test_run_doc = frappe.get_doc({
            "doctype": "Test Run",
            "test_lab": l_test_lab_id
        })
        ld_test_run_doc.insert()
        frappe.db.commit()
        l_test_run_id = ld_test_run_doc.name

    ld_test_run = frappe.get_doc("Test Run", l_test_run_id)
    ld_test_lab = frappe.get_doc("Test Lab", l_test_lab_id)

    # Build master_data_map from test_run.test_log
    ld_master_map = {}
    for ld_log in ld_test_run.get("test_log", []):
        if ld_log.master_data:
            ld_master_doc = frappe.get_doc("Master Data", ld_log.master_data)
            ld_master_map[ld_log.master_data] = ld_master_doc.as_dict()

    la_script_rows = ld_test_lab.get("test_lab_script", [])
    la_final_master = []

    # Initialize login map
    ld_login_map = {}
    l_current_group_key = None

    for ld_row in la_script_rows:
        l_master_id = ld_row.master_data
        if not l_master_id or l_master_id not in ld_master_map:
            continue

        ld_curr_doc = ld_master_map[l_master_id]
        la_curr_data = ld_curr_doc.get("actual_test_data", [])

        # Decrypt password for this row
        l_decrypted_password = ld_row.get_password("login_password")
        l_email = ld_row.login_username

        if not ld_row.is_connection:
            # Single master data
            la_final_master.append(ld_curr_doc)
            ld_login_map[l_master_id] = {"email": l_email, "password": l_decrypted_password}
            l_current_group_key = None  # Reset group key
        else:
            # Connection group
            if not la_final_master or not la_final_master[-1].get("is_connection_group"):
                # Start new connection group
                ld_new_group = ld_curr_doc.copy()
                ld_new_group["is_connection_group"] = True
                la_final_master.append(ld_new_group)

                # Initialize group key and login map
                l_current_group_key = ld_curr_doc["name"]
                ld_login_map[l_current_group_key] = {"email": l_email, "password": l_decrypted_password}
            else:
                # Extend previous connection group
                ld_prev_group = la_final_master[-1]
                la_prev_data = ld_prev_group.get("actual_test_data", [])
                l_last_pos = max((item.get("pos", 0) for item in la_prev_data), default=0)

                la_updated_data = []
                for ld_item in la_curr_data:
                    l_pos = ld_item.get("pos", 0)
                    ld_item["pos"] = l_last_pos + l_pos
                    la_updated_data.append(ld_item)

                la_prev_data.extend(la_updated_data)
                ld_prev_group["actual_test_data"] = la_prev_data
                ld_prev_group["name"] = f"{ld_prev_group['name']}&{ld_curr_doc['name']}"

                # Update login map key for combined group
                l_new_group_key = f"{l_current_group_key}&{ld_curr_doc['name']}"
                ld_login_map[l_new_group_key] = ld_login_map.pop(l_current_group_key)
                l_current_group_key = l_new_group_key

    # Remove helper flag
    for ld_doc in la_final_master:
        ld_doc.pop("is_connection_group", None)

    # Prepare response
    ld_response = {
        "test_run": ld_test_run.as_dict(),
        "master_data": la_final_master,
        "login_data": ld_login_map
    }

    # If any master data is stale
    if any(ld_doc.get("status") == "Stale" for ld_doc in la_final_master):
        ld_response["master_data"] = {"status": "Stale Master Data"}

# Action: Fetch Test Lab document
elif l_action == "get_test_lab" and l_test_lab_id:
    ld_test_lab = frappe.get_doc("Test Lab", l_test_lab_id)
    ld_response = {"test_lab": ld_test_lab.as_dict()}

# Send response
frappe.response["message"] = ld_response