import { PDFParse } from "pdf-parse";
import { agentUserId } from "@/lib/job-agent/identity";
import { inferRegion } from "@/lib/job-agent/matching";

export const runtime = "nodejs";

function findCategory(text: string) {
  const lower = text.toLowerCase();
  if (/\b(ui\s*[/&-]?\s*ux designer|ux\s*[/&-]?\s*ui designer|ux designer|ui designer|product designer|user experience designer)\b/.test(lower)) return "UI/UX Designer";
  if (/\b(software engineer|software developer|frontend developer|full-stack developer)\b/.test(lower)) return "Software Engineer";
  if (/\bfigma\b/.test(lower) && /\b(wirefram|user research|prototyp|design system)/.test(lower)) return "UI/UX Designer";
  if (/\b(react|typescript|python)\b/.test(lower)) return "Software Engineer";
  if (/marketing|growth|seo|campaign/.test(lower)) return "Marketing";
  if (/data analyst|sql|analytics|tableau/.test(lower)) return "Data Analyst";
  if (/project manager|scrum|agile/.test(lower)) return "Project Manager";
  return "Open roles";
}

function findExperience(text: string) {
  const match = text.match(/(\d{1,2})\+?\s*(?:years|yrs)\s+(?:of\s+)?experience/i);
  return match ? Math.min(Number(match[1]), 40) : 0;
}

export async function POST(request: Request) {
  if (!(await agentUserId())) return Response.json({ error: "Sign in with Google to continue." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  const pastedText = String(form.get("text") || "").slice(0, 60000);
  let resumeText = pastedText;
  let fileName = "Pasted resume";

  if (file instanceof File && file.size) {
    if (file.size > 5 * 1024 * 1024) return Response.json({ error: "The resume must be under 5 MB." }, { status: 400 });
    fileName = file.name.slice(0, 120);
    const isPdf = file.name.toLowerCase().endsWith(".pdf") && file.type === "application/pdf";
    const isText = /\.(txt|md)$/i.test(file.name) && (file.type.startsWith("text/") || !file.type);
    if (!isPdf && !isText) return Response.json({ error: "Choose a PDF or text resume." }, { status: 400 });
    if (isText) {
      resumeText = (await file.text()).slice(0, 60000);
    } else {
      const parser = new PDFParse({ data: new Uint8Array(await file.arrayBuffer()) });
      try {
        const result = await parser.getText();
        resumeText = result.text.slice(0, 60000);
      } catch {
        return Response.json({ error: "Could not read this PDF. Try a text resume or paste its content." }, { status: 422 });
      } finally {
        await parser.destroy();
      }
    }
  }

  if (resumeText.trim().length < 40) {
    return Response.json({ error: "Add a resume with at least a few lines of readable text." }, { status: 400 });
  }
  return Response.json({ fileName, resumeText, category: findCategory(resumeText), experienceYears: findExperience(resumeText), jobType: "Remote", region: inferRegion(resumeText) });
}
