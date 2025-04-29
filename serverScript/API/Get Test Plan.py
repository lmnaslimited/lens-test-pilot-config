# task_name = frappe.form_dict.get("task_name")

# if not task_name:
#     frappe.msgprint("Task name is required")

# result = []

# # Fetch the Task document
# task_doc = frappe.get_doc("Task", task_name).as_dict()

# # Loop through the custom_test_plan_reference child table
# for row in task_doc.custom_test_plan_reference:
#     # Fetch the related Test Plan document
#     test_plan_doc = frappe.get_doc("Test Plan", row.test_plan).as_dict()

#     # Loop through the test_script child table of the Test Plan
#     for script_row in test_plan_doc.test_script:
#         result.append({
#             "test_plan": test_plan_doc.name,  # Test Plan name or ID
#             "test_script": script_row.test_script  # Assuming 'script' is the field containing the script data
#         })

# # Return the result as a response
# frappe.response["message"] = {"data": result}


task_name = frappe.form_dict.get("task_name")

if not task_name:
    frappe.msgprint("Task name is required")

result = []

# Fetch the Task document
task_doc = frappe.get_doc("Task", task_name).as_dict()

# Loop through the custom_test_plan_reference child table
for row in task_doc.custom_test_plan_reference:
    # Fetch the related Test Plan document
    test_plan_doc = frappe.get_doc("Test Plan", row.test_plan).as_dict()

    # Loop through the test_script child table of the Test Plan
    for script_row in test_plan_doc.test_script:
        result.append({
            "test_plan": test_plan_doc.name,  # Test Plan name or ID
            "test_script": script_row.test_script,  # Assuming 'test_script' is the field containing the script data
            "master_data": script_row.master_data  # Fetching the 'master_data' field from the test_script row
        })

# Return the result as a response
frappe.response["message"] = {"data": result}
