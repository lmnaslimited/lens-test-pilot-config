frappe.ui.form.on('Test Case Configurator', {
    // Function to calculate position and set it to the field (as requested)
   get_pos(frm, item) {
       const prevItem = frm.doc.test_fields[item.idx - 2]; // Get the previous item

       // First row always starts at 10
       if (item.idx === 1) {
           item.pos = 10;
       } else if (item.is_child) {
           // Child rows increment by 0.01
           item.pos = prevItem ? prevItem.pos + 0.01 : 10.01;
       } else {
           // Parent rows increment by 10 when action is clicked
           // If action is clicked, reset to a clean number (e.g., 20, 30), ignoring decimals
           item.pos = prevItem ? (item.action ? Math.floor(prevItem.pos) + 10 : prevItem.pos + 0.01) : 10;
       }

       frm.refresh_field('test_fields'); // Refresh field after setting pos
   },
   site: function (frm) {
       console.log("Site Details", frm.doc.site);
        if (frm.doc.site) {
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
                   let doctype_lists = r.message.doctype_list;
                   console.log("List of Doctypes", doctype_lists);

                   // Convert single value to array if necessary and split by commas
                   if (!Array.isArray(doctype_lists)) {
                       doctype_lists = [doctype_lists]; // Ensure it's an array
                   }

                   // Split by commas, trim spaces, and remove any quotes or brackets
                   doctype_lists = doctype_lists.join(',').split(',').map(item => item.trim().replace(/["\[\]]/g, ''));

                   // Join the list into a single string with newlines
                   frm.set_df_property("doctype_to_be_tested", "options", doctype_lists.join("\n"));

                   frm.refresh_field("doctype_to_be_tested");
               }
           }
       });
   }
       if (frm.doc.site) {
           fetchDoctypeDetails(frm); // Fetch doctype details when site is set
       }
   },

   doctype_to_be_tested: function (frm) {
       console.log("Doctype Selected", frm.doc.doctype_to_be_tested);

       if (frm.doc.site && frm.doc.doctype_to_be_tested) {
           fetchDoctypeDetails(frm); // Fetch doctype details when doctype is set
       }
   },

   refresh(frm) {
       if (frm.doc.site && frm.doc.doctype_to_be_tested) {
           fetchDoctypeDetails(frm); // Fetch doctype details when form is refreshed
       }
   }
});

// Function to fetch doctype details based on site and doctype_to_be_tested
function fetchDoctypeDetails(frm) {
   const site = frm.doc.site;
   const doctype = frm.doc.doctype_to_be_tested;

   // Fetch the authorization key for the site
   frappe.call({
       method: "frappe.client.get_password",
       args: {
           "doctype": "Site Details",
           "name": site,
           "fieldname": "authorization_key"
       },
       callback: function (r) {
           if (r.message) {
               const key = r.message;
               const apiUrl = `${site}/api/method/get_doctype_meta?i_document=${doctype}`;
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
                       // Process the response and set the json_response field
                       processJsonResponse(frm, data);
                   })
                   .catch(error => {
                       console.error('Error fetching data:', error);
                   });
               }
           }
       }
   });
}

// Function to process the JSON response and populate the necessary fields
function processJsonResponse(frm, data) {
   let fields = data.message.parent.fields;
   let childFields = data.message.child;
   let fieldWithType = [];
   const notInclude = ["Column Break", "Section Break", "Tab Break"];

   // Loop through parent fields and process the required ones
   for (let field of fields) {
       if (!notInclude.includes(field.fieldtype)) {
           let fieldName = field.fieldname;
           let fieldType = field.fieldtype;
           let doctype = data.message.parent.name;
           fieldWithType.push(`Parent Doctype : ${doctype} | ${fieldName} - ${fieldType}`);
       }
   }

   // Loop through child fields and process the required ones
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

   // Set value to form field
   frm.set_value('json_response', fieldWithType.join('\n')); 
   const json_response = frm.doc.json_response;
       if (json_response) {
           // Parse JSON response
           const lines = json_response.split('\n');
           const field_names = []; // To store all parent field names
           const child_names = new Set(); // To store unique child names

           lines.forEach((line) => {
               const parts = line.split('|').map((part) => part.trim());
               const key = parts[0]?.split(':')[1]?.trim(); // Extract Parent Doctype or Child Name
               const field_label = parts[1]?.split('-')[0]?.trim(); // Extract Field Name
               const field_type = parts[1]?.split('-')[1]?.trim(); // Extract Field Type

               // Collect parent field names (excluding 'Table' type)
               if (parts[0]?.startsWith('Parent Doctype') && field_label && field_type !== 'Table') {
                   field_names.push(field_label);
               }

               // Collect unique child names from the JSON response
               if (parts[0]?.startsWith('Child Name') && key) {
                   child_names.add(key);
               }
           });

           // Set child_name options based on the unique child names extracted from json_response
           frappe.meta.get_docfield('Test Fields', 'child_name', frm.docname).options = Array.from(child_names).join('\n');

           // Set field_name options depending on whether 'is_child' is checked or not
           if (!frm.doc.test_fields.some(field => field.is_child)) {
               frappe.meta.get_docfield('Test Fields', 'child_name', frm.docname).options = '';
               frappe.meta.get_docfield('Test Fields', 'field_name', frm.docname).options =
                   Array.from(field_names).join('\n');
               frm.refresh_field('test_fields'); // Refresh the child table to reflect changes
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
   action(frm, cdt, cdn) {
       const item = locals[cdt][cdn];
       if (!item.pos) {
           frm.events.get_pos(frm, item);  // Call get_pos function here
       }
   },
   value(frm, cdt, cdn) {
       const item = locals[cdt][cdn];
       if (!item.pos) {
           frm.events.get_pos(frm, item);  // Call get_pos function here
       }
   },

  is_child(frm, cdt, cdn) {
   const item = locals[cdt][cdn];
   const is_child = item.is_child;

   // Check if json_response exists and is not empty
   if (!frm.doc.json_response || frm.doc.json_response.trim() === '') {
       frappe.msgprint(__('Please fetch the doctype details first.'));
       frappe.model.set_value(cdt, cdn, 'is_child', 0);  // Reset checkbox
       return;
   }

   if (is_child) {
       const child_names = getUniqueChildNames(frm.doc.json_response);
       console.log("Child Names:", child_names);  // Debugging

       // Update child_name options in the child table
       let child_field = frappe.meta.get_docfield('Test Fields', 'child_name', frm.doc.name);
       if (child_field) {
           child_field.options = child_names.join('\n');
       }

       // Clear previous selections
       frappe.model.set_value(cdt, cdn, 'child_name', '');
       frappe.model.set_value(cdt, cdn, 'field_name', '');

       // Clear field_name options
       let field_field = frappe.meta.get_docfield('Test Fields', 'field_name', frm.doc.name);
       if (field_field) {
           field_field.options = '';
       }
   } else {
       const field_names = getAllFieldNames(frm.doc.json_response);
       console.log("Field Names:", field_names);  // Debugging

       // Update field_name options in the child table
       let field_field = frappe.meta.get_docfield('Test Fields', 'field_name', frm.doc.name);
       if (field_field) {
           field_field.options = field_names.join('\n');
       }

       // Clear previous selections
       frappe.model.set_value(cdt, cdn, 'child_name', '');
       frappe.model.set_value(cdt, cdn, 'field_name', '');

       // Clear child_name options
       let child_field = frappe.meta.get_docfield('Test Fields', 'child_name', frm.doc.name);
       if (child_field) {
           child_field.options = '';
       }
   }

   // Refresh the specific row in the child table
   frm.fields_dict["test_fields"].grid.refresh();
}




   
});

