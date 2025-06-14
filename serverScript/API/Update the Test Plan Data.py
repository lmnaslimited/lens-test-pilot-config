# Get the Task document
l_task_name = frappe.form_dict.get('task_name')

# Get the Child information "Test Plan Reference" from the Task document
la_test_plan_names = frappe.get_all(
    'Test Plan Reference',
    fields=["test_plan"],
    filters={"parent": l_task_name}
)

if la_test_plan_names:
   
    la_test_plan_list = [ld_plan["test_plan"] for ld_plan in la_test_plan_names]
    # Get the child information "Test Plan Scripts" based on the Test Plan 
    # in Task document
    la_test_plan_scripts = frappe.get_all(
        "Test Plan Script",
        fields=["parent", "test_script", "master_data"],
        filters={"parent": ["in", la_test_plan_list]}
    )

    la_data = [{
        "test_plan": ld_script["parent"],
        "task": l_task_name,
        "test_script": ld_script["test_script"],
        "master_data": ld_script["master_data"]
    } for ld_script in la_test_plan_scripts]

    # Set the response message with the final data to 
    # the client sctipt "Get Test Plan for Test Lab"
    frappe.response["message"] = {"data": la_data}
