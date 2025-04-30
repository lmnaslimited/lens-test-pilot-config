frappe.ui.form.on('Test Lab', {
    refresh(frm) {
        frm.clear_custom_buttons();
        
       

        frm.add_custom_button('Get Test Plans', async function () {
            // Clear existing entries
            frm.clear_table('test_plan_and_script');
            await frm.save();  // Save to avoid duplicate rows issue during re-render

            let items = frm.doc.test_lab_items || [];
            console.log("List of Items", items)
            for (let item of items) {
                console.log("test", item.reference_document)
                console.log("test", item.reference_name)
                if (item.reference_document_type === "Task" && item.reference_name) {
                    await frappe.call({
                        method: 'get_test_plan',
                        args: { task_name: item.reference_name },
                        callback: function (r) {
                            console.log("Response", r.message)
                            if (r.message && r.message.data) {
                                r.message.data.forEach(entry => {
                                    let row = frm.add_child('test_plan_and_script');
                                    row.task = item.reference_name;
                                    row.test_plan = entry.test_plan;
                                    row.test_script = entry.test_script;
                                    row.master_data = entry.master_data;
                                });
                            }
                        }
                    });
                } else if (item.reference_document_type === "Test Plan" && item.reference_name) {
                    await frappe.call({
                        method: 'frappe.client.get',
                        args: {
                            doctype: 'Test Plan',
                            name: item.reference_name
                        },
                        callback: function (r) {
                            if (r.message && r.message.test_script) {
                                r.message.test_script.forEach(script => {
                                    let row = frm.add_child('test_plan_and_script');
                                    row.test_plan = item.reference_name;
                                    row.test_script = script.test_script;
                                    row.master_data = script.master_data;
                                });
                            }
                        }
                    });
                }
            }

            frm.refresh_field('test_plan_and_script');
            frappe.msgprint('Test Plans and Scripts added.');
        });
       
    }
});
