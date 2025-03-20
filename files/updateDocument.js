/* eslint-disable */
import { getEndPointForDoctype } from "./external.js";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '../../.env' });

const myHeaders = new Headers();
myHeaders.append("Authorization", process.env.HOST_KEY);
myHeaders.append("Content-Type", "application/json"); // Set the content type

// Get the project root directory dynamically
const rootPath = path.resolve(process.cwd(), '..');
const filesListPath = path.join(process.cwd(), 'txt', 'documentList.txt'); // Path to documentList.txt

// Function to upload a JSON file
async function uploadJsonFile(filePath, isSingleDocument, folderName = "") {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);
    const baseUrl = getEndPointForDoctype();

    const requestUrl = isSingleDocument
      ? `${baseUrl}${jsonData.name}/${jsonData.name}`
      : `${baseUrl}${folderName}/${jsonData.name}`;

    const putResponse = await fetch(requestUrl, {
      method: "PUT",
      headers: myHeaders,
      body: JSON.stringify(jsonData),
    });

    if (putResponse.ok) {
      console.log(`Updated document: ${jsonData.name}`);
    } else if (putResponse.status === 404) {
      console.log(`Document not found for ${jsonData.name}. Trying to create it with POST...`);
      delete jsonData.name;
      const postResponse = await fetch(`${baseUrl}${folderName}`, {
        method: "POST",
        headers: myHeaders,
        body: JSON.stringify(jsonData),
      });

      if (postResponse.ok) {
        console.log(`Created document: ${jsonData.name}`);
      } else {
        const errorMessage = await postResponse.text();
        console.log(`HTTP error on POST! Status: ${postResponse.status}, Message: ${errorMessage}`);
      }
    } else {
      const errorMessage = await putResponse.text();
      console.log(`HTTP error on PUT! Status: ${putResponse.status}, Message: ${errorMessage}`);
    }
  } catch (error) {
    console.log(`Error during request: ${error.message}`);
  }
}

// Function to process directories and files
async function processDirectory(directory, isSingleDocument) {
  try {
    const filesAndDirs = fs.readdirSync(directory);

    for (const entry of filesAndDirs) {
      const entryPath = path.join(directory, entry);
      const stat = fs.statSync(entryPath);

      if (stat.isDirectory()) {
        await processDirectory(entryPath, isSingleDocument);
      } else if (entry.endsWith('.json') && stat.isFile()) {
        console.log(`Processing JSON file: ${entryPath}`);
        await uploadJsonFile(entryPath, isSingleDocument, path.basename(directory));
      }
    }
  } catch (error) {
    console.log(`Error processing directory: ${error.message}`);
  }
}

// Function to process JSON files from the documentList.txt
async function processJsonFilesFromList(filePath) {
  try {
    const filePaths = fs.readFileSync(filePath, 'utf8').split('\n').map(line => line.trim()).filter(Boolean);
    // Filter paths to only include those starting with "document/"
    const documentPaths = filePaths.filter(relativePath => relativePath.startsWith('document/'));
 
    for (const relativePath of documentPaths) {
      const absolutePath = path.join(rootPath, relativePath); // Resolve paths from root directory
      console.log(`Processing path: ${absolutePath}`);

      if (fs.existsSync(absolutePath)) {
        const stat = fs.statSync(absolutePath);

        if (stat.isDirectory()) {
          console.log(`Traversing directory: ${absolutePath}`);
          const isSingleDocument = relativePath.includes('singleDocument');
          await processDirectory(absolutePath, isSingleDocument);
        } else if (stat.isFile() && absolutePath.endsWith('.json')) {
          console.log(`Processing single JSON file: ${absolutePath}`);
          const isSingleDocument = relativePath.includes('singleDocument');
          await uploadJsonFile(absolutePath, isSingleDocument, path.basename(path.dirname(absolutePath)));
        }
      } else {
        console.log(`Path does not exist: ${absolutePath}`);
      }
    }
  } catch (error) {
    console.log(`Error processing files from list: ${error.message}`);
  }
}

// Start processing JSON files listed in the documentList.txt
processJsonFilesFromList(filesListPath).catch(console.error);