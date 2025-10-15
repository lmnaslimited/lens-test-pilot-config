frappe.ui.form.on('Test Case Configurator', {
    refresh(frm) {
        if (!frm.doc.test_fields) return;

        // Check if any Stale Master Data exists
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Master Data",
                filters: {
                    "test_script": frm.doc.name,
                    "status": "Stale"
                },
                fields: ["name"],
                limit: 10
            },
            callback: function(idResponse) {
                
                if (idResponse.message && idResponse.message.length > 0) {
                    // Show Sync button if stale found
                    frm.add_custom_button(__('Sync Master Data'), function() {
                        frappe.call({
                            method: "sync_with_test_script",
                            args: {
                                i_testdata_id: frm.doc.name
                            },
                            callback: function(idSyncResponse) {
                                if (idSyncResponse.message) {
                                    frappe.msgprint(idSyncResponse.message);
                                    frm.reload_doc(); // Refresh form after sync
                                }
                            }
                        });
                    });
                } else {
                    // Hide button if nothing stale
                    frm.remove_custom_button(__('Sync Master Data'));
                }
            }
        });
    }
});