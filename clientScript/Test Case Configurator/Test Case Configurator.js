frappe.ui.form.on('Test Case Configurator', {
    // Set the pos for the action as 10,20
    // Set the pos for the child as 10.01,10.02
    fnGetPos(frm, idItem) {
        const L_PREVITEM = frm.doc.test_fields[idItem.idx - 2];
        if (idItem.idx === 1) {
            idItem.pos = 10;
        } else if (idItem.is_child) {
            // Child ldRows increment by 0.01
            idItem.pos = L_PREVITEM ? L_PREVITEM.pos + 0.01 : 10.01;
        } else {
            // Parent ldRows increment by 10 when action is clicked
            // If action is clicked, reset to a clean number (e.g., 20, 30), ignoring decimals
            idItem.pos = L_PREVITEM ? (idItem.action ? Math.floor(L_PREVITEM.pos) + 10 : L_PREVITEM.pos + 0.01) : 10;
        }
        frm.refresh_field('test_fields'); 
    },

    site: function (frm) {
        if (frm.doc.site) {
            fnFetchDoctypeList(frm);
            fnFetchDoctypeDetails(frm);
        }
    },
    //When the doctype is triggered, get the list of doctype from the site details
    doctype_to_be_tested: function (frm) {
        if (frm.doc.site && frm.doc.doctype_to_be_tested) {
           fnFetchDoctypeDetails(frm); 
       }
    },

    // When sequence is updated, set the "depends_on" field to mandatory if needed
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
    // If the sequence value is greater than 0
    // set the depends on as mandatory.
    if (frm.doc.sequence > 0) {
        frm.fields_dict['depends_on'].df.reqd = 1;  
    } else {
        frm.fields_dict['depends_on'].df.reqd = 0;  
    }
    frm.refresh_field('depends_on');
}

function fnFetchDoctypeList(frm) {
    //Get the doctypes from the site details 
    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Site Details",
            name: frm.doc.site
        },
        callback: function (ldResponse) {
            if (ldResponse.message) {
                let lDoctypeLists = ldResponse.message.doctype_list;
                 // Convert single value to array if necessary and split by commas
                if (!Array.isArray(lDoctypeLists)) {
                    lDoctypeLists = [lDoctypeLists]; 
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

// Function to fetch doctype details based on site and doctype
// From the target site through the API "get_doctype_meta"
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
                   'Authorization': L_KEY,
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
                            // Parse JSON if request succeeds
                           return ldResponse.json(); 
                       } else {
                           throw new Error('Failed to fetch data');
                       }
                   })
                   .then(idData => {
                        // Get the status option from the target doctype and list out here
                        const L_STATUSFIELD = idData.message.parent.fields.find(field => field.fieldname === 'status');
                        if (L_STATUSFIELD && L_STATUSFIELD.options) {
                           const L_STATUSOPTIONS = L_STATUSFIELD.options.split('\n'); 
                            // Directly update status options for child table
                           frm.fields_dict["test_fields"].grid.update_docfield_property("status", "options", L_STATUSOPTIONS.join("\n"));
                           // Now manually refresh the grid after the update
                           frm.fields_dict["test_fields"].grid.refresh();
                       }
                       //If json Response is empty only update the json format
                       if (!frm.doc.json_response || frm.doc.json_response.trim() === '') {
                           fnProcessJsonResponse(frm, idData);
                       }
                       
                   })
                   .catch(error => {
                       console.error('Error fetching data:', error);
                   });
               }
           }
       }
   });
}


function fnProcessJsonResponse(frm, idData) {
    //Get the parent doctype fields, child table fields, section, tab and so on.
    let laFields = idData.message.parent.fields;
    let laChildFields = idData.message.child;
    let laFieldWithType = [];
    const LA_NOTINCLUDE = ["Column Break", "Section Break", "Tab Break"];

    // To store section labels (not fieldnames)
    let laSectionLabels = new Set();

    // To store unique tab names
    let laTabNames = new Set();
    laTabNames.add("Details");
   
    for (let ldField of laFields) {
        if (ldField.fieldtype === "Tab Break") {
            laTabNames.add(ldField.label);
        }

        if (ldField.fieldtype === "Section Break") {
            laSectionLabels.add(ldField.label);  
        }

        if (!LA_NOTINCLUDE.includes(ldField.fieldtype)) {
            let ldFieldName = ldField.fieldname;
            
            let ldFieldType = ldField.fieldtype;
            let lDoctype = idData.message.parent.name;
            laFieldWithType.push(`Parent Doctype : ${lDoctype} | ${ldFieldName} - ${ldFieldType}`);
        }
    }

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
                    laSectionLabels.add(ldMetaField.label);  
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
function fnGetFieldNamesForChild(iJsonResponse, iChildName) {
   if (!iJsonResponse || !iChildName) {
       return [];
   }

   const LA_LINES = iJsonResponse.split('\n');
   const LA_FIELDOPTIONS = [];

   LA_LINES.forEach((line) => {
       const LA_PARTS = line.split('|').map((part) => part.trim());
       const L_KEY = LA_PARTS[0]?.split(':')[1]?.trim(); // Extract Doctype or Child Name
       const LA_FIELDLABEL = LA_PARTS[1]?.split('-')[0]?.trim(); // Extract Field Name

       if (L_KEY === iChildName && LA_FIELDLABEL) {
           LA_FIELDOPTIONS.push(LA_FIELDLABEL);
       }
   });
   return LA_FIELDOPTIONS;
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
        const LD_ITEM = locals[cdt][cdn];
        if (!LD_ITEM.pos) {
            // Call fnGetPos function here to set the pos
            frm.events.fnGetPos(frm, LD_ITEM);  
        }
        // Ensure that pos is updated when field_name changes
        if (LD_ITEM.pos) {
            // If pos is set already, call the same logic as `action`
            frm.events.fnGetPos(frm, LD_ITEM);
        }
    },

    action(frm, cdt, cdn) {
        const LD_ITEM = locals[cdt][cdn];
        if (!LD_ITEM.pos) {
            frm.events.fnGetPos(frm, LD_ITEM);  
        }
        // Ensure that pos is updated on action
        if (LD_ITEM.pos && LD_ITEM.action) {
            // Recalculate pos after action is triggered
            frm.events.fnGetPos(frm, LD_ITEM); 
        }
    },
    test_fields_add(frm, cdt, cdn) {
        // Get only parent fields
        const laParentFieldNames = fnGetAllFieldNames(frm.doc.json_response); 
        const ldItem = locals[cdt][cdn];
        // Ensure only parent fields are available by default
        frm.fields_dict["test_fields"].grid.update_docfield_property("field_name", "options", ['', ...laParentFieldNames].join("\n"));
        // Clear the child_name field before selecting is_child checkbox
        frappe.model.set_value(cdt, cdn, 'child_name', ''); 
        
        // Set the first available field as default (or empty string if none exist)
        const LA_DEFAULT_VALUE = laParentFieldNames[0] || ""; 
        frappe.model.set_value(cdt, ldItem.name, "field_name", LA_DEFAULT_VALUE);
        frappe.model.set_value(cdt, cdn, 'is_child', 0); 
        
        // Clear child_name options (if any) as is_child is 0
        frm.fields_dict["test_fields"].grid.update_docfield_property("child_name", "options", '');
        
        // Refresh the grid to reflect changes
        frm.fields_dict["test_fields"].grid.refresh();
    },

    is_child(frm, cdt, cdn) {
        const ldItem = locals[cdt][cdn];
        const is_child = ldItem.is_child;
        if (!frm.doc.json_response || frm.doc.json_response.trim() === '') {
            frappe.msgprint(__('Please fetch the doctype details first.'));
        
            return;
        }

        if (is_child) {
            const LA_CHILDNAMES = fnGetUniqueChildNames(frm.doc.json_response);
            
            // Clear field_name when is_child is checked
            frappe.model.set_value(cdt, cdn, 'field_name', '');  // Clear field_name
            frappe.model.set_value(cdt, cdn, 'child_name', '');  // Clear child_name

            // Update child_name dropdown with only child table names
            frm.fields_dict["test_fields"].grid.update_docfield_property("child_name", "options", LA_CHILDNAMES.join('\n'));
            
            // Ensure field_name options are cleared
            frm.fields_dict["test_fields"].grid.update_docfield_property("field_name", "options", '');
            
            // Set the first available field as default (or empty string if none exist)
            const LA_CHILD_DEFAULT_VALUE = LA_CHILDNAMES[0] || ""; 
            frappe.model.set_value(cdt, ldItem.name, "child_name", LA_CHILD_DEFAULT_VALUE);

            frm.fields_dict["test_fields"].grid.refresh();
        } else {
            frappe.model.set_value(cdt, cdn, 'child_name', '');
            frm.fields_dict["test_fields"].grid.update_docfield_property("child_name", "options", ''); 

            // Repopulate field_name with only parent fields
            const all_field_names = fnGetAllFieldNames(frm.doc.json_response);
            frm.fields_dict["test_fields"].grid.update_docfield_property("field_name", "options", all_field_names.join('\n'));
                
            frm.fields_dict["test_fields"].grid.refresh();
        }
    },
    child_name(frm, cdt, cdn) {
        const ldItem = locals[cdt][cdn];
        const LA_FIELDOPTIONS = fnGetFieldNamesForChild(frm.doc.json_response, ldItem.child_name);
        if (ldItem.child_name) {
            
            // Ensure the field list updates properly
            frappe.model.set_value(cdt, cdn, 'field_name', '');
            frm.fields_dict["test_fields"].grid.update_docfield_property("field_name", "options", LA_FIELDOPTIONS.join('\n'));
        }         
        frm.fields_dict["test_fields"].grid.refresh();
    },
});

