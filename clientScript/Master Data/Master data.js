// Initialize form event handler for 'Master Data' doctype
frappe.ui.form.on('Master Data', {
    // Execute when the form is loaded
    onload: function(frm) {
        // Check if this is a new document and has test_script field populated
        if (frm.is_new() && frm.doc.test_script) {
            // Fetch the linked Test Case Configurator document
            frappe.db.get_doc('Test Case Configurator', frm.doc.test_script)
                .then(ldSource => {
                    // Copy 'action' field value from the Test Case Configurator
                    if (ldSource.action) {
                        frm.set_value('action', ldSource.action);
                    }

                    // Copy 'document' field value from the Test Case Configurator
                    if (ldSource.document) {
                        frm.set_value('document', ldSource.document);
                    }
                    
                    if (ldSource.is_workflow_test_script) {
                        frm.set_value('is_workflow_test_script', ldSource.is_workflow_test_script);
                    }
                    if (ldSource.workflow_user) {
                        frm.set_value('workflow_user', ldSource.workflow_user);
                    }

                    // Copy child table data from Test Case Configurator to Master Data
                    if (ldSource.test_fields && ldSource.test_fields.length > 0) {
                        // Clear any existing rows in the actual_test_data table
                        frm.clear_table('actual_test_data');
                        
                        // Process each row from the test_fields child table
                        ldSource.test_fields.forEach(ldTestFields => {
                            // Add a new row to the actual_test_data table
                            let ldMasterData = frm.add_child('actual_test_data');
                            
                            // Copy all field values from the test_fields row
                            // to the actual_test_data row:
                            ldMasterData.pos = ldTestFields.pos;                  // Field position in the form
                            ldMasterData.is_child = ldTestFields.is_child;        // Whether this is a child table field
                            ldMasterData.child_name = ldTestFields.child_name;    // Name of child table if applicable
                            ldMasterData.child_index = ldTestFields.child_index;  // Index in child table
                            ldMasterData.field_name = ldTestFields.field_name;    // Name of the field
                            ldMasterData.value = ldTestFields.value;              // Field value to set
                            ldMasterData.message_type = ldTestFields.message_type;// Type of message if applicable
                            ldMasterData.tab = ldTestFields.tab;                  // Tab where field is located
                            ldMasterData.status = ldTestFields.status;            // Field status
                            ldMasterData.menus = ldTestFields.menus;              // Related menus if applicable
                            ldMasterData.data_type = ldTestFields.data_type;      // Data type of the field
                            ldMasterData.action = ldTestFields.action;            // Action to perform
                            ldMasterData.message = ldTestFields.message;          // Message to show if applicable
                            ldMasterData.section = ldTestFields.section;          // Form section containing field
                            ldMasterData.description = ldTestFields.description;  // Description of the field
                            ldMasterData.is_read_only = ldTestFields.is_read_only;// Read-only status
                            ldMasterData.is_mandatory = ldTestFields.is_mandatory;// Required status
                            ldMasterData.is_hidden = ldTestFields.is_hidden;      // Hidden status
                        });

                        // Refresh the actual_test_data table to show the new rows
                        frm.refresh_field('actual_test_data');
                    }
                });
        }
    }
});