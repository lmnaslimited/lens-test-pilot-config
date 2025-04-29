frappe.ui.form.on('Test Lab', {
    refresh(frm) {
        frm.clear_custom_buttons();

        if (frm.doc.task_id || frm.doc.test_plan_id) {
            frm.add_custom_button('Get Test Plans', function () {
                const existing_scripts = new Set(
                    (frm.doc.test_plan_and_script || []).map(row => row.test_script)
                );

                if (frm.doc.task_id) {
                    frappe.call({
                        method: 'get_test_plan',
                        args: { task_name: frm.doc.task_id },
                        callback: function (r) {
                            if (r.message && r.message.data) {
                                r.message.data.forEach(item => {
                                    if (!existing_scripts.has(item.test_script)) {
                                        let row = frm.add_child('test_plan_and_script');
                                        row.test_plan = item.test_plan;
                                        row.test_script = item.test_script;
                                        row.master_data = item.master_data;  // Adding master_data to the row
                                        existing_scripts.add(item.test_script);
                                    }
                                });
                                frm.refresh_field('test_plan_and_script');
                                frappe.msgprint('Test Plans and Scripts added from Task.');
                            } else {
                                frappe.msgprint('No Test Plans found for this Task.');
                            }
                        }
                    });
                } else if (frm.doc.test_plan_id) {
                    frappe.call({
                        method: 'frappe.client.get',
                        args: {
                            doctype: 'Test Plan',
                            name: frm.doc.test_plan_id
                        },
                        callback: function (r) {
                            if (r.message && r.message.test_script) {
                                r.message.test_script.forEach(script_row => {
                                    if (!existing_scripts.has(script_row.test_script)) {
                                        let row = frm.add_child('test_plan_and_script');
                                        row.test_plan = frm.doc.test_plan_id;
                                        row.test_script = script_row.test_script;
                                        row.master_data = script_row.master_data;  // Adding master_data to the row
                                        existing_scripts.add(script_row.test_script);
                                    }
                                });
                                frm.refresh_field('test_plan_and_script');
                                frappe.msgprint('Test Scripts added from Test Plan.');
                            } else {
                                frappe.msgprint('No scripts found for the selected Test Plan.');
                            }
                        }
                    });
                }
            });
        }
    },

    task_id(frm) {
        frm.trigger('refresh');
    },

    test_plan_id(frm) {
        frm.trigger('refresh');
    }
});
