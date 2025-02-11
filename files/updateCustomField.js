/* eslint-disable */
import fs from 'fs';
import { getEndPointForDoctype } from './functions.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '../.env' });

const myHeaders = new Headers();
myHeaders.append("Authorization", process.env.KEY);
myHeaders.append("Content-Type", "application/json");

const requestOptionsPUT = {
  method: "PUT",
  headers: myHeaders,
  redirect: "follow"
};

const requestOptionsPOST = {
  method: "POST",
  headers: myHeaders,
  redirect: "follow"
};

const current_path = process.cwd();
const customFieldFolder = path.join(current_path, '..', 'customField');
const filesListPath = path.join(current_path, 'txt', 'customFieldMigrate.txt'); // Path to the files list

// Fetch all custom fields from the API
const url = getEndPointForDoctype('Custom Field');

// Function to read the specified JSON files and update the fields via PUT request
async function updateCustomFields() {
  try {
    // Read the files list from files.txt
    const filesToProcess = fs.readFileSync(filesListPath, 'utf8').split('\n').map(file => file.trim()).filter(line => line && !line.startsWith('#'));

    if (filesToProcess.length === 1 && filesToProcess[0] === 'Skip') {
      console.log('Custom field updating process is skipped as per the txt file.');
      return;
    }

    // If filesToProcess is empty, read all JSON files in the customField directory
    if (filesToProcess.length === 0) {
      console.log('No files specified in files.txt. Processing all JSON files in the customField directory.');
      const allFiles = fs.readdirSync(customFieldFolder).filter(file => file.endsWith('.json'));
      for (const file of allFiles) {
        const filePath = path.join(customFieldFolder, file);
        await processCustomFieldFile(filePath);
      }
    } else {
      // Process each specified JSON file
      for (const file of filesToProcess) {
        const filePath = path.join(customFieldFolder, file);
        // Check if the file exists before processing
        if (fs.existsSync(filePath)) {
          await processCustomFieldFile(filePath);
        } else {
          console.log(`File not found: ${file}`);
        }
      }
    }
  } catch (error) {
    console.error('Error reading or updating custom fields:', error);
  }
}

// Function to process a custom field JSON file
async function processCustomFieldFile(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const customFields = JSON.parse(fileContent);

  // Process each custom field in the file and update it via PUT
  for (const field of customFields) {
    await updateCustomField(field);
  }
}

// Function to update each custom field via PUT request
async function updateCustomField(field) {
  const customFieldName = field.name;
  const fieldUrl = `${url}/${customFieldName}`; // API URL to update the custom field

  try {
    console.log(`Updating custom field: ${customFieldName}`);
    const response = await fetch(fieldUrl, {
      ...requestOptionsPUT,
      body: JSON.stringify(field) // Send the field data in the request body
    });

    if (response.ok) {
      console.log(`Successfully updated custom field: ${customFieldName}`);
    } else if (response.status === 404) {
      console.warn(`Custom field not found for update: ${customFieldName}. Attempting to create it via POST.`);
      await createCustomField(field);
    } else {
      console.error(`Failed to update custom field: ${customFieldName}`, await response.text());
    }
  } catch (error) {
    console.error(`Error updating custom field: ${customFieldName}`, error);
  }
}

// Function to create a new custom field via POST request
async function createCustomField(field) {
  try {
    const response = await fetch(url, {
      ...requestOptionsPOST,
      body: JSON.stringify(field) // Send the field data in the request body
    });

    if (response.ok) {
      console.log(`Successfully created custom field: ${field.name}`);
    } else {
      console.error(`Failed to create custom field: ${field.name}`, await response.text());
    }
  } catch (error) {
    console.error(`Error creating custom field: ${field.name}`, error);
  }
}

// Run the update function
updateCustomFields();