/* eslint-disable */
import dotenv from 'dotenv';

dotenv.config({path: '../.env'});

export function getEndPointForDoctype(doctype){
  const current_path = process.cwd()
  const host = process.env.HOST
  const protocol = process.env.PROTOCOL

  var endpoint
  switch(doctype){
    case 'Client Script':
      endpoint = process.env.CLIENT_SCRIPT_END_POINT
      break
    case 'Server Script':
      endpoint = process.env.SERVER_SCRIPT_END_POINT
      break
    case 'Custom Field':
      endpoint = process.env.CUSTOM_FIELD_END_POINT
      break
    case 'Custom Doctype':
      endpoint = process.env.DOCTYPE_END_POINT
      break
    default:
      endpoint = '';
      break

  }
  

  const baseUrl = `${protocol}://${host}/api/resource/${endpoint}`
  return baseUrl
}