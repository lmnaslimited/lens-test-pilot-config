/* eslint-disable */
import fs from 'fs';
import { getEndPointForDoctype } from './functions.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '../.env' });

const myHeaders = new Headers();
myHeaders.append("Authorization", process.env.KEY);

const requestOptions = {
  method: "GET",
  headers: myHeaders,
  redirect: "follow"
};

const current_path = process.cwd();
// Create the customField directory if it doesn't exist
const customFieldFolder = path.join(current_path, '..', 'customField');
if (!fs.existsSync(customFieldFolder)) {
    fs.mkdirSync(customFieldFolder);
}

// Fetch all custom fields from the API
const url = getEndPointForDoctype('Custom Field');

// Function to fetch data from API and create or update files per Doctype
async function createCustomFieldFiles() {
  try {
    // Fetch all custom fields (no Doctype filtering)
    const response = await fetch(`${url}?fields=["*"]&&limit_page_length=0`, requestOptions);
    const data = await response.json();

    // Ensure the API response contains data
    if (!data.data || data.data.length === 0) {
      console.log("No custom fields found");
      return;
    }

    // Group custom fields by Doctype ('dt')
    const groupedByDoctype = data.data.reduce((acc, item) => {
      const doctype = item.dt; // Get the Doctype (e.g., 'Quotation')
      if (!acc[doctype]) {
        acc[doctype] = []; // Create an array for this Doctype if it doesn't exist
      }
      // Remove specified keys
      const { modified, modified_by, owner, creation, ...filteredItem } = item; // Destructure and exclude keys
      acc[doctype].push(filteredItem); // Add the filtered custom field to the Doctype's array
      return acc;
    }, {});

    // Create or update a JSON file for each Doctype
    Object.keys(groupedByDoctype).forEach((doctype) => {
      const filename = `${doctype}.json`; // Use the Doctype name as the filename
      const filePath = path.join(customFieldFolder, filename);

      // Write the JSON data for the Doctype to the file
      fs.writeFileSync(filePath, JSON.stringify(groupedByDoctype[doctype], null, 2), 'utf8');
      console.log(`Created/Updated file: ${filename} with ${groupedByDoctype[doctype].length} custom fields for ${doctype}`);
    });
  } catch (error) {
    console.error('Error fetching or updating files:', error);
  }
}

// Run the function
createCustomFieldFiles();