import { PersonAddAltOutlined, UploadFileOutlined, WorkOutlineOutlined } from "@mui/icons-material";
import PostAJob from "../../assets/images/Postajob.png";
import UploadImg from '../../assets/images/Upload.png'
import FindEasy from '../../assets/images/FindEasy.png'

export const JOB_SUGGESTIONS = [
  "Software Engineer", "Frontend Developer", "Data Scientist",
  "Product Manager", "UI/UX Designer", "Backend Developer",
  "DevOps Engineer", "ML Engineer", "React Developer", "Node.js Developer",
];

export const EXPERIENCE_OPTIONS = ["Fresher", "1–3 years", "3–5 years", "5–10 years", "10+ years"];

export const HERO_COMPANIES = [
  { name: "Google",    domain: "google.com",    fallback: "#4285F4" },
  { name: "Microsoft", domain: "microsoft.com", fallback: "#5E5E5E" },
  { name: "Accenture", domain: "accenture.com", fallback: "#A100FF" },
  { name: "Amazon",    domain: "amazon.com",    fallback: "#FF9900" },
  { name: "Infosys",   domain: "infosys.com",   fallback: "#007CC3" },
];

export const HERO_PERSON = {
  src: null,
  alt: "Professional job seeker",
};

export const EASYFIND_ART = {
  src: FindEasy,
  alt: "Recruiter announcing jobs with a megaphone",
};

export const UPLOADCV_ART = {
  src: UploadImg,
  alt: "Candidate ready to upload her CV",
};

export const CTA40_ART = {

  src: PostAJob,
  fallback: PostAJob,
  alt: "Professional candidate smiling at the camera",
};

export const PARTNERS = ["MakeLess", "coworks", "greener", "SAAS TODAY", "Dorfus", "askimat"];

export const STEPS = [
  { icon: <PersonAddAltOutlined sx={{ fontSize: 26 }} />, num: "01", t1: "Register",  t2: "Your Account",
    desc: "Create your free IEvalx profile with education, experience and the skills you want to prove." },
  { icon: <UploadFileOutlined sx={{ fontSize: 26 }} />,   num: "02", t1: "Upload",    t2: "Your Resume",
    desc: "Upload your resume and take AI skill assessments to earn verified badges and a CIR score." },
  { icon: <WorkOutlineOutlined sx={{ fontSize: 26 }} />,  num: "03", t1: "Apply",     t2: "For Dream Job",
    desc: "Get AI-matched to jobs, complete AI or live interviews and track every application in one place." },
];

export const GUIDELINES = [
  "Build a strong verified profile.",
  "Take an AI skill assessment.",
  "Get matched to real openings.",
  "Interview with AI & get hired.",
];


export const TESTIMONIALS = [
  { quote: "The AI interview was surprisingly natural. I got detailed feedback on my technical answers within minutes — no more waiting weeks to hear back from recruiters.",
    name: "Madhumathi", role: "Engineer", color: "#7F9E7E",
    img: "https://i.pravatar.cc/128?img=47" },
  { quote: "We cut our time-to-hire from 45 days to 12. The CIR scoring system helps us identify candidates who are genuinely ready, not just good on paper.",
    name: "Kasula Shiva", role: "Frontend Developer, TechNova", color: "#7F9E7E",
    img: "https://i.pravatar.cc/128?img=12" },
  { quote: "Verified skill badges changed everything for me. Employers reached out first, and the anti-cheat monitored assessments meant my scores actually carried weight.",
    name: "Ananya Iyer", role: "Data Scientist", color: "#C08A5B",
    img: "https://i.pravatar.cc/128?img=32" },
];

export const ARTICLES = [
  { date: "02 Jul 2026", read: "4 min read", tag: "AI Hiring",
    img: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=700&q=80",
    title: "How AI interviews remove bias from the first screening round" },
  { date: "09 Jul 2026", read: "6 min read", tag: "Assessments",
    img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=700&q=80",
    title: "CIR scores explained — what employers actually see on your profile" },
  { date: "15 Jul 2026", read: "5 min read", tag: "Interviews",
    img: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=700&q=80",
    title: "Live vs AI interviews: choosing the right round for every role" },
  { date: "20 Jul 2026", read: "3 min read", tag: "Careers",
    img: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=700&q=80",
    title: "Building a profile that assessment-first employers actually notice" },
  { date: "24 Jul 2026", read: "7 min read", tag: "Employers",
    img: "https://images.unsplash.com/photo-1552581234-26160f608093?w=700&q=80",
    title: "Cutting time-to-hire: what the data says about AI-scored pipelines" },
];

export const PLANS = [
  { name: "Starter", tagline: "For getting started", m: 0, y: 0,
    features: ["2 AI interviews / month", "Basic skill assessments", "Public profile page", "Community support"],
    cta: "Start Free" },
  { name: "Pro", tagline: "For serious jobseekers", m: 499, y: 399, popular: true,
    features: ["Unlimited AI interviews", "CIR score & verified badge", "Priority job matching", "Detailed feedback reports", "Mock interview library"],
    cta: "Go Pro" },
  { name: "Teams", tagline: "For hiring teams", m: 1999, y: 1599,
    features: ["25 recruiter seats", "AI-scored pipelines", "Bulk assessments", "Analytics dashboard", "Dedicated support"],
    cta: "Contact Sales" },
];

export const FAQS = [
  { q: "How does the AI interview work?",
    a: "You answer role-specific questions on camera at your own pace. Our models evaluate skill depth, clarity and problem-solving — and you get a scored report within minutes." },
  { q: "What is a CIR score?",
    a: "The Candidate Interview Rating is a verified score built from your assessments and interviews. Employers see it on your profile, so your ability speaks before your resume does." },
  { q: "Is IEvalx free for jobseekers?",
    a: "Yes — the Starter plan is free forever, with monthly AI interviews and assessments included. Pro unlocks unlimited attempts and priority matching." },
  { q: "Can employers see my failed attempts?",
    a: "No. Only your best verified scores are visible. Practice attempts stay private to you, always." },
  { q: "How do employers use the platform?",
    a: "Teams post roles, invite candidates to assessments, and track applicants through AI-scored pipelines — with every candidate arriving pre-verified." },
];

export const FOOTER_COLS = [
  { head: "Product",   links: ["Product Tour", "Analytics", "Product Overview", "What's New", "Templates"] },
  { head: "Company",   links: ["What we Offer", "Our Story", "Latest Posts", "Help Center", "Our Partners"] },
  { head: "Resources", links: ["Blog", "Pricing", "FAQ", "Privacy Policy", "Terms & Conditions"] },
  { head: "Services",  links: ["AI Interviews", "Assessments", "Job Matching", "Book Interview"] },];