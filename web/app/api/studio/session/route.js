import {NextResponse} from "next/server";
import {createStudioSession,verifyStudioSession,STUDIO_SESSION_TTL_MS} from "../../../../game/studio/signedSession.mjs";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const COOKIE="fvm_studio_session";
function validSession(value){return verifyStudioSession(process.env.STUDIO_ADMIN_TOKEN||"",value);}
export async function GET(req){if(!validSession(req.cookies.get(COOKIE)?.value))return NextResponse.json({authenticated:false},{status:401});return NextResponse.json({authenticated:true,storage:process.env.STUDIO_STORAGE_DRIVER||"local"});}
export async function POST(req){let body;try{body=await req.json();}catch{return NextResponse.json({error:"بيانات تسجيل الدخول غير صالحة."},{status:400});}const expected=process.env.STUDIO_ADMIN_TOKEN||"",supplied=String(body.token||"");const a=Buffer.from(expected),b=Buffer.from(supplied);if(!expected||a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:"كلمة مرور المسؤول غير صحيحة."},{status:401});const session=createStudioSession(expected);const response=NextResponse.json({authenticated:true,storage:process.env.STUDIO_STORAGE_DRIVER||"local"});response.cookies.set(COOKIE,session,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/api/studio",maxAge:STUDIO_SESSION_TTL_MS/1000});return response;}
export async function DELETE(){const response=NextResponse.json({success:true});response.cookies.set(COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/api/studio",maxAge:0});return response;}
