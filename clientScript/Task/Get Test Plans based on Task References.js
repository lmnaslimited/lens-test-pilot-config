frappe.ui.form.on('Task', {
    refresh(frm) {
        frm.clear_custom_buttons();

        if ((frm.doc.custom_task_change_reference || []).length) {
            frm.add_custom_button('Get Test Plans', () => fnFetchAndAddTestPlans(frm));
        }
    },

    custom_task_change_reference_add(frm) {
        frm.trigger('refresh');
    },

    custom_task_change_reference_remove(frm) {
        frm.trigger('refresh');
    }
});


async function fnFetchAndAddTestPlans(frm) {
    const LtaskReference = frm.doc.custom_task_change_reference || [];
    const LAtestPlanList = [];

    for (let Lrow of LtaskReference) {
        if (!Lrow.task) continue;

        const LDresponse = await frappe.call({
            method: "get_test_plan",
            args: {
                task_name: Lrow.task,
                test_plan_name: Lrow.test_plan
            }
        });

        const LAplans = LDresponse.message?.data || [];
        LAplans.forEach(LplanRow => {
            if (LplanRow.test_plan && !LAtestPlanList.includes(LplanRow.test_plan)) {
                LAtestPlanList.push(LplanRow.test_plan);
            }
        });
    }

    if (LAtestPlanList.length === 0) {
        frappe.msgprint(__('No Test Plans linked in referenced Tasks.'));
        return;
    }

    const LAexistingPlans = (frm.doc.custom_test_plan_reference || []).map(Lrow => Lrow.test_plan);

    LAtestPlanList.forEach(Lplan => {
        if (!LAexistingPlans.includes(Lplan)) {
            frm.add_child('custom_test_plan_reference', { test_plan: Lplan });
        }
        
    });
    
    await frm.save()
    frm.refresh_field('custom_test_plan_reference');
    frappe.msgprint(__('Test Plans have been added successfully.'));
   
}