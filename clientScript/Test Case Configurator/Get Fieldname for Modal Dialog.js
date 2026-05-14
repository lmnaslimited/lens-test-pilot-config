frappe.ui.form.on("Test Case Configurator", {
  refresh(frm) {
    frm.add_custom_button(__("Get Modal Field"), () => {
	// Launch helper dialog so testers can directly paste inspected modal HTML
    // without manually identifying fieldnames from browser DOM
      const LdDialog = new frappe.ui.Dialog({
        title: "Extract Modal Fields",
        fields: [
			// Instructions help standardize the copied HTML structure
            // so field extraction works consistently across dialogs
          {
            fieldtype: "HTML",
            fieldname: "instructions",
            options: `
							<div style="margin-bottom: 15px;">
								<p><b>Instructions:</b></p>
								<ol style="padding-left: 18px;">
									<li>Inspect the Modal Dialog you wish to test in the site.</li>
									<li>From the Inspect Element tab, copy the full <b>modal-dialog</b> HTML element.</li>
									<li>Paste it below.</li>
								</ol>
							</div>
						`,
          },
          {
            fieldtype: "Small Text",
            fieldname: "modal_html",
            label: "Modal HTML",
            reqd: 1,
          },
        ],

        primary_action_label: "Confirm",

        primary_action(idValues) {
		  // Prevent processing when modal HTML is not provided
          if (!idValues.modal_html) {
            frappe.msgprint(__("Please paste the modal HTML."));
            return;
          }

          try {
			// Convert pasted modal HTML into searchable DOM structure
            const LdParser = new DOMParser();
            const LdDoc = LdParser.parseFromString(
              idValues.modal_html,
              "text/html"
            );
			// Store extracted field mappings from modal
            const LaExtractedFields = [];

            // Frappe controls are the most reliable source for extracting
			// metadata because fieldname/type are consistently maintained there
            const LaControls = LdDoc.querySelectorAll(".frappe-control");

            LaControls.forEach((idControl) => {
              const LFieldtype = idControl.getAttribute("data-fieldtype");
              const LFieldname = idControl.getAttribute("data-fieldname");

             // Handle child table fields separately because grid columns
			// are structured differently from normal modal fields
              if (LFieldtype === "Table") {
				// Use child table fieldname as the grid identifier
                const LChildTableName = LFieldname;

                // Read all visible columns from the child table grid
                const LaColumns =
                  idControl.querySelectorAll(".grid-static-col");

                LaColumns.forEach((idColumn) => {
                  const LColumnFieldname =
                    idColumn.getAttribute("data-fieldname");

                  const LColumnFieldtype =
                    idColumn.getAttribute("data-fieldtype");
                  // Ignore action/empty columns that are not real fields
                  if (!LColumnFieldname || !LColumnFieldtype) {
                    return;
                  }
				  // Prefer visible UI labels so extracted mappings are readable
                  // for testers during automation configuration
                  const LLabel =
                    idColumn.querySelector(".static-area")?.innerText?.trim() ||
                    idColumn.getAttribute("title") ||
                    LColumnFieldname;
				  // Store child table fields separately so it can
                  // distinguish grid interactions from normal modal fields
                  LaExtractedFields.push(
                    `Modal > Child Name: ${LChildTableName} : ${LLabel} | ${LColumnFieldname} - ${LColumnFieldtype}`
                  );
                });

                return;
              }

              // Prefer visible UI labels so extracted mappings are readable
              // for testers during automation configuration
              const LLabel =
                idControl.querySelector("label")?.innerText?.trim() ||
                idControl.querySelector(".label-area")?.innerText?.trim() ||
                LFieldname;

			  // Store parent modal fields using standard field mapping syntax
              // for reusable automation configuration
              if (LFieldname && LFieldtype && LFieldtype !== "Table") {
                LaExtractedFields.push(
                  `Modal > Parent Doctype : ${LLabel} | ${LFieldname} - ${LFieldtype}`
                );
              }
            });

            // Remove duplicate entries caused by repeated DOM structures
            // or multiple extraction attempts
            const LaUniqueFields = [...new Set(LaExtractedFields)];

            if (!LaUniqueFields.length) {
              frappe.msgprint(__("No fields found in the provided modal HTML."));
              return;
            }
			// Read existing mappings to set the values
            const LExistingValue = frm.doc.json_response || "";
            // Normalize stored items before comparison to avoid
            // whitespace-based duplicate mismatches
            const LaExistingLines = LExistingValue.split("\n")
              .map((idLine) => idLine.trim())
              .filter(Boolean);

            // Keep only newly discovered fields that are not already present
			// in json_response
            const LaNewFields = LaUniqueFields.filter(
              (idField) => !LaExistingLines.includes(idField)
            );

            if (!LaNewFields.length) {
              frappe.msgprint({
                title: "Info",
                message: __("All extracted fields already exist in json_response."),
                indicator: "blue",
              });

              return;
            }
			// Append only new mappings so existing values are preserved
            const LUpdatedValue =
			LExistingValue +
			(LExistingValue ? "\n" : "") +
			LaNewFields.join("\n");

            frm.set_value("json_response", LUpdatedValue);

            frappe.msgprint({
              title: "Success",
              message: __(`${LaNewFields.length} modal fields extracted successfully.`),
              indicator: "green",
            });

			// Close helper dialog after successful extraction process
            LdDialog.hide();
          } catch (error) {
            console.error(error);

            frappe.msgprint({
              title: "Error",
              message: __("Failed to parse the modal HTML."),
              indicator: "red",
            });
          }
        },
      });

      LdDialog.show();
    });
  },
});