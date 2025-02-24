frappe.ui.form.on('Test Case Configurator', {
    
    // Function to calculate position and set it to the field (as requested)
  fnGetPos(frm, item) {
      const L_PREVITEM = frm.doc.test_fields[item.idx - 2]; // Get the previous item

      // First row always starts at 10
      if (item.idx === 1) {
          item.pos = 10;
      } else if (item.is_child) {
          // Child rows increment by 0.01
          item.pos = L_PREVITEM ? L_PREVITEM.pos + 0.01 : 10.01;
      } else {
          // Parent rows increment by 10 when action is clicked
          // If action is clicked, reset to a clean number (e.g., 20, 30), ignoring decimals
          item.pos = L_PREVITEM ? (item.action ? Math.floor(L_PREVITEM.pos) + 10 : L_PREVITEM.pos + 0.01) : 10;
      }

      frm.refresh_field('test_fields'); // Refresh field after setting pos
  },
    site: function (frm) {
        console.log("Site Details", frm.doc.site);
        if (frm.doc.site) {
            fetchDoctypeList(frm);
             fnFetchDoctypeDetails(frm);
        }
    },
      
   doctype_to_be_tested: function (frm) {
       console.log("Doctype Selected", frm.doc.doctype_to_be_tested);

       if (frm.doc.site && frm.doc.doctype_to_be_tested) {
           fnFetchDoctypeDetails(frm); 
       }
   },

    sequence: function(frm){
        setDependsOnMandatory(frm);
    },
    
   refresh(frm) {
       
       if (frm.doc.site && frm.doc.doctype_to_be_tested) {
           
           fnFetchDoctypeDetails(frm); 
           fetchDoctypeList(frm);
       }
       setDependsOnMandatory(frm);
   }
});

function setDependsOnMandatory(frm) {
    // Check if the sequence value is greater than 0
    if (frm.doc.sequence > 0) {
        frm.fields_dict['depends_on'].df.reqd = 1;  // Make 'depends_on' mandatory
    } else {
        frm.fields_dict['depends_on'].df.reqd = 0;  // Remove 'depends_on' as mandatory
    }
    frm.refresh_field('depends_on');
}

function fetchDoctypeList(frm) {
    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Site Details",
            name: frm.doc.site
        },
        callback: function (r) {
            if (r.message) {
                console.log("doctype info", r.message);

                // Ensure correct key
                let lDoctypeLists = r.message.doctype_list;
                console.log("List of Doctypes", lDoctypeLists);

                // Convert single value to array if necessary and split by commas
                if (!Array.isArray(lDoctypeLists)) {
                    lDoctypeLists = [lDoctypeLists]; // Ensure it's an array
                }

                // Split by commas, trim spaces, and remove any quotes or brackets
                lDoctypeLists = lDoctypeLists.join(',').split(',').map(item => item.trim().replace(/["\[\]]/g, ''));

                // Join the list into a single string with newlines
                frm.set_df_property("doctype_to_be_tested", "options", lDoctypeLists.join("\n"));

                frm.refresh_field("doctype_to_be_tested");
            }
        }
    });
}

// Function to fetch doctype details based on site and doctype_to_be_tested
function fnFetchDoctypeDetails(frm) {
   const L_SITE = frm.doc.site;
   const doctype = frm.doc.doctype_to_be_tested;

   // Fetch the authorization key for the site
   frappe.call({
       method: "frappe.client.get_password",
       args: {
           "doctype": "Site Details",
           "name": L_SITE,
           "fieldname": "authorization_key"
       },
       callback: function (r) {
           if (r.message) {
               const key = r.message;
               const apiUrl = `${L_SITE}/api/method/get_doctype_meta?i_document=${doctype}`;
               const headers = {
                   'Authorization': key, // Assuming the auth token is stored in r.message
                   'Content-Type': 'application/json'
               };

               if (key) {
                   // Make the fetch request to get the doctype metadata
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
                        const statusField = data.message.parent.fields.find(field => field.fieldname === 'status');
                        if (statusField && statusField.options) {
                            const statusOptions = statusField.options.split('\n'); // Assuming options are newline-separated
                            statusOptions.push("Saved", "Not Saved");
                            // Update the child table 'status' field options
                            frm.fields_dict["test_fields"].grid.update_docfield_property("status", "options", statusOptions.join("\n"));
                            frm.refresh_field("test_fields"); // Refresh the field after setting options
                        }
                       // Process the response and set the json_response field
                       fnProcessJsonResponse(frm, data);
                       
                   })
                   .catch(error => {
                       console.error('Error fetching data:', error);
                   });
               }
           }
       }
   });
}


function fnProcessJsonResponse(frm, data) {
    let fields = data.message.parent.fields;
    let childFields = data.message.child;
    let fieldWithType = [];
    const notInclude = ["Column Break", "Section Break", "Tab Break"];

    // Create an array to store section labels (not fieldnames)
    let sectionLabels = new Set();

    // Create an array to store unique tab names
    let tabNames = new Set();
    tabNames.add("Details");
    // Loop through parent fields and process the required ones
    for (let field of fields) {
        if (field.fieldtype === "Tab Break") {
            // If it's a Tab Break, add the fieldname to tabNames
            tabNames.add(field.label);
        }

        if (field.fieldtype === "Section Break") {
            // If it's a Section Break, add the label (field label) to sectionLabels
            sectionLabels.add(field.label);  // Use the label instead of the fieldname
        }

        if (!notInclude.includes(field.fieldtype)) {
            let fieldName = field.fieldname;
            let fieldType = field.fieldtype;
            let doctype = data.message.parent.name;
            fieldWithType.push(`Parent Doctype : ${doctype} | ${fieldName} - ${fieldType}`);
        }
    }

    // Loop through child fields and process the required ones
    for (let childField of childFields) {
        let childFieldName = childField.fieldname;
        let childMeta = childField.meta;

        if (childMeta) {
            let childDoctype = childMeta.name;

            for (let metaField of childMeta.fields) {
                if (metaField.fieldtype === "Tab Break") {
                    tabNames.add(metaField.label);
                }

                if (metaField.fieldtype === "Section Break") {
                    // If it's a Section Break, add the label (field label) to sectionLabels
                    sectionLabels.add(metaField.label);  // Use the label instead of the fieldname
                }

                if (!notInclude.includes(metaField.fieldtype)) {
                    let metaFieldName = metaField.fieldname;
                    let metaFieldType = metaField.fieldtype;
                    fieldWithType.push(`Child Name: ${childFieldName} | ${metaFieldName} - ${metaFieldType}`);
                }
            }
        }
    }

    // Convert the set of tab names and section labels to arrays and set them as options
    // for the tab and section fields in the child table
    frm.fields_dict["test_fields"].grid.update_docfield_property("tab", "options", Array.from(tabNames).join("\n"));
    frm.fields_dict["test_fields"].grid.update_docfield_property("section", "options", Array.from(sectionLabels).join("\n"));

    // Set value to form field
    frm.set_value('json_response', fieldWithType.join('\n'));
    const json_response = frm.doc.json_response;
    if (json_response) {
        const lines = json_response.split('\n');
        const field_names = [];
        const child_names = new Set();

        lines.forEach((line) => {
            const parts = line.split('|').map((part) => part.trim());
            const key = parts[0]?.split(':')[1]?.trim();
            const field_label = parts[1]?.split('-')[0]?.trim();
            const field_type = parts[1]?.split('-')[1]?.trim();

            if (parts[0]?.startsWith('Parent Doctype') && field_label && field_type !== 'Table') {
                field_names.push(field_label);
            }

            if (parts[0]?.startsWith('Child Name') && key) {
                child_names.add(key);
            }
        });

        // Set field_name options depending on whether 'is_child' is checked or not
        if (!frm.doc.test_fields.some(field => field.is_child)) {
            frappe.meta.get_docfield('Test Fields', 'child_name', frm.docname).options = '';
            frappe.meta.get_docfield('Test Fields', 'field_name', frm.docname).options =
                Array.from(field_names).join('\n');
            frm.refresh_field('test_fields');
            
        }
       
    }
}




// Function to get field names based on selected child_name
function getFieldNamesForChild(json_response, child_name) {
   if (!json_response || !child_name) {
       return [];
   }

   const lines = json_response.split('\n');
   const field_options = [];

   lines.forEach((line) => {
       const parts = line.split('|').map((part) => part.trim());
       const key = parts[0]?.split(':')[1]?.trim(); // Extract Doctype or Child Name
       const field_label = parts[1]?.split('-')[0]?.trim(); // Extract Field Name

       if (key === child_name && field_label) {
           field_options.push(field_label);
       }
   });
   return field_options;
}

// Function to get all field names (excluding Parent Doctype and Child Name)
function getAllFieldNames(json_response) {
   if (!json_response) {
       return [];
   }

   const lines = json_response.split('\n');
   const field_names = [];
   const notInclude = ["Column Break", "Section Break", "Tab Break"];

   lines.forEach((line) => {
       const parts = line.split('|').map((part) => part.trim());
       const key = parts[0]?.split(':')[1]?.trim(); // Extract Parent Doctype or Child Name
       const field_label = parts[1]?.split('-')[0]?.trim(); // Extract Field Name
       const field_type = parts[1]?.split('-')[1]?.trim(); // Extract Field Type

       if (field_label && !notInclude.includes(field_type)) {
           field_names.push(field_label);
       }
   });
   return field_names;
}

// Function to get unique child names from json_response
function getUniqueChildNames(json_response) {
   if (!json_response) {
       return [];
   }

   const lines = json_response.split('\n');
   const child_names = new Set();

   lines.forEach((line) => {
       const parts = line.split('|').map((part) => part.trim());
       const key = parts[0]?.split(':')[1]?.trim(); // Extract Child Name
       if (parts[0]?.startsWith('Child Name') && key) {
           child_names.add(key);
       }
   });

   return Array.from(child_names);
}


frappe.ui.form.on('Test Fields', {
    
   
// When 'action' is triggered, calculate and set position
   
//   field_name(frm, cdt, cdn) {
//       const item = locals[cdt][cdn];
//       if (!item.pos) {
//           frm.events.fnGetPos(frm, item);  // Call fnGetPos function here
//       }
       
//   },
//   action(frm, cdt, cdn) {
//       const item = locals[cdt][cdn];
//     if (!item.pos) {
//           frm.events.fnGetPos(frm, item);  // Call fnGetPos function here
//       }
//   },
   
   field_name(frm, cdt, cdn) {
    const item = locals[cdt][cdn];
    if (!item.pos) {
        frm.events.fnGetPos(frm, item);  // Call fnGetPos function here to set the pos
    }

    // Ensure that pos is updated when field_name changes
    if (item.pos) {
        // If pos is set already, call the same logic as `action`
        frm.events.fnGetPos(frm, item);
    }
},

action(frm, cdt, cdn) {
    const item = locals[cdt][cdn];
    if (!item.pos) {
        frm.events.fnGetPos(frm, item);  // Call fnGetPos function here to update pos
    }

    // Ensure that pos is updated on action
    if (item.pos && item.action) {
        frm.events.fnGetPos(frm, item); // Recalculate pos after action is triggered
    }
},
    test_fields_add(frm, cdt, cdn) {
    
    const parent_field_names = getAllFieldNames(frm.doc.json_response); // Get only parent fields
    console.log("Parent Field Names", parent_field_names);

    const row = locals[cdt][cdn];

    // Ensure only parent fields are available by default
    frm.fields_dict["test_fields"].grid.update_docfield_property("field_name", "options", parent_field_names.join("\n"));

    // Clear the child_name field before selecting is_child checkbox
    frappe.model.set_value(cdt, cdn, 'child_name', ''); 

    // Set the first available field as default (or empty string if none exist)
    const default_value = parent_field_names[0] || ""; 
    frappe.model.set_value(cdt, row.name, "field_name", default_value);
    frappe.model.set_value(cdt, cdn, 'is_child', 0); // Ensure that is_child is unchecked by default
    
    // Clear child_name options (if any) as is_child is 0
    frm.fields_dict["test_fields"].grid.update_docfield_property("child_name", "options", '');
    
    // Refresh the grid to reflect changes
    frm.fields_dict["test_fields"].grid.refresh();
},

is_child(frm, cdt, cdn) {
   const item = locals[cdt][cdn];
   const is_child = item.is_child;

   if (!frm.doc.json_response || frm.doc.json_response.trim() === '') {
       frappe.msgprint(__('Please fetch the doctype details first.'));
        // Reset checkbox
       return;
   }

   if (is_child) {
       const child_names = getUniqueChildNames(frm.doc.json_response);
       console.log("Child Names:", child_names);

       // Clear field_name when is_child is checked
       frappe.model.set_value(cdt, cdn, 'field_name', '');  // Clear field_name
       frappe.model.set_value(cdt, cdn, 'child_name', '');  // Clear child_name

       // Update child_name dropdown with only child table names
       frm.fields_dict["test_fields"].grid.update_docfield_property("child_name", "options", child_names.join('\n'));
       
       // Ensure field_name options are cleared
       frm.fields_dict["test_fields"].grid.update_docfield_property("field_name", "options", '');
       
       
        // Set the first available field as default (or empty string if none exist)
        const child_default_value = child_names[0] || ""; 
        console.log("Child Default Value", child_default_value )
        frappe.model.set_value(cdt, item.name, "child_name", child_default_value);

       // Manually trigger a refresh on the field_name to ensure the clearing is respected
       frm.fields_dict["test_fields"].grid.refresh();
    } else {
       frappe.model.set_value(cdt, cdn, 'child_name', '');
       frm.fields_dict["test_fields"].grid.update_docfield_property("child_name", "options", ''); // Clear child_name options

       // **Repopulate field_name with only parent fields**
       const all_field_names = getAllFieldNames(frm.doc.json_response);
       frm.fields_dict["test_fields"].grid.update_docfield_property("field_name", "options", all_field_names.join('\n'));
        
        // Manually trigger a refresh on the field_name to ensure it's repopulated
        frm.fields_dict["test_fields"].grid.refresh();
   }
},
   child_name(frm, cdt, cdn) {
   const item = locals[cdt][cdn];

   if (item.child_name) {
       const field_options = getFieldNamesForChild(frm.doc.json_response, item.child_name);
       console.log("List of child fields", field_options)
       
       // Ensure the field list updates properly
       frappe.model.set_value(cdt, cdn, 'field_name', '');
       frm.fields_dict["test_fields"].grid.update_docfield_property("field_name", "options", field_options.join('\n'));
   } else {
    
        frm.fields_dict["test_fields"].grid.update_docfield_property("field_name", "options", all_field_names.join('\n'));
        // frappe.model.set_value(cdt, cdn, 'child_name', '');
        
   }

   frm.fields_dict["test_fields"].grid.refresh();
},


});

