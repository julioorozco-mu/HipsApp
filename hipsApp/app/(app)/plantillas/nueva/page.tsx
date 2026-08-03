import { MoreShell } from "@/components/features/more/more-shell";
import { TemplateForm } from "@/components/features/more/template-form";

export default function NewTemplatePage() {
  return <MoreShell title="Nueva plantilla" backHref="/plantillas"><TemplateForm /></MoreShell>;
}
