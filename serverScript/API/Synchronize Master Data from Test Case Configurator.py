# Get the configurator ID from request
l_testdata_id = frappe.form_dict.get("i_testdata_id")
if not l_testdata_id:
    frappe.throw("Configurator ID is required")

# Get configurator doc and test fields
ld_configurator = frappe.get_doc("Test Case Configurator", l_testdata_id)
la_incoming_rows = ld_configurator.test_fields or []

# Build incoming lookup ONCE
ld_incoming_lookup = {
    f"{ld_row.action}|{ld_row.field_name}": ld_row
    for ld_row in la_incoming_rows
}

# Get all stale Master Data linked to this configurator
la_stale_master_data = frappe.get_all(
    "Master Data",
    filters={
        "test_script": l_testdata_id,
        "status": "Stale"
    },
    fields=["name"]
)

for ld_master_data in la_stale_master_data:
    ld_master = frappe.get_doc("Master Data", ld_master_data)

    # Lookup existing rows by action|field_name key
    ld_existing_lookup = {
        f"{ld_row.action}|{ld_row.field_name}": ld_row
        for ld_row in ld_master.actual_test_data
    }

    la_updated_rows = []

    for l_key, ld_incoming_row in ld_incoming_lookup.items():
        ld_existing_row = ld_existing_lookup.get(l_key)

        if ld_existing_row:
            # Update existing rows if value has changed
            if ld_existing_row.value != ld_incoming_row.value:
                ld_existing_row.value = ld_incoming_row.value
                ld_existing_row.change_identifier = "Update"

            la_updated_rows.append(ld_existing_row)

        else:
            # Append new rows that don't exist yet
            la_updated_rows.append(ld_master.append("actual_test_data", {
                "pos": ld_incoming_row.pos,
                "action": ld_incoming_row.action,
                "field_name": ld_incoming_row.field_name,
                "value": ld_incoming_row.value,
                "change_identifier": "Insert"
            }))

    # Replace child table once (no repeated mutation)
    ld_master.actual_test_data = la_updated_rows

    # Sort rows by pos and update idx for correct UI display order
    ld_master.actual_test_data.sort(key=lambda ld_row: ld_row.pos or 0)
    for l_idx, ld_row in enumerate(ld_master.actual_test_data):
        ld_row.idx = l_idx

    ld_master.save()

frappe.response["message"] = "Master Data synced successfully"
