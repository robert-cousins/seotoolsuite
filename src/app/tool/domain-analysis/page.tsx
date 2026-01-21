import { Metadata } from "next";
import DomainAnalysisTool from "@/tools/DomainAnalysis";

export const metadata: Metadata = {
  title: "Domain Analysis | SEOToolSuite",
};

export default function DomainAnalysisPage() {
  return (
    <div className="domain-analysis-tool">
      <DomainAnalysisTool />
    </div>
  );
}
