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
const filesListPath = path.join(current_path, 'txt', 'documentList.txt');
 
// Function to create the "document" folder if it doesn't exist
function ensureDocumentFolderExists() {
  const documentFolderPath = path.join(current_path, '..', 'document');
  if (!fs.existsSync(documentFolderPath)) {
    fs.mkdirSync(documentFolderPath, { recursive: true });
    console.log('Created "document" folder.');
  }
}
 
// Ensure "document" folder exists
ensureDocumentFolderExists();
 
const baseUrl = getEndPointForDoctype();
 
// Read filters from the configuration file
const configContent = fs.readFileSync(path.join(current_path, 'txt', 'documentList.txt'), 'utf8');
const filtersLine = configContent.split('\n').find(line => line.startsWith('filters ='));
const filters = filtersLine ? filtersLine.match(/filters\s*=\s*(.*)/)?.[1]?.trim() || '' : ''; 
 
// Parse files to process
const filesToProcess = fs.readFileSync(filesListPath, 'utf8')
  .split('\n')
  .map(line => line.trim())
  .filter(line => line && !line.startsWith('#'));
 
// Function to clean an item by removing timestamp fields and the 'name' field from child tables
function cleanItem(item) {
  const { modified, modified_by, owner, creation, ...cleanedItem } = item;
 
  for (const key in cleanedItem) {
    if (Array.isArray(cleanedItem[key])) {
      cleanedItem[key] = cleanedItem[key].map(childItem => {
        const { name, ...cleanedChildItem } = childItem;
        return cleanItem(cleanedChildItem); // Recursively clean child items
      });
    }
  }
 
  return cleanedItem;
}
 
// Function to fetch data for a single document or multiple documents
async function fetchData(fetchUrl, folderName, fileName) {
  try {
    const response = await fetch(fetchUrl, requestOptions);
    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorMessage}`);
    }

    const data = await response.json();
    if (data && data.data) {
      const documentDetails = data.data;

      // If it's a single document, handle directly
      if (!Array.isArray(documentDetails)) {
        const cleanedItem = cleanItem(documentDetails);
        await writeToFile(folderName, fileName, cleanedItem);
      } else {
        // If it's an array, process each document individually
        for (const item of documentDetails) {
          const cleanedItem = cleanItem(item);
          const individualFileName = item.name;
          await writeToFile(folderName, individualFileName, cleanedItem);
        }
      }
    } else {
      console.error('Invalid or empty data received from the API.');
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

// Function to fetch the list of document names
async function fetchDocumentNames(fetchUrl) {
  try {
    const response = await fetch(fetchUrl, requestOptions);
    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorMessage}`);
    }
 
    const data = await response.json();
    return data.data.map(doc => doc.name); // Return the list of document names
  } catch (error) {
    console.error('Error fetching document names:', error);
    return [];
  }
}
 
// Function to fetch detailed data for a single document
async function fetchDocumentDetails(documentName, folderName) {
  try {
    const fetchUrl = `${baseUrl}${folderName}/${documentName}?fields=["*"]`;
    const response = await fetch(fetchUrl, requestOptions);
    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorMessage}`);
    }
 
    const data = await response.json();
    if (data && data.data) {
      const cleanedItem = cleanItem(data.data);
      await writeToFile(folderName, documentName, cleanedItem);
    } else {
      console.error('Invalid or empty data received from the API.');
    }
  } catch (error) {
    console.error('Error fetching document details:', error);
  }
}
 
// Function to write cleaned data to JSON file
function writeToFile(folderName, fileName, data) {
  const folderPath = path.join(current_path, '..', 'document', folderName);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(`Created folder for: ${folderName}`);
  }
 
  const jsonFileName = path.join(folderPath, `${fileName}.json`);
  
  fs.writeFileSync(jsonFileName, JSON.stringify(data, null, 2), { flag: 'w' });
  console.log('JSON file created successfully:', jsonFileName);
}
 
// Loop through each line in the list
(async () => {
  for (const line of filesToProcess) {
    const [key, value] = line.split('=').map(part => part.trim());
 
    if (key === 'Single Document') {
      const fetchUrl = `${baseUrl}${value}/${value}?fields=["*"]&limit_page_length=0`;
      await fetchData(fetchUrl, 'singleDocument', value);
 
    } else if (key === 'Document') {
      // Step 1: Fetch the list of document names
      const filterQuery = filters ? `&filters=${filters}` : '';
      const listFetchUrl = `${baseUrl}${value}?fields=["name"]${filterQuery}&limit_page_length=0`;
      const documentNames = await fetchDocumentNames(listFetchUrl);
 
      // Step 2: Fetch details for each document name
      for (const documentName of documentNames) {
        await fetchDocumentDetails(documentName, value);
      }
    }
  }
})();