frappe.ui.form.on('Test Case Configurator', {
    get_pos(frm, item) {
        const prevItem = frm.doc.test_fields[item.idx - 2];
        if (prevItem) {
            if (item.action === prevItem.action) {
                item.pos = prevItem.pos + 1 / 10; // Increment by 0.1 if actions are the same
            } else {
                item.pos = Math.floor(prevItem.pos) + 10; // Add 10 if actions differ
            }
        } else {
            item.pos = 10; // Start with 10 if no previous row
        }
        frm.refresh_field('test_fields');
    },

    refresh(frm) {
        const json_response = frm.doc.json_response;
        if (json_response) {
            // Parse JSON response
            const lines = json_response.split('\n');
            const field_names = []; // To store all field names (excluding 'Table' fields)
            const child_names = new Set(); // To store unique child names
    
            lines.forEach((line) => {
                const parts = line.split('|').map((part) => part.trim());
                const key = parts[0]?.split(':')[1]?.trim(); // Extract Parent Doctype or Child Name
                const field_label = parts[1]?.split('-')[0]?.trim(); // Extract Field Name
                const field_type = parts[1]?.split('-')[1]?.trim(); // Extract Field Type
    
                // Collect all child names
                if (parts[0]?.startsWith('Child Name')) {
                    child_names.add(key);
                }
    
                // Collect field names excluding 'Table' type
                if (field_label && field_type !== 'Table') {
                    field_names.push(field_label);
                }
            });
    
            // Set child_name options (all unique child names)
            frappe.meta.get_docfield('Test Fields', 'child_name', frm.docname).options =
                Array.from(child_names).join('\n');
            frm.refresh_field('test_fields'); // Refresh the child_name field
    
            // Set field_name options (all field names excluding 'Table')
            frappe.meta.get_docfield('Test Fields', 'field_name', frm.docname).options =
                Array.from(field_names).join('\n');
            frm.refresh_field('test_fields'); // Refresh the child table to reflect changes
        }
    
        frm.add_custom_button('Get Fields', function () {
            frappe.call({
                method: "frappe.client.get_password",
                args: {
                    "doctype": "Site Details",
                    "name": frm.doc.site,
                    "fieldname": "authorization_key"
                },
                callback: function (r) {
                    if (r.message) {
                        const site = frm.doc.site
                        const doctype = frm.doc.doctype_to_be_tested
                        const key = r.message
                        const apiUrl = `${site}/api/method/get_doctype_meta?i_document=${doctype}`;
                        const headers = {
                            'Authorization': key, // Assuming the auth token is stored in r.message
                            'Content-Type': 'application/json'
                        };
    
                        if(key) {
                            // Make the fetch request
                            fetch(apiUrl, {
                                method: 'GET',
                                headers: headers
                            })
                                .then(response => {
                                    if (response.ok) {
                                        return response.json(); // Parse JSON if request succeeds
                                    } else {
                                        throw new Error('Failed to fetch data');
                                    }
                                })
                                .then(data => {
                                    let fields = data.message.parent.fields;
                                    let childFields = data.message.child;
                                    let fieldWithType = [];
                                    let childNameInParent = [];
                                    const notInclude = ["Column Break", "Section Break", "Tab Break"];
        
                                    // Loop through fields and process the required ones
                                    for (let field of fields) {
                                        if (!notInclude.includes(field.fieldtype)) {
                                            let fieldName = field.fieldname;
                                            let fieldType = field.fieldtype;
                                            let doctype = data.message.parent.name;
                                            fieldWithType.push(`Parent Doctype : ${doctype} | ${fieldName} - ${fieldType}`);
                                        }
                                    }
                                    for (let childField of childFields) {
                                        // Extract fieldname and meta
                                        let childFieldName = childField.fieldname;
                                        let childMeta = childField.meta;
        
                                        if (childMeta) {
                                            // Extract the name from meta
                                            let childDoctype = childMeta.name;
        
                                            // Iterate through the fields inside meta
                                            for (let metaField of childMeta.fields) {
                                                if (!notInclude.includes(metaField.fieldtype)) {
                                                    let metaFieldName = metaField.fieldname;
                                                    let metaFieldType = metaField.fieldtype;
            
                                                    // Push the extracted information into the array
                                                    fieldWithType.push(`Child Name: ${childFieldName} | ${metaFieldName} - ${metaFieldType}`);
                                                }
                                            }
                                        }
                                    }
        
                                    frm.set_value('json_response', fieldWithType.join('\n')); // Set value to form field
                                })
                                .catch(error => {
                                    console.error('Error fetching data:', error);
                                });
                        }
                    }
                }
            });
        });
    }
});


frappe.ui.form.on('Test Fields', {
	action(frm, cdt, cdn) {
        const item = locals[cdt][cdn];
        if (!item.pos) {
            frm.events.get_pos(frm, item);
        }
    },
})

