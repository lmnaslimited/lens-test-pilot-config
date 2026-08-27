if doc.test_lab and not doc.test_log:
    # Get the Test Lab document with child information
    ld_test_lab = frappe.get_doc("Test Lab", doc.test_lab)
    for ld_lab_script in ld_test_lab.test_lab_script:
        # Appending the Test lab child information to the test log child table in Test Run
        doc.append("test_log", {
            "task_id": ld_lab_script.task_id,
            "test_plan": ld_lab_script.test_plan,
            "test_script": ld_lab_script.test_script,
            "master_data": ld_lab_script.master_data,
            "connection": ld_lab_script.connection,
            "connection_doctype": ld_lab_script.connection_doctype,
            "linked_document": ld_lab_script.linked_document,
            "connection_from": ld_lab_script.connection_from,
            "use_docname": ld_lab_script.use_docname,
            "store_docname": ld_lab_script.store_docname,
            "is_connection": ld_lab_script.is_connection,
            "identity_provider": ld_lab_script.identity_provider
        })
    doc.save()