if doc.test_lab:
    l_fail_count = 0
    l_not_started = True
    # Get the child table from the test log to retrieve the results.
    # If any result is 'Fail', update the status in the Test Lab to 'Failed'.
    # Only if all results are 'Passed', set the status to 'Passed'.
    for ld_entry in doc.test_log:
        if ld_entry.result == "Fail":
            l_fail_count = l_fail_count + 1
        if ld_entry.result not in ["", None]:
            l_not_started = False

    # Get the status field from the Test Lab document
    l_current_status = frappe.db.get_value("Test Lab", doc.test_lab, "status")

    if l_not_started:
        l_new_status = "Not Started"
    else:
        l_new_status = "Passed" if l_fail_count == 0 else "Failed"

    # Update the status in the Test Lab document based on the results.
    if l_current_status != l_new_status:
        ld_lab_doc = frappe.get_doc("Test Lab", doc.test_lab)
        ld_lab_doc.status = l_new_status
        ld_lab_doc.save()