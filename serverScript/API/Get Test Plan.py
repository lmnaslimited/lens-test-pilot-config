# Get the task name from the request
l_task_name = frappe.form_dict.get("task_name")

# Validate task_name
if not l_task_name:
    frappe.msgprint("Task name is required")
   
# To fetch test plans for the single task
ld_test_plan = frappe.get_all(
    'Task',
    fields=["name", "`tabTest Plan Reference`.test_plan"],
    filters={"name": ["in", [l_task_name]]},
    order_by="`tabTask`.creation desc" 
)

# Return the test plans
frappe.response["message"] = {"data": ld_test_plan}
