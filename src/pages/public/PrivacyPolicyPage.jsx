import LegalPage from "./LegalPage";



const SECTIONS = [
  { id: "information-we-collect", title: "Information we collect", body: [
    "We collect information you provide directly when you create an IEvalx account, build your profile, upload a resume, or communicate with us. This includes your name, email address, phone number, education, work history, skills and career preferences.",
    { list: [
      "Account data — name, email, password (stored hashed), phone number and profile photo.",
      "Career data — resume contents, skills, experience, expected salary and locations.",
      "Usage data — pages visited, searches run, jobs viewed, saved and applied to.",
      "Device data — browser type, IP address and approximate region, used for security and localisation.",
    ]},
  ]},
  { id: "assessment-and-proctoring", title: "Assessment & proctoring data", body: [
    "IEvalx assessments are anti-cheat monitored so that the badges and scores you earn carry real weight. During a monitored assessment we may process your camera feed, screen activity, tab-switch events and typing patterns strictly to verify test integrity.",
    "Proctoring signals are analysed to flag anomalies; flagged sessions are reviewed before any score is invalidated. Raw proctoring media is retained only as long as needed for review and dispute resolution, then deleted.",
  ]},
  { id: "ai-interview-recordings", title: "AI interview recordings", body: [
    "When you take an AI interview, your audio (and video, where enabled) responses are recorded to generate your transcript, feedback and scoring. Recordings are linked to your application and are visible to the employer for the role you applied to.",
    "Practice interviews are private to your account. You can delete practice recordings at any time from your dashboard.",
  ]},
  { id: "how-we-use-information", title: "How we use your information", body: [
    { list: [
      "To operate your account, assessments, CIR score, matching and applications.",
      "To share your profile, verified badges and interview outcomes with employers you apply to.",
      "To improve our matching models and assessment quality using aggregated, de-identified data.",
      "To send service messages — application updates, interview invites and security alerts.",
      "To detect fraud, cheating, and abuse of the platform.",
    ]},
    "We do not sell your personal data, and we do not share your profile with an employer unless you apply to that employer or make your profile discoverable in settings.",
  ]},
  { id: "sharing-and-disclosure", title: "Sharing & disclosure", body: [
    "Your data is shared only with: employers you apply to (profile, CIR score, relevant assessment results and interview outcomes); service providers who process data on our instructions under contract (hosting, email, payments); and authorities where the law requires it.",
    "If IEvalx is involved in a merger or acquisition, your data may transfer under the same protections as this policy, and we will notify you before any change takes effect.",
  ]},
  { id: "data-retention", title: "Data retention", body: [
    "We keep your account data while your account is active. If you delete your account, profile and application data are removed within 30 days, except records we must keep for legal, dispute or fraud-prevention purposes.",
    "Assessment outcomes attached to a completed hire may be retained by the employer as part of their own hiring records, governed by their policies.",
  ]},
  { id: "security", title: "Security", body: [
    "We protect your data with encryption in transit, hashed credentials, role-based access controls and audit logging. Access to proctoring media and interview recordings is restricted to integrity-review and support staff on a need-to-know basis.",
    "No system is perfectly secure — if we learn of a breach affecting your data, we will notify you and the relevant authorities as required by law.",
  ]},
  { id: "your-rights", title: "Your rights & choices", body: [
    { list: [
      "Access and export — download a copy of your profile and assessment history from settings.",
      "Correction — edit your profile and career data at any time.",
      "Deletion — delete individual recordings, or your entire account, from settings.",
      "Discoverability — control whether employers can find your profile in search.",
      "Marketing — opt out of non-essential emails with one click; service messages still apply.",
    ]},
  ]},
  { id: "cookies", title: "Cookies", body: [
    "We use essential cookies to keep you signed in and secure, and analytics cookies to understand how the product is used. You can control non-essential cookies from your browser settings; the platform works fully with essential cookies alone.",
  ]},
  { id: "changes-to-this-policy", title: "Changes to this policy", body: [
    "We may update this policy as the product evolves. Material changes are announced in-app and by email at least 14 days before they take effect. The date at the top of this page always reflects the current version.",
  ]},
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Privacy Policy"
      title="Your Data, Handled With Care"
      subtitle="What IEvalx collects, why we collect it, and the controls you have — written to be read, not skimmed past."
      sections={SECTIONS}
    />
  );
}