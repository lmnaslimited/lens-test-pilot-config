frappe.ui.form.on('Test Case Configurator', {
	refresh(frm) {
	   // set the action field's options based on test type
		frm.events.fnSetActionFieldOptions(frm);
	},
	test_type(frm){
	    // set the action field's options based on test type
	    frm.events.fnSetActionFieldOptions(frm);
	},
	
	/**
	 * Sets the "action" field dropdown options based on the selected test_type.
	 * 
	 * Logic:
	 *  - If test_type = "UI"  → Set Create, Update, Connection
	 *  - If test_type = "API" → Set GET, PUT, POST
	 */
	fnSetActionFieldOptions(frm){
	    switch(frm.doc.test_type){
		    case "UI":
		        frm.set_df_property("action", 'options', ["Create", "Update", "Connection"]);
		        break;
		    
		    case "API":
		        frm.set_df_property("action", 'options', ["GET", "PUT", "POST"]);
		        break;
		}
	}
})