frappe.ui.form.on('Task', {
    refresh(frm) {
        frm.clear_custom_buttons();

        const has_references = frm.doc.custom_task_change_reference?.length > 0;

        if (has_references) {
            frm.add_custom_button('Get Test Plans', async function () {
                const test_plan_set = new Set();
                const references = frm.doc.custom_task_change_reference || [];

                for (let row of references) {
                    if (!row.task) continue;

                    await frappe.call({
                        method: "get_test_plan",  // Replace with your actual API endpoint
                        args: {
                            task_name: row.task
                        },
                        callback: function (r) {
                            if (r.message && r.message.data) {
                                r.message.data.forEach(plan_row => {
                                    if (plan_row.test_plan) {
                                        test_plan_set.add(plan_row.test_plan);
                                    }
                                });
                            }
                        }
                    });
                }

                const test_plans = Array.from(test_plan_set);

                if (test_plans.length === 0) {
                    frappe.msgprint(__('No Test Plans linked in referenced Tasks.'));
                } else {
                    const existing = frm.doc.custom_test_plan_reference.map(row => row.test_plan);

                    test_plans.forEach(test_plan => {
                        if (!existing.includes(test_plan)) {
                            let row = frm.add_child('custom_test_plan_reference');
                            row.test_plan = test_plan;
                        }
                    });

                    frm.refresh_field('custom_test_plan_reference');
                    frappe.msgprint(`Added ${test_plans.length} test plan(s). Save the form.`);
                }
            });
        }
    },

    custom_task_change_reference_add(frm) {
        frm.trigger('refresh');
    },

    custom_task_change_reference_remove(frm) {
        frm.trigger('refresh');
    },

    after_save(frm) {
        frm.trigger('refresh');
    }
});
