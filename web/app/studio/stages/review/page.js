import {Suspense} from "react";
import StageReleaseReviewClient from "./StageReleaseReviewClient.jsx";
export default function StageReleaseReviewPage(){
 return <Suspense fallback={<main className="stage-review" dir="rtl">جارٍ تحميل صفحة مراجعة الإصدار…</main>}>
  <StageReleaseReviewClient/>
 </Suspense>;
}
