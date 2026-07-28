import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata():Promise<Metadata>{
  const requestHeaders=await headers();
  const host=requestHeaders.get("x-forwarded-host")||requestHeaders.get("host")||"localhost:3000";
  const protocol=requestHeaders.get("x-forwarded-proto")||(host.startsWith("localhost")?"http":"https");
  const origin=`${protocol}://${host}`;
  const title="Studio Ledger — Interior Design Operations";
  const description="Estimation, procurement, project delivery and finance control for interior design studios.";
  return{
    metadataBase:new URL(origin),
    title,description,
    openGraph:{title,description,type:"website",images:[{url:"/og.png",width:1680,height:909,alt:"Interior design plans, material samples and project ledger"}]},
    twitter:{card:"summary_large_image",title,description,images:["/og.png"]}
  };
}

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>{children}</body></html>;
}
