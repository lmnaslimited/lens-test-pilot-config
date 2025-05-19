frappe.ui.form.on('Task', {
    refresh(frm) {
        frm.clear_custom_buttons();
        //Get the test plans by using the button
        if ((frm.doc.custom_task_change_reference || []).length) {
            frm.add_custom_button('Get Test Plans', () => fnFetchAndAddTestPlans(frm));
        }
    },
    //Refresh the child table when adding and removing the task references
    custom_task_change_reference_add(frm) {
        frm.trigger('refresh');
    },

    custom_task_change_reference_remove(frm) {
        frm.trigger('refresh');
    }
});

//The purpose of the function is to add the test plans based on the refernce tasks
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
       
        frm.clear_table('custom_test_plan_reference');
        LAplans.forEach(LplanRow => {
            if (LplanRow.test_plan && !LAtestPlanList.includes(LplanRow.test_plan)) {
                LAtestPlanList.push({
                    test_plan: LplanRow.test_plan,
                    test_plan_name: LplanRow.test_plan_name, 
                    task: Lrow.task
                });
            }
        });
    }

    if (LAtestPlanList.length === 0) {
        frappe.msgprint(__('No Test Plans linked in referenced Tasks.'));
        return;
    }

   //Remove the duplicate test plans that is present in different reference tasks
    const LAexistingPlans = (frm.doc.custom_test_plan_reference || []).map(Lrow => Lrow.test_plan);

    LAtestPlanList.forEach(Lplan => {
        
        //Appending the values into the Test Plan Reference child table
        if (!LAexistingPlans.includes(Lplan.test_plan)) {
            frm.add_child('custom_test_plan_reference', {
                test_plan: Lplan.test_plan,
                test_plan_name: Lplan.test_plan_name,
                task: Lplan.task
            });
        }
        
    });
    
    await frm.save()
    frm.refresh_field('custom_test_plan_reference');
    frappe.msgprint(__('Test Plans have been added successfully.'));
   
}