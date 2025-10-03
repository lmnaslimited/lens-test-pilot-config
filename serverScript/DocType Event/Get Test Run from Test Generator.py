if doc.test_lab and not doc.test_log:
    # Get the Test Lab document with child information
    ld_test_lab = frappe.get_doc("Test Lab", doc.test_lab)
    for ld_lab_script in ld_test_lab.test_lab_script:
        # Appending the Test lab child information to the test log child table in Test Run
        doc.append("test_log", {
            "test_plan": ld_lab_script.test_plan,
            "test_script": ld_lab_script.test_script,
            "master_data": ld_lab_script.master_data,
            "connection": ld_lab_script.connection,
            "connection_doctype": ld_lab_script.connection_doctype,
            "linked_document": ld_lab_script.linked_document,
            "connection_from": ld_lab_script.connection_from,
            "login_username": ld_lab_script.login_username,
            "login_password": ld_lab_script.login_password
        })
    doc.save()