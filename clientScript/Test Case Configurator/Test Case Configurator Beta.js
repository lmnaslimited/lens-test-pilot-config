frappe.ui.form.on('Test Case Configurator', {
    // Set the pos for the action as 10,20
    // Set the pos for the child as 10.01,10.02
    fnGetPos(frm, idItem) {
        const LPrevItem = frm.doc.test_fields[idItem.idx - 2];
        if (idItem.idx === 1) {
            idItem.pos = 10;
        } else if (idItem.is_child && !idItem.action) {
            // Child ldRows increment by 0.01
            idItem.pos = LPrevItem ? LPrevItem.pos + 0.01 : 10.01;
        } else {
            // Parent ldRows increment by 10 when action is clicked
            // If action is clicked, reset to a clean number (e.g., 20, 30), ignoring decimals
            idItem.pos = LPrevItem ? (idItem.action ? Math.floor(LPrevItem.pos) + 10 : LPrevItem.pos + 0.01) : 10;
        }
        frm.refresh_field('test_fields'); 
    },

    site: function (frm) {
        if (frm.doc.site) {
            fnFetchDoctypeList(frm);
            fnFetchDoctypeDetails(frm, frm.doc.doctype_to_be_tested);
        }
    },
    //When the doctype is triggered, get the list of doctype from the site details
    doctype_to_be_tested: function (frm) {
        if (frm.doc.site && frm.doc.doctype_to_be_tested) {
           fnFetchDoctypeDetails(frm, frm.doc.doctype_to_be_tested); 
       }
    },
    
    refresh(frm) {

        if (!frm.doc.site) return;
    
        // Load doctype dropdown
        fnFetchDoctypeList(frm, true);
    
        // Ensure parent doctype meta exists
        if (frm.doc.doctype_to_be_tested) {
            fnFetchDoctypeDetails(frm, frm.doc.doctype_to_be_tested);
        }
    
        if (!frm.doc.test_fields || !frm.doc.json_response) return;
    
        // Ensure all assisting doctypes meta are loaded
        const uniqueDoctypes = new Set();
    
        frm.doc.test_fields.forEach(row => {
            if (row.connecting_doctype) {
                uniqueDoctypes.add(row.connecting_doctype);
            }
        });
    
        uniqueDoctypes.forEach(dt => {
            fnFetchDoctypeDetails(frm, dt);
        });
    
        // DO NOT rebuild dropdowns here
        // They will rebuild automatically when row is opened
    
        frm.refresh_field("test_fields");
    }
});

function fnFetchDoctypeList(frm, iUpdateChild = false) {

    if (!frm.doc.site) return;

    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Site Details",
            name: frm.doc.site
        },
        callback: function (idResponse) {

            if (!idResponse.message) return;

            let laDoctypeLists = idResponse.message.doctype_list;

            if (!Array.isArray(laDoctypeLists)) {
                laDoctypeLists = [laDoctypeLists];
            }

            laDoctypeLists = laDoctypeLists
                .join(',')
                .split(',')
                .map(l => l.trim().replace(/["\[\]]/g, ''));

            const LOptions = laDoctypeLists.join("\n");

            // Parent field
            frm.set_df_property("doctype_to_be_tested", "options", LOptions);
            frm.refresh_field("doctype_to_be_tested");

            // Child field (only when requested)
            if (iUpdateChild) {
                frm.fields_dict["test_fields"].grid.update_docfield_property("connecting_doctype", "options", LOptions);

                frm.fields_dict["test_fields"].grid.refresh();
            }
        }
    });
}

// Function to fetch doctype details based on site and doctype
// From the target site through the API "get_doctype_meta"
function fnFetchDoctypeDetails(frm, iDoctype) {
   const LSite = frm.doc.site;
   const LDoctype = iDoctype || frm.doc.doctype_to_be_tested;
   if (!LSite || !LDoctype) {
        return;
    }
    
    const LJson = frm.doc.json_response || '';

    if (LJson && LJson.trim() !== '') {

        const LaLines = LJson.split('\n');

        const LAlreadyExists = LaLines.some(line => {
            const LDoctypeInLine = line.split('>')[0]?.trim();
            return LDoctypeInLine === LDoctype;
        });

        if (LAlreadyExists) {
            return; //STOP HERE — no API call
        }
    }

   // Fetch the authorization LKey for the site
   frappe.call({
       method: "frappe.client.get_password",
       args: {
           "doctype": "Site Details",
           "name": LSite,
           "fieldname": "authorization_key"
       },
       callback: function (idResponse) {
           if (idResponse.message) {
               const LKey = idResponse.message;
               const LApiUrl = `${LSite}/api/method/get_doctype_meta?i_document=${LDoctype}`;
               const LHeaders = {
                   'Authorization': LKey,
                   'Content-Type': 'application/json'
               };

               if (LKey) {
                   // Make the fetch request to get the doctype metadata
                   fetch(LApiUrl, {
                       method: 'GET',
                       headers: LHeaders
                   })
                   .then(idResponse => {
                       if (idResponse.ok) {
                            // Parse JSON if request succeeds
                           return idResponse.json(); 
                       } else {
                           throw new Error('Failed to fetch data');
                       }
                   })
                   .then(idData => {
                       //If json Response is empty only update the json format
                       fnProcessJsonResponse(frm, idData);
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

    let laFields = idData.message.parent.fields;
    let laChildFields = idData.message.child;
    let laFieldWithType = [];
    const LaNotInclude = ["Column Break", "Section Break", "Tab Break"];

    const LDoctype = idData.message.parent.name;

    for (let ldField of laFields) {

        // Store TAB BREAK
        if (ldField.fieldtype === "Tab Break" && ldField.label) {
            laFieldWithType.push(
                `${LDoctype} > Tab Break : ${LDoctype} | ${ldField.label} - Tab`
            );
        }

        // Store SECTION BREAK
        if (ldField.fieldtype === "Section Break" && ldField.label) {
            laFieldWithType.push(
                `${LDoctype} > Section Break : ${LDoctype} | ${ldField.label} - Section`
            );
        }

        if (!LaNotInclude.includes(ldField.fieldtype)) {

            laFieldWithType.push(
                `${LDoctype} > Parent Doctype : ${LDoctype} | ${ldField.fieldname} - ${ldField.fieldtype}`
            );

            // Store STATUS OPTIONS
            if (ldField.fieldname === "status" && ldField.options) {

                const laStatusOptions = ldField.options.split('\n');

                laStatusOptions.forEach(lStatus => {
                    laFieldWithType.push(
                        `${LDoctype} > Status Option : ${LDoctype} | ${lStatus} - Status`
                    );
                });
            }
        }
    }

    for (let ldChildField of laChildFields) {

        const lChildFieldName = ldChildField.fieldname;

        if (ldChildField.meta) {

            for (let ldMetaField of ldChildField.meta.fields) {

                // Store TAB BREAK
                if (ldMetaField.fieldtype === "Tab Break" && ldMetaField.label) {
                    laFieldWithType.push(
                        `${LDoctype} > Tab Break : ${lChildFieldName} | ${ldMetaField.label} - Tab`
                    );
                }

                // Store SECTION BREAK
                if (ldMetaField.fieldtype === "Section Break" && ldMetaField.label) {
                    laFieldWithType.push(
                        `${LDoctype} > Section Break : ${lChildFieldName} | ${ldMetaField.label} - Section`
                    );
                }

                if (!LaNotInclude.includes(ldMetaField.fieldtype)) {

                    laFieldWithType.push(
                        `${LDoctype} > Child Name: ${lChildFieldName} | ${ldMetaField.fieldname} - ${ldMetaField.fieldtype}`
                    );
                }
            }
        }
    }

    const LExisting = frm.doc.json_response || '';
    const LNew = laFieldWithType.join('\n');

    let LFinal = LNew;

    if (LExisting && LExisting.trim() !== '') {

        const LaExistingLines = LExisting.split('\n');
        const LaNewLines = LNew.split('\n');

        const LaMerged = Array.from(new Set([...LaExistingLines, ...LaNewLines]));
        LFinal = LaMerged.join('\n');
    }

    frm.set_value('json_response', LFinal);
}

function fnGetMetaOptions(iJsonResponse, iDoctype, iType) {

    if (!iJsonResponse || !iDoctype || !iType) return [];

    const LaLines = iJsonResponse.split('\n');
    const LaResult = new Set();
    if (iType == "Tab Break"){
        LaResult.add("Details");   
    }

    LaLines.forEach(line => {

        const LaParts = line.split('|').map(part => part.trim());

        const LDoctype = LaParts[0]?.split('>')[0]?.trim();
        const LTypeInfo = LaParts[0]?.split('>')[1]?.trim();
        const LLabel = LaParts[1]?.split('-')[0]?.trim();

        if (LDoctype === iDoctype && LTypeInfo?.startsWith(iType) && LLabel) {
            LaResult.add(LLabel);
        }
        
    });

    return Array.from(LaResult);
}

// Function to get field names based on selected child_name
function fnGetFieldNamesForChild(iJsonResponse, iChildName, iDoctype) {

    if (!iJsonResponse || !iChildName || !iDoctype) return [];
    const LaNotInclude = ["Tab", "Section"];

    const LaLines = iJsonResponse.split('\n');
    const LaFieldOptions = [];

    LaLines.forEach((line) => {

        const LaParts = line.split('|').map((part) => part.trim());

        const LDoctype = LaParts[0]?.split('>')[0]?.trim();
        const LTypeInfo = LaParts[0]?.split('>')[1]?.trim();
        const LKey = LTypeInfo?.split(':')[1]?.trim();

        const LaFieldType = LaParts[1]?.split('-')[1]?.trim(); 
        const LaFieldLabel = LaParts[1]?.split('-')[0]?.trim(); 

        if (LDoctype === iDoctype && LKey === iChildName && !LaNotInclude.includes(LaFieldType)) {
            LaFieldOptions.push(LaFieldLabel);
        }
    });

    return LaFieldOptions;
}

// Function to get all field names (excluding Parent Doctype and Child Name)
function fnGetAllFieldNames(iJsonResponse, iDoctype) {

    if (!iJsonResponse || !iDoctype) return [];
    const LaNotInclude = ["Tab", "Section"];

    const LaLines = iJsonResponse.split('\n');
    const LaFieldNames = [];

    LaLines.forEach((line) => {

        const LaParts = line.split('|').map((part) => part.trim());

        const LDoctype = LaParts[0]?.split('>')[0]?.trim();
        const LTypeInfo = LaParts[0]?.split('>')[1]?.trim();

        const LaFieldLabel = LaParts[1]?.split('-')[0]?.trim();
        const LaFieldType = LaParts[1]?.split('-')[1]?.trim();

        if (
            LDoctype === iDoctype &&
            LTypeInfo?.startsWith('Parent Doctype') &&
            LaFieldLabel &&
            !LaNotInclude.includes(LaFieldType) &&
            LaFieldType !== 'Table'
        ) {
            LaFieldNames.push(LaFieldLabel);
        }
    });

    return LaFieldNames;
}


// Function to get unique child names from iJsonResponse
function fnGetUniqueChildNames(iJsonResponse, iDoctype) {

    if (!iJsonResponse || !iDoctype) return [];
    const LaNotInclude = ["Tab", "Section"];

    const LaLines = iJsonResponse.split('\n');
    const LaChildNames = new Set();

    LaLines.forEach((line) => {

        const LaParts = line.split('|').map((part) => part.trim());

        const LDoctype = LaParts[0]?.split('>')[0]?.trim();
        const LTypeInfo = LaParts[0]?.split('>')[1]?.trim();
        const LKey = LTypeInfo?.split(':')[1]?.trim();
        const LaFieldType = LaParts[1]?.split('-')[1]?.trim();

        if (
            LDoctype === iDoctype && 
            LTypeInfo?.startsWith('Child Name') && 
            LKey &&
            !LaNotInclude.includes(LaFieldType)
        ) {
            LaChildNames.add(LKey);
        }
    });

    return Array.from(LaChildNames);
}

function fnResetParentFieldConfiguration(frm, cdt, cdn, iDoctype, iResetValues = true) {

    if (!frm.doc.json_response || !iDoctype) return;

    const row = locals[cdt][cdn];
    const grid = frm.fields_dict["test_fields"].grid;

    const laParentFieldNames = fnGetAllFieldNames(frm.doc.json_response, iDoctype);

    const laChildNames = fnGetUniqueChildNames(frm.doc.json_response, iDoctype);

    const laStatusOptions = fnGetMetaOptions(frm.doc.json_response, iDoctype, "Status Option");

    const laTabs = fnGetMetaOptions(frm.doc.json_response, iDoctype, "Tab Break");

    const laSections =fnGetMetaOptions(frm.doc.json_response, iDoctype, "Section Break");
    grid.update_docfield_property("field_name", "options", laParentFieldNames.join("\n"));

    grid.update_docfield_property("child_name", "options", laChildNames.join("\n"));

    grid.update_docfield_property("status", "options", laStatusOptions.join("\n"));

    grid.update_docfield_property("tab", "options", laTabs.join("\n"));

    grid.update_docfield_property("section", "options", laSections.join("\n"));

    if (iResetValues) {

        frappe.model.set_value(cdt, cdn, "child_name", "");
        frappe.model.set_value(cdt, cdn, "is_child", 0);

        const LDefaultValue = laParentFieldNames[0] || "";
        frappe.model.set_value(cdt, cdn, "field_name", LDefaultValue);
        grid.refresh();
    }
}

frappe.ui.form.on('Test Fields', {
    form_render(frm, cdt, cdn) {

        const row = locals[cdt][cdn];
        const grid = frm.fields_dict["test_fields"].grid;
        if (!row.connecting_doctype) {
          row.connecting_doctype = frm.doc.doctype_to_be_tested;
        }

        fnResetParentFieldConfiguration(frm, cdt, cdn, row.connecting_doctype, false);
        if (row.is_child) {
            if (row.child_name) {
                // Get fields for existing child_name
                const LaChildFields = fnGetFieldNamesForChild(
                    frm.doc.json_response,
                    row.child_name,
                    row.connecting_doctype
                );

                // Update field_name options
                grid.update_docfield_property("field_name", "options", LaChildFields.join('\n'));

                // Set field_name only if empty
                if (!row.field_name && LaChildFields.length > 0) {
                    frappe.model.set_value(cdt, cdn, 'field_name', LaChildFields[0]);
                }

                grid.refresh();
            }
        }
    },
    
    field_name(frm, cdt, cdn) {
        const LdItem = locals[cdt][cdn];
        if (!LdItem.pos) {
            // Call fnGetPos function here to set the pos
            frm.events.fnGetPos(frm, LdItem);  
        }
        // Ensure that pos is updated when field_name changes
        if (LdItem.pos) {
            // If pos is set already, call the same logic as `action`
            frm.events.fnGetPos(frm, LdItem);
        }
    },

    action(frm, cdt, cdn) {
        const LdItem = locals[cdt][cdn];
        if (!LdItem.pos) {
            frm.events.fnGetPos(frm, LdItem);  
        }
        // Ensure that pos is updated on action
        if (LdItem.pos && LdItem.action) {
            // Recalculate pos after action is triggered
            frm.events.fnGetPos(frm, LdItem); 
        }
        // Whenever the Create Doc action is clicked, Specify the doctype for creation
        if (LdItem.action === "Create Doc" && frm.doc.doctype_to_be_tested) {
            const LformattedValue = frm.doc.doctype_to_be_tested.toLowerCase().replace(/\s+/g, '-');
            frappe.model.set_value(cdt, cdn, "value", LformattedValue);
        }
    },
    test_fields_add(frm, cdt, cdn) {
        const ldItem = locals[cdt][cdn];
        // Set connecting_doctype same as doctype_to_be_tested
        if (frm.doc.doctype_to_be_tested) {
            frappe.model.set_value(cdt, cdn, "connecting_doctype", frm.doc.doctype_to_be_tested);
        }
        fnResetParentFieldConfiguration(frm, cdt, cdn, frm.doc.doctype_to_be_tested, true);
    },

    is_child(frm, cdt, cdn) {
        const ldItem = locals[cdt][cdn];
        const is_child = ldItem.is_child;
        if (!frm.doc.json_response || frm.doc.json_response.trim() === '') {
            frappe.msgprint(__('Please fetch the doctype details first.'));
            return;
        }

        if (is_child) {
            const LaChildNames = fnGetUniqueChildNames(frm.doc.json_response, ldItem.connecting_doctype);
            
            // Clear field_name when is_child is checked
            frappe.model.set_value(cdt, cdn, 'field_name', '');  // Clear field_name
            frappe.model.set_value(cdt, cdn, 'child_name', '');  // Clear child_name

            // Update child_name dropdown with only child table names
            frm.fields_dict["test_fields"].grid.update_docfield_property("child_name", "options", LaChildNames.join('\n'));
            
            // Ensure field_name options are cleared
            frm.fields_dict["test_fields"].grid.update_docfield_property("field_name", "options", '');
            
            // Set the first available field as default (or empty string if none exist)
            const LaChildDefaultValue = LaChildNames[0] || ""; 
            frappe.model.set_value(cdt, ldItem.name, "child_name", LaChildDefaultValue);

            frm.fields_dict["test_fields"].grid.refresh();
        } else {
            frappe.model.set_value(cdt, cdn, 'child_name', '');
            frm.fields_dict["test_fields"].grid.update_docfield_property("child_name", "options", ''); 

            // Repopulate field_name with only parent fields
            const all_field_names = fnGetAllFieldNames(frm.doc.json_response, ldItem.connecting_doctype);
            frm.fields_dict["test_fields"].grid.update_docfield_property("field_name", "options", all_field_names.join('\n'));
            frm.fields_dict["test_fields"].grid.refresh();
        }
    },
    child_name(frm, cdt, cdn) {
        const ldItem = locals[cdt][cdn];
        const LaFieldOptions = fnGetFieldNamesForChild(frm.doc.json_response, ldItem.child_name, ldItem.connecting_doctype);
        if (ldItem.child_name) {
            
            // Ensure the field list updates properly
            frappe.model.set_value(cdt, cdn, 'field_name', '');
            frm.fields_dict["test_fields"].grid.update_docfield_property("field_name", "options", LaFieldOptions.join('\n'));
        }         
        frm.fields_dict["test_fields"].grid.refresh();
    },
    
    connecting_doctype(frm, cdt, cdn) {
        const ldItem = locals[cdt][cdn];
        if (!frm.doc.site) return;
    
        // Update options
        fnFetchDoctypeList(frm, true);
    
        // Fetch meta for selected connecting_doctype
        if (ldItem.connecting_doctype != frm.doc.doctype_to_be_tested) {
            fnFetchDoctypeDetails(frm, ldItem.connecting_doctype);
        }
        fnResetParentFieldConfiguration(frm, cdt, cdn, ldItem.connecting_doctype, true);
    }
});