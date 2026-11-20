import {NextResponse} from "next/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const COOKIE="fvm_studio_session";
function validToken(value){const expected=process.env.STUDIO_ADMIN_TOKEN;return Boolean(expected&&value&&value.length===expected.length&&timingSafeEqual(value,expected));}
function timingSafeEqual(a,b){let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
export async function GET(req){const value=req.cookies.get(COOKIE)?.value;if(!validToken(value))return NextResponse.json({authenticated:false},{status:401});return NextResponse.json({authenticated:true,storage:process.env.STUDIO_STORAGE_DRIVER||"local"});}
export async function POST(req){let body;try{body=await req.json();}catch{return NextResponse.json({error:"بيانات تسجيل الدخول غير صالحة."},{status:400});}if(!validToken(String(body.token||"")))return NextResponse.json({error:"كلمة مرور المسؤول غير صحيحة."},{status:401});const response=NextResponse.json({authenticated:true,storage:process.env.STUDIO_STORAGE_DRIVER||"local"});response.cookies.set(COOKIE,String(body.token),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/api/studio",maxAge:60*60*12});return response;}
export async function DELETE(){const response=NextResponse.json({success:true});response.cookies.set(COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/api/studio",maxAge:0});return response;}
