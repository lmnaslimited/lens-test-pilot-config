l_document = frappe.form_dict.get('i_document')

if l_document:
    # Fetch parent document metadata
    parent_meta = frappe.get_meta(l_document)

    if parent_meta:
        # Prepare parent document metadata dictionary
        parent_dict = parent_meta.as_dict()
        frappe.msgprint(str(parent_dict))
        # Initialize child_meta as None to store metadata for the first child table found
        child_meta_list = []

        # Iterate through fields to gather child table metadata
        for field in parent_meta.fields:
            if field.fieldtype == 'Table' and field.options:
                # Append fieldname and child meta to the list
                child_meta_list.append({
                    "fieldname": field.fieldname,
                    "meta": frappe.get_meta(field.options)
                })

        # Combine parent and child metadata into a single result dictionary
        result = {
            "parent": parent_dict,
            "child": child_meta_list  # List of child metadata
        }

    # Optionally set to frappe.flags
    frappe.flags = result



# l_document = frappe.form_dict.get('i_document')
# # result = {
# #     "parent": {},
# #     "child": []
# # }

# # if l_document:
# #     parent_meta = frappe.get_meta(l_document)
# #     if parent_meta:
# #         child_meta_list = []
# #         for field in parent_meta.fields:
# #             if field.fieldtype == 'Table' and field.options:
# #                 child_meta = frappe.get_meta(field.options)
# #                 if child_meta:  # Ensure the child meta exists
# #                     child_meta_list.append({
# #                         "fieldname": field.fieldname,
# #                         "meta": child_meta.as_dict()  # Convert to dictionary
# #                     })
# #         result["parent"] = parent_meta.as_dict()  # Convert parent meta to dictionary
# #         result["child"] = child_meta_list

# # # Log or print the result for debugging
# # frappe.msgprint(str(result))
# result = {"key": "Hello"}
# # # Store the result in frappe.flags for lifecycle use
# frappe.flags = result

