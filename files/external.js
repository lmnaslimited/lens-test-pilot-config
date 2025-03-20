/* eslint-disable */
import dotenv from 'dotenv';

dotenv.config({path: '../../.env'});

export function getEndPointForDoctype(doctype){
  const current_path = process.cwd()
  const host = process.env.HOST_URL
  const target = process.env.TARGET_URL

  var endpoint
  switch(doctype){
    case 'Client Script':
      endpoint = "Client Script"
      break
    case 'Server Script':
      endpoint = "Server Script"
      break
    case 'Custom Field':
      endpoint = "Custom Field"
      break
    case 'Custom Doctype':
      endpoint = "DocType"
      break
    default:
      endpoint = '';
      break

  }
  
  if(doctype === "Server Script"){
    var baseUrl = `${target}/api/resource/${endpoint}`
  } else {
    var baseUrl = `${host}/api/resource/${endpoint}`
  }
  return baseUrl
}