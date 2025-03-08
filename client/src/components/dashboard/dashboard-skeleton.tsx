import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Account Overview Skeleton */}
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>Account Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </CardContent>
      </Card>

      {/* Credit Balance Skeleton */}
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>AI Credits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-8 bg-gray-200 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics Skeleton */}
      <div className="md:col-span-2 lg:col-span-3">
        <Card className="animate-pulse">
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-6 bg-gray-200 rounded w-3/4" />
                </div>
              ))}
            </div>
            <div className="h-[300px] bg-gray-200 rounded" />
          </CardContent>
        </Card>
      </div>

      {/* Recent Trades Skeleton */}
      <div className="md:col-span-2">
        <Card className="animate-pulse">
          <CardHeader>
            <CardTitle>Recent Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Signals Skeleton */}
      <div className="lg:col-span-1">
        <Card className="animate-pulse">
          <CardHeader>
            <CardTitle>Active Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
