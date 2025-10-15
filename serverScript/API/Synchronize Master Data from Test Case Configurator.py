# Get the configurator ID from request
l_testdata_id = frappe.form_dict.get("i_testdata_id")
if not l_testdata_id:
    frappe.throw("Configurator ID is required")

# Get configurator doc and test fields
ld_configurator = frappe.get_doc("Test Case Configurator", l_testdata_id)
la_test_fields = ld_configurator.test_fields or []

# Get all stale Master Data linked to this configurator
la_stale_master_data = frappe.get_all(
    "Master Data",
    filters={"test_script": l_testdata_id, "status": "Stale"},
    fields=["name"]
)

for ld_master_data_info in la_stale_master_data:
    ld_master = frappe.get_doc("Master Data", ld_master_data_info.name)

    # Lookup existing and incoming rows by action|field_name key
    ld_existing_rows_lookup = {
        f"{ld_row.action}|{ld_row.field_name}": ld_row
        for ld_row in ld_master.actual_test_data
    }
    ld_incoming_rows_lookup = {
        f"{ld_row.action}|{ld_row.field_name}": ld_row
        for ld_row in la_test_fields
    }

    # Update existing rows if value has changed
    for l_key in ld_existing_rows_lookup:
        if l_key in ld_incoming_rows_lookup:
            ld_existing_row = ld_existing_rows_lookup[l_key]
            ld_incoming_row = ld_incoming_rows_lookup[l_key]

            if ld_existing_row.value != ld_incoming_row.value:
                ld_existing_row.value = ld_incoming_row.value
                ld_existing_row.change_identifier = "Update"

    # Remove rows not present in incoming
    ld_master.actual_test_data = [
        ld_row for l_key, ld_row in ld_existing_rows_lookup.items()
        if l_key in ld_incoming_rows_lookup
    ]

    # Append new rows that don't exist yet
    for l_key, ld_incoming_row in ld_incoming_rows_lookup.items():
        if l_key not in ld_existing_rows_lookup:
            ld_master.append("actual_test_data", {
                "pos": ld_incoming_row.pos,
                "action": ld_incoming_row.action,
                "field_name": ld_incoming_row.field_name,
                "value": ld_incoming_row.value,
                "change_identifier": "Insert"
            })

    # Sort rows by pos and update idx for correct UI display order
    ld_master.actual_test_data.sort(key=lambda ld_row: ld_row.pos or 0)
    for l_idx, ld_row in enumerate(ld_master.actual_test_data):
        ld_row.idx = l_idx

    ld_master.save()

frappe.response["message"] = "Master Data synced successfully"
