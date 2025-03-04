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
            fnFetchDoctypeList(frm);
            fnFetchDoctypeDetails(frm);
        }
    },
      
   doctype_to_be_tested: function (frm) {
        if (frm.doc.site && frm.doc.doctype_to_be_tested) {
           fnFetchDoctypeDetails(frm); 
       }
   },

    sequence: function(frm){
        fnSetDependsOnMandatory(frm);
    },
    
   refresh(frm) {
        if (frm.doc.site && frm.doc.doctype_to_be_tested) {
           
           fnFetchDoctypeDetails(frm); 
           fnFetchDoctypeList(frm);
       }
       fnSetDependsOnMandatory(frm);
       
   }
});

function fnSetDependsOnMandatory(frm) {
    // Check if the sequence value is greater than 0
    if (frm.doc.sequence > 0) {
        frm.fields_dict['depends_on'].df.reqd = 1;  // Make 'depends_on' mandatory
    } else {
        frm.fields_dict['depends_on'].df.reqd = 0;  // Remove 'depends_on' as mandatory
    }
    frm.refresh_field('depends_on');
}

function fnFetchDoctypeList(frm) {
    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Site Details",
            name: frm.doc.site
        },
        callback: function (ldResponse) {
            if (ldResponse.message) {
                // Ensure correct L_KEY
                let lDoctypeLists = ldResponse.message.doctype_list;
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
   const L_DOCTYPE = frm.doc.doctype_to_be_tested;

   // Fetch the authorization L_KEY for the site
   frappe.call({
       method: "frappe.client.get_password",
       args: {
           "doctype": "Site Details",
           "name": L_SITE,
           "fieldname": "authorization_key"
       },
       callback: function (ldResponse) {
           if (ldResponse.message) {
               const L_KEY = ldResponse.message;
               const L_APIURL = `${L_SITE}/api/method/get_doctype_meta?i_document=${L_DOCTYPE}`;
               const L_HEADERS = {
                   'Authorization': L_KEY, // Assuming the auth token is stored in r.message
                   'Content-Type': 'application/json'
               };

               if (L_KEY) {
                   // Make the fetch request to get the doctype metadata
                   fetch(L_APIURL, {
                       method: 'GET',
                       headers: L_HEADERS
                   })
                   .then(ldResponse => {
                       if (ldResponse.ok) {
                           return ldResponse.json(); // Parse JSON if request succeeds
                       } else {
                           throw new Error('Failed to fetch data');
                       }
                   })
                   .then(data => {
                       const L_STATUSFIELD = data.message.parent.fields.find(field => field.fieldname === 'status');
                       if (L_STATUSFIELD && L_STATUSFIELD.options) {
                           const L_STATUSOPTIONS = L_STATUSFIELD.options.split('\n'); 
                            // Directly update status options for child table
                           frm.fields_dict["test_fields"].grid.update_docfield_property("status", "options", L_STATUSOPTIONS.join("\n"));
                           // Now manually refresh the grid after the update
                           frm.fields_dict["test_fields"].grid.refresh();
                       }
                      
                       // Process the ldResponse and set the json_response field
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
    let laFields = data.message.parent.fields;
    let laChildFields = data.message.child;
    let laFieldWithType = [];
    const LA_NOTINCLUDE = ["Column Break", "Section Break", "Tab Break"];

    // Create an array to store section labels (not fieldnames)
    let laSectionLabels = new Set();

    // Create an array to store unique tab names
    let laTabNames = new Set();
    laTabNames.add("Details");
     // Loop through parent fields and process the required ones
    for (let ldField of laFields) {
        if (ldField.fieldtype === "Tab Break") {
            // If it's a Tab Break, add the fieldname to laTabNames
            laTabNames.add(ldField.label);
        }

        if (ldField.fieldtype === "Section Break") {
            // If it's a Section Break, add the label (ldField label) to laSectionLabels
            laSectionLabels.add(ldField.label);  // Use the label instead of the fieldname
        }

        if (!LA_NOTINCLUDE.includes(ldField.fieldtype)) {
            let ldFieldName = ldField.fieldname;
            
            let ldFieldType = ldField.fieldtype;
            let lDoctype = data.message.parent.name;
            laFieldWithType.push(`Parent Doctype : ${lDoctype} | ${ldFieldName} - ${ldFieldType}`);
        }
    }

    // Loop through child fields and process the required ones
    for (let ldChildField of laChildFields) {
        let lChildFieldName = ldChildField.fieldname;
        let ldChildMeta = ldChildField.meta;
        if (ldChildMeta) {
             for (let ldMetaField of ldChildMeta.fields) {
                console.log("ldMetaField", ldMetaField);
                if (ldMetaField.fieldtype === "Tab Break") {
                    laTabNames.add(ldMetaField.label);
                }

                if (ldMetaField.fieldtype === "Section Break") {
                    // If it's a Section Break, add the label (ldField label) to laSectionLabels
                    laSectionLabels.add(ldMetaField.label);  // Use the label instead of the fieldname
                }

                if (!LA_NOTINCLUDE.includes(ldMetaField.fieldtype)) {
                    let lMetaFieldName = ldMetaField.fieldname;
                    let lMetaFieldType = ldMetaField.fieldtype;
                    laFieldWithType.push(`Child Name: ${lChildFieldName} | ${lMetaFieldName} - ${lMetaFieldType}`);
                }
            }
        }
    }

    // Convert the set of tab names and section labels to arrays and set them as options
    // for the tab and section fields in the child table
    frm.fields_dict["test_fields"].grid.update_docfield_property("tab", "options", Array.from(laTabNames).join("\n"));
    frm.fields_dict["test_fields"].grid.update_docfield_property("section", "options", Array.from(laSectionLabels).join("\n"));

    // Set value to form field
    frm.set_value('json_response', laFieldWithType.join('\n'));
    
    
    
    const LD_JSON_RESPONSE = frm.doc.json_response;
    if (LD_JSON_RESPONSE) {
        const LA_LINES = LD_JSON_RESPONSE.split('\n');
        const LA_FIELDNAMES = [];
        const LA_CHILDNAMES = new Set();

        LA_LINES.forEach((line) => {
            const LA_PARTS = line.split('|').map((part) => part.trim());
            const L_KEY = LA_PARTS[0]?.split(':')[1]?.trim();
            const LA_FIELDLABEL = LA_PARTS[1]?.split('-')[0]?.trim();
            const LA_FIELDTYPE = LA_PARTS[1]?.split('-')[1]?.trim();

            if (LA_PARTS[0]?.startsWith('Parent Doctype') && LA_FIELDLABEL && LA_FIELDTYPE !== 'Table') {
                LA_FIELDNAMES.push(LA_FIELDLABEL);
            }

            if (LA_PARTS[0]?.startsWith('Child Name') && L_KEY) {
                LA_CHILDNAMES.add(L_KEY);
            }
        });

        // Set field_name options depending on whether 'is_child' is checked or not
        if (!frm.doc.test_fields.some(field => field.is_child)) {
            frappe.meta.get_docfield('Test Fields', 'child_name', frm.docname).options = '';
            frappe.meta.get_docfield('Test Fields', 'field_name', frm.docname).options =
                Array.from(LA_FIELDNAMES).join('\n');
            frm.refresh_field('test_fields');
            
        }
       
    }
}




// Function to get field names based on selected child_name
function fnGetFieldNamesForChild(iJsonResponse, child_name) {
   if (!iJsonResponse || !child_name) {
       return [];
   }

   const LA_LINES = iJsonResponse.split('\n');
   const field_options = [];

   LA_LINES.forEach((line) => {
       const LA_PARTS = line.split('|').map((part) => part.trim());
       const L_KEY = LA_PARTS[0]?.split(':')[1]?.trim(); // Extract Doctype or Child Name
       const LA_FIELDLABEL = LA_PARTS[1]?.split('-')[0]?.trim(); // Extract Field Name

       if (L_KEY === child_name && LA_FIELDLABEL) {
           field_options.push(LA_FIELDLABEL);
       }
   });
   return field_options;
}

// Function to get all field names (excluding Parent Doctype and Child Name)
function fnGetAllFieldNames(iJsonResponse) {
  if (!iJsonResponse) {
      return [];
  }

  const LA_LINES = iJsonResponse.split('\n');
  const LA_FIELDNAMES = [];
  const LA_NOTINCLUDE = ["Column Break", "Section Break", "Tab Break"];

  LA_LINES.forEach((line) => {
      const LA_PARTS = line.split('|').map((part) => part.trim());
    //   const L_KEY = LA_PARTS[0]?.split(':')[1]?.trim(); // Extract Parent Doctype or Child Name
        const L_KEY = LA_PARTS[0]?.startsWith('Parent Doctype') ? LA_PARTS[0].split(':')[1]?.trim() : null;
      const LA_FIELDLABEL = LA_PARTS[1]?.split('-')[0]?.trim(); // Extract Field Name
      const LA_FIELDTYPE = LA_PARTS[1]?.split('-')[1]?.trim(); // Extract Field Type

      if (L_KEY && LA_FIELDLABEL && !LA_NOTINCLUDE.includes(LA_FIELDTYPE)) {
          LA_FIELDNAMES.push(LA_FIELDLABEL);
      }
  
  });
  
  return LA_FIELDNAMES;
}



// Function to get unique child names from iJsonResponse
function fnGetUniqueChildNames(iJsonResponse) {
   if (!iJsonResponse) {
       return [];
   }

   const LA_LINES = iJsonResponse.split('\n');
   const LA_CHILDNAMES = new Set();

   LA_LINES.forEach((line) => {
       const LA_PARTS = line.split('|').map((part) => part.trim());
       const L_KEY = LA_PARTS[0]?.split(':')[1]?.trim(); // Extract Child Name
       if (LA_PARTS[0]?.startsWith('Child Name') && L_KEY) {
           LA_CHILDNAMES.add(L_KEY);
       }
   });

   return Array.from(LA_CHILDNAMES);
}


frappe.ui.form.on('Test Fields', {
    
  field_name(frm, cdt, cdn) {
    const ldItem = locals[cdt][cdn];
    console.log("ldItem", ldItem)
    if (!ldItem.pos) {
        frm.events.fnGetPos(frm, ldItem);  // Call fnGetPos function here to set the pos
    }

    // Ensure that pos is updated when field_name changes
    if (ldItem.pos) {
        // If pos is set already, call the same logic as `action`
        frm.events.fnGetPos(frm, ldItem);
    }
},

action(frm, cdt, cdn) {
    const ldItem = locals[cdt][cdn];
    if (!ldItem.pos) {
        frm.events.fnGetPos(frm, ldItem);  // Call fnGetPos function here to update pos
    }

    // Ensure that pos is updated on action
    if (ldItem.pos && ldItem.action) {
        frm.events.fnGetPos(frm, ldItem); // Recalculate pos after action is triggered
    }
},
    test_fields_add(frm, cdt, cdn) {
    
    const parent_field_names = fnGetAllFieldNames(frm.doc.json_response); // Get only parent fields
    
    
    //console.log("Parent Field Names", parent_field_names);

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
       const LA_CHILDNAMES = fnGetUniqueChildNames(frm.doc.json_response);
       console.log("Child Names:", LA_CHILDNAMES);

       // Clear field_name when is_child is checked
       frappe.model.set_value(cdt, cdn, 'field_name', '');  // Clear field_name
       frappe.model.set_value(cdt, cdn, 'child_name', '');  // Clear child_name

       // Update child_name dropdown with only child table names
       frm.fields_dict["test_fields"].grid.update_docfield_property("child_name", "options", LA_CHILDNAMES.join('\n'));
       
       // Ensure field_name options are cleared
       frm.fields_dict["test_fields"].grid.update_docfield_property("field_name", "options", '');
       
       
        // Set the first available field as default (or empty string if none exist)
        const child_default_value = LA_CHILDNAMES[0] || ""; 
        console.log("Child Default Value", child_default_value )
        frappe.model.set_value(cdt, item.name, "child_name", child_default_value);

       // Manually trigger a refresh on the field_name to ensure the clearing is respected
       frm.fields_dict["test_fields"].grid.refresh();
    } else {
       frappe.model.set_value(cdt, cdn, 'child_name', '');
       frm.fields_dict["test_fields"].grid.update_docfield_property("child_name", "options", ''); // Clear child_name options

       // **Repopulate field_name with only parent fields**
       const all_field_names = fnGetAllFieldNames(frm.doc.json_response);
       frm.fields_dict["test_fields"].grid.update_docfield_property("field_name", "options", all_field_names.join('\n'));
        
        // Manually trigger a refresh on the field_name to ensure it's repopulated
        frm.fields_dict["test_fields"].grid.refresh();
   }
},
   child_name(frm, cdt, cdn) {
   const item = locals[cdt][cdn];
const field_options = fnGetFieldNamesForChild(frm.doc.json_response, item.child_name);
   if (item.child_name) {
       
       console.log("List of child fields", field_options)
       
       // Ensure the field list updates properly
       frappe.model.set_value(cdt, cdn, 'field_name', '');
       frm.fields_dict["test_fields"].grid.update_docfield_property("field_name", "options", field_options.join('\n'));
   } else {
    
        // frm.fields_dict["test_fields"].grid.update_docfield_property("field_name", "options", field_options.join('\n'));
        // frappe.model.set_value(cdt, cdn, 'child_name', '');
        
   }

   frm.fields_dict["test_fields"].grid.refresh();
},


});

