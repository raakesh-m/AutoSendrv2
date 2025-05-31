import { DashboardLayout } from "@/components/dashboard-layout"
import { FileUploadSection } from "@/components/file-upload-section"
import { DataSummary } from "@/components/data-summary"
import { ContactsTable } from "@/components/contacts-table"

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Upload and process your scraped contact data</p>
        </div>

        <FileUploadSection />
        <DataSummary />
        <ContactsTable />
      </div>
    </DashboardLayout>
  )
}
