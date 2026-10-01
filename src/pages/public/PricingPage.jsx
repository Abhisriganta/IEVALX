import PublicLayout, { PageHero } from "./PublicLayout";
import PricingSection from "../landing/Pricing";
import { Box } from "@mui/material";


export default function PricingPage() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="Pricing"
        title="Simple Plans, Verified Results"
        subtitle="Start free, upgrade when you're ready — every plan includes verified assessments and a shareable CIR score."
        back={{ label: "Back to Home", to: "/" }}
      />
      {/* the section carries its own container + spacing; trim the top gap a
          little since the hero band sits directly above it */}
      <Box sx={{ mt: { xs: -3, md: -5 }, mb: { xs: 6, md: 9 } }}>
        <PricingSection hideHeader />
      </Box>
    </PublicLayout>
  );
}