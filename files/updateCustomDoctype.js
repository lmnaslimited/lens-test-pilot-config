/* eslint-disable */
import { getEndPointForDoctype } from "./functions.js";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
 
dotenv.config({ path: '../.env' });
 
const myHeaders = new Headers();
myHeaders.append("Authorization", process.env.KEY);
myHeaders.append("Content-Type", "application/json");
 
const current_path = process.cwd();
const customDoctypeFolderPath = path.join(current_path, '..', 'customDoctype');
 
// Read the doctypeList.txt file
function getAllowedFiles() {
  const doctypeListPath = path.join(current_path, 'txt',  'doctypeList.txt');
  try {
    if (fs.existsSync(doctypeListPath)) {
      const doctypeList = fs.readFileSync(doctypeListPath, 'utf8');
      return doctypeList
        .split(/\r?\n/)
        .filter(Boolean)
        .map((fileName) => `${fileName}.json`); // Add .json to each file name
    } else {
      console.error('doctypeList.txt not found!');
      return [];
    }
  } catch (error) {
    console.error('Error reading doctypeList.txt:', error);
    return [];
  }
}
 
// Function to upload a JSON file
async function uploadJsonFile(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);
    const baseUrl = getEndPointForDoctype("Custom Doctype");
    const requestUrl = `${baseUrl}/${jsonData.name}`;
 
    // Try PUT request first
    const putResponse = await fetch(requestUrl, {
      method: "PUT",
      headers: myHeaders,
      body: JSON.stringify(jsonData),
    });
 
    if (putResponse.ok) {
      console.log('Updated document:', jsonData.name);
    } else if (putResponse.status === 404) {
      console.log(`Document not found for ${jsonData.name}. Trying to create it with POST...`);
 
      const postResponse = await fetch(baseUrl, {
        method: "POST",
        headers: myHeaders,
        body: JSON.stringify(jsonData),
      });
 
      if (postResponse.ok) {
        console.log('Created document:', jsonData.name);
      } else {
        const errorMessage = await postResponse.text();
        console.error(`HTTP error on POST! Status: ${postResponse.status}, Message: ${errorMessage}`);
      }
    } else {
      const errorMessage = await putResponse.text();
      console.error(`HTTP error on PUT! Status: ${putResponse.status}, Message: ${errorMessage}`);
    }
  } catch (error) {
    console.error('Error during request:', error);
  }
}
 
// Function to process JSON files in all subdirectories
async function processJsonFiles(directory, allowedFiles) {
  try {
    const subDirectories = [
      'customChildDoctype',
      'customSingleDoctype',
      'parent',
    ];
 
    for (const subDir of subDirectories) {
      const directoryPath = path.join(directory, subDir);
      if (fs.existsSync(directoryPath)) {
        const files = fs.readdirSync(directoryPath);
        for (const file of files) {
          if (allowedFiles.includes(file) && fs.statSync(path.join(directoryPath, file)).isFile()) {
            console.log(`Processing allowed file: ${file}`);
            await uploadJsonFile(path.join(directoryPath, file));
          } else {
            console.log(`Skipping file: ${file}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing JSON files:', error);
  }
}
 
// Start processing the JSON files
(async function start() {
  const allowedFiles = getAllowedFiles();
  if (allowedFiles.length === 0) {
    console.error('No files to process!');
    return;
  }
 
  await processJsonFiles(customDoctypeFolderPath, allowedFiles);
})();
 