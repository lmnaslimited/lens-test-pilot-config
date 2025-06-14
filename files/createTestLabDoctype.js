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

// ─── Read Doctype List from TXT ──────────────────────
function getDoctypeNames() {
  const doctypeListPath = path.join(current_path, 'txt', 'doctypeList.txt');
  try {
    if (fs.existsSync(doctypeListPath)) {
      const doctypeList = fs.readFileSync(doctypeListPath, 'utf8');
      return doctypeList
        .split(/\r?\n/)
        .filter(Boolean); // Remove empty lines
    } else {
      console.error('doctypeList.txt not found!');
      return [];
    }
  } catch (error) {
    console.error('Error reading doctypeList.txt:', error);
    return [];
  }
}

async function uploadJsonFile(filePath, doctypeName) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`JSON file not found for ${doctypeName}: ${filePath}`);
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);

    // Remove or clear links
    if ('links' in jsonData) {
      jsonData.links = []; // or: delete jsonData.links;
    }

    const baseUrl = getEndPointForDoctype("Custom Doctype");
    const requestUrl = `${baseUrl}/${jsonData.name}`;

    const putResponse = await fetch(requestUrl, {
      method: "PUT",
      headers: myHeaders,
      body: JSON.stringify(jsonData),
    });

    if (putResponse.ok) {
      console.log('Updated document:', jsonData.name);
    } else if (putResponse.status === 404) {
      console.log(`Document not found for ${jsonData.name}. Trying to create it...`);

      const postResponse = await fetch(baseUrl, {
        method: "POST",
        headers: myHeaders,
        body: JSON.stringify(jsonData),
      });

      if (postResponse.ok) {
        console.log('Created document:', jsonData.name);
      } else {
        const errorMessage = await postResponse.text();
        console.error(`POST failed! Status: ${postResponse.status}, Message: ${errorMessage}`);
      }
    } else {
      const errorMessage = await putResponse.text();
      console.error(`PUT failed! Status: ${putResponse.status}, Message: ${errorMessage}`);
    }
  } catch (error) {
    console.error('Error during upload:', error);
  }
}

// ─── Try File in Subfolders ───────────────────────────
function findJsonFilePath(doctypeName) {
  const subDirs = ['customChildDoctype', 'customSingleDoctype', 'parent'];
  for (const dir of subDirs) {
    const filePath = path.join(customDoctypeFolderPath, dir, `${doctypeName}.json`);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

// ─── Main Start Function ──────────────────────────────
(async function start() {
  const doctypeNames = getDoctypeNames();

  if (doctypeNames.length === 0) {
    console.error('No Doctypes found in doctypeList.txt!');
    return;
  }

  for (const name of doctypeNames) {
    const filePath = findJsonFilePath(name);
    if (filePath) {
      console.log(`Processing Doctype: ${name}`);
      await uploadJsonFile(filePath, name);
    } else {
      console.warn(`File not found for Doctype: ${name}`);
    }
  }
})();
