frappe.ui.form.on('Master Data', {
    onload(frm){
        frm.refresh_field("status");
        frm.refresh_field("actual_test_fields");
    },
    refresh(frm) {
        frm.set_df_property('actual_test_data', 'cannot_add_rows', true);
        //  Apply row highlights based on change_identifier
        lfnHighlightChangedRows(frm);

        // Show or hide "Confirm Sync" button
        lfnHandleConfirmSyncButton(frm);
    }
});
function lfnHighlightChangedRows(frm) {
    if (!frm.doc.actual_test_data) return;

    frm.doc.actual_test_data.forEach((ldRowData) => {
        const lRowElement = frm.fields_dict["actual_test_data"].grid.grid_rows_by_docname[ldRowData.name]?.row;
        if (!lRowElement) return;

        const $lRow = $(lRowElement);

        // Reset any existing background color
        $lRow.css('background-color', '');

        // Apply color based on change_identifier
        if (ldRowData.change_identifier === "Insert") {
            $lRow.css('background-color', '#d4edda'); // light green
        } else if (ldRowData.change_identifier === "Update") {
            $lRow.css('background-color', '#fff3cd'); // light yellow
        }
    });
}
function lfnHandleConfirmSyncButton(frm) {
    // Clear old buttons to avoid duplicates
    frm.clear_custom_buttons();

    // Conditions to show "Confirm Sync"
    const LIsStale = frm.doc.status === "Stale";
    const LChangedRow = frm.doc.actual_test_data?.some(
        ldRowData => ["Insert", "Update"].includes(ldRowData.change_identifier)
    );

    if (LIsStale && LChangedRow) {
        frm.add_custom_button(__('Confirm Sync'), function() {
            // Use custom dialog (no native confirm)
            const LDialog = new frappe.ui.Dialog({
                title: __("Confirm Sync"),
                fields: [
                    {
                        fieldname: "info",
                        fieldtype: "HTML",
                        options: `<p>Do you want to confirm and mark this Master Data as <b>Active</b>?</p>`
                    }
                ],
                primary_action_label: __("Yes, Confirm"),
                primary_action: async function() {
                    LDialog.hide();

                    // Clear change identifiers in child table
                    (frm.doc.actual_test_data || []).forEach(ldRowData => {
                        ldRowData.change_identifier = "";
                    });

                    //  Update status to "Active"
                    frm.set_value("status", "Active");

                    // Save changes
                    await frm.save();

                    frappe.show_alert({
                        message: __("Master Data confirmed and activated."),
                        indicator: "green"
                    });

                    // Reload form to remove highlights
                    frm.reload_doc();
                },
                secondary_action_label: __("Cancel"),
                secondary_action: () => LDialog.hide()
            });

            LDialog.show();
        }, __("Actions"));
    }
}