if doc.test_lab:
    l_fail_count = 0
    for l_entry in doc.test_log:
        if l_entry.result == "Fail":
            l_fail_count = l_fail_count + 1

    # Retrieve the current status of the linked Test Lab
    l_current_status = frappe.db.get_value("Test Lab", doc.test_lab, "status")
    # Set the Status "Passed" when the all test log result is passed
    # Otherwise set as failed
    l_new_status = "Passed" if l_fail_count == 0 else "Failed"
    
    if l_current_status != l_new_status:
        ld_lab_doc = frappe.get_doc("Test Lab", doc.test_lab)
        ld_lab_doc.status = l_new_status
        ld_lab_doc.save()
        
 
