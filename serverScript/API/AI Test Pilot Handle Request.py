l_master_data_id = frappe.form_dict.get("i_master_data")
l_test_script = frappe.form_dict.get("i_test_script")
l_test_lab_id = frappe.form_dict.get("i_test_lab")
l_get_test_script = frappe.form_dict.get("i_action")

# Fetch only if master_data is provided
if l_master_data_id:
    l_master_data = frappe.get_list("Master Data", filters={"name": l_master_data_id}, fields=["*"])

# Fetch only if test_script is provided
if l_test_script:
    l_scripts = frappe.get_list("Test Case Configurator", filters={"title": l_test_script}, fields=["*"])

# Always try to fetch test_lab if test_lab is present
if l_test_lab_id:
    l_test_lab = frappe.get_list("Test Lab", filters={"name": l_test_lab_id}, fields=["*"])

# Create Test Run only if test_lab and action are appropriately set
# if l_get_test_script == "create_test_run" and l_test_lab_id:
#     new_doc = frappe.get_doc({
#         "doctype": "Test Run",
#         "test_lab_id": l_test_lab_id
#     })
#     new_doc.insert()
#     frappe.db.commit()
#     test_run_result = f"Test Run created successfully: {new_doc.name}"
#     created_test_run = frappe.get_list("Test Run", filters={"name": new_doc.name}, fields=["*"])

la_test_run_data = []
la_scripts_data = [] 

if l_get_test_script == "get_test_data" and l_test_lab_id:
    # Create new Test Run
    ld_new_doc = frappe.get_doc({"doctype": "Test Run", "test_lab_id": l_test_lab_id })
    ld_new_doc.insert()
    frappe.db.commit()
    # Fetch the created test run document
    ld_test_run_doc = frappe.get_doc("Test Run", {ld_new_doc.name})  # Replace "TR-0006" this with "{ld_new_doc.name}"
    # Loop through test_log and collect relevant entries in a single array
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


output = {
    # "master_data": l_master_data,
    # "test_script": l_scripts,
    # "test_lab": l_test_lab,
    # "test_run": la_test_run_data,
    "scripts_data": la_scripts_data
}

frappe.response['message'] = output

