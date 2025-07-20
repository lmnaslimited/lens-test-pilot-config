# Get request parameters from form input
l_master_data_id = frappe.form_dict.get("i_master_data")
l_test_script = frappe.form_dict.get("i_test_script")
l_test_lab_id = frappe.form_dict.get("i_test_lab")
l_action = frappe.form_dict.get("i_action")

#  Fetch specific Master Data if provided
if l_master_data_id:
    la_master_data = frappe.get_list(
        "Master Data",
        filters={"name": l_master_data_id},
        fields=["*"]
    )

#  Fetch specific Test Script if provided
if l_test_script:
    la_scripts = frappe.get_list(
        "Test Case Configurator",
        filters={"name": l_test_script},
        fields=["*"]
    )

# Initialize output dictionary
ld_output = {}

# Action: get_test_data → Fetch or create Test Run and collect Master Data
if l_action == "get_test_data" and l_test_lab_id:
    la_existing_active_runs = frappe.get_list(
        "Test Run",
        filters={
            "test_lab": l_test_lab_id,
            "is_active_run": 1
        },
        fields=["name"],
        limit=1
    )

    if la_existing_active_runs:
        l_test_run_name = la_existing_active_runs[0].name
    else:
        ld_new_test_run = frappe.get_doc({
            "doctype": "Test Run",
            "test_lab": l_test_lab_id
        })
        ld_new_test_run.insert()
        frappe.db.commit()
        l_test_run_name = ld_new_test_run.name

    ld_test_run_doc = frappe.get_doc("Test Run", l_test_run_name)

    la_scripts_data = []
    for l_log in ld_test_run_doc.get("test_log", []):
        if l_log.test_script and l_log.master_data:
            ld_master_data_doc = frappe.get_doc("Master Data", l_log.master_data)
            la_scripts_data.append(ld_master_data_doc.as_dict())

    ld_output = {
        "test_run": ld_test_run_doc.as_dict(),
        "master_data": la_scripts_data
    }

# Action: get_test_lab → Fetch full Test Lab including child table `test_lab_script`
elif l_action == "get_test_lab" and l_test_lab_id:
    ld_test_lab_doc = frappe.get_doc("Test Lab", l_test_lab_id)
    ld_output = {
        "test_lab": ld_test_lab_doc.as_dict()
    }

# Return the appropriate output
frappe.response['message'] = ld_output
