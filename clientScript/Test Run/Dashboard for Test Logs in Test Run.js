
frappe.ui.form.on('Test Run', {
    onload: function(frm) {
        if (frm.doc.test_lab && (!frm.doc.test_log || frm.doc.test_log.length === 0)) {
            // Fetch associated test logs from the linked Test Lab document 
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Test Lab',
                    name: frm.doc.test_lab,
                },
                callback: function(ldResponse) {
                    let ldTestLab = ldResponse.message;
                    if (ldTestLab && ldTestLab.test_lab_script) {
                        ldTestLab.test_lab_script.forEach(function(ldScript) {
                            //Append the Test Lab child into Test Run child 'Test Log"
                            frm.add_child('test_log', {
                                test_plan: ldScript.test_plan,
                                test_script: ldScript.test_script,
                                master_data: ldScript.master_data
                            });
                        });
                        frm.refresh_field('test_log');
                    }
                }
            });
        }
    },
      
    refresh: function(frm) {
        let laLogs = frm.doc.test_log || [];
        if (laLogs.length === 0) return;        let lPass = 0, lFail = 0, lNotStarted = 0;        // Get the Test log result for creating the dashboard
        laLogs.forEach(ldLog => {
            if (ldLog.result === 'Pass') {
                lPass++;
            } else if (ldLog.result === 'Fail') {
                lFail++;
            } else {
                lNotStarted++;
            }
        });        let lTotal = laLogs.length;
        let laBars = [];        // Progress bar for Passed
        if (lPass > 0) {
            laBars.push({
                title: "Passed: " + lPass,
                width: (lPass / lTotal * 100).toFixed(2) + "%",
                progress_class: "progress-bar-success"
            });
        }        // Progress bar for Failed
        if (lFail > 0) {
            laBars.push({
                title: "Failed: " + lFail,
                width: (lFail / lTotal * 100).toFixed(2) + "%",
                progress_class: "progress-bar-danger"
            });
        }        // Progress bar for Not Started
        if (lNotStarted > 0) {
            laBars.push({
                title: "Not Started: " + lNotStarted,
                width: (lNotStarted / lTotal * 100).toFixed(2) + "%",
                progress_class: "progress-bar-warning"
            });
        }        // Create message summary
        let lMessage = `:white_tick: Passed: ${lPass} &nbsp;&nbsp; :x: Failed: ${lFail} &nbsp;&nbsp; :hourglass_flowing_sand: Not Started: ${lNotStarted}`;        // Creating the Progress bar based on the result metrics (Pass, Fail, Not Started)
        if (frm.dashboard) {
            frm.dashboard.reset();
            frm.dashboard.add_progress(__("Test Log Progress"), laBars, lMessage);
        }
    }
});
