/* eslint-disable */
import { getEndPointForDoctype } from "./functions.js";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({path: '../.env'});

const myHeaders = new Headers();
myHeaders.append("Authorization", process.env.KEY)

const requestOptions = {
  method: "GET",
  headers: myHeaders,
  redirect: "follow"
};

const current_path = process.cwd();

// Function to create the "clientScript" folder if it doesn't exist
function ensureClientScriptFolderExists() {
  const clientScriptFolderPath = path.join(current_path, '..', 'clientScript');
  if (!fs.existsSync(clientScriptFolderPath)) {
    fs.mkdirSync(clientScriptFolderPath, { recursive: true });
    console.log('Created "clientScript" folder.');
  }
}

// Ensure "clientScript" folder exists
ensureClientScriptFolderExists();

const baseUrl = getEndPointForDoctype("Client Script");

fetch(`${baseUrl}?fields=["*"]&filters={\"enabled\":1}&limit_page_length=0`, requestOptions)
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    if (data && data.data && Array.isArray(data.data)) {
      data.data.forEach(documentDetails => {
        const folderName = documentDetails.dt;
        const folderPath = path.join(current_path,'..', 'clientScript', folderName);
        const metaFileName = path.join(folderPath, `${documentDetails.name}.meta`);
        const scriptFileName = path.join(folderPath, `${documentDetails.name}.js`);

        fs.mkdir(folderPath, { recursive: true }, (err) => {
          if (err) {
            console.error('Error creating folder:', err);
          } else {
            console.log('Folder created successfully:', folderName);

            // Create .meta file
            const metaData = { ...documentDetails }; 
            delete metaData.script; 
            fs.writeFile(metaFileName, JSON.stringify(metaData), { flag: 'w' }, (err) => {
              if (err) {
                console.error('Error writing meta file:', err);
              } else {
                console.log('Meta file created successfully:', metaFileName);
              }
            });

            // Create .py file for script
           
            fs.writeFile(scriptFileName, documentDetails.script, { flag: 'w' }, (err) => {
              if (err) {
                console.error('Error writing script file:', err);
              } else {
                console.log('Script file created successfully:', scriptFileName);
              }
              });
            
          }
        });
      });
    } else {
      console.error('Invalid or empty data received from the API.');
    }
  })
  .catch(error => console.error('Error fetching data:', error));