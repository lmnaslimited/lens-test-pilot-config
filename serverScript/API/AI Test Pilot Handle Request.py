# Get request parameters from form input
l_master_data_id = frappe.form_dict.get("i_master_data")
l_test_script = frappe.form_dict.get("i_test_script")
l_test_lab_id = frappe.form_dict.get("i_test_lab")
l_get_test_script = frappe.form_dict.get("i_action")

# Fetch only if master_data is provided
if l_master_data_id:
    l_master_data = frappe.get_list("Master Data", filters={"name": l_master_data_id}, fields=["*"])

# Fetch test script data if provided
if l_test_script:
    l_scripts = frappe.get_list("Test Case Configurator", filters={"name": l_test_script}, fields=["*"])

# Always fetch test lab data if provided
if l_test_lab_id:
    l_test_lab = frappe.get_list("Test Lab", filters={"name": l_test_lab_id}, fields=["*"])

# Initialize data containers
la_scripts_data = []

# Create or reuse Test Run if action is 'get_test_data' and test_lab_id is provided
if l_get_test_script == "get_test_data" and l_test_lab_id:

    # Check for an existing active Test Run (now using active_run)
    existing_active_runs = frappe.get_list(
        "Test Run",
        filters={
            "test_lab": l_test_lab_id,
            "is_active_run": 1
        },
        fields=["name"],
        limit=1
    )

    if existing_active_runs:
        # Reuse the existing active Test Run
        test_run_name = existing_active_runs[0].name
    else:
        # No active run found, create a new Test Run
        ld_new_doc = frappe.get_doc({"doctype": "Test Run", "test_lab": l_test_lab_id})
        ld_new_doc.insert()
        frappe.db.commit()
        test_run_name = ld_new_doc.name

    # Fetch the Test Run document (existing or newly created)
    ld_test_run_doc = frappe.get_doc("Test Run", test_run_name)

    # Loop through test_log entries and collect Master Data
    for log in ld_test_run_doc.get("test_log", []):
        if log.test_script and log.master_data:
            master_data_name = log.master_data  # This is expected to be the name of a Master Data document

            try:
                master_data_doc = frappe.get_doc("Master Data", master_data_name)
                la_scripts_data.append(master_data_doc.as_dict())
            except frappe.DoesNotExistError:
                frappe.log_error(f"Master Data '{master_data_name}' not found.", "Data Fetch Error")

# Return the collected master data as response
output = {
    "test_run": ld_test_run_doc,
    "master_data": la_scripts_data
}

frappe.response['message'] = output
