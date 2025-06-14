frappe.ui.form.on('Test Lab', {
    refresh(frm) {
        frm.clear_custom_buttons();
        // Do not allow creation of a Test Run from the Test Lab if the test has already passed.
        // Otherwise, allow creating multiple Test Runs until the test is passed.
        if (frm.doc.status === 'Passed') {
            $('.document-link[data-doctype="Test Run"]').each(function () {
                const $btn = $(this).find('button.btn-new[data-doctype="Test Run"]');
                if ($btn.length) {
                    $btn.hide(); 
                }
            });
        } else {
            $('.document-link[data-doctype="Test Run"]').each(function () {
                const $btn = $(this).find('button.btn-new[data-doctype="Test Run"]');
                if ($btn.length) {
                    $btn.show();  // Show the + icon if status is not Passed
                }
            });
        }

        frm.add_custom_button('Get Test Plans', async function () {
            frm.clear_table('test_lab_script');
            let laItems = frm.doc.reference_by || [];
            if (!laItems.length) {
                frappe.msgprint("No reference doctypes found.");
                return;
            }
            
           // Store Test Plans, ensuring no duplicates are added
            const LAexistingPlans = [];

            for (let lItem of laItems) {
                //If the Doctype is "Task", retrieve the Test Plan and its associated
                //Test Scripts from the Task Doctype.
                if (lItem.reference_doctype === "Task" && lItem.reference_name) {

                    //Call the API, to get the Test plan Child fields based on Task
                    let ldResponse = await frappe.call({
                        method: 'update_test_plan_data',
                        args: { task_name: lItem.reference_name }
                    });

                    if (ldResponse.message?.data) {
                        ldResponse.message.data.forEach(ldEntry => {
                           
                            const LplanScriptKey = `${ldEntry.test_plan}::${ldEntry.test_script}`;
                            if (!LAexistingPlans.includes(LplanScriptKey)) {
                                let ldRow = frm.add_child('test_lab_script');
                                ldRow.task_id = lItem.reference_name;
                                ldRow.test_plan = ldEntry.test_plan;
                                ldRow.test_script = ldEntry.test_script;
                                ldRow.master_data = ldEntry.master_data;
                                LAexistingPlans.push(LplanScriptKey); 
                            }
                        });
                    }
                } 
                //If the Doctype is "Test Plan", retrieve the Test Plan and its associated
                //Test Scripts from the Test Plan Doctype.
                else if (lItem.reference_doctype === "Test Plan" && lItem.reference_name) {
                    let ldResponse = await frappe.call({
                        method: 'frappe.client.get',
                        args: {
                            doctype: 'Test Plan',
                            name: lItem.reference_name
                        }
                    });

                    if (ldResponse.message?.test_plan_script) {
                        ldResponse.message.test_plan_script.forEach(ldScript => {
                            
                            const LplanScriptKey = `${lItem.reference_name}::${ldScript.test_script}`;
                            if (!LAexistingPlans.includes(LplanScriptKey)) {
                                let ldRow = frm.add_child('test_lab_script');
                                ldRow.test_plan = lItem.reference_name;
                                ldRow.test_script = ldScript.test_script;
                                ldRow.master_data = ldScript.master_data;
                                LAexistingPlans.push(LplanScriptKey); 
                            }
                        });
                    }
                }
            }

            frm.refresh_field('test_lab_script');
            await frm.save();
            frappe.msgprint('Test Plans and Scripts added.');
        });
        // Display only the Task and Test Plan Doctypes; restrict all other Doctypes     
        frm.fields_dict['reference_by'].grid.get_field('reference_doctype').get_query = function () {
            return {
                filters: [
                    ['name', 'in', ['Task', 'Test Plan']]
                ]
            };
        };
    }
});
