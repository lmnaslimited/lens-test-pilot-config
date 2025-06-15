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
    l_scripts = frappe.get_list("Test Case Configurator", filters={"title": l_test_script}, fields=["*"])

# Always fetch test lab data if provided
if l_test_lab_id:
    l_test_lab = frappe.get_list("Test Lab", filters={"name": l_test_lab_id}, fields=["*"])


# Initialize data 
la_test_run_data = []
la_scripts_data = [] 

# Create and fetch Test Run document if action is 'get_test_data' and test_lab_id is provided
if l_get_test_script == "get_test_data" and l_test_lab_id:
    
    # Create a new Test Run document with the given test_lab
    ld_new_doc = frappe.get_doc({"doctype": "Test Run", "test_lab": l_test_lab_id })
    ld_new_doc.insert()
    frappe.db.commit()
    
    # Fetch the newly created Test Run document using its name
    ld_test_run_doc = frappe.get_doc("Test Run", ld_new_doc.name)
    
    # For each collected test_script, fetch the corresponding Test Case Configurator document
    for log in ld_test_run_doc.get("test_log", []):
        if log.test_script:
         la_test_run_data.append(log.test_script)
    for title in la_test_run_data:
        matching_docs = frappe.get_list(
            "Test Case Configurator",
            filters={"title": title},
            fields=["name"]
        )
        if matching_docs:
            doc_name = matching_docs[0].name
            doc = frappe.get_doc("Test Case Configurator", doc_name)
            la_scripts_data.append(doc.as_dict())

# Return the collected script data as response
output = {
    "scripts_data": la_scripts_data
}

frappe.response['message'] = output