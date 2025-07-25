# If the Test Case Configurator is being updated (not newly created)
if not doc.is_new():
    # Fetch all Master Data records linked to this Test Case Configurator
    ld_master_data_list = frappe.get_list("Master Data",
        filters={"test_script": doc.name},
        fields=["name"]
    )
    # Mark each linked Master Data record as 'Stale'
    for ld_record in ld_master_data_list:
        master_doc = frappe.get_doc("Master Data", ld_record.name)
        master_doc.status = "Stale"
        master_doc.save()  