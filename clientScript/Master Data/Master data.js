frappe.ui.form.on('Master Data', {
    onload: function(frm) {
        if (frm.is_new() && frm.doc.test_script) {
            frappe.db.get_doc('Test Case Configurator', frm.doc.test_script)
                .then(ldSource => {
                    //  Copy 'action' field
                    if (ldSource.action) {
                        frm.set_value('action', ldSource.action);
                    }

                    //  Copy 'document' field
                    if (ldSource.document) {
                        frm.set_value('document', ldSource.document);
                    }

                    //  Copy child table: test_fields → test_filed
                    if (ldSource.test_fields && ldSource.test_fields.length > 0) {
                        frm.clear_table('actual_test_data');

                        ldSource.test_fields.forEach(row => {
                            let new_row = frm.add_child('actual_test_data');
                            new_row.pos = row.pos;
                            new_row.is_child = row.is_child;
                            new_row.child_name = row.child_name;
                            new_row.child_index = row.child_index;
                            new_row.field_name = row.field_name;
                            new_row.value = row.value;
                            new_row.message_type = row.message_type;
                            new_row.tab = row.tab;
                            new_row.status = row.status;
                            new_row.menus = row.menus;
                            new_row.data_type = row.data_type;
                            new_row.action = row.action;
                            new_row.message = row.message;
                            new_row.section = row.section;
                            new_row.description = row.description;
                            new_row.is_read_only = row.is_read_only;
                            new_row.is_mandatory = row.is_mandatory;
                            new_row.is_hidden = row.is_hidden;
                        });

                        frm.refresh_field('actual_test_data');
                    }
                });
        }
    }
});