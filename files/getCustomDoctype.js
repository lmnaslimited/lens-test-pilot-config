/* eslint-disable */
import { getEndPointForDoctype } from "./functions.js";
import dotenv from 'dotenv';
import fs from 'fs';
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
const filesListPath = path.join(current_path,'txt', 'doctypeList.txt');

// Function to create the "customDoctype" folder if it doesn't exist
function ensureCustomDoctypeFolderExists() {
  const customDoctypeFolderPath = path.join(current_path, '..', 'customDoctype');
  if (!fs.existsSync(customDoctypeFolderPath)) {
    fs.mkdirSync(customDoctypeFolderPath, { recursive: true });
    console.log('Created "customDoctype" folder.');
  }
}

// Ensure "customDoctype" folder exists
ensureCustomDoctypeFolderExists();

const baseUrl = getEndPointForDoctype("Custom Doctype");

const filesToProcess = fs.readFileSync(filesListPath, 'utf8')
  .split('\n')
  .map(file => file.trim())
  .filter(line => line && !line.startsWith('#'));

// Function to clean an item by removing timestamp fields and the 'name' field from child tables
function cleanItem(item) {
  const { modified, modified_by, owner, creation, ...cleanedItem } = item;

  for (const key in cleanedItem) {
    if (Array.isArray(cleanedItem[key])) {
      cleanedItem[key] = cleanedItem[key].map(childItem => {
        // Remove 'name' field from each child item
        const { name, ...cleanedChildItem } = childItem; 
        return cleanItem(cleanedChildItem); // Recursively clean child items
      });
    }
  }
  
  return cleanedItem;
}

// Loop through each file in the list
for (const file of filesToProcess) {
  const fetchUrl = `${baseUrl}/${file}?fields=["*"]&limit_page_length=0`;

  fetch(fetchUrl, requestOptions)
    .then(response => {
      if (!response.ok) {
        return response.text().then(errorMessage => {
          throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorMessage}`);
        });
      }
      return response.json();
    })
    .then(data => {
 
      // Check if the data field is an object
      if (data && data.data && typeof data.data === 'object') {
        const documentDetails = data.data; // Get the document details

        // Adjust folder naming based on is_table and is_single properties
        const folderName = documentDetails.istable === 1
          ? 'customChildDoctype'
          : documentDetails.issingle === 1
          ? 'customSingleDoctype'
          : 'parent'; 

        const folderPath = path.join(current_path, '..', 'customDoctype', folderName);
        const jsonFileName = path.join(folderPath, `${documentDetails.name}.json`);

        // Clean the document details to remove timestamp fields and 'name' fields from child tables
        const cleanedItem = cleanItem(documentDetails);

        // Ensure the folder exists
        fs.mkdirSync(folderPath, { recursive: true });
        console.log('Folder created successfully:', folderName);

        // Create the JSON file for the cleaned document
        fs.writeFile(jsonFileName, JSON.stringify(cleanedItem, null, 2), { flag: 'w' }, (err) => {
          if (err) {
            console.error('Error writing JSON file:', err);
          } else {
            console.log('JSON file created successfully:', jsonFileName);
          }
        });
      } else {
        console.error('Invalid or empty data received from the API.');
      }
    })
    .catch(error => console.error('Error fetching data:', error));
}