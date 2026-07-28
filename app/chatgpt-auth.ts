import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type ChatGPTUser={displayName:string;email:string;fullName:string|null};

export async function getChatGPTUser():Promise<ChatGPTUser|null>{
  const requestHeaders=await headers();
  const email=requestHeaders.get("oai-authenticated-user-email");
  if(!email)return null;
  const encoded=requestHeaders.get("oai-authenticated-user-full-name");
  const encoding=requestHeaders.get("oai-authenticated-user-full-name-encoding");
  let fullName:string|null=null;
  if(encoded&&encoding==="percent-encoded-utf-8"){
    try{fullName=decodeURIComponent(encoded);}catch{fullName=null;}
  }
  return{displayName:fullName??email,email,fullName};
}

export async function requireChatGPTUser(returnTo:string):Promise<ChatGPTUser>{
  const user=await getChatGPTUser();
  if(user)return user;
  if(process.env.NODE_ENV!=="production")return{displayName:"Local preview",email:"local-preview@studio-ledger",fullName:"Local preview"};
  const safe=returnTo.startsWith("/")&&!returnTo.startsWith("//")?returnTo:"/";
  redirect(`/signin-with-chatgpt?return_to=${encodeURIComponent(safe)}`);
}
