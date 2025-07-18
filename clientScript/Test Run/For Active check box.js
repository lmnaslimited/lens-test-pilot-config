frappe.ui.form.on('Test Run', {
    // Triggered when the 'is_active_run' field is changed
    is_active_run: function(frm) {
        // Proceed only if the checkbox is selected and test_lab is set
        if (frm.doc.is_active_run && frm.doc.test_lab) {

            // Make a server call to check if any other active Test Run exists for the same test_lab
            frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Test Run',
                    filters: [
                        ['test_lab', '=', frm.doc.test_lab],         // Same test_lab
                        ['is_active_run', '=', 1],                   // Already marked as active
                        ['name', '!=', frm.doc.name]                 // Exclude current record
                    ],
                    fields: ['name'] // Only need the document name
                },
                callback: function(ldResponse) {
                    // If another active Test Run exists for this test_lab
                    if (ldResponse.message && ldResponse.message.length > 0) {
                        const lConflictingRun = ldResponse.message[0].name;
                        const lTestLabId = frm.doc.test_lab;

                        // Show warning and unset the current checkbox
                        frappe.msgprint(
                            `For this <b>${lTestLabId}</b>, the Test Run <b>${lConflictingRun}</b> is already active.`
                        );
                        frm.set_value('is_active_run', 0);
                    }
                }
            });
        }
    }
});
