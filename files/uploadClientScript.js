/* eslint-disable */
import { getEndPointForDoctype } from "./functions.js";

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();

const baseFolder = '../clientScript';

const myHeaders = new Headers();
myHeaders.append("Authorization", process.env.KEY);
myHeaders.append('Content-Type', 'application/json');

const baseUrl = getEndPointForDoctype("Client Script");

function createNewResource(requestBody) {
    
    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: JSON.stringify(requestBody),
        redirect: 'follow',
    };

    const url = baseUrl

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
            //wconst fileExtension = path.extname(file).toLowerCase();
            //const folderName = path.basename(folderPath); // Define folderName within the scope of the loop

            const metaFilePath = path.join(folderPath, `${file.replace(/\.js$/, '')}.meta`); // Move this line outside the if block


            if (stats.isDirectory()) {
                const currentFolder = parentFolder ? `${parentFolder}/${file}` : file;
                processFilesInFolder(filePath, currentFolder); // Recursively process subdirectories
            } else {
                if (file.endsWith('.js')) { 
                    const fileContent = fs.readFileSync(filePath, 'utf-8');
                    const metaFilePath = path.join(folderPath, `${file.replace(/\.js$/, '')}.meta`);

                    if (fs.existsSync(metaFilePath)) {
                        let metaContent = fs.readFileSync(metaFilePath, 'utf-8');

                        // Check if the .meta file is empty or contains valid JSON content
                        if (!metaContent) {
                            console.log(`Meta file is empty for ${file}, skipping meta content`);
                            metaContent = {}; // Provide a default empty object
                        } else {
                            try {
                                metaContent = JSON.parse(metaContent); // Parse the JSON content of .meta file
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

                        const encodedFilename = encodeURIComponent(file.replace(/\.js$/, ''));
                        const postFilename = file.replace(/\.js$/, '');
                        const folderName = parentFolder ? parentFolder : '';

                        const requestOptions = {
                            method: 'PUT',
                            headers: myHeaders,
                            body: JSON.stringify({
                                filename: encodedFilename,
                                script: fileContent,
                                ...metaContent
                            }),
                            redirect: 'follow',
                        };

                        const url = `${baseUrl}/${encodedFilename}`

                        fetch(url, requestOptions)
                            .then(response => {
                                if (!response.ok) {
                                    if (response.status === 404) {
                                        // If the file doesn't exist, create a new resource
                                        createNewResource({
                                            name: postFilename,
                                            script: fileContent,
                                            ...metaContent,
                                            dt: folderName,
                                            enabled: 1
                                        });
                                    } else {
                                        throw new Error(`HTTP error! Status: ${response.status}`);
                                    }
                                }
                                return response.json();
                            })
                            .then(result => {
                                console.log(`Processing changed file: ${file}`);

                            })
                            .catch(error => {
                                console.error(`Error processing changed file ${file}:`, error);
                            });
                    }
                } else {
                    console.log(`Skipping file ${file} as .meta file does not exist at path: ${metaFilePath}`);
                }
            }
        }
    } catch (error) {
        console.error(`Error reading folder ${folderPath}: ${error}`);
    }
}

// Start processing the base folder
processFilesInFolder(baseFolder);