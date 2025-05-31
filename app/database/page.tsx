import { DashboardLayout } from "@/components/dashboard-layout"
import { DatabaseTables } from "@/components/database-tables"

export default function DatabasePage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database Control</h1>
          <p className="text-muted-foreground">View and manage your backend data</p>
        </div>

        <DatabaseTables />
      </div>
    </DashboardLayout>
  )
}
