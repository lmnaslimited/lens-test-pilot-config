/* eslint-disable */

import { getEndPointForDoctype } from "./functions.js"

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process'; 
dotenv.config({path: '../.env'});

const baseFolder = '../serverScript';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': process.env.KEY,
};

const baseUrl = getEndPointForDoctype("Server Script")

function isFileChanged(filePath) {
  try {
    // Use Git to check if the file is modified
    const gitStatus = execSync(`git status --porcelain "${filePath}"`, { encoding: 'utf-8' }).trim();
    return gitStatus !== '';
  } catch (error) {
    console.error(`Error checking Git status for file ${filePath}: ${error}`);
    return false;
  }
}

function isFileNew(filePath) {
  try {
      // Check if the file exists on the filesystem but is not yet committed
      const isUncommitted = !execSync(`git log --format=%H -- "${filePath}"`, { encoding: 'utf-8' }).trim();
      return isUncommitted;
  } catch (error) {
    console.error(`Error checking Git status for file ${filePath}: ${error}`);
    return false;
  }
}

function createNewResource( requestBody) {
  const requestOptions = {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      redirect: 'follow',
  };
  
  const url = baseUrl;
  

  fetch(url, requestOptions)
      .then(response => {
        if (!response.ok) {
          if (response.status === 409) {
            console.log(`Report creation conflict .... Skipping creation...`);
          } else {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
        } else {
          console.log(`New script created`);
           // Mark the report as created
        }
      }) 
      .catch(error => {
        console.error(`Error creating new script : ${error}`);
      });
}

function processFilesInFolder(folderPath, parentFolder = null) {
  try {
    const files = fs.readdirSync(folderPath);

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        const currentFolder = parentFolder ? `${parentFolder}/${file}` : file;
        processFilesInFolder(filePath, currentFolder); // Recursively process subdirectories
      } else {
        if (file.endsWith('.py')) { // Process only JavaScript files
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const metaFilePath = path.join(folderPath, `${file.replace(/\.py$/, '')}.meta`);

          if (fs.existsSync(metaFilePath)) {
            let metaContent = fs.readFileSync(metaFilePath, 'utf-8');

            // Check if the .meta file is empty or contains valid JSON content
            if (!metaContent) {
              console.log(`Meta file is empty for ${file}, skipping meta content`);
              metaContent = {}; // Provide a default empty object
            } else {
              try {
                metaContent = JSON.parse(metaContent) // Parse the JSON content of .meta file
                delete metaContent.name;
                delete metaContent.owner;
                delete metaContent.modified;
                delete metaContent.modified_by;
                delete metaContent.roles;
                delete metaContent.creation;
              } catch (error) {
                console.error(`Error parsing meta file ${metaFilePath}: ${error}`);
                console.log(`Skipping file ${file} due to invalid meta content`);
                continue; // Skip processing this file if there's an issue with the .meta file
              }
            }

            const encodedFilename = encodeURIComponent(file.replace(/\.py$/, ''));
            const postFilename = file.replace(/\.py$/, '');
            const folderName = parentFolder ? parentFolder : '';

            if (isFileNew(filePath) || isFileChanged(filePath)) {
              // Use PUT for changed files or new files
              const requestOptions = {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                  name: postFilename,
                  script: fileContent,
                  // ...metaContent,
                  script_type: folderName,
                  disabled: 0
                }),
                redirect: 'follow',
              };

              const url = `${baseUrl}/${encodedFilename}`;

              fetch(url, requestOptions)
                .then(response => {
                  if (!response.ok) {
                    if (response.status === 404) {
                      // If the file doesn't exist, create a new resource using POST
                      createNewResource( {
                        name: postFilename,
                        script: fileContent,
                        ...metaContent,
                        script_type: folderName,
                        disabled: 0
                    });
                    } else {
                      throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                  } else {
                    console.log(`Updated script: ${file}`);
                  }
                })
                .catch(error => {
                  console.error(`Error processing file ${file}:`, error);
                });
            }
          } else {
            console.log(`Skipping file ${file} as .meta file does not exist at path: ${metaFilePath}`);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error reading folder ${folderPath}: ${error}`);
  }
}
// Start processing the base folder
processFilesInFolder(baseFolder);