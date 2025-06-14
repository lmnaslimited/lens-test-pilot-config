if doc.test_lab and not doc.test_log:
    # Get the Test Lab document with child information
    ld_test_lab = frappe.get_doc("Test Lab", doc.test_lab)
    for ld_lab_script in ld_test_lab.test_lab_script:
        # Appending the Test lab child information to the test log child table in Test Run
        doc.append("test_log", {
            "test_plan": ld_lab_script.test_plan,
            "test_script": ld_lab_script.test_script,
            "master_data": ld_lab_script.master_data
        })
    doc.save()