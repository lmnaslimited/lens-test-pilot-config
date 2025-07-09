# Get request parameters from form input
l_master_data_id = frappe.form_dict.get("i_master_data")
l_test_script = frappe.form_dict.get("i_test_script")
l_test_lab_id = frappe.form_dict.get("i_test_lab")
l_get_test_script = frappe.form_dict.get("i_action")

# Optional: Fetch specific Master Data if provided
if l_master_data_id:
    l_master_data = frappe.get_list(
        "Master Data",
        filters={"name": l_master_data_id},
        fields=["*"]
    )

# Optional: Fetch specific Test Script if provided
if l_test_script:
    l_scripts = frappe.get_list(
        "Test Case Configurator",
        filters={"name": l_test_script},
        fields=["*"]
    )

# Initialize output dictionary
output = {}

# Action: get_test_data → Fetch or create Test Run and collect Master Data
if l_get_test_script == "get_test_data" and l_test_lab_id:
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
        test_run_name = existing_active_runs[0].name
    else:
        # Create a new Test Run if no active one exists
        ld_new_doc = frappe.get_doc({
            "doctype": "Test Run",
            "test_lab": l_test_lab_id
        })
        ld_new_doc.insert()
        frappe.db.commit()
        test_run_name = ld_new_doc.name

    # Fetch the Test Run document
    ld_test_run_doc = frappe.get_doc("Test Run", test_run_name)

    # Collect related Master Data from the Test Run's test_log child table
    la_scripts_data = []
    for log in ld_test_run_doc.get("test_log", []):
        if log.test_script and log.master_data:
            master_data_doc = frappe.get_doc("Master Data", log.master_data)
            la_scripts_data.append(master_data_doc.as_dict())

    # Set output for get_test_data
    output = {
        "test_run": ld_test_run_doc.as_dict(),
        "master_data": la_scripts_data
    }

# Action: get_test_lab → Fetch full Test Lab including child table `test_lab_script`
elif l_get_test_script == "get_test_lab" and l_test_lab_id:
    test_lab_doc = frappe.get_doc("Test Lab", l_test_lab_id)
    output = {
        "test_lab": test_lab_doc.as_dict()
    }

# Return the appropriate output
frappe.response['message'] = output
