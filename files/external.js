/* eslint-disable */
import dotenv from 'dotenv';

dotenv.config({path: '../../.env'});

export function getEndPointForDoctype(doctype){
  const current_path = process.cwd()
  const host = process.env.HOST_URL

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
  
  var baseUrl = `${host}/api/resource/${endpoint}`
  return baseUrl
}