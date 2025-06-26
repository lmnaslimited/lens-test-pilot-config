frappe.ui.form.on('Test Run', {
    is_active: function(frm) {
        if (frm.doc.is_active && frm.doc.test_lab) {
            frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Test Run',
                    filters: [
                        ['test_lab', '=', frm.doc.test_lab],
                        ['is_active', '=', 1],
                        ['name', '!=', frm.doc.name]  // exclude current doc
                    ],
                    fields: ['name']
                },
                callback: function(response) {
                    if (response.message && response.message.length > 0) {
                        const conflicting_doc = response.message[0].name;
                        const test_lab_id = frm.doc.test_lab;
                        frappe.msgprint(
                            `For this <b>${test_lab_id}</b>, the Test Run <b>${conflicting_doc}</b> is already active.`
                        );
                        frm.set_value('is_active', 0);
                    }
                }
            });
        }
    }
});
